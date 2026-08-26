use std::path::{Path, PathBuf};
use std::time::Duration;

/// Quant types llama.cpp can produce and that Crafter exposes for the custom
/// quantization pipeline. Low-bit types (Q2_K, IQ2_XXS, IQ3_XXS) are the x86
/// approximation of the CQ codebook quality-per-bit; Q4_K_M is the safe default.
pub const SUPPORTED_OUTTYPES: &[&str] = &[
    "f16", "q8_0", "q6_k", "q5_k_m", "q4_k_m", "q4_k_s", "q4_0", "q3_k_m", "q3_k_l",
    "q2_k", "iq2_xxs", "iq2_xs", "iq2_s", "iq3_xxs", "iq3_xs", "iq3_m",
];

pub fn is_supported_outtype(quant: &str) -> bool {
    SUPPORTED_OUTTYPES.contains(&quant.to_lowercase().as_str())
}

pub fn quant_bits(quant: &str) -> u32 {
    match quant.to_lowercase().as_str() {
        "f16" => 16,
        "q8_0" => 8,
        "q6_k" => 6,
        "q5_k_m" | "q5_k_s" => 5,
        "q4_k_m" | "q4_k_s" | "q4_0" => 4,
        "q3_k_m" | "q3_k_l" => 3,
        "q2_k" => 2,
        "iq2_xxs" | "iq2_xs" | "iq2_s" => 2,
        "iq3_xxs" | "iq3_xs" | "iq3_m" => 3,
        _ => 0,
    }
}

/// Arguments for a single `llama-quantize` invocation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuantizeArgs {
    pub source: PathBuf,
    pub dest: PathBuf,
    pub outtype: String,
    pub imatrix: Option<PathBuf>,
}

/// Build the exact argv passed to `llama-quantize`. Options precede the three
/// positional args (`<input> <output> <outtype>`). Pure and unit-testable.
pub fn quantize_argv(args: &QuantizeArgs) -> Vec<String> {
    let mut v: Vec<String> = Vec::new();
    if let Some(imatrix) = &args.imatrix {
        v.push("--imatrix".to_string());
        v.push(imatrix.to_string_lossy().into_owned());
    }
    v.push(args.source.to_string_lossy().into_owned());
    v.push(args.dest.to_string_lossy().into_owned());
    v.push(args.outtype.to_lowercase());
    v
}

/// Build the exact argv passed to `llama-imatrix` for calibration.
pub fn imatrix_argv(model: &Path, calibration: &Path, out: &Path) -> Vec<String> {
    vec![
        "-m".to_string(),
        model.to_string_lossy().into_owned(),
        "-f".to_string(),
        calibration.to_string_lossy().into_owned(),
        "-o".to_string(),
        out.to_string_lossy().into_owned(),
    ]
}

fn last_stderr_lines(stderr: &[u8], n: usize) -> String {
    String::from_utf8_lossy(stderr)
        .lines()
        .rev()
        .take(n)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>()
        .join("\n")
}

async fn run_tool(bin_dir: &Path, name: &str, argv: &[String]) -> Result<String, String> {
    let bin = bin_dir.join(name);
    if !bin.exists() {
        return Err(format!(
            "{} no encontrado en {}. Instala el motor local con local_setup.",
            name,
            bin_dir.display()
        ));
    }
    let output = tokio::time::timeout(
        Duration::from_secs(600),
        tokio::process::Command::new(&bin)
            .current_dir(bin_dir)
            .args(argv)
            .output(),
    )
    .await
    .map_err(|_| format!("{} excedio el limite de 10 minutos", name))?
    .map_err(|e| format!("Error ejecutando {}: {}", name, e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(format!(
            "{} fallo:\n{}",
            name,
            last_stderr_lines(&output.stderr, 8)
        ))
    }
}

/// Built-in calibration sample used when the caller provides none, so the
/// imatrix pipeline works out of the box. Short, representative prose + code.
pub const DEFAULT_CALIBRATION: &str = "\
El agente de codigo local cuantiza pesos para correr en hardware modesto. \
La cuantizacion de baja densidad conserva la calidad por bit usando codebooks. \
Un modelo de 0.5B parametros ocupa unos 400 MB en Q2_K y menos de 1 GB en fp16. \
El motor usa mmap para no cargar todo el repositorio en RAM y mantiene el uso bajo 500 MB en reposo. \
Los cuant types como Q2_K, IQ2_XXS e IQ3_XXS son la aproximacion x86 mas cercana a la alta calidad por bit. \
\n\n\
fn main() {\n    let tier = detect_hardware_tier();\n    let model = catalog::default_for_tier(tier);\n    println!(\"usando {}\", model.id);\n}\n";

/// A quantization pipeline: optionally compute an importance matrix from
/// calibration text, then quantize `source` to `outtype` into `dest`.
#[derive(Debug, Clone)]
pub struct QuantizePipeline {
    pub source: PathBuf,
    pub dest: PathBuf,
    pub outtype: String,
    pub calibration: Option<PathBuf>,
}

/// Runs the full pipeline against the local llama.cpp tool bundle.
///
/// Returns the human-readable log lines of each step. The caller owns `dest` and
/// the temporary imatrix file (written next to `dest`).
pub async fn run_pipeline(bin_dir: &Path, p: &QuantizePipeline) -> Result<Vec<String>, String> {
    if !is_supported_outtype(&p.outtype) {
        return Err(format!(
            "Tipo de cuantizacion no soportado: {}. Usa uno de: {}",
            p.outtype,
            SUPPORTED_OUTTYPES.join(", ")
        ));
    }
    if !p.source.exists() {
        return Err(format!("Modelo fuente no existe: {}", p.source.display()));
    }

    let mut log: Vec<String> = Vec::new();

    let imatrix = match &p.calibration {
        Some(calib) if calib.exists() => {
            log.push(format!("Usando calibracion: {}", calib.display()));
            Some(calib.clone())
        }
        Some(calib) => {
            return Err(format!("Archivo de calibracion no existe: {}", calib.display()));
        }
        None => {
            let dir = p.dest.parent().unwrap_or(Path::new("/tmp"));
            let calib_path = dir.join("crafter-calibration.txt");
            std::fs::write(&calib_path, DEFAULT_CALIBRATION).map_err(|e| e.to_string())?;
            log.push(format!("Calibracion por defecto: {}", calib_path.display()));
            Some(calib_path)
        }
    };

    let imatrix_path = p.dest.with_extension(format!("{}.imatrix", p.outtype));
    if let Some(calib) = imatrix {
        let argv = imatrix_argv(&p.source, &calib, &imatrix_path);
        log.push("Generando importancia (imatrix)...".to_string());
        run_tool(bin_dir, "llama-imatrix", &argv).await?;
        log.push(format!("imatrix listo: {}", imatrix_path.display()));
    }

    let args = QuantizeArgs {
        source: p.source.clone(),
        dest: p.dest.clone(),
        outtype: p.outtype.clone(),
        imatrix: Some(imatrix_path),
    };
    let argv = quantize_argv(&args);
    log.push(format!(
        "Cuantizando {} -> {} ({} bits)...",
        p.source.display(),
        p.dest.display(),
        quant_bits(&p.outtype)
    ));
    run_tool(bin_dir, "llama-quantize", &argv).await?;

    log.push(format!("Listo: {}", p.dest.display()));
    Ok(log)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn outtype_validation_accepts_low_bit_types() {
        assert!(is_supported_outtype("q2_k"));
        assert!(is_supported_outtype("IQ2_XXS"));
        assert!(is_supported_outtype("iq3_xxs"));
        assert!(is_supported_outtype("q4_k_m"));
        assert!(!is_supported_outtype("q1_k"));
        assert!(!is_supported_outtype("gptq"));
    }

    #[test]
    fn quant_bits_maps_types() {
        assert_eq!(quant_bits("f16"), 16);
        assert_eq!(quant_bits("Q4_K_M"), 4);
        assert_eq!(quant_bits("iq2_xxs"), 2);
        assert_eq!(quant_bits("iq3_m"), 3);
    }

    #[test]
    fn quantize_argv_order_with_and_without_imatrix() {
        let src = PathBuf::from("/tmp/model-f16.gguf");
        let dst = PathBuf::from("/tmp/model-q4km.gguf");
        let with_im = QuantizeArgs {
            source: src.clone(),
            dest: dst.clone(),
            outtype: "q4_k_m".to_string(),
            imatrix: Some(PathBuf::from("/tmp/imatrix.dat")),
        };
        assert_eq!(
            quantize_argv(&with_im),
            vec![
                "--imatrix".to_string(),
                "/tmp/imatrix.dat".to_string(),
                "/tmp/model-f16.gguf".to_string(),
                "/tmp/model-q4km.gguf".to_string(),
                "q4_k_m".to_string(),
            ]
        );

        let no_im = QuantizeArgs {
            source: src,
            dest: dst,
            outtype: "Q2_K".to_string(),
            imatrix: None,
        };
        assert_eq!(
            quantize_argv(&no_im),
            vec![
                "/tmp/model-f16.gguf".to_string(),
                "/tmp/model-q4km.gguf".to_string(),
                "q2_k".to_string(),
            ]
        );
    }

    #[test]
    fn imatrix_argv_shape() {
        let argv = imatrix_argv(
            Path::new("/tmp/model-f16.gguf"),
            Path::new("/tmp/calib.txt"),
            Path::new("/tmp/imatrix.dat"),
        );
        assert_eq!(argv[0], "-m");
        assert_eq!(argv[1], "/tmp/model-f16.gguf");
        assert_eq!(argv[3], "/tmp/calib.txt");
        assert_eq!(argv[5], "/tmp/imatrix.dat");
    }

    #[tokio::test]
    async fn run_tool_missing_binary_returns_clear_error() {
        let err = run_tool(Path::new("/tmp/no-such-dir"), "llama-quantize", &[]).await;
        assert!(err.is_err());
        assert!(err.unwrap_err().contains("no encontrado"));
    }

    #[tokio::test]
    async fn pipeline_rejects_unsupported_outtype_without_running() {
        let p = QuantizePipeline {
            source: PathBuf::from("/tmp/model-f16.gguf"),
            dest: PathBuf::from("/tmp/model.gguf"),
            outtype: "awq".to_string(),
            calibration: None,
        };
        let err = run_pipeline(Path::new("/tmp"), &p).await;
        assert!(err.is_err());
        assert!(err.unwrap_err().contains("no soportado"));
    }
}

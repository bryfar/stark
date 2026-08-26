use flate2::read::GzDecoder;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use tar::Archive;
use tauri::{AppHandle, Emitter};
use tokio::time::{timeout, Duration};

const WHISPER_BIN_URL: &str =
    "https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-ubuntu-x64.tar.gz";
const WHISPER_MODEL_URL: &str =
    "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceSetupStatus {
    pub whisper_binary: Option<String>,
    pub whisper_model: Option<String>,
    pub complete: bool,
    pub message: String,
    pub downloading: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceSetupProgress {
    pub stage: String, // "binary" | "model" | "done"
    pub downloaded: u64,
    pub total: u64,
    pub message: String,
}

fn data_dir() -> PathBuf {
    dirs_next::data_dir().unwrap_or_else(|| PathBuf::from("/tmp"))
}

pub fn whisper_dir() -> PathBuf {
    data_dir().join("crafter/whisper")
}

pub fn whisper_bin_path() -> PathBuf {
    whisper_dir().join("whisper-cli")
}

pub fn whisper_with_libs_dir() -> PathBuf {
    whisper_dir().join("dist")
}

pub fn whisper_model_path() -> PathBuf {
    whisper_dir().join("models/ggml-tiny.bin")
}

fn which_in_path(name: &str) -> Option<String> {
    let path_var = std::env::var("PATH").unwrap_or_default();
    for dir in path_var.split(':') {
        let candidate = Path::new(dir).join(name);
        if candidate.exists() {
            return Some(candidate.to_string_lossy().to_string());
        }
    }
    None
}

fn find_existing_binary() -> Option<String> {
    for bin in ["whisper", "whisper-cli", "whisper-cpp", "whisper.cpp"] {
        if let Some(p) = which_in_path(bin) {
            return Some(p);
        }
    }
    let with_libs = whisper_with_libs_dir().join("whisper-cli");
    if with_libs.exists() {
        return Some(with_libs.to_string_lossy().to_string());
    }
    let local = whisper_bin_path();
    if local.exists() {
        return Some(local.to_string_lossy().to_string());
    }
    None
}

pub fn current_status() -> VoiceSetupStatus {
    let binary = find_existing_binary();
    let model = if whisper_model_path().exists() {
        Some(whisper_model_path().to_string_lossy().to_string())
    } else {
        None
    };

    let complete = binary.is_some() && model.is_some();
    let message = if complete {
        "Whisper listo para usar".to_string()
    } else if binary.is_none() && model.is_none() {
        "Whisper no instalado. Instalalo para habilitar dictado local.".to_string()
    } else if binary.is_none() {
        "Falta el binario whisper-cli".to_string()
    } else {
        "Falta el modelo ggml-tiny.bin".to_string()
    };

    VoiceSetupStatus {
        whisper_binary: binary,
        whisper_model: model,
        complete,
        message,
        downloading: false,
    }
}

static DOWNLOAD_LOCK: OnceLock<()> = OnceLock::new();

async fn download_with_progress(
    client: &reqwest::Client,
    url: &str,
    dest: &Path,
    app: &AppHandle,
    stage: &str,
) -> Result<(), String> {
    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Error descargando {}: {}", stage, e))?;
    if !resp.status().is_success() {
        return Err(format!(
            "Error descargando {}: HTTP {}",
            stage,
            resp.status()
        ));
    }
    let total = resp.content_length().unwrap_or(0);

    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let mut file = tokio::fs::File::create(dest)
        .await
        .map_err(|e| format!("Error creando archivo: {}", e))?;

    let mut stream = resp.bytes_stream();
    let mut downloaded: u64 = 0;
    use futures_util::StreamExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        use tokio::io::AsyncWriteExt;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        let _ = app.emit(
            "voice-setup-progress",
            VoiceSetupProgress {
                stage: stage.to_string(),
                downloaded,
                total,
                message: format!("{}: {:.1} MB / {:.1} MB", stage, downloaded as f64 / 1e6, total as f64 / 1e6),
            },
        );
    }
    Ok(())
}

fn extract_tar_gz(tar_path: &Path, dest_dir: &Path) -> Result<(), String> {
    let file = fs::File::open(tar_path).map_err(|e| e.to_string())?;
    let gz = GzDecoder::new(file);
    let mut archive = Archive::new(gz);
    archive
        .unpack(dest_dir)
        .map_err(|e| format!("Error extrayendo whisper: {}", e))?;
    Ok(())
}

pub async fn ensure_whisper_installed(app: AppHandle) -> Result<VoiceSetupStatus, String> {
    let _lock = DOWNLOAD_LOCK.get_or_init(|| ());
    let client = reqwest::Client::new();

    let mut binary = find_existing_binary();
    let mut model = if whisper_model_path().exists() {
        Some(whisper_model_path().to_string_lossy().to_string())
    } else {
        None
    };

    if binary.is_none() {
        let dir = whisper_dir();
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let tar_path = dir.join("whisper-bin.tar.gz");
        let extract_dir = dir.join("extract");
        fs::create_dir_all(&extract_dir).map_err(|e| e.to_string())?;

        download_with_progress(&client, WHISPER_BIN_URL, &tar_path, &app, "whisper-cli").await?;
        extract_tar_gz(&tar_path, &extract_dir)?;
        let _ = fs::remove_file(&tar_path);

        // The tarball extracts to whisper-bin-ubuntu-x64/ containing whisper-cli + *.so libs.
        // Keep ALL files together in dist/ because whisper-cli dynamically loads its .so siblings.
        let dist = whisper_with_libs_dir();
        fs::create_dir_all(&dist).map_err(|e| e.to_string())?;
        let src_bundle = find_bundle_dir(&extract_dir).unwrap_or_else(|| extract_dir.clone());

        let mut confirmed = false;
        if let Ok(entries) = fs::read_dir(&src_bundle) {
            for entry in entries.flatten() {
                let src = entry.path();
                let name = entry.file_name();
                let dst = dist.join(&name);
                let _ = fs::copy(&src, &dst);
                if name == "whisper-cli" {
                    confirmed = true;
                }
            }
        }

        if !confirmed {
            let _ = fs::remove_dir_all(&dist);
            return Err(
                "No se encontro whisper-cli tras descargar. Reporta este bug.".to_string()
            );
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let cli_path = dist.join("whisper-cli");
            let _ = fs::set_permissions(&cli_path, fs::Permissions::from_mode(0o755));
        }

        // Cleanup extraction dir
        let _ = fs::remove_dir_all(&extract_dir);
        binary = Some(dist.join("whisper-cli").to_string_lossy().to_string());
    }

    if model.is_none() {
        let model_path = whisper_model_path();
        if let Some(parent) = model_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        download_with_progress(&client, WHISPER_MODEL_URL, &model_path, &app, "modelo").await?;
        model = Some(model_path.to_string_lossy().to_string());
    }

    Ok(VoiceSetupStatus {
        whisper_binary: binary,
        whisper_model: model,
        complete: true,
        message: "Whisper listo para usar".to_string(),
        downloading: false,
    })
}

fn find_bundle_dir(dir: &Path) -> Option<PathBuf> {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let candidate = path.join("whisper-cli");
                if candidate.exists() {
                    return Some(path);
                }
                if let Some(found) = find_bundle_dir(&path) {
                    return Some(found);
                }
            }
        }
    }
    None
}

pub async fn transcribe(
    wav_path: &Path,
    binary: &Path,
    model: &Path,
) -> Result<String, String> {
    // whisper-cli writes <wav_path>.txt next to the audio when using -otxt.
    // Set the working directory to the binary's dir so its .so libs resolve.
    let bin_dir = binary.parent().unwrap_or_else(|| Path::new("/tmp"));
    let output = timeout(
        Duration::from_secs(120),
        tokio::process::Command::new(binary)
            .current_dir(bin_dir)
            .arg("-m")
            .arg(model)
            .arg("-f")
            .arg(wav_path)
            .arg("-otxt")
            .output(),
    )
    .await
    .map_err(|_| "La transcripcion excedio el limite de 2 minutos".to_string())?
    .map_err(|e| format!("Error ejecutando whisper: {}", e))?;

    if output.status.success() {
        let txt_file = wav_path.with_extension("txt");
        if txt_file.exists() {
            let text = fs::read_to_string(&txt_file).map_err(|e| e.to_string())?;
            let _ = fs::remove_file(&txt_file);
            Ok(text.trim().to_string())
        } else {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Whisper fallo: {}", stderr))
    }
}

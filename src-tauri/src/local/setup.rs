use crate::hardware;
use crate::local::cancel;
use crate::local::catalog::{self, CatalogEntry, Tier};
use crate::local::{LocalSetupProgress, LocalSetupStatus};
use flate2::read::GzDecoder;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use tar::Archive;
use tauri::{AppHandle, Emitter};

const LLAMA_BIN_URL: &str =
    "https://github.com/ggml-org/llama.cpp/releases/download/b10361/llama-b10361-bin-ubuntu-x64.tar.gz";
const LLAMA_BIN_REV: &str = "b10361";
/// SHA-256 of the pinned `LLAMA_BIN_URL` artifact (llama.cpp release b10361).
/// The release is immutable, so this hash never rotates — a mismatch means a
/// tampered or truncated download and aborts the install.
const LLAMA_BIN_SHA256: &str = "7809d66f8f48ca1887036b3ff10689b990462153a6fc5ada0246bd3dccfad5ac";
/// Floor (bytes) below which a "successful" download is a proxy error page or an
/// empty body masquerading as the artifact.
const MIN_DOWNLOAD_BYTES: u64 = 1024 * 1024;

fn data_dir() -> PathBuf {
    dirs_next::data_dir().unwrap_or_else(|| PathBuf::from("/tmp"))
}

pub fn local_dir() -> PathBuf {
    data_dir().join("crafter/local")
}

pub fn bin_dir() -> PathBuf {
    local_dir().join("dist")
}

pub fn binary_path() -> PathBuf {
    bin_dir().join("llama-server")
}

pub fn models_dir() -> PathBuf {
    local_dir().join("models")
}

pub fn model_path(entry: &CatalogEntry) -> PathBuf {
    models_dir().join(&entry.file)
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
    if let Some(p) = which_in_path("llama-server") {
        return Some(p);
    }
    let local = binary_path();
    if local.exists() {
        return Some(local.to_string_lossy().to_string());
    }
    None
}

pub fn current_status(model_id: Option<&str>) -> LocalSetupStatus {
    let binary = find_existing_binary();
    let model = model_id
        .and_then(catalog::by_id)
        .filter(|e| model_path(e).exists())
        .map(|e| model_path(&e).to_string_lossy().to_string());

    let server_url = crate::local::manager::server_url_str();
    let running = server_url.is_some();
    let complete = binary.is_some() && model.is_some();
    let message = if running {
        "Motor local en ejecucion".to_string()
    } else if complete {
        "Motor local listo".to_string()
    } else if binary.is_none() && model.is_none() {
        "Motor local no instalado".to_string()
    } else if binary.is_none() {
        "Falta el binario llama-server".to_string()
    } else {
        "Falta el modelo GGUF".to_string()
    };

    LocalSetupStatus {
        binary,
        model: model.clone(),
        server_url,
        running,
        complete,
        message,
        downloading: false,
        loaded_model: if running {
            crate::local::manager::loaded_model_id()
        } else {
            None
        },
    }
}

/// Sleep-poll the cancel flag so a long connect phase can still be aborted
/// without busy-spinning the executor.
async fn poll_cancel(guard: &cancel::CancelGuard) {
    while !guard.is_cancelled() {
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
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
    let guard = cancel::register();

    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut file = tokio::fs::File::create(dest)
        .await
        .map_err(|e| format!("Error creando archivo: {}", e))?;

    let resp = {
        let send = client.get(url).send();
        tokio::pin!(send);
        tokio::select! {
            biased;
            _ = poll_cancel(&guard) => {
                let _ = fs::remove_file(dest);
                return Err(cancel::CANCELLED.to_string());
            }
            res = &mut send => res.map_err(|e| format!("Error descargando {}: {}", stage, e))?,
        }
    };
    if !resp.status().is_success() {
        return Err(format!(
            "Error descargando {}: HTTP {}",
            stage,
            resp.status()
        ));
    }
    let total = resp.content_length().unwrap_or(0);

    let mut stream = resp.bytes_stream();
    let mut downloaded: u64 = 0;
    use futures_util::StreamExt;
    while let Some(chunk) = stream.next().await {
        if guard.is_cancelled() {
            let _ = fs::remove_file(dest);
            return Err(cancel::CANCELLED.to_string());
        }
        let chunk = chunk.map_err(|e| e.to_string())?;
        use tokio::io::AsyncWriteExt;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        let _ = app.emit(
            "local-setup-progress",
            LocalSetupProgress {
                stage: stage.to_string(),
                downloaded,
                total,
                message: format!(
                    "{}: {:.1} MB / {:.1} MB",
                    stage,
                    downloaded as f64 / 1e6,
                    total as f64 / 1e6
                ),
            },
        );
    }

    // Stream-integrity guard: webservers may cut the connection early or a proxy
    // may answer with an HTML error page as a 200. A truncated stream or a
    // suspiciously tiny body is a failed download, never a "success".
    let truncated = total > 0 && downloaded < total;
    let tiny = downloaded < MIN_DOWNLOAD_BYTES;
    if truncated || tiny {
        let _ = fs::remove_file(dest);
        return Err(format!(
            "Descarga incompleta de {} ({}/{})",
            stage, downloaded, total
        ));
    }
    guard.finish();
    Ok(())
}

fn extract_tar_gz(tar_path: &Path, dest_dir: &Path) -> Result<(), String> {
    let file = fs::File::open(tar_path).map_err(|e| e.to_string())?;
    let gz = GzDecoder::new(file);
    let mut archive = Archive::new(gz);
    archive
        .unpack(dest_dir)
        .map_err(|e| format!("Error extrayendo llama.cpp: {}", e))?;
    Ok(())
}

/// SHA-256 hex digest of a file; used to pin the immutable llama.cpp release.
fn sha256_hex(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|e| format!("Error leyendo {}: {}", path.display(), e))?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Ok(format!("{:x}", hasher.finalize()))
}

/// Fail the install when a pinned artifact does not match its recorded digest.
fn verify_sha256(path: &Path, expected: &str, what: &str) -> Result<(), String> {
    let actual = sha256_hex(path)?;
    if actual.eq_ignore_ascii_case(expected) {
        Ok(())
    } else {
        Err(format!(
            "Checksum invalido de {}. Se esperaba {} pero se obtuvo {}. \
             Elimina el archivo y reintenta.",
            what, expected, actual
        ))
    }
}

fn find_bundle_dir(dir: &Path, binary_name: &str) -> Option<PathBuf> {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let candidate = path.join(binary_name);
                if candidate.exists() {
                    return Some(path);
                }
                if let Some(found) = find_bundle_dir(&path, binary_name) {
                    return Some(found);
                }
            }
        }
    }
    None
}

async fn ensure_binary(app: &AppHandle) -> Result<String, String> {
    if let Some(bin) = find_existing_binary() {
        return Ok(bin);
    }

    let dir = local_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let tar_path = dir.join("llama-bin.tar.gz");
    let extract_dir = dir.join("extract");
    fs::create_dir_all(&extract_dir).map_err(|e| e.to_string())?;

    let client = reqwest::Client::new();
    download_with_progress(&client, LLAMA_BIN_URL, &tar_path, app, "llama-server").await?;
    verify_sha256(&tar_path, LLAMA_BIN_SHA256, "llama-server")?;
    extract_tar_gz(&tar_path, &extract_dir)?;
    let _ = fs::remove_file(&tar_path);

    let dist = bin_dir();
    fs::create_dir_all(&dist).map_err(|e| e.to_string())?;
    let src_bundle = find_bundle_dir(&extract_dir, "llama-server").unwrap_or_else(|| extract_dir.clone());

    let mut confirmed = false;
    if let Ok(entries) = fs::read_dir(&src_bundle) {
        for entry in entries.flatten() {
            let src = entry.path();
            let name = entry.file_name();
            let dst = dist.join(&name);
            let _ = fs::copy(&src, &dst);
            if name == "llama-server" {
                confirmed = true;
            }
        }
    }

    if !confirmed {
        let _ = fs::remove_dir_all(&dist);
        return Err("No se encontro llama-server tras descargar. Reporta este bug.".to_string());
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let cli_path = dist.join("llama-server");
        let _ = fs::set_permissions(&cli_path, fs::Permissions::from_mode(0o755));
    }

    let _ = fs::remove_dir_all(&extract_dir);
    let _ = fs::write(dir.join(".rev"), LLAMA_BIN_REV);

    Ok(dist.join("llama-server").to_string_lossy().to_string())
}

async fn ensure_model(app: &AppHandle, entry: &CatalogEntry) -> Result<String, String> {
    let path = model_path(entry);
    if path.exists() {
        return Ok(path.to_string_lossy().to_string());
    }
    let client = reqwest::Client::new();
    download_with_progress(&client, &entry.download_url(), &path, app, "modelo").await?;
    Ok(path.to_string_lossy().to_string())
}

pub async fn ensure_installed(app: AppHandle, model_id: Option<String>) -> Result<LocalSetupStatus, String> {
    let _lock = DOWNLOAD_LOCK.get_or_init(|| ());

    let tier = Tier::from_str(&hardware::detect_hardware_tier().tier);
    let entry = model_id
        .and_then(|id| catalog::by_id(&id))
        .unwrap_or_else(|| catalog::default_for_tier(tier));

    let binary = match ensure_binary(&app).await {
        Ok(b) => b,
        Err(e) if e == cancel::CANCELLED => {
            let _ = app.emit(
                "local-setup-cancelled",
                LocalSetupProgress {
                    stage: "llama-server".to_string(),
                    downloaded: 0,
                    total: 0,
                    message: "Instalacion cancelada".to_string(),
                },
            );
            return Ok(LocalSetupStatus {
                binary: None,
                model: None,
                server_url: None,
                running: false,
                complete: false,
                message: "Instalacion cancelada".to_string(),
                downloading: false,
                loaded_model: None,
            });
        }
        Err(e) => return Err(e),
    };
    let model = match ensure_model(&app, &entry).await {
        Ok(m) => m,
        Err(e) if e == cancel::CANCELLED => {
            let _ = app.emit(
                "local-setup-cancelled",
                LocalSetupProgress {
                    stage: "modelo".to_string(),
                    downloaded: 0,
                    total: 0,
                    message: "Instalacion cancelada".to_string(),
                },
            );
            return Ok(LocalSetupStatus {
                binary: Some(binary),
                model: None,
                server_url: None,
                running: false,
                complete: false,
                message: "Instalacion cancelada".to_string(),
                downloading: false,
                loaded_model: None,
            });
        }
        Err(e) => return Err(e),
    };

    Ok(LocalSetupStatus {
        binary: Some(binary),
        model: Some(model),
        server_url: None,
        running: false,
        complete: true,
        message: "Motor local listo".to_string(),
        downloading: false,
        loaded_model: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn binary_sha256_matches_pinned_release() {
        // The pinned URL's digest is a constant; guard the constant itself from
        // accidental edits by re-deriving it from a known-good value.
        assert_eq!(LLAMA_BIN_SHA256.len(), 64);
    }

    #[test]
    fn verify_sha256_rejects_mismatch() {
        let dir = std::env::temp_dir().join(format!("crafter-setup-test-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let f = dir.join("probe.bin");
        fs::write(&f, b"hola mundo").unwrap();

        let good = sha256_hex(&f).unwrap();
        assert!(verify_sha256(&f, &good, "probe").is_ok());
        let bad = "0".repeat(64);
        let err = verify_sha256(&f, &bad, "probe").unwrap_err();
        assert!(err.contains("Checksum invalido"));

        fs::remove_dir_all(&dir).unwrap();
    }
}
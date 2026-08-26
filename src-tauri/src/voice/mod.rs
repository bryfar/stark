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

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

pub struct SendStream(pub cpal::Stream);
unsafe impl Send for SendStream {}
unsafe impl Sync for SendStream {}

pub struct VoiceState {
    pub stream: Option<SendStream>,
    pub is_listening: bool,
}

static VOICE_STATE: std::sync::OnceLock<std::sync::Mutex<VoiceState>> = std::sync::OnceLock::new();

fn get_voice_state() -> &'static std::sync::Mutex<VoiceState> {
    VOICE_STATE.get_or_init(|| {
        std::sync::Mutex::new(VoiceState {
            stream: None,
            is_listening: false,
        })
    })
}


fn write_wav_file(path: &Path, samples: &[i16], sample_rate: u32) -> Result<(), String> {
    use std::fs::File;
    use std::io::Write;

    let mut file = File::create(path).map_err(|e| format!("No se pudo crear archivo WAV: {}", e))?;

    let num_channels = 1u16;
    let bits_per_sample = 16u16;
    let byte_rate = sample_rate * num_channels as u32 * (bits_per_sample as u32 / 8);
    let block_align = num_channels * (bits_per_sample / 8);
    let subchunk2_size = samples.len() as u32 * 2;
    let chunk_size = 36 + subchunk2_size;

    file.write_all(b"RIFF").map_err(|e| e.to_string())?;
    file.write_all(&chunk_size.to_le_bytes()).map_err(|e| e.to_string())?;
    file.write_all(b"WAVE").map_err(|e| e.to_string())?;

    file.write_all(b"fmt ").map_err(|e| e.to_string())?;
    file.write_all(&16u32.to_le_bytes()).map_err(|e| e.to_string())?;
    file.write_all(&1u16.to_le_bytes()).map_err(|e| e.to_string())?;
    file.write_all(&num_channels.to_le_bytes()).map_err(|e| e.to_string())?;
    file.write_all(&sample_rate.to_le_bytes()).map_err(|e| e.to_string())?;
    file.write_all(&byte_rate.to_le_bytes()).map_err(|e| e.to_string())?;
    file.write_all(&block_align.to_le_bytes()).map_err(|e| e.to_string())?;
    file.write_all(&bits_per_sample.to_le_bytes()).map_err(|e| e.to_string())?;

    file.write_all(b"data").map_err(|e| e.to_string())?;
    file.write_all(&subchunk2_size.to_le_bytes()).map_err(|e| e.to_string())?;

    for &sample in samples {
        file.write_all(&sample.to_le_bytes()).map_err(|e| e.to_string())?;
    }

    Ok(())
}

async fn process_and_transcribe(samples: Vec<f32>, app: AppHandle) -> Result<(), String> {
    let pcm_samples: Vec<i16> = samples
        .iter()
        .map(|&x| {
            let clamped = x.clamp(-1.0, 1.0);
            if clamped < 0.0 {
                (clamped * 32768.0) as i16
            } else {
                (clamped * 32767.0) as i16
            }
        })
        .collect();

    let temp_dir = std::env::temp_dir();
    let r: u32 = rand::random();
    let wav_path = temp_dir.join(format!("stark_continuous_{}_{}.wav", std::process::id(), r));

    write_wav_file(&wav_path, &pcm_samples, 16000)?;

    let status = current_status();
    let binary = status.whisper_binary.ok_or_else(|| "Binario de Whisper no disponible".to_string())?;
    let model = status.whisper_model.ok_or_else(|| "Modelo de Whisper no disponible".to_string())?;

    let text = transcribe(&wav_path, Path::new(&binary), Path::new(&model)).await?;

    let _ = fs::remove_file(&wav_path);

    if !text.trim().is_empty() {
        println!("[VAD] Transcripción: {}", text);
        let _ = app.emit("voice-speech-processed", text);
    }

    Ok(())
}

#[tauri::command]
pub fn start_continuous_listening(app: AppHandle) -> Result<(), String> {
    let mut state = get_voice_state().lock().unwrap();
    if state.is_listening {
        return Ok(());
    }

    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| "No se encontró ningún dispositivo de entrada de audio".to_string())?;

    let config = device
        .default_input_config()
        .map_err(|e| format!("Error en config de entrada: {}", e))?;

    let sample_rate = config.sample_rate().0;
    let channels = config.channels();
    let sample_format = config.sample_format();

    let (tx, rx) = std::sync::mpsc::channel::<Vec<f32>>();

    let app_handle = app.clone();
    std::thread::spawn(move || {
        let mut speech_buffer = Vec::new();
        let mut in_speech = false;
        let mut silence_chunks = 0;
        let mut speech_chunks = 0;

        let rms_threshold: f32 = 0.015;
        let silence_chunks_threshold: usize = 15;
        let min_speech_chunks: usize = 3;

        let chunk_size = (sample_rate as f32 * channels as f32 * 0.1) as usize;
        let mut current_chunk = Vec::with_capacity(chunk_size);

        while let Ok(samples) = rx.recv() {
            current_chunk.extend(samples);
            while current_chunk.len() >= chunk_size {
                let chunk: Vec<f32> = current_chunk.drain(..chunk_size).collect();

                let mut mono = Vec::new();
                for frame in chunk.chunks(channels as usize) {
                    let avg: f32 = frame.iter().sum::<f32>() / (frame.len() as f32);
                    mono.push(avg);
                }

                let target_rate = 16000.0;
                let ratio = target_rate / (sample_rate as f64);
                let mut resampled = Vec::new();
                let mut index = 0.0;
                while index < mono.len() as f64 {
                    let i = index.floor() as usize;
                    let f = index - index.floor();
                    if i + 1 < mono.len() {
                        let val = mono[i] * (1.0 - f as f32) + mono[i + 1] * (f as f32);
                        resampled.push(val);
                    } else if i < mono.len() {
                        resampled.push(mono[i]);
                    }
                    index += 1.0 / ratio;
                }

                let sum_sq: f32 = resampled.iter().map(|&x| x * x).sum();
                let rms = (sum_sq / resampled.len() as f32).sqrt();

                let is_active = rms > rms_threshold;

                if is_active {
                    silence_chunks = 0;
                    if !in_speech {
                        speech_chunks += 1;
                        if speech_chunks >= min_speech_chunks {
                            in_speech = true;
                        }
                    }
                } else {
                    speech_chunks = 0;
                    if in_speech {
                        silence_chunks += 1;
                        if silence_chunks >= silence_chunks_threshold {
                            in_speech = false;
                            let audio_to_transcribe = speech_buffer.clone();
                            speech_buffer.clear();

                            let app_clone = app_handle.clone();
                            tokio::spawn(async move {
                                if let Err(e) = process_and_transcribe(audio_to_transcribe, app_clone).await {
                                    eprintln!("[VAD] Error transcribiendo: {}", e);
                                }
                            });
                        }
                    }
                }

                if in_speech || (!in_speech && speech_chunks > 0) {
                    speech_buffer.extend_from_slice(&resampled);
                }
            }
        }
    });

    let error_callback = |err| eprintln!("Error en stream de audio: {}", err);

    let stream = match sample_format {
        cpal::SampleFormat::F32 => device.build_input_stream(
            &config.into(),
            move |data: &[f32], _| {
                let _ = tx.send(data.to_vec());
            },
            error_callback,
            None,
        ),
        cpal::SampleFormat::I16 => device.build_input_stream(
            &config.into(),
            move |data: &[i16], _| {
                let f32_data: Vec<f32> = data.iter().map(|&x| x as f32 / 32768.0).collect();
                let _ = tx.send(f32_data);
            },
            error_callback,
            None,
        ),
        cpal::SampleFormat::U16 => device.build_input_stream(
            &config.into(),
            move |data: &[u16], _| {
                let f32_data: Vec<f32> = data
                    .iter()
                    .map(|&x| (x as f32 - 32768.0) / 32768.0)
                    .collect();
                let _ = tx.send(f32_data);
            },
            error_callback,
            None,
        ),
        _ => return Err("Formato de audio no soportado".to_string()),
    }
    .map_err(|e| format!("Error construyendo stream: {}", e))?;

    stream.play().map_err(|e| format!("Error reproduciendo stream: {}", e))?;

    state.stream = Some(SendStream(stream));
    state.is_listening = true;

    Ok(())
}

#[tauri::command]
pub fn stop_continuous_listening() -> Result<(), String> {
    let mut state = get_voice_state().lock().unwrap();
    state.stream = None;
    state.is_listening = false;
    Ok(())
}


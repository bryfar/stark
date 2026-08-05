pub mod hardware;
pub mod providers;
pub mod repo;
pub mod sandbox;
pub mod skills;
pub mod storage;

use hardware::{detect_hardware_tier, HardwareInfo};
use providers::{
    types::{
        LocalModelInfo, ProviderConfig, ProviderSavePayload, SendChatPayload,
    },
    AnthropicProvider, GeminiProvider, OpenAICompatibleProvider, Provider,
};
use repo::{
    apply_edit,
    indexer::{index_directory, FileNode},
    ApplyEditPayload, EditResult,
};
use sandbox::{execute_sandboxed_command, ExecutionResult, SandboxMode};
use skills::{get_skills, loader::SkillInfo, read_skill_content};
use std::path::Path;
use storage::{
    delete_provider, get_provider, load_api_key, load_providers, parse_kind, preset_providers,
    save_api_key, save_providers, upsert_provider, unlock_storage,
};
use storage::{load_encrypted_value, save_encrypted_value};
use tauri::AppHandle;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("¡Hola, {}! Bienvenido a Crafter Linux Agent.", name)
}

#[tauri::command]
fn repo_index(workspace_path: String) -> Result<Vec<FileNode>, String> {
    let path = Path::new(&workspace_path);
    index_directory(path)
}

#[tauri::command]
fn edit_apply(payload: ApplyEditPayload) -> Result<EditResult, String> {
    apply_edit(payload)
}

#[tauri::command]
async fn crypto_unlock(passphrase: String) -> Result<bool, String> {
    let passphrase = passphrase.clone();
    tauri::async_runtime::spawn_blocking(move || unlock_storage(&passphrase))
        .await
        .map_err(|e| format!("Error en tarea de desbloqueo: {}", e))?
}

#[tauri::command]
fn storage_save(key: String, value: String) -> Result<bool, String> {
    save_encrypted_value(&key, &value)
}

#[tauri::command]
fn storage_load(key: String) -> Result<String, String> {
    load_encrypted_value(&key)
}

#[tauri::command]
fn hardware_detect() -> HardwareInfo {
    detect_hardware_tier()
}

#[tauri::command]
fn skills_list(workspace_path: String) -> Vec<SkillInfo> {
    get_skills(&workspace_path)
}

#[tauri::command]
fn skills_read(file_path: String) -> Result<String, String> {
    read_skill_content(&file_path)
}

#[tauri::command]
async fn terminal_execute(
    app: AppHandle,
    cmd_str: String,
    workspace_path: String,
    perimeter_mode: bool,
    timeout_secs: u64,
) -> Result<ExecutionResult, String> {
    let mode = if perimeter_mode {
        SandboxMode::Perimeter
    } else {
        SandboxMode::SynchronizedCopy
    };
    execute_sandboxed_command(&cmd_str, &workspace_path, mode, timeout_secs, app).await
}

#[tauri::command]
async fn send_chat_message(app: AppHandle, payload: SendChatPayload) -> Result<(), String> {
    let provider_name = payload.provider.to_lowercase();
    tokio::spawn(async move {
        match provider_name.as_str() {
            "anthropic" => {
                let _ = AnthropicProvider.chat_stream(payload, app).await;
            }
            "gemini" => {
                let _ = GeminiProvider.chat_stream(payload, app).await;
            }
            _ => {
                let config = get_provider(&provider_name).ok().flatten();
                match config {
                    Some(cfg) => {
                        let api_key = load_api_key(&provider_name).ok().flatten();
                        let base_url = cfg.base_url.unwrap_or_else(|| {
                            if provider_name == "ollama" {
                                "http://localhost:11434/v1".to_string()
                            } else {
                                "https://api.openai.com/v1".to_string()
                            }
                        });
                        let adapter = OpenAICompatibleProvider {
                            base_url,
                            api_key,
                        };
                        let _ = adapter.chat_stream(payload, app).await;
                    }
                    None => {
                        let base_url = if provider_name == "ollama" {
                            "http://localhost:11434/v1".to_string()
                        } else {
                            "https://api.openai.com/v1".to_string()
                        };
                        let adapter = OpenAICompatibleProvider {
                            base_url,
                            api_key: None,
                        };
                        let _ = adapter.chat_stream(payload, app).await;
                    }
                }
            }
        }
    });
    Ok(())
}

#[tauri::command]
fn providers_list() -> Result<Vec<ProviderConfig>, String> {
    match load_providers() {
        Ok(list) => Ok(list),
        Err(_) => Ok(preset_providers()),
    }
}

#[tauri::command]
fn providers_seed_presets() -> Result<Vec<ProviderConfig>, String> {
    let presets = preset_providers();
    save_providers(&presets)?;
    Ok(presets)
}

#[tauri::command]
fn providers_save(payload: ProviderSavePayload) -> Result<ProviderConfig, String> {
    let kind = parse_kind(&payload.kind);
    let config = ProviderConfig {
        id: payload.id.clone(),
        name: payload.name,
        kind,
        base_url: payload.base_url,
        models: payload.models,
        needs_api_key: payload.needs_api_key,
    };
    upsert_provider(config.clone())?;
    if let Some(api_key) = payload.api_key {
        if !api_key.trim().is_empty() {
            save_api_key(&config.id, &api_key)?;
        }
    }
    Ok(config)
}

#[tauri::command]
fn providers_delete(id: String) -> Result<bool, String> {
    delete_provider(&id)
}

#[tauri::command]
async fn providers_detect_models(provider_id: String) -> Result<Vec<LocalModelInfo>, String> {
    let config = get_provider(&provider_id)
        .ok()
        .flatten()
        .ok_or_else(|| "Proveedor no encontrado".to_string())?;

    let client = reqwest::Client::new();
    let base = config
        .base_url
        .unwrap_or_else(|| "http://localhost:11434".to_string());
    let base = base.trim_end_matches('/').to_string();

    if config.kind == providers::types::ProviderKind::Ollama {
        let url = format!("{}/api/tags", base);
        let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        let mut models = Vec::new();
        if let Some(arr) = json["models"].as_array() {
            for m in arr {
                if let Some(name) = m["name"].as_str() {
                    let size = m["size"].as_u64().unwrap_or(0);
                    let size_label = if size == 0 {
                        "".to_string()
                    } else if size >= 1_000_000_000 {
                        format!("{:.1} GB", size as f64 / 1_000_000_000.0)
                    } else {
                        format!("{:.0} MB", size as f64 / 1_000_000.0)
                    };
                    models.push(LocalModelInfo {
                        name: name.to_string(),
                        size: size_label,
                    });
                }
            }
        }
        Ok(models)
    } else {
        let url = format!("{}/models", base);
        let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        let mut models = Vec::new();
        if let Some(arr) = json["data"].as_array() {
            for m in arr {
                if let Some(id) = m["id"].as_str() {
                    models.push(LocalModelInfo {
                        name: id.to_string(),
                        size: "".to_string(),
                    });
                }
            }
        }
        Ok(models)
    }
}

#[tauri::command]
async fn providers_install_model(model_name: String) -> Result<String, String> {
    let output = tokio::process::Command::new("ollama")
        .args(["pull", &model_name])
        .output()
        .await
        .map_err(|e| format!("Ollama no disponible en el sistema: {}", e))?;

    if output.status.success() {
        Ok(format!("Modelo {} instalado correctamente", model_name))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Error instalando {}: {}", model_name, stderr))
    }
}

#[tauri::command]
async fn voice_transcribe(audio_base64: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose};
    let decoded = general_purpose::STANDARD
        .decode(&audio_base64)
        .map_err(|e| format!("Error decodificando audio base64: {}", e))?;
    
    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join("crafter_voice.wav");
    std::fs::write(&temp_file, &decoded)
        .map_err(|e| format!("Error guardando archivo de audio temporal: {}", e))?;

    let output = tokio::process::Command::new("whisper")
        .arg(&temp_file)
        .arg("--output_format")
        .arg("txt")
        .output()
        .await;

    match output {
        Ok(out) if out.status.success() => {
            let txt_file = temp_file.with_extension("txt");
            if txt_file.exists() {
                let text = std::fs::read_to_string(&txt_file)
                    .map_err(|e| format!("Error leyendo transcripción: {}", e))?;
                let _ = std::fs::remove_file(txt_file);
                let _ = std::fs::remove_file(temp_file);
                Ok(text.trim().to_string())
            } else {
                let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                let _ = std::fs::remove_file(temp_file);
                Ok(stdout.trim().to_string())
            }
        }
        _ => {
            let _ = std::fs::remove_file(temp_file);
            Err("Whisper no disponible en el sistema. Instala whisper para dictado.".to_string())
        }
    }
}

#[tauri::command]
async fn terminal_execute_ssh(
    cmd_str: String,
    host: String,
    timeout_secs: u64,
) -> Result<ExecutionResult, String> {
    let output_future = tokio::process::Command::new("ssh")
        .arg("-o")
        .arg("StrictHostKeyChecking=no")
        .arg(&host)
        .arg(&cmd_str)
        .output();

    match tokio::time::timeout(tokio::time::Duration::from_secs(timeout_secs), output_future).await {
        Ok(Ok(output)) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            Ok(ExecutionResult {
                exit_code: output.status.code().unwrap_or(-1),
                stdout,
                stderr,
            })
        }
        Ok(Err(e)) => Err(format!("Error ejecutando comando SSH: {}", e)),
        Err(_) => Err(format!("El comando SSH excedió el tiempo límite de {} segundos", timeout_secs)),
    }
}

#[tauri::command]
fn workspace_multi_root_save(folders: Vec<String>) -> Result<(), String> {
    let folders_str = serde_json::to_string(&folders).map_err(|e| e.to_string())?;
    save_encrypted_value("workspace_multi_root", &folders_str)?;
    Ok(())
}

#[tauri::command]
fn workspace_multi_root_load() -> Result<Vec<String>, String> {
    match load_encrypted_value("workspace_multi_root") {
        Ok(val) => {
            let folders: Vec<String> = serde_json::from_str(&val).map_err(|e| e.to_string())?;
            Ok(folders)
        }
        Err(_) => Ok(Vec::new()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            send_chat_message,
            repo_index,
            edit_apply,
            crypto_unlock,
            storage_save,
            storage_load,
            hardware_detect,
            terminal_execute,
            skills_list,
            skills_read,
            providers_list,
            providers_seed_presets,
            providers_save,
            providers_delete,
            providers_detect_models,
            providers_install_model,
            voice_transcribe,
            terminal_execute_ssh,
            workspace_multi_root_save,
            workspace_multi_root_load
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

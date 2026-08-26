pub mod hardware;
pub mod providers;
pub mod repo;
pub mod sandbox;
pub mod skills;
pub mod storage;
pub mod agent;
pub mod cli;
pub mod crash;
pub mod eventsink;
pub mod local;
pub mod voice;


use hardware::{detect_hardware_tier, HardwareInfo};
use providers::types::{LocalModelInfo, ProviderConfig, ProviderSavePayload, SendChatPayload};
use repo::{
    apply_edit,
    indexer::{index_directory, FileNode},
    ApplyEditPayload, EditResult,
};
use sandbox::ExecutionResult;
use skills::{
    create_agent, create_plugin, create_skill, get_skills, loader::SkillInfo, list_agents,
    list_plugins, read_skill_content, AssetScope,
};
use std::path::Path;
use storage::{
    delete_provider, get_provider, load_providers, parse_kind, preset_providers,
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
fn git_undo(workspace_path: String) -> Result<String, String> {
    repo::git::git_undo_last(&workspace_path)
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
fn skills_create(
    name: String,
    description: String,
    content: String,
    scope: String,
    workspace_path: String,
) -> Result<String, String> {
    create_skill(&name, &description, &content, &parse_scope(&scope), &workspace_path)
}

#[tauri::command]
fn agents_list(workspace_path: String) -> Vec<skills::AgentInfo> {
    list_agents(&workspace_path)
}

#[tauri::command]
fn plugins_list(workspace_path: String) -> Vec<skills::PluginInfo> {
    list_plugins(&workspace_path)
}

#[tauri::command]
fn agents_create(
    name: String,
    description: String,
    instructions: String,
    scope: String,
    workspace_path: String,
) -> Result<String, String> {
    create_agent(&name, &description, &instructions, &parse_scope(&scope), &workspace_path)
}

#[tauri::command]
fn plugins_create(
    name: String,
    description: String,
    prompt_template: String,
    icon: String,
    scope: String,
    workspace_path: String,
) -> Result<String, String> {
    create_plugin(
        &name,
        &description,
        &prompt_template,
        &icon,
        &parse_scope(&scope),
        &workspace_path,
    )
}

fn parse_scope(scope: &str) -> AssetScope {
    if scope.eq_ignore_ascii_case("global") {
        AssetScope::Global
    } else {
        AssetScope::Workspace
    }
}

#[tauri::command]
async fn terminal_execute(
    app: AppHandle,
    cmd_str: String,
    workspace_path: String,
    perimeter_mode: bool,
    _timeout_secs: u64,
) -> Result<ExecutionResult, String> {
    use crate::agent::{AgentRuntime, permissions::modes::PermissionMode};
    use crate::eventsink::WebviewSink;
    
    let permission_mode = if perimeter_mode {
        PermissionMode::Auto
    } else {
        PermissionMode::Manual
    };

    let runtime = AgentRuntime::new(std::sync::Arc::new(WebviewSink::new(app)));
    match runtime.run_turn(cmd_str, workspace_path, permission_mode, 5).await {
        Ok(msg) => Ok(ExecutionResult {
            exit_code: 0,
            stdout: msg,
            stderr: String::new(),
        }),
        Err(err) => Ok(ExecutionResult {
            exit_code: 1,
            stdout: String::new(),
            stderr: err,
        }),
    }
}

#[tauri::command]
async fn send_chat_message(app: AppHandle, payload: SendChatPayload) -> Result<(), String> {
    let chat_id_opt = payload.chat_id.clone();
    let app_clone = app.clone();
    tokio::spawn(async move {
        let _ = crate::providers::route_chat_stream(payload, app).await;
        if let Some(chat_id) = chat_id_opt {
            crate::providers::generate_chat_title_background(chat_id, app_clone);
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

    let output = tokio::process::Command::new("voxtype")
        .arg("transcribe")
        .arg(&temp_file)
        .output()
        .await;

    match output {
        Ok(out) if out.status.success() => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let _ = std::fs::remove_file(temp_file);
            Ok(stdout.trim().to_string())
        }
        _ => {
            let _ = std::fs::remove_file(temp_file);
            Err("Voxtype no disponible en el sistema. Instala voxtype para dictado local.".to_string())
        }
    }
}

/// Grabación de audio por el sistema (sin depender del permiso del webview).
///
/// El webview WebKitGTK puede denegar getUserMedia sin ofrecer diálogo; esta
/// ruta captura directo del servidor de audio (PipeWire/PulseAudio) con
/// `parecord` y cae a `ffmpeg` si no está. Devuelve el WAV en base64 con la
/// misma forma que espera `voice_transcribe`.
#[tauri::command]
async fn voice_record(seconds: Option<u32>) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose};
    use std::process::Stdio;

    let seconds = seconds.unwrap_or(10).clamp(1, 120) as u64;
    let temp_dir = std::env::temp_dir();
    let wav_path = temp_dir.join(format!("stark_voice_{}.wav", std::process::id()));
    let wav_str = wav_path.to_string_lossy().to_string();
    let _ = std::fs::remove_file(&wav_path);

    let tool = if std::path::Path::new("/usr/bin/parecord").exists()
        || tokio::process::Command::new("sh")
            .arg("-c")
            .arg("command -v parecord")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
            .map(|s| s.success())
            .unwrap_or(false)
    {
        "parecord"
    } else {
        "ffmpeg"
    };

    // timeout -s INT: parecord necesita SIGINT para cerrar el header WAV bien.
    let mut command = match tool {
        "parecord" => {
            let mut c = tokio::process::Command::new("timeout");
            c.args([
                "--signal=INT",
                &seconds.to_string(),
                "parecord",
                "--file-format=wav",
                "--channels=1",
                "--rate=16000",
                &wav_str,
            ]);
            c
        }
        _ => {
            let mut c = tokio::process::Command::new("ffmpeg");
            c.args([
                "-y",
                "-loglevel", "error",
                "-f", "pulse",
                "-i", "default",
                "-t", &seconds.to_string(),
                "-ac", "1",
                "-ar", "16000",
                &wav_str,
            ]);
            c
        }
    };

    let output = command
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .status()
        .await
        .map_err(|e| format!("No se pudo lanzar {} : {}", tool, e))?;

    let meta = std::fs::metadata(&wav_path);
    let recorded_ok = meta.as_ref().map(|m| m.len() > 44).unwrap_or(false);

    if !recorded_ok {
        let _ = std::fs::remove_file(&wav_path);
        return Err(format!(
            "{} no capturó audio (exit {:?}). Verifica que el micrófono exista y esté activo.",
            tool,
            output.code()
        ));
    }

    let bytes = std::fs::read(&wav_path).map_err(|e| format!("Error leyendo grabación: {}", e))?;
    let _ = std::fs::remove_file(&wav_path);
    Ok(general_purpose::STANDARD.encode(bytes))
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

#[tauri::command]
fn graft_build(workspace_path: String) -> Result<String, String> {
    crate::repo::graft::build_graft_graph(&workspace_path)
}

#[tauri::command]
fn send_desktop_notification(title: String, body: String) -> Result<(), String> {
    std::process::Command::new("notify-send")
        .arg(&title)
        .arg(&body)
        .status()
        .map_err(|e| format!("Failed to send notification: {}", e))?;
    Ok(())
}

/// Capture crash context from the system (journalctl, coredumpctl, memory)
/// and return the formatted markdown body. Does NOT file the issue — the
/// frontend decides whether to file or just display the diagnosis.
#[tauri::command]
fn crash_diagnose() -> Result<String, String> {
    let ctx = crash::capture::capture_crash_context();
    Ok(crash::capture::format_issue_body(&ctx))
}

/// File a GitHub issue with previously captured crash context.
#[tauri::command]
fn crash_file_issue(repo: String) -> Result<String, String> {
    let ctx = crash::capture::capture_crash_context();
    crash::capture::file_github_issue(&ctx, &repo)
}

/// Return all usage records (JSONL).
#[tauri::command]
fn usage_records() -> Result<Vec<storage::records::UsageRecord>, String> {
    storage::records::read_records()
}

/// Return usage aggregated by model.
#[tauri::command]
fn usage_by_model() -> Result<Vec<storage::records::TokenSummary>, String> {
    storage::records::usage_by_model()
}

/// Return usage aggregated by operation type.
#[tauri::command]
fn usage_by_op() -> Result<Vec<storage::records::TokenSummary>, String> {
    storage::records::usage_by_op()
}

/// Materialize bundled skills to ~/.local/share/stark/skills/.
#[tauri::command]
fn skills_install_bundled() -> Result<Vec<String>, String> {
    skills::bundled::materialize_skills()
}

/// Create symlinks from external harness skill dirs to stark's bundled skills.
#[tauri::command]
fn skills_install_symlinks(targets: Option<Vec<String>>) -> Result<(Vec<String>, Vec<String>), String> {
    skills::bundled::install_symlinks(targets)
}

fn has_appindicator() -> bool {
    if let Ok(output) = std::process::Command::new("ldconfig").arg("-p").output() {
        let list = String::from_utf8_lossy(&output.stdout);
        list.contains("libayatana-appindicator3.so") || list.contains("libappindicator3.so")
    } else {
        std::path::Path::new("/usr/lib/libayatana-appindicator3.so.1").exists()
            || std::path::Path::new("/usr/lib/libappindicator3.so.1").exists()
            || std::path::Path::new("/usr/lib64/libayatana-appindicator3.so.1").exists()
            || std::path::Path::new("/usr/lib64/libappindicator3.so.1").exists()
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Dispatch headless ANTES de levantar el webview: `stark prompt ...` corre
    // el agente en la terminal y sale, sin Builder ni ventana.
    if let Some(code) = cli::dispatch_from_args(std::env::args().collect()) {
        std::process::exit(code);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let server = crate::agent::rpc::RpcServer::new(handle, 8124);
            tauri::async_runtime::spawn(async move {
                server.start().await;
            });

            // Build Tray Icon only if appindicator is available
            if has_appindicator() {
                use tauri::menu::{MenuBuilder, MenuItemBuilder};
                use tauri::tray::TrayIconBuilder;
                use tauri::Manager;

                if let Ok(toggle_i) = MenuItemBuilder::new("Mostrar/Ocultar Stark").id("toggle").build(app) {
                    if let Ok(quit_i) = MenuItemBuilder::new("Salir").id("quit").build(app) {
                        if let Ok(menu) = MenuBuilder::new(app).items(&[&toggle_i, &quit_i]).build() {
                            let mut builder = TrayIconBuilder::new()
                                .menu(&menu)
                                .on_menu_event(|app, event| {
                                    match event.id().as_ref() {
                                        "toggle" => {
                                            if let Some(window) = app.get_webview_window("main") {
                                                if let Ok(visible) = window.is_visible() {
                                                    if visible {
                                                        let _ = window.hide();
                                                    } else {
                                                        let _ = window.show();
                                                        let _ = window.set_focus();
                                                    }
                                                }
                                            }
                                        }
                                        "quit" => app.exit(0),
                                        _ => {}
                                    }
                                });

                            if let Some(icon) = app.default_window_icon().cloned() {
                                builder = builder.icon(icon);
                            }

                            let _ = builder.build(app);
                        }
                    }
                }
            } else {
                println!("Warning: appindicator library not found. Skipping tray icon.");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            send_chat_message,
            repo_index,
            edit_apply,
            git_undo,
            crypto_unlock,
            storage_save,
            storage_load,
            hardware_detect,
            terminal_execute,
            skills_list,
            skills_read,
            skills_create,
            agents_list,
            agents_create,
            plugins_list,
            plugins_create,
            providers_list,
            providers_seed_presets,
            providers_save,
            providers_delete,
            providers_detect_models,
            providers_install_model,
            voice_transcribe,
            voice_record,
            terminal_execute_ssh,
            workspace_multi_root_save,
            workspace_multi_root_load,
            graft_build,
            send_desktop_notification,
            crash_diagnose,
            crash_file_issue,
            usage_records,
            usage_by_model,
            usage_by_op,
                        skills_install_bundled,
            skills_install_symlinks,
            voice::start_continuous_listening,
            voice::stop_continuous_listening
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

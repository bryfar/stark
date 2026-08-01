pub mod hardware;
pub mod providers;
pub mod repo;
pub mod sandbox;
pub mod storage;

use hardware::{detect_hardware_tier, HardwareInfo};
use providers::{
    types::SendChatPayload, AnthropicProvider, GeminiProvider, OllamaProvider, OpenAIProvider,
    Provider,
};
use repo::{
    apply_edit,
    indexer::{index_directory, FileNode},
    ApplyEditPayload, EditResult,
};
use sandbox::{execute_sandboxed_command, ExecutionResult, SandboxMode};
use std::path::Path;
use storage::{load_encrypted_value, save_encrypted_value, unlock_storage};
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
fn crypto_unlock(passphrase: String) -> Result<bool, String> {
    unlock_storage(&passphrase)
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
            "openai" => {
                let _ = OpenAIProvider.chat_stream(payload, app).await;
            }
            "anthropic" => {
                let _ = AnthropicProvider.chat_stream(payload, app).await;
            }
            "gemini" => {
                let _ = GeminiProvider.chat_stream(payload, app).await;
            }
            _ => {
                let _ = OllamaProvider.chat_stream(payload, app).await;
            }
        }
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            send_chat_message,
            repo_index,
            edit_apply,
            crypto_unlock,
            storage_save,
            storage_load,
            hardware_detect,
            terminal_execute
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

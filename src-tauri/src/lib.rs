pub mod providers;
pub mod repo;

use providers::{
    types::SendChatPayload, AnthropicProvider, GeminiProvider, OllamaProvider, OpenAIProvider,
    Provider,
};
use repo::{
    apply_edit,
    indexer::{index_directory, FileNode},
    ApplyEditPayload, EditResult,
};
use std::path::Path;
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
            edit_apply
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub mod providers;

use providers::{
    types::SendChatPayload, AnthropicProvider, GeminiProvider, OllamaProvider, OpenAIProvider,
    Provider,
};
use tauri::AppHandle;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("¡Hola, {}! Bienvenido a Crafter Linux Agent.", name)
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
        .invoke_handler(tauri::generate_handler![greet, send_chat_message])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

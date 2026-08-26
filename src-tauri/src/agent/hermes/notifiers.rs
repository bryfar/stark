use reqwest::Client;
use serde_json::json;

pub struct HermesNotifier;

impl HermesNotifier {
    /// Envía una notificación a un Webhook de Discord.
    pub async fn notify_discord(webhook_url: &str, message: &str) -> Result<(), String> {
        let client = Client::new();
        let payload = json!({
            "content": message
        });

        let resp = client.post(webhook_url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Error de conexión con Discord: {}", e))?;

        if resp.status().is_success() {
            Ok(())
        } else {
            Err(format!("Discord respondió con error: {}", resp.status()))
        }
    }

    /// Envía una notificación a un Webhook de Slack.
    pub async fn notify_slack(webhook_url: &str, message: &str) -> Result<(), String> {
        let client = Client::new();
        let payload = json!({
            "text": message
        });

        let resp = client.post(webhook_url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Error de conexión con Slack: {}", e))?;

        if resp.status().is_success() {
            Ok(())
        } else {
            Err(format!("Slack respondió con error: {}", resp.status()))
        }
    }

    /// Envía un mensaje a través de un bot de Telegram.
    pub async fn notify_telegram(bot_token: &str, chat_id: &str, message: &str) -> Result<(), String> {
        let client = Client::new();
        let url = format!("https://api.telegram.org/bot{}/sendMessage", bot_token);
        let payload = json!({
            "chat_id": chat_id,
            "text": message
        });

        let resp = client.post(&url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Error de conexión con Telegram: {}", e))?;

        if resp.status().is_success() {
            Ok(())
        } else {
            Err(format!("Telegram respondió con error: {}", resp.status()))
        }
    }
}

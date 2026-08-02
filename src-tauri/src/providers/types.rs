use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StreamEvent {
    pub token: Option<String>,
    pub usage: Option<TokenUsage>,
    pub error: Option<String>,
    pub done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SendChatPayload {
    pub provider: String,
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub reasoning: bool,
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProviderConfig {
    pub id: String,
    pub name: String,
    pub kind: ProviderKind,
    pub base_url: Option<String>,
    pub models: Vec<String>,
    pub needs_api_key: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum ProviderKind {
    #[default]
    #[serde(rename = "openai_compatible")]
    OpenAICompatible,
    Anthropic,
    Gemini,
    Ollama,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LocalModelInfo {
    pub name: String,
    pub size: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProviderSavePayload {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub base_url: Option<String>,
    pub models: Vec<String>,
    pub needs_api_key: bool,
    pub api_key: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chat_message_serialization() {
        let msg = ChatMessage {
            role: "user".to_string(),
            content: "Hola Crafter".to_string(),
        };
        let json = serde_json::to_string(&msg).unwrap();
        let deserialized: ChatMessage = serde_json::from_str(&json).unwrap();
        assert_eq!(msg, deserialized);
    }

    #[test]
    fn test_stream_event_token_usage() {
        let usage = TokenUsage {
            prompt_tokens: 10,
            completion_tokens: 15,
            total_tokens: 25,
        };
        let event = StreamEvent {
            token: Some("chunk".to_string()),
            usage: Some(usage.clone()),
            error: None,
            done: false,
        };
        assert_eq!(event.usage.unwrap().total_tokens, 25);
    }

    #[test]
    fn test_send_chat_payload_deserialization() {
        let json_data = r#"{
            "provider": "ollama",
            "model": "qwen2.5:1.5b",
            "messages": [{"role": "user", "content": "test"}],
            "reasoning": true,
            "api_key": null
        }"#;
        let payload: SendChatPayload = serde_json::from_str(json_data).unwrap();
        assert_eq!(payload.provider, "ollama");
        assert_eq!(payload.model, "qwen2.5:1.5b");
        assert!(payload.reasoning);
        assert_eq!(payload.messages.len(), 1);
    }
    #[test]
    fn test_provider_config_serialization() {
        let config = ProviderConfig {
            id: "openrouter".to_string(),
            name: "OpenRouter".to_string(),
            kind: ProviderKind::OpenAICompatible,
            base_url: Some("https://openrouter.ai/api/v1".to_string()),
            models: vec!["gpt-4o".to_string()],
            needs_api_key: true,
        };
        let json = serde_json::to_string(&config).unwrap();
        let deserialized: ProviderConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(config, deserialized);
        assert!(json.contains("openai_compatible"));
    }
}

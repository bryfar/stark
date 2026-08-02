pub mod types;

use async_trait::async_trait;
use types::{SendChatPayload, StreamEvent, TokenUsage};
use tauri::{AppHandle, Emitter};

#[async_trait]
pub trait Provider: Send + Sync {
    async fn chat_stream(
        &self,
        payload: SendChatPayload,
        app: AppHandle,
    ) -> Result<(), String>;
}

pub struct OllamaProvider;
pub struct OpenAIProvider;
pub struct AnthropicProvider;
pub struct GeminiProvider;
pub struct OpenAICompatibleProvider {
    pub base_url: String,
    pub api_key: Option<String>,
}

#[async_trait]
impl Provider for OllamaProvider {
    async fn chat_stream(
        &self,
        payload: SendChatPayload,
        app: AppHandle,
    ) -> Result<(), String> {
        let client = reqwest::Client::new();
        let body = serde_json::json!({
            "model": payload.model,
            "messages": payload.messages,
            "stream": false,
        });

        let res = client
            .post("http://localhost:11434/api/chat")
            .json(&body)
            .send()
            .await;

        match res {
            Ok(resp) => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    let content = json["message"]["content"]
                        .as_str()
                        .unwrap_or("")
                        .to_string();
                    let prompt_tokens = json["prompt_eval_count"].as_u64().unwrap_or(0) as u32;
                    let completion_tokens = json["eval_count"].as_u64().unwrap_or(0) as u32;

                    let _ = app.emit("chat-token", StreamEvent {
                        token: Some(content),
                        usage: Some(TokenUsage {
                            prompt_tokens,
                            completion_tokens,
                            total_tokens: prompt_tokens + completion_tokens,
                        }),
                        error: None,
                        done: false,
                    });
                }
            }
            Err(err) => {
                let _ = app.emit("chat-token", StreamEvent {
                    token: None,
                    usage: None,
                    error: Some(format!("Error conectando a Ollama local: {}", err)),
                    done: false,
                });
            }
        }

        let _ = app.emit("chat-token", StreamEvent {
            token: None,
            usage: None,
            error: None,
            done: true,
        });

        Ok(())
    }
}

#[async_trait]
impl Provider for OpenAIProvider {
    async fn chat_stream(
        &self,
        payload: SendChatPayload,
        app: AppHandle,
    ) -> Result<(), String> {
        let api_key = payload.api_key.unwrap_or_default();
        let client = reqwest::Client::new();
        let body = serde_json::json!({
            "model": payload.model,
            "messages": payload.messages,
        });

        let res = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .json(&body)
            .send()
            .await;

        match res {
            Ok(resp) => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(err_msg) = json["error"]["message"].as_str() {
                        let _ = app.emit("chat-token", StreamEvent {
                            token: None,
                            usage: None,
                            error: Some(err_msg.to_string()),
                            done: false,
                        });
                    } else if let Some(content) = json["choices"][0]["message"]["content"].as_str() {
                        let prompt_tokens = json["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32;
                        let completion_tokens = json["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32;

                        let _ = app.emit("chat-token", StreamEvent {
                            token: Some(content.to_string()),
                            usage: Some(TokenUsage {
                                prompt_tokens,
                                completion_tokens,
                                total_tokens: prompt_tokens + completion_tokens,
                            }),
                            error: None,
                            done: false,
                        });
                    }
                }
            }
            Err(err) => {
                let _ = app.emit("chat-token", StreamEvent {
                    token: None,
                    usage: None,
                    error: Some(format!("OpenAI request failed: {}", err)),
                    done: false,
                });
            }
        }

        let _ = app.emit("chat-token", StreamEvent {
            token: None,
            usage: None,
            error: None,
            done: true,
        });

        Ok(())
    }
}

#[async_trait]
impl Provider for AnthropicProvider {
    async fn chat_stream(
        &self,
        payload: SendChatPayload,
        app: AppHandle,
    ) -> Result<(), String> {
        let api_key = payload.api_key.unwrap_or_default();
        let client = reqwest::Client::new();
        let body = serde_json::json!({
            "model": payload.model,
            "max_tokens": 4096,
            "messages": payload.messages,
        });

        let res = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&body)
            .send()
            .await;

        match res {
            Ok(resp) => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(content) = json["content"][0]["text"].as_str() {
                        let prompt_tokens = json["usage"]["input_tokens"].as_u64().unwrap_or(0) as u32;
                        let completion_tokens = json["usage"]["output_tokens"].as_u64().unwrap_or(0) as u32;

                        let _ = app.emit("chat-token", StreamEvent {
                            token: Some(content.to_string()),
                            usage: Some(TokenUsage {
                                prompt_tokens,
                                completion_tokens,
                                total_tokens: prompt_tokens + completion_tokens,
                            }),
                            error: None,
                            done: false,
                        });
                    }
                }
            }
            Err(err) => {
                let _ = app.emit("chat-token", StreamEvent {
                    token: None,
                    usage: None,
                    error: Some(format!("Anthropic request failed: {}", err)),
                    done: false,
                });
            }
        }

        let _ = app.emit("chat-token", StreamEvent {
            token: None,
            usage: None,
            error: None,
            done: true,
        });

        Ok(())
    }
}

#[async_trait]
impl Provider for GeminiProvider {
    async fn chat_stream(
        &self,
        payload: SendChatPayload,
        app: AppHandle,
    ) -> Result<(), String> {
        let api_key = payload.api_key.unwrap_or_default();
        let client = reqwest::Client::new();
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            payload.model, api_key
        );

        let parts: Vec<serde_json::Value> = payload
            .messages
            .iter()
            .map(|m| serde_json::json!({ "text": m.content }))
            .collect();

        let body = serde_json::json!({
            "contents": [{ "parts": parts }]
        });

        let res = client.post(&url).json(&body).send().await;

        match res {
            Ok(resp) => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(content) = json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                        let prompt_tokens = json["usageMetadata"]["promptTokenCount"].as_u64().unwrap_or(0) as u32;
                        let completion_tokens = json["usageMetadata"]["candidatesTokenCount"].as_u64().unwrap_or(0) as u32;

                        let _ = app.emit("chat-token", StreamEvent {
                            token: Some(content.to_string()),
                            usage: Some(TokenUsage {
                                prompt_tokens,
                                completion_tokens,
                                total_tokens: prompt_tokens + completion_tokens,
                            }),
                            error: None,
                            done: false,
                        });
                    }
                }
            }
            Err(err) => {
                let _ = app.emit("chat-token", StreamEvent {
                    token: None,
                    usage: None,
                    error: Some(format!("Gemini request failed: {}", err)),
                    done: false,
                });
            }
        }

        let _ = app.emit("chat-token", StreamEvent {
            token: None,
            usage: None,
            error: None,
            done: true,
        });

        Ok(())
    }
}

#[async_trait]
impl Provider for OpenAICompatibleProvider {
    async fn chat_stream(
        &self,
        payload: SendChatPayload,
        app: AppHandle,
    ) -> Result<(), String> {
        let api_key = self
            .api_key
            .clone()
            .or(payload.api_key)
            .unwrap_or_default();
        let base = self.base_url.trim_end_matches('/').to_string();
        let url = format!("{}/chat/completions", base);
        let client = reqwest::Client::new();
        let body = serde_json::json!({
            "model": payload.model,
            "messages": payload.messages,
        });

        let mut req = client.post(&url).json(&body);
        if !api_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", api_key));
        }

        let res = req.send().await;

        match res {
            Ok(resp) => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(err_msg) = json["error"]["message"].as_str() {
                        let _ = app.emit("chat-token", StreamEvent {
                            token: None,
                            usage: None,
                            error: Some(format!("{}: {}", base, err_msg)),
                            done: false,
                        });
                    } else if let Some(content) = json["choices"][0]["message"]["content"].as_str() {
                        let prompt_tokens = json["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32;
                        let completion_tokens = json["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32;

                        let _ = app.emit("chat-token", StreamEvent {
                            token: Some(content.to_string()),
                            usage: Some(TokenUsage {
                                prompt_tokens,
                                completion_tokens,
                                total_tokens: prompt_tokens + completion_tokens,
                            }),
                            error: None,
                            done: false,
                        });
                    }
                }
            }
            Err(err) => {
                let _ = app.emit("chat-token", StreamEvent {
                    token: None,
                    usage: None,
                    error: Some(format!("{} request failed: {}", base, err)),
                    done: false,
                });
            }
        }

        let _ = app.emit("chat-token", StreamEvent {
            token: None,
            usage: None,
            error: None,
            done: true,
        });

        Ok(())
    }
}

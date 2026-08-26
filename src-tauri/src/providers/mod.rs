pub mod abort;
pub mod cache;
pub mod router;
pub mod types;

use async_trait::async_trait;
use futures_util::StreamExt;

use types::{SendChatPayload, StreamEvent, TokenUsage};
use tauri::{AppHandle, Emitter};

use crate::storage::usage::record_usage;
use crate::storage::records;

/// Persist token usage for the daily free-tier budget AND append a JSONL record
/// for the usage panel. Fire-and-forget: failures never block the response.
fn track_usage(total: u32, provider: &str, model: &str, session_id: Option<&str>) {
    if total > 0 {
        let _ = record_usage(total as u64);
        // Best-effort JSONL record — split into prompt/completion would require
        // caller changes, so we record total as completion (prompt is unknown here).
        let _ = records::append_record(provider, model, "chat", 0, total, session_id);
    }
}

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
pub struct LocalProvider;
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
            "stream": true,
        });

        let resp = match client
            .post("http://localhost:11434/api/chat")
            .json(&body)
            .send()
            .await {
                Ok(r) => r,
                Err(e) => {
                    let _ = app.emit("chat-token", StreamEvent {
                        token: None,
                        usage: None,
                        error: Some(format!("Error connecting to Ollama local: {}", e)),
                        done: false,
            chat_id: None,
                    });
                    return Ok(());
                }
            };

        if !resp.status().is_success() {
            if let Ok(err_json) = resp.json::<serde_json::Value>().await {
                if let Some(err_msg) = err_json["error"]["message"].as_str() {
                    let _ = app.emit("chat-token", StreamEvent {
                        token: None,
                        usage: None,
                        error: Some(err_msg.to_string()),
                        done: false,
            chat_id: None,
                    });
                }
            }
            let _ = app.emit("chat-token", StreamEvent {
                token: None,
                usage: None,
                error: None,
                done: true,
            chat_id: None,
            });
            return Ok(());
        }

        let mut stream = resp.bytes_stream();
        while let Some(item) = stream.next().await {
            match item {
                Ok(chunk) => {
                    if let Ok(text) = std::str::from_utf8(&chunk) {
                        for line in text.lines() {
                            if line.starts_with("data: ") {
                                let data = &line[6..];
                                if data.trim() == "[DONE]" {
                                    let _ = app.emit("chat-token", StreamEvent {
                                        token: None,
                                        usage: None,
                                        error: None,
                                        done: true,
            chat_id: None,
                                    });
                                    return Ok(());
                                }
                                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                                    if let Some(content) = json["message"]["content"].as_str() {
                                        let _ = app.emit("chat-token", StreamEvent {
                                            token: Some(content.to_string()),
                                            usage: None,
                                            error: None,
                                            done: false,
            chat_id: None,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    let _ = app.emit("chat-token", StreamEvent {
                        token: None,
                        usage: None,
                        error: Some(format!("Stream error: {}", e)),
                        done: false,
            chat_id: None,
                    });
                }
            }
        }
        // Ensure done emitted if loop exits unexpectedly
        let _ = app.emit("chat-token", StreamEvent {
            token: None,
            usage: None,
            error: None,
            done: true,
            chat_id: None,
        });
        Ok(())
    }
}

#[async_trait]
impl Provider for LocalProvider {
    async fn chat_stream(
        &self,
        payload: SendChatPayload,
        app: AppHandle,
    ) -> Result<(), String> {
        let entry = match crate::local::catalog::by_id(&payload.model) {
            Some(entry) => entry,
            None => {
                let _ = app.emit("chat-token", StreamEvent {
                    token: None,
                    usage: None,
                    error: Some(format!("Modelo local desconocido: {}", payload.model)),
                    done: false,
            chat_id: None,
                });
                let _ = app.emit("chat-token", StreamEvent {
                    token: None,
                    usage: None,
                    error: None,
                    done: true,
            chat_id: None,
                });
                return Ok(());
            }
        };
        let base_url = match crate::local::manager::ensure_running(&entry).await {
            Ok(url) => url,
            Err(e) => {
                let _ = app.emit("chat-token", StreamEvent {
                    token: None,
                    usage: None,
                    error: Some(format!("Motor local: {}", e)),
                    done: false,
            chat_id: None,
                });
                let _ = app.emit("chat-token", StreamEvent {
                    token: None,
                    usage: None,
                    error: None,
                    done: true,
            chat_id: None,
                });
                return Ok(());
            }
        };
        let adapter = OpenAICompatibleProvider {
            base_url,
            api_key: None,
        };
        adapter.chat_stream(payload, app).await
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
            "stream": true,
        });

        let resp = match client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .json(&body)
            .send()
            .await {
                Ok(r) => r,
                Err(e) => {
                    let _ = app.emit("chat-token", StreamEvent {
                        token: None,
                        usage: None,
                        error: Some(format!("OpenAI request failed: {}", e)),
                        done: false,
            chat_id: None,
                    });
                    return Ok(());
                }
            };

        if !resp.status().is_success() {
            // Attempt to parse error body
            if let Ok(err_json) = resp.json::<serde_json::Value>().await {
                if let Some(err_msg) = err_json["error"]["message"].as_str() {
                    let _ = app.emit("chat-token", StreamEvent {
                        token: None,
                        usage: None,
                        error: Some(err_msg.to_string()),
                        done: false,
            chat_id: None,
                    });
                }
            }
            let _ = app.emit("chat-token", StreamEvent {
                token: None,
                usage: None,
                error: None,
                done: true,
            chat_id: None,
            });
            return Ok(());
        }

        let mut stream = resp.bytes_stream();
        while let Some(item) = stream.next().await {
            match item {
                Ok(chunk) => {
                    if let Ok(text) = std::str::from_utf8(&chunk) {
                        for line in text.lines() {
                            if line.starts_with("data: ") {
                                let data = &line[6..];
                                if data.trim() == "[DONE]" {
                                    // End of stream
                                    let _ = app.emit("chat-token", StreamEvent {
                                        token: None,
                                        usage: None,
                                        error: None,
                                        done: true,
            chat_id: None,
                                    });
                                    return Ok(());
                                }
                                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                                    if let Some(content) = json["choices"][0]["delta"]["content"].as_str() {
                                        let _ = app.emit("chat-token", StreamEvent {
                                            token: Some(content.to_string()),
                                            usage: None,
                                            error: None,
                                            done: false,
            chat_id: None,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
                Err(_) => {}
            }
        }
        // Ensure done emitted if loop exits unexpectedly
        let _ = app.emit("chat-token", StreamEvent {
            token: None,
            usage: None,
            error: None,
            done: true,
            chat_id: None,
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
        let api_key = payload.api_key.clone().unwrap_or_default();
        let chat_id = payload.chat_id.clone();
        let client = reqwest::Client::new();
        let body = serde_json::json!({
            "model": payload.model,
            "max_tokens": 4096,
            "messages": payload.messages,
        });

        let done = StreamEvent {
            token: None, usage: None, error: None, done: true, chat_id: chat_id.clone(),
        };

        let res = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&body)
            .send()
            .await;

        let resp = match res {
            Ok(r) => r,
            Err(e) => {
                let _ = app.emit("chat-token", StreamEvent {
                    token: None,
                    usage: None,
                    error: Some(format!("Anthropic request failed: {}", e)),
                    done: false,
                    chat_id: chat_id.clone(),
                });
                let _ = app.emit("chat-token", done);
                return Ok(());
            }
        };

        if !resp.status().is_success() {
            if let Ok(err_json) = resp.json::<serde_json::Value>().await {
                if let Some(err_msg) = err_json["error"]["message"].as_str() {
                    let _ = app.emit("chat-token", StreamEvent {
                        token: None,
                        usage: None,
                        error: Some(err_msg.to_string()),
                        done: false,
                        chat_id: chat_id.clone(),
                    });
                }
            }
            let _ = app.emit("chat-token", done);
            return Ok(());
        }

        let mut stream = resp.bytes_stream();
        while let Some(item) = stream.next().await {
            if abort::should_abort(&payload) {
                let _ = app.emit("chat-token", done);
                return Ok(());
            }
            match item {
                Ok(chunk) => {
                    if let Ok(text) = std::str::from_utf8(&chunk) {
                        for line in text.lines() {
                            if line.starts_with("data: ") {
                                let data = &line[6..];
                                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                                    if json["type"] == "content_block_delta" {
                                        if let Some(content) = json["delta"]["text"].as_str() {
                                            let _ = app.emit("chat-token", StreamEvent {
                                                token: Some(content.to_string()),
                                                usage: None,
                                                error: None,
                                                done: false,
                                                chat_id: chat_id.clone(),
                                            });
                                        }
                                    } else if json["type"] == "message_stop" {
                                        let _ = app.emit("chat-token", done);
                                        return Ok(());
                                    }
                                }
                            }
                        }
                    }
                }
                Err(_) => {}
            }
        }
        // Ensure done emitted if loop exits unexpectedly
        let _ = app.emit("chat-token", done);
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
        let api_key = payload.api_key.clone().unwrap_or_default();
        let client = reqwest::Client::new();
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            payload.model, api_key
        );
        let chat_id = payload.chat_id.clone();

        let parts: Vec<serde_json::Value> = payload
            .messages
            .iter()
            .map(|m| serde_json::json!({ "text": m.content }))
            .collect();

        let body = serde_json::json!({
            "contents": [{ "parts": parts }]
        });

        let done = StreamEvent {
            token: None, usage: None, error: None, done: true, chat_id: chat_id.clone(),
        };
        if abort::should_abort(&payload) {
            let _ = app.emit("chat-token", done);
            return Ok(());
        }

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
                            chat_id: chat_id.clone(),
                        });
                        track_usage(prompt_tokens + completion_tokens, "gemini", &payload.model, chat_id.as_deref());
                    }
                }
            }
            Err(err) => {
                let _ = app.emit("chat-token", StreamEvent {
                    token: None,
                    usage: None,
                    error: Some(format!("Gemini request failed: {}", err)),
                    done: false,
                    chat_id: chat_id.clone(),
                });
            }
        }

        let _ = app.emit("chat-token", done);

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
        // Abortable streams (payload carries a chat_id) are sent in SSE mode so
        // the loop can poll the abort flag per chunk and stop mid-generation.
        // Non-tracked requests keep the existing one-shot behaviour.
        if abort::is_tracked(&payload) {
            return self.stream_tracked(&payload, app).await;
        }

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

        // Cached identical request → emit the stored answer without any network.
        let messages_json = serde_json::to_string(&payload.messages).unwrap_or_default();
        if let Some(cached) = cache::get(&base, &payload.model, &messages_json) {
            let _ = app.emit("chat-token", StreamEvent {
                token: Some(cached),
                usage: None,
                error: None,
                done: false,
            chat_id: None,
            });
            let _ = app.emit("chat-token", StreamEvent {
                token: None,
                usage: None,
                error: None,
                done: true,
            chat_id: None,
            });
            return Ok(());
        }

        // Check if API key is required but missing
        let needs_key = base.contains("openrouter.ai")
            || base.contains("api.openai.com")
            || base.contains("api.anthropic.com")
            || base.contains("api.groq.com")
            || base.contains("api.mistral.ai")
            || base.contains("opencode.ai/zen");

        let is_pollinations = base.contains("pollinations");
        let is_openrouter = base.contains("openrouter");

        // Pollinations free tier: no API key needed, but requires model-level auth hint
        // and has per-IP rate limits (~5 req/min). OpenRouter free models: key optional.

        if needs_key && api_key.is_empty() && !is_openrouter {
            let provider_name = if base.contains("opencode.ai/zen") {
                "OpenCode Zen"
            } else if base.contains("openai") {
                "OpenAI"
            } else if base.contains("groq") {
                "Groq"
            } else if base.contains("mistral") {
                "Mistral"
            } else if base.contains("anthropic") {
                "Anthropic"
            } else {
                "este proveedor"
            };
            let _ = app.emit("chat-token", StreamEvent {
                token: None,
                usage: None,
                error: Some(format!(
                    "API key requerida para {}. \
                     Abre el selector de modelos y guarda tu API key para {}.",
                    provider_name, provider_name
                )),
                done: false,
            chat_id: None,
            });
            let _ = app.emit("chat-token", StreamEvent {
                token: None,
                usage: None,
                error: None,
                done: true,
            chat_id: None,
            });
            return Ok(());
        }

        // Retry loop (spec Q4): on transient errors (429/5xx/network) wait with
        // backoff (15s/30s/60s) and retry, cancellable by the caller dropping the
        // future. Auth/bad-request errors are surfaced immediately, no retry.
        let mut attempt = 0usize;
        let (status, json) = loop {
            let mut req = client.post(&url).json(&body);

            // Pollinations: no auth header, but add model alias resolution headers
            if is_pollinations {
                req = req.header("X-Client", "crafter-linux-agent");
            } else if !api_key.is_empty() {
                req = req.header("Authorization", format!("Bearer {}", api_key));
            }

            // OpenRouter free tier: if no key, send "public" fallback key
            if is_openrouter && api_key.is_empty() {
                req = req.header("Authorization", "Bearer public");
            }

            // OpenRouter-specific headers
            if base.contains("openrouter.ai") {
                req = req.header("HTTP-Referer", "https://github.com/crafter-linux-agent");
                req = req.header("X-Title", "Crafter Linux Agent");
            }

            match req.send().await {
                Ok(resp) => {
                    let status = resp.status();
                    let json = match resp.json::<serde_json::Value>().await {
                        Ok(v) => v,
                        Err(_) => serde_json::json!({}),
                    };
                    let class = router::ErrorClass::classify(status.as_u16());
                    if class.allows_fallback() && attempt < 3 {
                        attempt += 1;
                        let wait = router::backoff_seconds(attempt - 1);
                        let _ = app.emit("chat-token", StreamEvent {
                            token: None,
                            usage: None,
                            error: Some(format!(
                                "Limite o caida del servicio ({}). Reintentando en {}s...",
                                status.as_u16(),
                                wait
                            )),
                            done: false,
            chat_id: None,
                        });
                        tokio::time::sleep(std::time::Duration::from_secs(wait)).await;
                        continue;
                    }
                    break (status, json);
                }
                Err(err) => {
                    let class = router::ErrorClass::classify(0);
                    // Network errors are transient; retry up to 3 times.
                    if class.allows_fallback() && attempt < 3 {
                        attempt += 1;
                        let wait = router::backoff_seconds(attempt - 1);
                        let _ = app.emit("chat-token", StreamEvent {
                            token: None,
                            usage: None,
                            error: Some(format!(
                                "Error de red ({}). Reintentando en {}s...",
                                err, wait
                            )),
                            done: false,
            chat_id: None,
                        });
                        tokio::time::sleep(std::time::Duration::from_secs(wait)).await;
                        continue;
                    }
                    let _ = app.emit("chat-token", StreamEvent {
                        token: None,
                        usage: None,
                        error: Some(format!("{} request failed: {}", base, err)),
                        done: false,
            chat_id: None,
                    });
                    let _ = app.emit("chat-token", StreamEvent {
                        token: None,
                        usage: None,
                        error: None,
                        done: true,
                        chat_id: None,
                    });
                    return Err(format!("{} request failed: {}", base, err));
                }
            }
        };

        if !status.is_success() {
            let err_msg = json["error"]["message"].as_str().unwrap_or("Unknown provider error");
            return Err(format!("HTTP {}: {}", status.as_u16(), err_msg));
        }

        let mut cached_answer: Option<String> = None;
        let tokens = handle_chat_response(&status, &json, &base, |ev| {
            if let Some(txt) = &ev.token {
                if cached_answer.is_none() {
                    cached_answer = Some(txt.clone());
                }
            }
            let _ = app.emit("chat-token", ev);
        })
        .await;

        if let Some((prompt, completion)) = tokens {
            track_usage(
                prompt + completion,
                &payload.provider,
                &payload.model,
                payload.chat_id.as_deref(),
            );
        }

        if let Some(answer) = cached_answer {
            cache::put(&base, &payload.model, &messages_json, answer);
        }

        let _ = app.emit("chat-token", StreamEvent {
            token: None,
            usage: None,
            error: None,
            done: true,
            chat_id: None,
        });

        Ok(())
    }
}

impl OpenAICompatibleProvider {
    /// SSE streaming for abortable requests (`chat_id` present). Emits each
    /// `delta.content` chunk on `chat-token` and polls the abort flag before
    /// every chunk; an aborted stream unwinds with a clean `done`.
    async fn stream_tracked(&self, payload: &SendChatPayload, app: AppHandle) -> Result<(), String> {
        let api_key = self
            .api_key
            .clone()
            .or(payload.api_key.clone())
            .unwrap_or_default();
        let base = self.base_url.trim_end_matches('/').to_string();
        let url = format!("{}/chat/completions", base);
        let client = reqwest::Client::new();
        let is_pollinations = base.contains("pollinations");
        let is_openrouter = base.contains("openrouter");
        let chat_id = payload.chat_id.clone();

        let mut req = client
            .post(&url)
            .json(&serde_json::json!({
                "model": payload.model,
                "messages": payload.messages.clone(),
                "stream": true,
            }));

        if is_pollinations {
            req = req.header("X-Client", "crafter-linux-agent");
        } else if !api_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", api_key));
        }
        if is_openrouter && api_key.is_empty() {
            req = req.header("Authorization", "Bearer public");
        }
        if base.contains("openrouter.ai") {
            req = req.header("HTTP-Referer", "https://github.com/crafter-linux-agent");
            req = req.header("X-Title", "Crafter Linux Agent");
        }

        let done = StreamEvent {
            token: None, usage: None, error: None, done: true, chat_id: chat_id.clone(),
        };

        match req.send().await {
            Ok(resp) => {
                if !resp.status().is_success() {
                    let status = resp.status();
                    let body = resp
                        .text()
                        .await
                        .unwrap_or_else(|_| String::new());
                    let err = serde_json::from_str::<serde_json::Value>(&body)
                        .ok()
                        .and_then(|j| j["error"]["message"].as_str().map(|s| s.to_string()))
                        .unwrap_or_else(|| format!("HTTP {}", status));
                    let _ = app.emit("chat-token", StreamEvent {
                        token: None,
                        usage: None,
                        error: Some(format!("{}: {}", base, err)),
                        done: false,
                        chat_id: chat_id.clone(),
                    });
                    let _ = app.emit("chat-token", done);
                    return Ok(());
                }
                let mut stream = resp.bytes_stream();
                while let Some(item) = stream.next().await {
                    if abort::should_abort(payload) {
                        let _ = app.emit("chat-token", done);
                        return Ok(());
                    }
                    match item {
                        Ok(chunk) => {
                            if let Ok(text) = std::str::from_utf8(&chunk) {
                                for line in text.lines() {
                                    if let Some(data) = line.strip_prefix("data: ") {
                                        if data.trim() == "[DONE]" {
                                            let _ = app.emit("chat-token", done);
                                            return Ok(());
                                        }
                                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                                            if let Some(content) =
                                                json["choices"][0]["delta"]["content"].as_str()
                                            {
                                                let _ = app.emit("chat-token", StreamEvent {
                                                    token: Some(content.to_string()),
                                                    usage: None,
                                                    error: None,
                                                    done: false,
                                                    chat_id: chat_id.clone(),
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        Err(_) => {}
                    }
                }
                let _ = app.emit("chat-token", done);
                Ok(())
            }
            Err(e) => {
                let _ = app.emit("chat-token", StreamEvent {
                    token: None,
                    usage: None,
                    error: Some(format!("{} request failed: {}", base, e)),
                    done: false,
                    chat_id: chat_id.clone(),
                });
                let _ = app.emit("chat-token", done);
                Ok(())
            }
        }
    }
}

fn event_with_error(msg: String) -> StreamEvent {
    StreamEvent {
        token: None,
        usage: None,
        error: Some(msg),
        done: false,
            chat_id: None,
    }
}

/// Turn a final chat-completions response (status + body) into the `StreamEvent`s
/// that Crafter emits on `chat-token`. The `emit` callback is injected so this can
/// be tested against a mocked transport without an `AppHandle`.
///
/// `provider_base` is used for error prefixes.
/// Returns `Some((prompt_tokens, completion_tokens))` on success for usage tracking.
async fn handle_chat_response<E>(
    _status: &reqwest::StatusCode,
    json: &serde_json::Value,
    provider_base: &str,
    mut emit: E,
) -> Option<(u32, u32)>
where
    E: FnMut(StreamEvent),
{
    let err_msg = json["error"]["message"].as_str().map(|s| s.to_string());
    let err_lower = err_msg.as_ref().map(|s| s.to_lowercase());
    let auth_failed = err_lower.as_ref().map_or(false, |m| {
        m.contains("cookie")
            || m.contains("auth")
            || m.contains("invalid api key")
    });
    let rate_limited = err_lower.as_ref().map_or(false, |m| {
        m.contains("rate") || m.contains("limit")
    });

    if rate_limited {
        emit(event_with_error("Limite de peticiones alcanzado.".to_string()));
        None
    } else if auth_failed {
        emit(event_with_error(format!(
            "Error de autenticacion. Verifica tu API key en el selector de modelos."
        )));
        None
    } else if let Some(err_msg) = err_msg {
        emit(event_with_error(format!("{}: {}", provider_base, err_msg)));
        None
    } else if let Some(content) = json["choices"][0]["message"]["content"].as_str() {
        let prompt_tokens = json["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as u32;
        let completion_tokens = json["usage"]["completion_tokens"].as_u64().unwrap_or(0) as u32;
        emit(StreamEvent {
            token: Some(content.to_string()),
            usage: Some(TokenUsage {
                prompt_tokens,
                completion_tokens,
                total_tokens: prompt_tokens + completion_tokens,
            }),
            error: None,
            done: false,
            chat_id: None,
        });
        Some((prompt_tokens, completion_tokens))
    } else {
        None
    }
}

pub async fn route_chat_stream(payload: crate::providers::types::SendChatPayload, app: AppHandle) -> Result<(), String> {
    let provider_name = payload.provider.to_lowercase();
    let route = router::get_route(&provider_name);

    let mut order = route.order.clone();
    if route.zero_data_only {
        order.retain(|p| router::is_provider_zero_data(p));
    }

    if order.is_empty() {
        let err_msg = "No hay proveedores disponibles que cumplan las restricciones de la ruta.".to_string();
        let _ = app.emit("chat-token", StreamEvent {
            token: None,
            usage: None,
            error: Some(err_msg.clone()),
            done: true,
            chat_id: payload.chat_id.clone(),
        });
        return Err(err_msg);
    }

    let mut last_err = "No se pudo conectar a ningún proveedor en la ruta.".to_string();

    for (step, prov_id) in order.iter().enumerate() {
        if step > 0 && !route.allow_fallbacks {
            break;
        }

        if router::is_provider_on_cooldown(prov_id) && step + 1 < order.len() {
            continue;
        }

        let mut prov_payload = payload.clone();
        prov_payload.provider = prov_id.clone();

        let res = match prov_id.as_str() {
            "anthropic" => AnthropicProvider.chat_stream(prov_payload, app.clone()).await,
            "gemini" => GeminiProvider.chat_stream(prov_payload, app.clone()).await,
            _ => {
                let config = crate::storage::providers_store::get_provider(prov_id).ok().flatten();
                match config {
                    Some(cfg) => {
                        let api_key = crate::storage::providers_store::load_api_key(prov_id).ok().flatten();
                        let base_url = cfg.base_url.unwrap_or_else(|| {
                            if prov_id == "ollama" {
                                "http://localhost:11434/v1".to_string()
                            } else {
                                "https://api.openai.com/v1".to_string()
                            }
                        });
                        let adapter = OpenAICompatibleProvider {
                            base_url,
                            api_key,
                        };
                        adapter.chat_stream(prov_payload, app.clone()).await
                    }
                    None => {
                        let base_url = if prov_id == "ollama" {
                            "http://localhost:11434/v1".to_string()
                        } else {
                            "https://api.openai.com/v1".to_string()
                        };
                        let adapter = OpenAICompatibleProvider {
                            base_url,
                            api_key: None,
                        };
                        adapter.chat_stream(prov_payload, app.clone()).await
                    }
                }
            }
        };

        match res {
            Ok(_) => return Ok(()),
            Err(err_msg) => {
                let class = if err_msg.contains("401") || err_msg.contains("403") || err_msg.contains("Unauthorized") || err_msg.contains("key") {
                    router::ErrorClass::Auth
                } else if err_msg.contains("400") || err_msg.contains("Bad Request") {
                    router::ErrorClass::InvalidRequest
                } else {
                    router::ErrorClass::Transient
                };

                last_err = err_msg.clone();

                if class == router::ErrorClass::Auth || class == router::ErrorClass::InvalidRequest {
                    let _ = app.emit("chat-token", StreamEvent {
                        token: None,
                        usage: None,
                        error: Some(err_msg.clone()),
                        done: true,
                        chat_id: payload.chat_id.clone(),
                    });
                    return Err(err_msg);
                } else {
                    router::put_provider_on_cooldown(prov_id);
                }
            }
        }
    }

    let _ = app.emit("chat-token", StreamEvent {
        token: None,
        usage: None,
        error: Some(last_err.clone()),
        done: true,
        chat_id: payload.chat_id.clone(),
    });
    Err(last_err)
}

pub fn generate_chat_title_background(chat_id: String, app: AppHandle) {
    tokio::spawn(async move {
        // 1. Obtener la lista de chats
        let list = match crate::storage::chats::list_chats() {
            Ok(l) => l,
            Err(_) => return,
        };

        // 2. Buscar el chat actual
        let chat = match list.into_iter().find(|c| c.id == chat_id) {
            Some(c) => c,
            None => return,
        };

        // Solo generar si el título es genérico o vacío
        let current_title = chat.title.trim();
        if current_title != "Nueva conversación" && current_title != "Primera conversación" && !current_title.is_empty() {
            return;
        }

        let messages = &chat.messages;
        if messages.len() < 2 {
            return;
        }

        // 3. Crear el prompt de resumen
        let mut prompt_msgs = Vec::new();
        for msg in messages {
            prompt_msgs.push(serde_json::json!({
                "role": msg.role,
                "content": msg.content,
            }));
        }
        prompt_msgs.push(serde_json::json!({
            "role": "user",
            "content": "Resume esta conversación en un título corto y conciso (máximo 4 palabras, sin comillas, sin prefijos).",
        }));

        let client = reqwest::Client::new();
        let body = serde_json::json!({
            "model": "meta-llama/llama-3.1-8b-instruct:free",
            "messages": prompt_msgs,
            "stream": false,
        });

        let resp = match client.post("https://openrouter.ai/api/v1/chat/completions")
            .header("Authorization", "Bearer public")
            .header("HTTP-Referer", "https://github.com/crafter-linux-agent")
            .header("X-Title", "Crafter Linux Agent")
            .json(&body)
            .send()
            .await {
                Ok(r) => r,
                Err(_) => return,
            };

        if resp.status().is_success() {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let Some(title) = json["choices"][0]["message"]["content"].as_str() {
                    let mut updated_chat = chat.clone();
                    let cleaned_title = title.replace("\"", "").replace("'", "").trim().to_string();
                    if !cleaned_title.is_empty() {
                        updated_chat.title = cleaned_title;
                        let _ = crate::storage::chats::save_chat(&updated_chat);
                        let _ = app.emit("chat-title-updated", serde_json::json!({
                            "chat_id": chat_id,
                            "title": updated_chat.title,
                        }));
                    }
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn ok_chat_body(content: &str) -> serde_json::Value {
        serde_json::json!({
            "choices": [{ "message": { "content": content } }],
            "usage": { "prompt_tokens": 2, "completion_tokens": 3, "total_tokens": 5 }
        })
    }

    #[tokio::test]
    async fn handle_chat_response_emits_token_on_success() {
        let mut emitted: Vec<StreamEvent> = Vec::new();
        let body = ok_chat_body("hola desde Crafter");
        handle_chat_response(
            &reqwest::StatusCode::OK,
            &body,
            "https://test.local",
            |ev| emitted.push(ev),
        )
        .await;
        assert_eq!(emitted.len(), 1);
        assert_eq!(emitted[0].token.as_deref(), Some("hola desde Crafter"));
        assert_eq!(emitted[0].error, None);
        assert_eq!(emitted[0].usage.as_ref().unwrap().total_tokens, 5);
    }

    #[tokio::test]
    async fn handle_chat_response_emits_auth_error() {
        let mut emitted: Vec<StreamEvent> = Vec::new();
        let body = serde_json::json!({ "error": { "message": "Invalid API key" } });
        handle_chat_response(
            &reqwest::StatusCode::UNAUTHORIZED,
            &body,
            "https://test.local",
            |ev| emitted.push(ev),
        )
        .await;
        assert_eq!(emitted.len(), 1);
        assert!(emitted[0]
            .error
            .as_deref()
            .unwrap_or("")
            .contains("autenticacion"));
    }

    #[tokio::test]
    async fn transport_post_to_wiremock_and_classify() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/v1/chat/completions"))
            .respond_with(ResponseTemplate::new(200).set_body_json(ok_chat_body("capturado")))
            .mount(&server)
            .await;

        let client = reqwest::Client::new();
        let res = client
            .post(format!("{}/v1/chat/completions", server.uri()))
            .json(&serde_json::json!({ "model": "openai", "messages": [] }))
            .send()
            .await
            .unwrap();
        let status = res.status();
        let json: serde_json::Value = res.json().await.unwrap();
        assert_eq!(status.as_u16(), 200);
        assert_eq!(json["choices"][0]["message"]["content"], "capturado");
    }

    #[tokio::test]
    async fn wiremock_429_then_200_surfaces_success() {
        let server = MockServer::start().await;
        // First call returns 429, second returns 200.
        Mock::given(method("POST"))
            .and(path("/v1/chat/completions"))
            .respond_with(ResponseTemplate::new(200).set_body_json(ok_chat_body("superado")))
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .and(path("/v1/chat/completions"))
            .respond_with(ResponseTemplate::new(429))
            .up_to_n_times(1)
            .mount(&server)
            .await;

        let client = reqwest::Client::new();
        let mut events: Vec<StreamEvent> = Vec::new();

        // Simulate the retry loop: first attempt 429 -> emit retry hint; second -> success.
        let url = format!("{}/v1/chat/completions", server.uri());
        let body = serde_json::json!({ "model": "openai", "messages": [] });
        let mut attempt = 0usize;
        loop {
            let res = client.post(&url).json(&body).send().await.unwrap();
            let status = res.status();
            let json: serde_json::Value = res.json().await.unwrap();
            if status.as_u16() == 429 {
                handle_chat_response(&status, &json, "test", |ev| events.push(ev)).await;
                attempt += 1;
                if attempt >= 2 {
                    break;
                }
                continue;
            }
            handle_chat_response(&status, &json, "test", |ev| events.push(ev)).await;
            break;
        }

        let tokens: Vec<&str> = events
            .iter()
            .filter_map(|e| e.token.as_deref())
            .collect();
        assert_eq!(tokens, vec!["superado"]);
    }

    /// Live E2E smoke against a real provider endpoint. Opt-in: skipped unless
    /// `CRAFTER_LIVE_E2E_KEY` is set (the value is only used in-memory; never
    /// committed). Exercises the exact request shape + `handle_chat_response`
    /// parse path Crafter uses in production.
    #[tokio::test]
    #[ignore = "requires CRAFTER_LIVE_E2E_KEY env var; run manually"]
    async fn live_endpoint_e2e_non_streaming() {
        let key = match std::env::var("CRAFTER_LIVE_E2E_KEY") {
            Ok(k) if !k.is_empty() => k,
            _ => return, // not configured: skip silently
        };
        let url = "https://integrate.api.nvidia.com/v1/chat/completions";
        let client = reqwest::Client::new();
        let res = client
            .post(url)
            .header("Authorization", format!("Bearer {}", key))
            .json(&serde_json::json!({
                "model": "z-ai/glm-5.2",
                "messages": [{ "role": "user", "content": "Di exactamente HOLA_END2E" }],
                "max_tokens": 20,
            }))
            .send()
            .await
            .expect("endpoint reachable");
        assert_eq!(res.status().as_u16(), 200, "auth must succeed with the provided key");
        let json: serde_json::Value = res.json().await.unwrap();
        let mut events: Vec<StreamEvent> = Vec::new();
        handle_chat_response(&reqwest::StatusCode::OK, &json, url, |ev| events.push(ev)).await;
        let token = events.iter().filter_map(|e| e.token.as_deref()).next();
        assert!(token.is_some(), "expected a content token from the real endpoint");
        assert!(token.unwrap().to_lowercase().contains("hola"), "got: {:?}", token);
    }

    /// Live SSE E2E mirroring `stream_tracked`'s chunk parsing (line-based
    /// `data: ` events, `choices[0].delta.content`). Opt-in, same env key.
    #[tokio::test]
    #[ignore = "requires CRAFTER_LIVE_E2E_KEY env var; run manually"]
    async fn live_endpoint_e2e_streaming() {
        let key = match std::env::var("CRAFTER_LIVE_E2E_KEY") {
            Ok(k) if !k.is_empty() => k,
            _ => return,
        };
        let url = "https://integrate.api.nvidia.com/v1/chat/completions";
        let client = reqwest::Client::new();
        let res = client
            .post(url)
            .header("Authorization", format!("Bearer {}", key))
            .json(&serde_json::json!({
                "model": "z-ai/glm-5.2",
                "messages": [{ "role": "user", "content": "say: stream ok" }],
                "max_tokens": 20,
                "stream": true,
            }))
            .send()
            .await
            .expect("endpoint reachable");
        assert_eq!(res.status().as_u16(), 200);
        let mut stream = res.bytes_stream();
        let mut full = String::new();
        while let Some(item) = stream.next().await {
            let chunk = item.expect("body reads");
            if let Ok(text) = std::str::from_utf8(&chunk) {
                for line in text.lines() {
                    if let Some(data) = line.strip_prefix("data: ") {
                        if data.trim() == "[DONE]" {
                            break;
                        }
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(content) =
                                json["choices"][0]["delta"]["content"].as_str()
                            {
                                full.push_str(content);
                            }
                        }
                    }
                }
            }
        }
        assert!(!full.is_empty(), "expected streamed tokens from the real endpoint");
    }
}

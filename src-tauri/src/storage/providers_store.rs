use super::crypto::{decrypt_aes_gcm, encrypt_aes_gcm};
use super::get_storage_master_key;
use crate::providers::types::{ProviderConfig, ProviderKind};
use std::fs;
use std::path::PathBuf;

const PROVIDERS_KEY: &str = "providers_list";

fn provider_dir() -> PathBuf {
    PathBuf::from(".crafter_storage")
}

fn write_encrypted(key: &str, value: &str) -> Result<bool, String> {
    let master_key = get_storage_master_key()?;
    let encrypted = encrypt_aes_gcm(value.as_bytes(), &master_key)?;
    let dir = provider_dir();
    let _ = fs::create_dir_all(&dir);
    let file_path = dir.join(format!("{}.enc", key));
    fs::write(&file_path, encrypted).map_err(|e| format!("Error guardando valor cifrado: {}", e))?;
    Ok(true)
}

fn read_encrypted(key: &str) -> Result<Option<String>, String> {
    let master_key = get_storage_master_key()?;
    let file_path = provider_dir().join(format!("{}.enc", key));
    if !file_path.exists() {
        return Ok(None);
    }
    let encrypted_data = fs::read(&file_path).map_err(|e| e.to_string())?;
    let decrypted = decrypt_aes_gcm(&encrypted_data, &master_key)?;
    String::from_utf8(decrypted)
        .map(Some)
        .map_err(|e| format!("UTF-8 inválido: {}", e))
}

pub fn load_providers() -> Result<Vec<ProviderConfig>, String> {
    match read_encrypted(PROVIDERS_KEY)? {
        Some(raw) => serde_json::from_str(&raw).map_err(|e| format!("Config de proveedores corrupta: {}", e)),
        None => Ok(Vec::new()),
    }
}

pub fn save_providers(providers: &[ProviderConfig]) -> Result<bool, String> {
    let raw = serde_json::to_string(providers).map_err(|e| e.to_string())?;
    write_encrypted(PROVIDERS_KEY, &raw)
}

pub fn get_provider(id: &str) -> Result<Option<ProviderConfig>, String> {
    let providers = load_providers()?;
    Ok(providers.into_iter().find(|p| p.id == id))
}

pub fn upsert_provider(config: ProviderConfig) -> Result<bool, String> {
    let mut providers = load_providers()?;
    if let Some(existing) = providers.iter_mut().find(|p| p.id == config.id) {
        *existing = config;
    } else {
        providers.push(config);
    }
    save_providers(&providers)
}

pub fn delete_provider(id: &str) -> Result<bool, String> {
    let mut providers = load_providers()?;
    providers.retain(|p| p.id != id);
    save_providers(&providers)?;
    let _ = fs::remove_file(provider_dir().join(format!("api_key_{}.enc", id)));
    Ok(true)
}

pub fn save_api_key(provider_id: &str, api_key: &str) -> Result<bool, String> {
    write_encrypted(&format!("api_key_{}", provider_id), api_key)
}

pub fn load_api_key(provider_id: &str) -> Result<Option<String>, String> {
    read_encrypted(&format!("api_key_{}", provider_id))
}

pub fn parse_kind(kind: &str) -> ProviderKind {
    match kind.to_lowercase().as_str() {
        "anthropic" => ProviderKind::Anthropic,
        "gemini" => ProviderKind::Gemini,
        "ollama" => ProviderKind::Ollama,
        "local" => ProviderKind::Local,
        _ => ProviderKind::OpenAICompatible,
    }
}

pub fn preset_providers() -> Vec<ProviderConfig> {
    vec![
        ProviderConfig {
            id: "stark-free".to_string(),
            name: "Stark Free (OpenRouter)".to_string(),
            kind: ProviderKind::OpenAICompatible,
            base_url: Some("https://openrouter.ai/api/v1".to_string()),
            models: vec![
                "meta-llama/llama-3.1-8b-instruct:free".to_string(),
                "mistralai/mistral-7b-instruct:free".to_string(),
                "google/gemma-2-9b-it:free".to_string(),
                "qwen/qwen-2-7b-instruct:free".to_string(),
            ],
            needs_api_key: true,
        },
        ProviderConfig {
            id: "nvidia-nim".to_string(),
            name: "NVIDIA NIM (GLM-5.2)".to_string(),
            kind: ProviderKind::OpenAICompatible,
            base_url: Some("https://integrate.api.nvidia.com/v1".to_string()),
            models: vec![
                "z-ai/glm-5.2".to_string(),
                "deepseek-ai/deepseek-v4-flash-0731".to_string(),
                "meta/llama-3.3-70b-instruct".to_string(),
                "mistralai/mistral-nemotron".to_string(),
            ],
            needs_api_key: true,
        },
        ProviderConfig {
            id: "ollama".to_string(),
            name: "Ollama Local".to_string(),
            kind: ProviderKind::Ollama,
            base_url: Some("http://localhost:11434".to_string()),
            models: vec![
                "qwen2.5:1.5b".to_string(),
                "llama3.2:3b".to_string(),
                "phi3:mini".to_string(),
                "deepseek-coder:6.7b".to_string(),
            ],
            needs_api_key: false,
        },
        ProviderConfig {
            id: "pollinations-free".to_string(),
            name: "Pollinations Free (sin API)".to_string(),
            kind: ProviderKind::OpenAICompatible,
            base_url: Some("https://text.pollinations.ai/openai/v1".to_string()),
            models: vec![
                "openai".to_string(),
                "mistral".to_string(),
                "qwen".to_string(),
                "llama".to_string(),
                "deepseek".to_string(),
                "gemini".to_string(),
            ],
            needs_api_key: false,
        },
        ProviderConfig {
            id: "openai".to_string(),
            name: "OpenAI".to_string(),
            kind: ProviderKind::OpenAICompatible,
            base_url: Some("https://api.openai.com/v1".to_string()),
            models: vec![
                "gpt-4o".to_string(),
                "gpt-4o-mini".to_string(),
                "o1-mini".to_string(),
            ],
            needs_api_key: true,
        },
        ProviderConfig {
            id: "anthropic".to_string(),
            name: "Anthropic".to_string(),
            kind: ProviderKind::Anthropic,
            base_url: Some("https://api.anthropic.com".to_string()),
            models: vec![
                "claude-3-5-sonnet-20241022".to_string(),
                "claude-3-5-haiku-20241022".to_string(),
                "claude-3-opus-20240229".to_string(),
            ],
            needs_api_key: true,
        },
        ProviderConfig {
            id: "gemini".to_string(),
            name: "Google Gemini".to_string(),
            kind: ProviderKind::Gemini,
            base_url: Some("https://generativelanguage.googleapis.com".to_string()),
            models: vec![
                "gemini-1.5-flash".to_string(),
                "gemini-1.5-pro".to_string(),
            ],
            needs_api_key: true,
        },
        ProviderConfig {
            id: "groq".to_string(),
            name: "Groq".to_string(),
            kind: ProviderKind::OpenAICompatible,
            base_url: Some("https://api.groq.com/openai/v1".to_string()),
            models: vec![
                "llama-3.3-70b-versatile".to_string(),
                "llama-3.1-8b-instant".to_string(),
                "mixtral-8x7b-32768".to_string(),
            ],
            needs_api_key: true,
        },
        ProviderConfig {
            id: "openrouter".to_string(),
            name: "OpenRouter".to_string(),
            kind: ProviderKind::OpenAICompatible,
            base_url: Some("https://openrouter.ai/api/v1".to_string()),
            models: vec![
                "openai/gpt-4o".to_string(),
                "anthropic/claude-3.5-sonnet".to_string(),
                "meta-llama/llama-3.3-70b-instruct".to_string(),
            ],
            needs_api_key: true,
        },
        ProviderConfig {
            id: "mistral".to_string(),
            name: "Mistral".to_string(),
            kind: ProviderKind::OpenAICompatible,
            base_url: Some("https://api.mistral.ai/v1".to_string()),
            models: vec![
                "mistral-large-latest".to_string(),
                "mistral-small-latest".to_string(),
            ],
            needs_api_key: true,
        },
        ProviderConfig {
            id: "lmstudio".to_string(),
            name: "LM Studio".to_string(),
            kind: ProviderKind::OpenAICompatible,
            base_url: Some("http://localhost:1234/v1".to_string()),
            models: Vec::new(),
            needs_api_key: false,
        },
        ProviderConfig {
            id: "opencode-zen".to_string(),
            name: "OpenCode Zen".to_string(),
            kind: ProviderKind::OpenAICompatible,
            base_url: Some("https://opencode.ai/zen/v1".to_string()),
            models: vec![
                "deepseek-v4-flash-free".to_string(),
                "mimo-v2.5-free".to_string(),
                "ling-3.0-flash-free".to_string(),
                "ling-3.0-tiny-free".to_string(),
                "nemotron-3-ultra-free".to_string(),
                "north-mini-code-free".to_string(),
                "laguna-s-2.1-free".to_string(),
                "longcat-2.0-free".to_string(),
            ],
            needs_api_key: true,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::providers::types::ProviderConfig;

    fn cleanup() {
        let _ = fs::remove_dir_all(".crafter_storage");
    }

    #[test]
    fn test_provider_store_roundtrip() {
        crate::storage::unlock_storage("clave_test_providers").unwrap();
        cleanup();

        let config = ProviderConfig {
            id: "openrouter".to_string(),
            name: "OpenRouter".to_string(),
            kind: ProviderKind::OpenAICompatible,
            base_url: Some("https://openrouter.ai/api/v1".to_string()),
            models: vec!["gpt-4o".to_string()],
            needs_api_key: true,
        };

        assert!(upsert_provider(config.clone()).unwrap());
        let loaded = get_provider("openrouter").unwrap().unwrap();
        assert_eq!(loaded.id, "openrouter");
        assert_eq!(loaded.base_url, Some("https://openrouter.ai/api/v1".to_string()));

        assert!(save_api_key("openrouter", "sk-test-123").unwrap());
        assert_eq!(load_api_key("openrouter").unwrap(), Some("sk-test-123".to_string()));

        assert!(delete_provider("openrouter").unwrap());
        assert!(get_provider("openrouter").unwrap().is_none());
        assert!(load_api_key("openrouter").unwrap().is_none());

        cleanup();
    }

    #[test]
    fn test_preset_providers_cover_major() {
        let presets = preset_providers();
        let ids: Vec<&str> = presets.iter().map(|p| p.id.as_str()).collect();
        assert!(ids.contains(&"ollama"));
        assert!(ids.contains(&"openai"));
        assert!(ids.contains(&"anthropic"));
        assert!(ids.contains(&"gemini"));
        assert!(ids.contains(&"groq"));
        assert!(ids.contains(&"openrouter"));
        assert!(ids.contains(&"mistral"));
        assert!(ids.contains(&"nvidia-nim"));
    }
}

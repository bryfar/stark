use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};

use super::types::SendChatPayload;

/// Best-effort abort registry, keyed by the optional `chat_id` a call carries.
///
/// The frontend asks for a stream to be stopped via `chat_abort(chat_id)`; the
/// provider loop polls its `AtomicBool` before each emitted chunk and unwinds
/// with a clean `done` event. Without a `chat_id` the stream is not
/// interceptable (retro-compatible with existing callers).
static REGISTRY: OnceLock<Mutex<HashMap<String, Arc<AtomicBool>>>> = OnceLock::new();

fn registry() -> &'static Mutex<HashMap<String, Arc<AtomicBool>>> {
    REGISTRY.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Register a chat for abortable streaming; returns whether it was newly
/// registered (false when the same chat was already streaming).
pub fn register(chat_id: &str) -> bool {
    match registry().lock() {
        Ok(mut m) => {
            if m.contains_key(chat_id) {
                false
            } else {
                m.insert(chat_id.to_string(), Arc::new(AtomicBool::new(false)));
                true
            }
        }
        Err(_) => false,
    }
}

/// Unregister a chat once its stream has finished (aborted or not), so a later
/// request for the same chat starts with a clean flag.
pub fn unregister(chat_id: &str) {
    if let Ok(mut m) = registry().lock() {
        m.remove(chat_id);
    }
}

/// Set the abort flag for a chat. Returns false if the chat was not streaming.
pub fn abort(chat_id: &str) -> bool {
    match registry().lock() {
        Ok(m) => m.get(chat_id).map(|f| f.store(true, Ordering::SeqCst)).is_some(),
        Err(_) => false,
    }
}

/// Whether the call carries an abort flag (i.e. it is an interceptable stream).
pub fn is_tracked(payload: &SendChatPayload) -> bool {
    payload.chat_id.is_some()
}

/// Poll the abort flag for the payload's chat, if any.
pub fn should_abort(payload: &SendChatPayload) -> bool {
    let Some(id) = payload.chat_id.as_deref() else {
        return false;
    };
    match registry().lock() {
        Ok(m) => m
            .get(id)
            .map(|f| f.load(Ordering::SeqCst))
            .unwrap_or(false),
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn payload(chat_id: Option<&str>) -> SendChatPayload {
        SendChatPayload {
            provider: "local".to_string(),
            model: "qwen-0.5b-q2k".to_string(),
            messages: Vec::new(),
            reasoning: false,
            api_key: None,
            chat_id: chat_id.map(|s| s.to_string()),
        }
    }

    #[test]
    fn untracked_payload_never_aborts() {
        let p = payload(None);
        assert!(!is_tracked(&p));
        assert!(!should_abort(&p));
    }

    #[test]
    fn register_then_abort_then_should_abort() {
        let p = payload(Some("chat-reg"));
        assert!(register("chat-reg"));
        assert!(is_tracked(&p));
        assert!(!should_abort(&p));
        assert!(abort("chat-reg"));
        assert!(should_abort(&p));
    }

    #[test]
    fn unregister_clears_flag_and_allows_regain() {
        assert!(register("chat-clear"));
        let _ = abort("chat-clear");
        unregister("chat-clear");
        // Unknown chat: abort is a no-op (false).
        assert!(!abort("chat-clear"));
        // A fresh request for the same chat starts clean.
        assert!(register("chat-clear"));
        assert!(!should_abort(&payload(Some("chat-clear"))));
    }

    #[test]
    fn duplicate_register_is_rejected() {
        assert!(register("chat-dup"));
        assert!(!register("chat-dup"));
        unregister("chat-dup");
    }
}
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStepEvent {
    pub step: u32,
    pub stage: String, // "start" | "prompt_prep" | "llm_request" | "tool_call" | "tool_result" | "done" | "error"
    pub details: Option<String>,
}

use std::collections::HashMap;
use std::sync::{Arc, RwLock};

pub type EventHandler = Arc<dyn Fn(&serde_json::Value) + Send + Sync>;

pub struct EventBus {
    listeners: RwLock<HashMap<String, Vec<EventHandler>>>,
}

impl EventBus {
    pub fn new() -> Self {
        Self {
            listeners: RwLock::new(HashMap::new()),
        }
    }

    pub fn subscribe(&self, event_name: &str, handler: EventHandler) {
        if let Ok(mut map) = self.listeners.write() {
            map.entry(event_name.to_string()).or_default().push(handler);
        }
    }

    pub fn emit(&self, event_name: &str, data: &serde_json::Value) {
        if let Ok(map) = self.listeners.read() {
            if let Some(handlers) = map.get(event_name) {
                for handler in handlers {
                    handler(data);
                }
            }
        }
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new()
    }
}

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

/// Simple in-memory TTL cache for completed chat responses (exact same request).
///
/// Keys are a stable hash of the provider + model + serialized messages, so a
/// repeated prompt with identical history returns instantly without touching the
/// network. Capacity and TTL are bounded to keep the memory budget low.
const MAX_ENTRIES: usize = 64;
const TTL_SECS: u64 = 5 * 60;

struct Entry {
    payload: String,
    created_at: Instant,
}

static CACHE: Mutex<Option<HashMap<u64, Entry>>> = Mutex::new(None);

fn buckets() -> &'static Mutex<Option<HashMap<u64, Entry>>> {
    &CACHE
}

fn key_of(provider: &str, model: &str, messages: &str) -> u64 {
    use std::hash::{Hash, Hasher};
    let mut h = std::collections::hash_map::DefaultHasher::new();
    provider.hash(&mut h);
    model.hash(&mut h);
    messages.hash(&mut h);
    h.finish()
}

fn expire(map: &mut HashMap<u64, Entry>) {
    let cutoff = Instant::now() - std::time::Duration::from_secs(TTL_SECS);
    map.retain(|_, e| e.created_at >= cutoff);
}

/// Look up a cached payload. Returns `None` on miss, expiry, or lock contention.
pub fn get(provider: &str, model_id: &str, messages: &str) -> Option<String> {
    let mut guard = match buckets().lock() {
        Ok(g) => g,
        Err(_) => return None,
    };
    let map = guard.get_or_insert_with(HashMap::new);
    expire(map);
    let key = key_of(provider, model_id, messages);
    map.get(&key).map(|e| e.payload.clone())
}

/// Store a payload under the (provider, model, messages) key, evicting the
/// oldest entries when the bucket is full.
pub fn put(provider: &str, model_id: &str, messages: &str, payload: String) {
    let mut guard = match buckets().lock() {
        Ok(g) => g,
        Err(_) => return,
    };
    let map = guard.get_or_insert_with(HashMap::new);
    expire(map);
    let key = key_of(provider, model_id, messages);
    map.insert(
        key,
        Entry {
            payload,
            created_at: Instant::now(),
        },
    );
    while map.len() > MAX_ENTRIES {
        let oldest = map.iter().min_by_key(|(_, e)| e.created_at).map(|(k, _)| *k);
        if let Some(k) = oldest {
            map.remove(&k);
        } else {
            break;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_stores_and_returns() {
        put("stark", "openai", "[{\"role\":\"user\"}]", "hola".into());
        assert_eq!(
            get("stark", "openai", "[{\"role\":\"user\"}]").as_deref(),
            Some("hola")
        );
    }

    #[test]
    fn different_messages_miss() {
        put("p", "m", "msg-a", "x".into());
        assert_eq!(get("p", "m", "msg-b"), None);
    }

    #[test]
    fn different_model_misses() {
        put("p", "m1", "msg", "x".into());
        assert_eq!(get("p", "m2", "msg"), None);
    }

    #[test]
    fn overwrite_updates_value() {
        put("p", "m", "msg", "a".into());
        put("p", "m", "msg", "b".into());
        assert_eq!(get("p", "m", "msg").as_deref(), Some("b"));
    }
}
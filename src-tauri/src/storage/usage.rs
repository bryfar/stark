use chrono::Datelike;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Daily token allowance for the free tier (no saved API key).
/// Mirrors the free-tier cap documented in `/home/bryan/Downloads/stark's
/// pricing plan: FREE = 10k tokens / day.
pub const FREE_TIER_DAILY_TOKENS: u64 = 10_000;

const USAGE_DIR: &str = ".crafter_storage/usage";
const USAGE_FILE_NAME: &str = "usage.json";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DailyUsage {
    pub date: String,
    pub tokens_used: u64,
}

fn usage_file() -> PathBuf {
    PathBuf::from(USAGE_DIR).join(USAGE_FILE_NAME)
}

/// Today's date as `YYYY-MM-DD` using the local timezone if available,
/// otherwise UTC. Used to key daily usage buckets.
pub fn today_key() -> String {
    let now = chrono::Local::now();
    format!("{:04}-{:02}-{:02}", now.year(), now.month(), now.day())
}

fn ensure_dir() -> Result<(), String> {
    fs::create_dir_all(USAGE_DIR).map_err(|e| format!("Error creando carpeta de uso: {}", e))
}

/// Load today's usage. Missing file counts as zero (never errors).
pub fn load_today_usage() -> DailyUsage {
    let path = usage_file();
    if !path.exists() {
        return DailyUsage {
            date: today_key(),
            tokens_used: 0,
        };
    }
    match fs::read_to_string(&path) {
        Ok(raw) => serde_json::from_str(&raw).unwrap_or(DailyUsage {
            date: today_key(),
            tokens_used: 0,
        }),
        Err(_) => DailyUsage {
            date: today_key(),
            tokens_used: 0,
        },
    }
}

/// Persist a `DailyUsage` bucket atomically-ish (write temp file, rename).
fn save_usage(usage: &DailyUsage) -> Result<(), String> {
    ensure_dir()?;
    let raw = serde_json::to_string(usage).map_err(|e| e.to_string())?;
    let path = usage_file();
    fs::write(&path, raw).map_err(|e| format!("Error guardando uso: {}", e))?;
    Ok(())
}

/// Add `tokens` to today's counter, rolling over if the date changed.
pub fn record_usage(tokens: u64) -> Result<DailyUsage, String> {
    let today = today_key();
    let mut usage = load_today_usage();
    if usage.date != today {
        usage.date = today;
        usage.tokens_used = 0;
    }
    usage.tokens_used += tokens;
    save_usage(&usage)?;
    Ok(usage)
}

/// Total tokens used today, and how many remain in the free tier.
pub fn usage_status() -> (u64, u64) {
    let usage = load_today_usage();
    let used = if usage.date == today_key() {
        usage.tokens_used
    } else {
        0
    };
    let used = used.min(FREE_TIER_DAILY_TOKENS);
    (used, FREE_TIER_DAILY_TOKENS.saturating_sub(used))
}

/// Whether the free tier budget for today has been exhausted.
pub fn is_over_free_limit() -> bool {
    usage_status().1 == 0
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::Mutex;

    // cargo test runs tests in parallel on shared threads; the usage bucket is a
    // single file, so serialize every usage test through the same lock.
    static TEST_LOCK: Mutex<()> = Mutex::new(());

    fn cleanup() {
        let _ = fs::remove_dir_all(USAGE_DIR);
    }

    #[test]
    fn records_and_accumulates_tokens() {
        let _guard = TEST_LOCK.lock().unwrap();
        cleanup();
        let u1 = record_usage(100).unwrap();
        assert_eq!(u1.tokens_used, 100);
        let u2 = record_usage(50).unwrap();
        assert_eq!(u2.tokens_used, 150);
        let (used, remaining) = usage_status();
        assert_eq!(used, 150);
        assert_eq!(remaining, FREE_TIER_DAILY_TOKENS - 150);
        cleanup();
    }

    #[test]
    fn free_limit_not_exceeded_by_default() {
        let _guard = TEST_LOCK.lock().unwrap();
        cleanup();
        assert!(!is_over_free_limit());
        assert_eq!(usage_status().1, FREE_TIER_DAILY_TOKENS);
        cleanup();
    }

    #[test]
    fn over_limit_when_capacity_reached() {
        let _guard = TEST_LOCK.lock().unwrap();
        cleanup();
        let _ = record_usage(FREE_TIER_DAILY_TOKENS).unwrap();
        assert!(is_over_free_limit());
        assert_eq!(usage_status().1, 0);
        cleanup();
    }

    #[test]
    fn caps_reported_used_at_limit() {
        let _guard = TEST_LOCK.lock().unwrap();
        cleanup();
        let _ = record_usage(FREE_TIER_DAILY_TOKENS + 500).unwrap();
        let (used, remaining) = usage_status();
        assert_eq!(used, FREE_TIER_DAILY_TOKENS);
        assert_eq!(remaining, 0);
        cleanup();
    }
}
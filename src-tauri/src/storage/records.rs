use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

/// Per-request usage record. Written as JSONL (one JSON object per line)
/// under `.crafter_storage/usage/records.jsonl`. Exempt from encryption
/// per ADR 0002 — plaintext with 0644 perms for Omarchy panel compat.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageRecord {
    /// ISO-8601 timestamp (local timezone)
    pub ts: String,
    /// Provider name (e.g. "openai", "anthropic", "gemini", "ollama")
    pub provider: String,
    /// Model identifier (e.g. "gpt-4o", "claude-sonnet-4-20250514")
    pub model: String,
    /// Operation type: "chat", "completion", "embedding"
    pub op: String,
    /// Prompt/input tokens consumed
    pub prompt_tokens: u32,
    /// Completion/output tokens generated
    pub completion_tokens: u32,
    /// Total tokens (prompt + completion)
    pub total_tokens: u32,
    /// Optional session/conversation ID for per-session aggregation
    pub session_id: Option<String>,
}

/// Aggregated token summary for a key (model, op, session, etc.)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenSummary {
    pub key: String,
    pub total_prompt: u64,
    pub total_completion: u64,
    pub total_tokens: u64,
    pub request_count: u64,
}

const RECORDS_DIR: &str = ".crafter_storage/usage";
const RECORDS_FILE: &str = "records.jsonl";

fn records_path() -> PathBuf {
    PathBuf::from(RECORDS_DIR).join(RECORDS_FILE)
}

fn ensure_dir() -> Result<(), String> {
    fs::create_dir_all(RECORDS_DIR).map_err(|e| format!("Error creating usage dir: {}", e))
}

/// Append a single usage record to the JSONL file.
pub fn append_record(
    provider: &str,
    model: &str,
    op: &str,
    prompt_tokens: u32,
    completion_tokens: u32,
    session_id: Option<&str>,
) -> Result<(), String> {
    ensure_dir()?;
    let record = UsageRecord {
        ts: chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string(),
        provider: provider.to_string(),
        model: model.to_string(),
        op: op.to_string(),
        prompt_tokens,
        completion_tokens,
        total_tokens: prompt_tokens + completion_tokens,
        session_id: session_id.map(|s| s.to_string()),
    };
    let line = serde_json::to_string(&record).map_err(|e| e.to_string())?;
    let path = records_path();
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| format!("Error opening records file: {}", e))?;
    writeln!(file, "{}", line).map_err(|e| format!("Error writing record: {}", e))?;
    Ok(())
}

/// Read all records from the JSONL file.
pub fn read_records() -> Result<Vec<UsageRecord>, String> {
    let path = records_path();
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("Error reading records: {}", e))?;
    let records = content
        .lines()
        .filter(|line| !line.trim().is_empty())
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect();
    Ok(records)
}

/// Aggregate usage by model name.
pub fn usage_by_model() -> Result<Vec<TokenSummary>, String> {
    let records = read_records()?;
    aggregate(&records, |r| r.model.clone())
}

/// Aggregate usage by operation type.
pub fn usage_by_op() -> Result<Vec<TokenSummary>, String> {
    let records = read_records()?;
    aggregate(&records, |r| r.op.clone())
}

/// Aggregate usage by session ID.
pub fn usage_by_session() -> Result<Vec<TokenSummary>, String> {
    let records = read_records()?;
    aggregate(&records, |r| r.session_id.clone().unwrap_or_else(|| "none".to_string()))
}

/// Aggregate records by a key extractor function.
fn aggregate<F>(records: &[UsageRecord], key_fn: F) -> Result<Vec<TokenSummary>, String>
where
    F: Fn(&UsageRecord) -> String,
{
    let mut map: HashMap<String, TokenSummary> = HashMap::new();
    for record in records {
        let key = key_fn(record);
        let entry = map.entry(key.clone()).or_insert_with(|| TokenSummary {
            key,
            total_prompt: 0,
            total_completion: 0,
            total_tokens: 0,
            request_count: 0,
        });
        entry.total_prompt += record.prompt_tokens as u64;
        entry.total_completion += record.completion_tokens as u64;
        entry.total_tokens += record.total_tokens as u64;
        entry.request_count += 1;
    }
    let mut summaries: Vec<TokenSummary> = map.into_values().collect();
    summaries.sort_by(|a, b| b.total_tokens.cmp(&a.total_tokens));
    Ok(summaries)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    static TEST_LOCK: Mutex<()> = Mutex::new(());

    fn cleanup() {
        let _ = fs::remove_dir_all(RECORDS_DIR);
    }

    #[test]
    fn append_and_read_records() {
        let _guard = TEST_LOCK.lock().unwrap();
        cleanup();
        append_record("openai", "gpt-4o", "chat", 100, 50, Some("s1")).unwrap();
        append_record("anthropic", "claude-sonnet-4-20250514", "chat", 200, 80, Some("s1")).unwrap();
        let records = read_records().unwrap();
        assert_eq!(records.len(), 2);
        assert_eq!(records[0].model, "gpt-4o");
        assert_eq!(records[1].model, "claude-sonnet-4-20250514");
        assert_eq!(records[0].total_tokens, 150);
        cleanup();
    }

    #[test]
    fn aggregate_by_model() {
        let _guard = TEST_LOCK.lock().unwrap();
        cleanup();
        append_record("openai", "gpt-4o", "chat", 100, 50, None).unwrap();
        append_record("openai", "gpt-4o", "chat", 200, 100, None).unwrap();
        append_record("anthropic", "claude-sonnet-4-20250514", "chat", 50, 25, None).unwrap();
        let summaries = usage_by_model().unwrap();
        assert_eq!(summaries.len(), 2);
        assert_eq!(summaries[0].key, "gpt-4o");
        assert_eq!(summaries[0].request_count, 2);
        assert_eq!(summaries[0].total_tokens, 450);
        assert_eq!(summaries[1].key, "claude-sonnet-4-20250514");
        assert_eq!(summaries[1].request_count, 1);
        cleanup();
    }

    #[test]
    fn aggregate_by_session() {
        let _guard = TEST_LOCK.lock().unwrap();
        cleanup();
        append_record("openai", "gpt-4o", "chat", 100, 50, Some("s1")).unwrap();
        append_record("openai", "gpt-4o", "chat", 200, 100, Some("s1")).unwrap();
        append_record("openai", "gpt-4o", "chat", 50, 25, Some("s2")).unwrap();
        let summaries = usage_by_session().unwrap();
        assert_eq!(summaries.len(), 2);
        assert_eq!(summaries[0].key, "s1");
        assert_eq!(summaries[0].request_count, 2);
        cleanup();
    }

    #[test]
    fn read_empty_records() {
        let _guard = TEST_LOCK.lock().unwrap();
        cleanup();
        let records = read_records().unwrap();
        assert!(records.is_empty());
        cleanup();
    }
}

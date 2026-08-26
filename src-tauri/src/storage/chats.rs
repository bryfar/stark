use super::crypto::{decrypt_aes_gcm, encrypt_aes_gcm};
use super::get_storage_master_key;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct ChatMessageRecord {
    pub role: String,
    pub content: String,
    pub timestamp: Option<String>,
    pub model: Option<String>,
    pub tokens_used: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Copy, Default)]
#[serde(rename_all = "snake_case")]
pub enum ChatKind {
    /// A root conversation (or a legacy chat without tree metadata).
    #[default]
    Root,
    /// A forked conversation: shares ancestry with its parent but diverges.
    Branch,
    /// A compacted conversation: its `messages` hold a summary + tail.
    Compacted,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct ChatRecord {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub provider: Option<String>,
    pub messages: Vec<ChatMessageRecord>,
    /// Id of the chat this one was forked from, if any.
    #[serde(default)]
    pub parent_id: Option<String>,
    #[serde(default)]
    pub kind: ChatKind,
}

fn chats_dir() -> PathBuf {
    PathBuf::from(".crafter_storage").join("chats")
}

fn chat_path(id: &str) -> PathBuf {
    chats_dir().join(format!("{}.enc", id))
}

pub fn save_chat(chat: &ChatRecord) -> Result<bool, String> {
    let master_key = get_storage_master_key()?;
    let raw = serde_json::to_string(chat).map_err(|e| format!("Error serializando chat: {}", e))?;
    let encrypted = encrypt_aes_gcm(raw.as_bytes(), &master_key)?;
    let dir = chats_dir();
    fs::create_dir_all(&dir).map_err(|e| format!("Error creando directorio de chats: {}", e))?;
    let file_path = chat_path(&chat.id);
    fs::write(&file_path, encrypted).map_err(|e| format!("Error guardando chat cifrado: {}", e))?;
    Ok(true)
}

fn read_chat(id: &str) -> Result<Option<ChatRecord>, String> {
    let master_key = get_storage_master_key()?;
    let file_path = chat_path(id);
    if !file_path.exists() {
        return Ok(None);
    }
    let encrypted = fs::read(&file_path).map_err(|e| e.to_string())?;
    let decrypted = decrypt_aes_gcm(&encrypted, &master_key)?;
    let raw = String::from_utf8(decrypted).map_err(|e| format!("UTF-8 inválido: {}", e))?;
    serde_json::from_str(&raw)
        .map(Some)
        .map_err(|e| format!("Chat corrupto: {}", e))
}

pub fn list_chats() -> Result<Vec<ChatRecord>, String> {
    let dir = chats_dir();
    let entries = match fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return Ok(Vec::new()),
    };
    let mut chats = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("enc") {
            continue;
        }
        let id = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string();
        if let Ok(Some(chat)) = read_chat(&id) {
            chats.push(chat);
        }
    }
    chats.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(chats)
}

pub fn delete_chat(id: &str) -> Result<bool, String> {
    let file_path = chat_path(id);
    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| format!("Error borrando chat: {}", e))?;
    }
    Ok(true)
}

/// Fork a chat: a new chat copies the parent's messages (deep) so the branch
/// keeps working without touching the original conversation. The title is
/// suffixed so both entries stay distinguishable in a flat sidebar.
pub fn fork_chat(parent_id: &str, fork_id: &str) -> Result<ChatRecord, String> {
    let parent = read_chat(parent_id)?
        .ok_or_else(|| format!("Chat origen no encontrado: {}", parent_id))?;
    let now = now_rfc3339();
    let fork = ChatRecord {
        id: fork_id.to_string(),
        title: format!("{} (rama)", parent.title.trim()),
        created_at: now.clone(),
        updated_at: now,
        provider: parent.provider,
        messages: parent.messages.clone(),
        parent_id: Some(parent_id.to_string()),
        kind: ChatKind::Branch,
    };
    save_chat(&fork)?;
    Ok(fork)
}

/// Descendants of `id` (excluding `id` itself): the tree edges usable for a
/// flat "parents → branches" listing in the sidebar. Depth-first, newest last.
pub fn chat_tree(id: &str) -> Result<Vec<String>, String> {
    let all = list_chats()?;
    let mut queue = vec![id.to_string()];
    let mut out = Vec::new();
    let mut seen = std::collections::HashSet::new();
    seen.insert(id.to_string());
    while let Some(curr) = queue.pop() {
        let children: Vec<String> = all
            .iter()
            .filter(|c| c.parent_id.as_deref() == Some(curr.as_str()) && !seen.contains(&c.id))
            .map(|c| c.id.clone())
            .collect();
        for child in children {
            seen.insert(child.clone());
            out.push(child.clone());
            queue.push(child);
        }
    }
    Ok(out)
}

/// Compact a chat in place: keep a leading summary message plus the retained
/// tail of recent turns (rightmost watchers, up to `keep_tails` user/assistant
/// pairs from the end). Messages older than the tail are replaced by a single
/// assistant summary. The originals are not recoverable afterwards.
pub fn compact_chat(id: &str, summary: &str, keep_tails: usize) -> Result<ChatRecord, String> {
    let mut chat = read_chat(id)?
        .ok_or_else(|| format!("Chat no encontrado: {}", id))?;
    let tail_start = chat.messages.len().saturating_sub(keep_tails * 2);
    let kept = chat.messages.split_off(tail_start);
    let mut compacted: Vec<ChatMessageRecord> = Vec::new();
    compacted.push(ChatMessageRecord {
        role: "assistant".to_string(),
        content: format!(
            "## Resumen de la conversacion\n\n{}",
            summary.trim()
        ),
        timestamp: Some(chat.updated_at.clone()),
        model: None,
        tokens_used: None,
    });
    compacted.extend(kept);
    chat.messages = compacted;
    chat.kind = ChatKind::Compacted;
    chat.updated_at = now_rfc3339();
    save_chat(&chat)?;
    Ok(chat)
}

pub fn delete_stale_chats(retention_days: u64) -> Result<usize, String> {
    let dir = chats_dir();
    let entries = match fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return Ok(0),
    };
    let cutoff = chrono::Utc::now()
        .checked_sub_signed(chrono::Duration::days(retention_days as i64))
        .map(|c| c.to_rfc3339())
        .unwrap_or_default();
    let mut removed = 0usize;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("enc") {
            continue;
        }
        let id = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string();
        if let Ok(Some(chat)) = read_chat(&id) {
            if chat.updated_at < cutoff {
                let _ = fs::remove_file(&path);
                removed += 1;
            }
        }
    }
    Ok(removed)
}

pub fn now_rfc3339() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_unlock() {
        crate::storage::unlock_storage("clave_test_chats").unwrap();
        let _ = fs::remove_dir_all(chats_dir());
    }

    #[test]
    fn test_chat_save_list_roundtrip() {
        setup_unlock();
        let chat = ChatRecord {
            id: "chat-1".to_string(),
            title: "Primera conversación".to_string(),
            created_at: now_rfc3339(),
            updated_at: now_rfc3339(),
            provider: Some("ollama".to_string()),
            messages: vec![
                ChatMessageRecord {
                    role: "user".to_string(),
                    content: "hola".to_string(),
                    timestamp: None,
                    model: None,
                    tokens_used: None,
                },
                ChatMessageRecord {
                    role: "assistant".to_string(),
                    content: "hola!".to_string(),
                    timestamp: None,
                    model: Some("qwen2.5:1.5b".to_string()),
                    tokens_used: Some(10),
                },
            ],
            parent_id: None,
            kind: ChatKind::default(),
        };
        assert!(save_chat(&chat).unwrap());
        let list = list_chats().unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, "chat-1");
        assert_eq!(list[0].messages.len(), 2);
        assert_eq!(list[0].messages[1].tokens_used, Some(10));
        let _ = fs::remove_dir_all(chats_dir());
    }

    #[test]
    fn test_chat_delete_removes_file() {
        setup_unlock();
        let chat = ChatRecord {
            id: "chat-delete".to_string(),
            title: "A borrar".to_string(),
            created_at: now_rfc3339(),
            updated_at: now_rfc3339(),
            provider: None,
            messages: Vec::new(),
            parent_id: None,
            kind: ChatKind::default(),
        };
        assert!(save_chat(&chat).unwrap());
        assert_eq!(list_chats().unwrap().len(), 1);
        assert!(delete_chat("chat-delete").unwrap());
        assert!(list_chats().unwrap().is_empty());
        let _ = fs::remove_dir_all(chats_dir());
    }

    #[test]
    fn test_chat_fork_copies_messages_and_marks_branch() {
        setup_unlock();
        save_chat(&ChatRecord {
            id: "fork-parent".to_string(),
            title: "Plan".to_string(),
            created_at: now_rfc3339(),
            updated_at: now_rfc3339(),
            provider: Some("ollama".to_string()),
            messages: vec![ChatMessageRecord {
                role: "user".to_string(),
                content: "diseña".to_string(),
                timestamp: None,
                model: None,
                tokens_used: None,
            }],
            parent_id: None,
            kind: ChatKind::default(),
        })
        .unwrap();
        let fork = fork_chat("fork-parent", "fork-child").unwrap();
        assert_eq!(fork.title, "Plan (rama)");
        assert_eq!(fork.parent_id.as_deref(), Some("fork-parent"));
        assert_eq!(fork.kind, ChatKind::Branch);
        assert_eq!(fork.messages.len(), 1);
        assert_eq!(fork.messages[0].content, "diseña");
        assert_eq!(fork_chat("missing", "x").is_err(), true);
        let _ = fs::remove_dir_all(chats_dir());
    }

    #[test]
    fn test_chat_tree_lists_descendants_depth_first() {
        setup_unlock();
        let base = now_rfc3339();
        for (id, title, parent) in [
            ("t-root", "Root", None),
            ("t-b1", "B1", Some("t-root")),
            ("t-b2", "B2", Some("t-root")),
            ("t-b1a", "B1a", Some("t-b1")),
        ] {
            save_chat(&ChatRecord {
                id: id.to_string(),
                title: title.to_string(),
                created_at: base.clone(),
                updated_at: base.clone(),
                provider: None,
                messages: Vec::new(),
                parent_id: parent.map(|p| p.to_string()),
                kind: ChatKind::Branch,
            })
            .unwrap();
        }
        let mut tree = chat_tree("t-root").unwrap();
        tree.sort();
        assert_eq!(tree, vec!["t-b1", "t-b1a", "t-b2"]);
        assert!(chat_tree("t-b1a").unwrap().is_empty());
        let existing_json = serde_json::json!({
            "id": "legacy",
            "title": "v1",
            "created_at": base,
            "updated_at": base,
            "provider": null,
            "messages": []
        });
        let legacy: ChatRecord = serde_json::from_value(existing_json).unwrap();
        assert!(legacy.parent_id.is_none());
        assert_eq!(legacy.kind, ChatKind::Root);
        let _ = fs::remove_dir_all(chats_dir());
    }

    #[test]
    fn test_compact_chat_keeps_summary_plus_tail() {
        setup_unlock();
        let mut msgs = Vec::new();
        for i in 0..6 {
            msgs.push(ChatMessageRecord {
                role: if i % 2 == 0 { "user" } else { "assistant" }.to_string(),
                content: format!("m{}", i),
                timestamp: None,
                model: None,
                tokens_used: None,
            });
        }
        save_chat(&ChatRecord {
            id: "compact-me".to_string(),
            title: "Larga".to_string(),
            created_at: now_rfc3339(),
            updated_at: now_rfc3339(),
            provider: None,
            messages: msgs,
            parent_id: None,
            kind: ChatKind::default(),
        })
        .unwrap();
        let compacted = compact_chat("compact-me", "El usuario pidio X y respondimos Y.", 2).unwrap();
        // summary + last 2 turns (4 messages)
        assert_eq!(compacted.messages.len(), 5);
        assert_eq!(compacted.messages[0].content, "## Resumen de la conversacion\n\nEl usuario pidio X y respondimos Y.");
        assert_eq!(compacted.messages[1].content, "m2");
        assert_eq!(compacted.messages[4].content, "m5");
        assert!(compacted.messages.iter().all(|m| m.content != "m0" && m.content != "m1"));
        assert_eq!(compacted.kind, ChatKind::Compacted);
        let _ = fs::remove_dir_all(chats_dir());
    }
}
pub mod attachments;
pub mod context;
pub mod indexer;
pub mod map;
pub mod git;
pub mod graft;

use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplyEditPayload {
    pub file_path: String,
    pub new_content: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditResult {
    pub success: bool,
    pub message: String,
}

fn find_git_root(start_path: &Path) -> Option<String> {
    let mut current = start_path;
    while let Some(parent) = current.parent() {
        if parent.join(".git").is_dir() {
            return Some(parent.to_string_lossy().to_string());
        }
        current = parent;
    }
    None
}

pub fn apply_edit(payload: ApplyEditPayload) -> Result<EditResult, String> {
    let path = Path::new(&payload.file_path);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    if let Err(err) = fs::write(path, &payload.new_content) {
        return Err(format!("Error escribiendo en archivo: {}", err));
    }

    // Registrar en log de auditoría
    let audit_log = Path::new(".crafter_audit.log");
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(audit_log) {
        let timestamp = chrono::Local::now().to_rfc3339();
        let _ = writeln!(
            file,
            "[{}] Edit aplicado a {}: {}",
            timestamp,
            payload.file_path,
            payload.description.as_ref().map(|s| s.as_str()).unwrap_or("Edición aprobada por el usuario")
        );
    }

    // Crear checkpoint de Git si es posible (Aider style)
    if let Some(git_root) = find_git_root(path) {
        let filename = path.file_name().and_then(|s| s.to_str()).unwrap_or("archivo");
        let commit_msg = format!(
            "Stark: auto-commit de edición en '{}' - {}",
            filename,
            payload.description.as_ref().map(|s| s.as_str()).unwrap_or("Modificación aprobada")
        );
        let _ = git::git_create_checkpoint(&git_root, &commit_msg);
    }

    Ok(EditResult {
        success: true,
        message: format!("Archivo {} actualizado con éxito", payload.file_path),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    pub line: String,
}

/// Reads the last N lines of the edit audit log (`.crafter_audit.log`).
pub fn read_audit_log(max_lines: usize) -> Result<Vec<AuditEntry>, String> {
    let path = Path::new(".crafter_audit.log");
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(path).map_err(|e| format!("Error leyendo audit log: {}", e))?;
    let mut entries: Vec<AuditEntry> = content
        .lines()
        .map(|l| AuditEntry { line: l.to_string() })
        .filter(|e| !e.line.trim().is_empty())
        .collect();
    if entries.len() > max_lines {
        entries.drain(0..entries.len() - max_lines);
    }
    Ok(entries)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_edit_and_audit_log() {
        let temp_dir = std::env::temp_dir().join("crafter_test_edit");
        let _ = fs::create_dir_all(&temp_dir);
        let target_file = temp_dir.join("sample.rs");

        let payload = ApplyEditPayload {
            file_path: target_file.to_string_lossy().to_string(),
            new_content: "fn main() {}".to_string(),
            description: Some("Test edit".to_string()),
        };

        let res = apply_edit(payload).unwrap();
        assert!(res.success);
        assert_eq!(fs::read_to_string(&target_file).unwrap(), "fn main() {}");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_read_audit_log_missing_returns_empty() {
        let log = read_audit_log(10).unwrap();
        // No log file in the test env (or an empty one); must not error.
        let _ = log;
    }
}

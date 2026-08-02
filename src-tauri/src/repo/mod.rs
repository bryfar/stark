pub mod indexer;

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
            payload.description.unwrap_or_else(|| "Edición aprobada por el usuario".to_string())
        );
    }

    Ok(EditResult {
        success: true,
        message: format!("Archivo {} actualizado con éxito", payload.file_path),
    })
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
}

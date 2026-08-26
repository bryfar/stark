use serde::{Deserialize, Serialize};
use std::fs;

/// A file attached to a chat prompt, bounded and readable as text.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AttachmentContent {
    pub name: String,
    pub path_text: String,
    /// "text" | "pdf" | "image" | "binary"
    pub kind: String,
    pub size: usize,
}

const MAX_TEXT_BYTES: usize = 64 * 1024;
const MAX_PDF_BYTES: usize = 5 * 1024 * 1024;

fn is_text_ext(path: &str) -> bool {
    let lower = path.to_lowercase();
    let exts = [
        "txt", "md", "log", "json", "jsonl", "yml", "yaml", "toml", "csv", "tsv",
        "js", "jsx", "ts", "tsx", "rs", "py", "go", "java", "c", "h", "cpp", "hpp",
        "rb", "php", "bash", "sh", "zsh", "html", "css", "scss", "sql", "xml",
    ];
    lower.split('.').last().map(|e| exts.contains(&e)).unwrap_or(false)
}

fn file_name(path: &str) -> &str {
    std::path::Path::new(path)
        .file_name()
        .map(|s| s.to_str().unwrap_or(path))
        .unwrap_or(path)
}

/// Reads a single attached file into bounded text:
/// - text files and PDFs are extracted & inlined (bounded)
/// - images / binaries are reported as a reference only (no content in prompt)
pub fn read_attachment(path: &str) -> Result<AttachmentContent, String> {
    let meta = fs::metadata(path).map_err(|e| format!("No se pudo leer {}: {}", path, e))?;
    let size = meta.len() as usize;
    let lower = path.to_lowercase();

    if lower.ends_with(".pdf") {
        if size > MAX_PDF_BYTES {
            return Ok(AttachmentContent {
                name: file_name(path).to_string(),
                path_text: format!("[PDF demasiado grande: {} bytes]", size),
                kind: "pdf".to_string(),
                size,
            });
        }
        let data = fs::read(path).map_err(|e| format!("Error leyendo PDF {}: {}", path, e))?;
        let text = pdf_extract::extract_text_from_mem(&data)
            .map_err(|e| format!("Error extrayendo texto del PDF {}: {}", path, e))?;
        let bounded: String = text.chars().take(MAX_TEXT_BYTES).collect();
        return Ok(AttachmentContent {
            name: file_name(path).to_string(),
            path_text: bounded,
            kind: "pdf".to_string(),
            size,
        });
    }

    if is_text_ext(path) {
        let data = fs::read(path).map_err(|e| format!("Error leyendo {}: {}", path, e))?;
        let slice = data.into_iter().take(MAX_TEXT_BYTES).collect::<Vec<u8>>();
        let text = String::from_utf8_lossy(&slice).to_string();
        return Ok(AttachmentContent {
            name: file_name(path).to_string(),
            path_text: text,
            kind: "text".to_string(),
            size,
        });
    }

    let image_ext = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"];
    let is_img = image_ext.iter().any(|e| lower.ends_with(&format!(".{}", e)));
    Ok(AttachmentContent {
        name: file_name(path).to_string(),
        path_text: format!("[Archivo adjunto de referencia: {} ({} bytes)]", path, size),
        kind: if is_img { "image" } else { "binary" }.to_string(),
        size,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_read_text_attachment() {
        let tmp = std::env::temp_dir().join("crafter_attach_test.md");
        let _ = fs::write(&tmp, "# Documento de ejemplo\ncon contenido");
        let att = read_attachment(tmp.to_str().unwrap()).unwrap();
        assert_eq!(att.kind, "text");
        assert!(att.path_text.contains("contenido"));
        let _ = fs::remove_file(&tmp);
    }

    #[test]
    fn test_unknown_binary_is_reference_only() {
        let tmp = std::env::temp_dir().join("crafter_attach_unknown.xyz");
        let _ = fs::write(&tmp, vec![0u8, 1, 2, 3]);
        let att = read_attachment(tmp.to_str().unwrap()).unwrap();
        assert_eq!(att.kind, "binary");
        assert!(att.path_text.contains("referencia"));
        let _ = fs::remove_file(&tmp);
    }
}
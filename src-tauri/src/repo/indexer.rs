use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
}

pub fn index_directory(dir_path: &Path) -> Result<Vec<FileNode>, String> {
    if !dir_path.exists() || !dir_path.is_dir() {
        return Err("La ruta especificada no existe o no es un directorio".to_string());
    }

    let mut nodes = Vec::new();
    let entries = match fs::read_dir(dir_path) {
        Ok(e) => e,
        Err(err) => return Err(format!("Error leyendo directorio: {}", err)),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Ignorar directorios git, node_modules y dist
        if name == ".git" || name == "node_modules" || name == "target" || name == "dist" {
            continue;
        }

        let is_dir = path.is_dir();
        let children = if is_dir {
            index_directory(&path).ok()
        } else {
            None
        };

        nodes.push(FileNode {
            name,
            path: path.to_string_lossy().to_string(),
            is_dir,
            children,
        });
    }

    nodes.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then_with(|| a.name.cmp(&b.name)));
    Ok(nodes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_index_directory_basic() {
        let temp_dir = env::temp_dir().join("crafter_test_repo");
        let _ = fs::create_dir_all(&temp_dir);
        let file_path = temp_dir.join("test.txt");
        let _ = fs::write(&file_path, "hello world");

        let nodes = index_directory(&temp_dir).unwrap();
        assert!(!nodes.is_empty());
        assert!(nodes.iter().any(|n| n.name == "test.txt"));

        let _ = fs::remove_dir_all(&temp_dir);
    }
}

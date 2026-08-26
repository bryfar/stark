use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SessionNode {
    pub id: String,
    pub parent_id: Option<String>,
    pub timestamp: String,
    pub event_type: String, // "user_input" | "llm_response" | "tool_call" | "tool_result"
    pub content: String,
}

pub struct SessionTreeManager {
    pub session_id: String,
    storage_path: PathBuf,
}

impl SessionTreeManager {
    pub fn new(session_id: &str, storage_dir: &str) -> Self {
        let storage_path = Path::new(storage_dir).join(format!("{}_tree.jsonl", session_id));
        Self {
            session_id: session_id.to_string(),
            storage_path,
        }
    }

    pub fn append_node(&self, node: SessionNode) -> Result<(), String> {
        if let Some(parent) = self.storage_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json_line = serde_json::to_string(&node)
            .map_err(|e| format!("Error serializando nodo: {}", e))? + "\n";
        
        use std::io::Write;
        let mut file = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.storage_path)
            .map_err(|e| format!("Error abriendo log: {}", e))?;
        
        file.write_all(json_line.as_bytes())
            .map_err(|e| format!("Error escribiendo log: {}", e))?;
        
        Ok(())
    }

    pub fn load_all_nodes(&self) -> Result<Vec<SessionNode>, String> {
        if !self.storage_path.exists() {
            return Ok(Vec::new());
        }
        let content = fs::read_to_string(&self.storage_path)
            .map_err(|e| format!("Error leyendo archivo de árbol: {}", e))?;
        
        let mut nodes = Vec::new();
        for line in content.lines() {
            if line.trim().is_empty() {
                continue;
            }
            let node: SessionNode = serde_json::from_str(line)
                .map_err(|e| format!("Línea corrupta en log de árbol: {}", e))?;
            nodes.push(node);
        }
        Ok(nodes)
    }

    pub fn get_active_path(&self, leaf_id: &str) -> Result<Vec<SessionNode>, String> {
        let nodes = self.load_all_nodes()?;
        let mut path = Vec::new();
        let mut current_id = Some(leaf_id.to_string());
        
        while let Some(id) = current_id {
            if let Some(node) = nodes.iter().find(|n| n.id == id) {
                path.push(node.clone());
                current_id = node.parent_id.clone();
            } else {
                break;
            }
        }
        
        path.reverse();
        Ok(path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tree_active_path_resolution() {
        let nodes = vec![
            SessionNode {
                id: "root-1".to_string(),
                parent_id: None,
                timestamp: "2026-08-26T12:00:00Z".to_string(),
                event_type: "user_input".to_string(),
                content: "Hola".to_string(),
            },
            SessionNode {
                id: "child-1".to_string(),
                parent_id: Some("root-1".to_string()),
                timestamp: "2026-08-26T12:01:00Z".to_string(),
                event_type: "llm_response".to_string(),
                content: "Qué tal".to_string(),
            },
            SessionNode {
                id: "branch-1".to_string(),
                parent_id: Some("root-1".to_string()),
                timestamp: "2026-08-26T12:02:00Z".to_string(),
                event_type: "llm_response".to_string(),
                content: "Hola de nuevo".to_string(),
            },
        ];

        let path = SessionTreeManager::load_active_path_from_memory(&nodes, "branch-1");
        assert_eq!(path.len(), 2);
        assert_eq!(path[0].id, "root-1");
        assert_eq!(path[1].id, "branch-1");
    }
}

impl SessionTreeManager {
    // Helper para pruebas en memoria
    pub fn load_active_path_from_memory(nodes: &[SessionNode], leaf_id: &str) -> Vec<SessionNode> {
        let mut path = Vec::new();
        let mut current_id = Some(leaf_id.to_string());
        
        while let Some(id) = current_id {
            if let Some(node) = nodes.iter().find(|n| n.id == id) {
                path.push(node.clone());
                current_id = node.parent_id.clone();
            } else {
                break;
            }
        }
        
        path.reverse();
        path
    }
}

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ContextFile {
    pub path: String,
    pub relative_path: String,
    pub score: u32,
    pub content: String,
}

const MAX_FILES: usize = 6;
const MAX_BYTES_PER_FILE: usize = 8 * 1024;
const MAX_TOTAL_BYTES: usize = 32 * 1024;
const SKIPPED_DIRS: [&str; 5] = [".git", "node_modules", "target", "dist", ".crafter_storage"];

fn tokenize(text: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    for word in text.split(|c: char| !c.is_alphanumeric()) {
        let w = word.trim().to_lowercase();
        if w.len() >= 3 {
            tokens.push(w);
        }
    }
    tokens
}

fn flatten_files(path: &Path, base: &Path, out: &mut Vec<(String, String)>) {
    let rel = path
        .strip_prefix(base)
        .unwrap_or(path)
        .to_string_lossy()
        .to_string();

    if rel.split('/').next().map(|f| SKIPPED_DIRS.contains(&f)).unwrap_or(false) {
        return;
    }

    if path.is_dir() {
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                flatten_files(&entry.path(), base, out);
            }
        }
    } else {
        out.push((rel, path.to_string_lossy().to_string()));
    }
}

fn score_file(relative_path: &str, tokens: &[String]) -> u32 {
    let path_lower = relative_path.to_lowercase();
    let mut score = 0u32;
    for t in tokens.iter().take(40) {
        if path_lower.contains(t) {
            score += 1;
        }
    }
    // Prefer shallow source files over vendored/deep paths when tied.
    if relative_path.starts_with("src/") {
        score += 2;
    }
    score
}

fn read_truncated(path: &str, max_bytes: usize) -> String {
    let data = match fs::read(path) {
        Ok(d) => d,
        Err(_) => return String::new(),
    };
    let slice = data.into_iter().take(max_bytes).collect::<Vec<u8>>();
    String::from_utf8_lossy(&slice).to_string()
}

/// Selects the top-N files in a workspace whose paths best match the tokens of
/// an active prompt, reading bounded slices of their content. Skips heavy or
/// vendored paths up front so memory stays within budget.
pub fn select_context_files(prompt: &str, workspace_path: &str) -> Result<Vec<ContextFile>, String> {
    let root = Path::new(workspace_path);
    if !root.is_dir() {
        return Err("La ruta especificada no existe o no es un directorio".to_string());
    }

    let tokens = tokenize(prompt);
    if tokens.is_empty() {
        return Ok(Vec::new());
    }

    let mut files: Vec<(String, String)> = Vec::new();
    flatten_files(root, root, &mut files);

    let mut scored: Vec<(u32, String, String)> = files
        .into_iter()
        .map(|(rel, abs)| (score_file(&rel, &tokens), rel, abs))
        .filter(|(s, _, _)| *s > 0)
        .collect();

    scored.sort_by(|a, b| b.0.cmp(&a.0).then_with(|| a.1.cmp(&b.1)));

    let mut total = 0usize;
    let mut result = Vec::new();
    for (score, rel, abs) in scored.into_iter().take(MAX_FILES) {
        if total >= MAX_TOTAL_BYTES {
            break;
        }
        let content = read_truncated(&abs, MAX_BYTES_PER_FILE);
        total += content.len();
        result.push(ContextFile {
            path: abs,
            relative_path: rel,
            score,
            content,
        });
    }

    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_select_context_files_ranks_relevant_source() {
        let temp_dir = env::temp_dir().join("crafter_context_test");
        let _ = fs::create_dir_all(temp_dir.join("src"));
        let _ = fs::write(temp_dir.join("src/App.jsx"), "const App = () => <div>hi</div>;");
        let _ = fs::write(temp_dir.join("src/store.js"), "export const store = {};");
        let _ = fs::write(temp_dir.join("README.md"), "# docs");

        let files = select_context_files("modifica el componente App del frontend", temp_dir.to_str().unwrap()).unwrap();

        assert!(!files.is_empty(), "Should find a match");
        assert!(files[0].relative_path.contains("App"));
        assert!(files[0].content.contains("App"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_select_context_files_empty_prompt_returns_empty() {
        let temp_dir = env::temp_dir().join("crafter_context_test2");
        let _ = fs::create_dir_all(&temp_dir);
        let _ = fs::write(temp_dir.join("a.txt"), "x");

        let files = select_context_files("", temp_dir.to_str().unwrap()).unwrap();
        assert!(files.is_empty());

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
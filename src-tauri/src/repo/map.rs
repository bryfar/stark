use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use tree_sitter::{Parser, Query, QueryCursor};

/// Genera un mapa estructural del repositorio puntuando los archivos según sus referencias mutuas.
/// Implementa un algoritmo de PageRank/centralidad simplificado para identificar los archivos más importantes.
pub fn generate_repo_map(workspace_path: &str) -> Result<String, String> {
    let root = Path::new(workspace_path);
    if !root.is_dir() {
        return Err("Ruta de workspace inválida".to_string());
    }

    let mut files = Vec::new();
    find_source_files(root, root, &mut files);

    // 1. Recopilar definiciones: Mapa de symbol_name -> rel_path
    let mut definitions: HashMap<String, String> = HashMap::new();
    let mut file_contents: HashMap<String, String> = HashMap::new();

    for rel_path in &files {
        let abs_path = root.join(rel_path);
        if let Ok(content) = fs::read_to_string(&abs_path) {
            let extension = Path::new(rel_path)
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("");
            
            let symbols = parse_definitions(&content, extension);
            for sym in symbols {
                definitions.insert(sym, rel_path.clone());
            }
            file_contents.insert(rel_path.clone(), content);
        }
    }

    // 2. Contar referencias a cada archivo (in-degree weight)
    let mut file_scores: HashMap<String, u32> = HashMap::new();
    for rel_path in &files {
        file_scores.insert(rel_path.clone(), 0);
    }

    for (rel_path, content) in &file_contents {
        let words = tokenize_content(content);
        let mut referenced_files = HashSet::new();
        for word in words {
            if let Some(target_file) = definitions.get(&word) {
                // Si hace referencia a un símbolo en otro archivo, lo registramos
                if target_file != rel_path {
                    referenced_files.insert(target_file.clone());
                }
            }
        }
        for target_file in referenced_files {
            if let Some(score) = file_scores.get_mut(&target_file) {
                *score += 1;
            }
        }
    }

    // 3. Ordenar archivos por relevancia (score descendente)
    let mut ranked_files = files.clone();
    ranked_files.sort_by(|a, b| {
        let score_a = file_scores.get(a).unwrap_or(&0);
        let score_b = file_scores.get(b).unwrap_or(&0);
        score_b.cmp(score_a).then_with(|| a.cmp(b))
    });

    // 4. Generar el mapa estructural para los 12 archivos más relevantes
    let mut map = String::new();
    for rel_path in ranked_files.iter().take(12) {
        if let Some(content) = file_contents.get(rel_path) {
            let extension = Path::new(rel_path)
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("");

            let parsed = parse_file_structure(content, extension);
            if !parsed.is_empty() {
                map.push_str(&format!("{}:\n", rel_path));
                for line in parsed {
                    map.push_str(&format!("  {}\n", line));
                }
            } else {
                map.push_str(&format!("{}\n", rel_path));
            }
        }
    }

    Ok(map)
}

fn find_source_files(dir: &Path, base: &Path, out: &mut Vec<String>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let filename = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
            if filename.starts_with('.') || filename == "node_modules" || filename == "target" || filename == "dist" {
                continue;
            }
            if path.is_dir() {
                find_source_files(&path, base, out);
            } else {
                let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
                if ["rs", "js", "jsx", "ts", "tsx"].contains(&ext) {
                    if let Ok(rel) = path.strip_prefix(base) {
                        out.push(rel.to_string_lossy().to_string());
                    }
                }
            }
        }
    }
}

fn tokenize_content(text: &str) -> Vec<String> {
    let mut words = Vec::new();
    let mut current_word = String::new();
    for c in text.chars() {
        if c.is_alphanumeric() || c == '_' {
            current_word.push(c);
        } else if !current_word.is_empty() {
            words.push(current_word.clone());
            current_word.clear();
        }
    }
    if !current_word.is_empty() {
        words.push(current_word);
    }
    words
}

fn parse_definitions(content: &str, ext: &str) -> Vec<String> {
    let mut parser = Parser::new();
    let mut results = Vec::new();

    let (lang, query_str) = match ext {
        "rs" => {
            let lang = tree_sitter_rust::language();
            (
                lang,
                "(function_item name: (identifier) @name)
                 (struct_item name: (type_identifier) @name)
                 (impl_item type: (type_identifier) @name)
                 (trait_item name: (identifier) @name)"
            )
        }
        "js" | "jsx" => {
            let lang = tree_sitter_javascript::language();
            (
                lang,
                "(function_declaration id: (identifier) @name)
                 (class_declaration id: (identifier) @name)
                 (method_definition name: (property_identifier) @name)"
            )
        }
        "ts" | "tsx" => {
            let lang = tree_sitter_typescript::language_typescript();
            (
                lang,
                "(function_declaration id: (identifier) @name)
                 (class_declaration id: (identifier) @name)
                 (method_definition name: (property_identifier) @name)
                 (interface_declaration name: (type_identifier) @name)"
            )
        }
        _ => return results,
    };

    let _ = parser.set_language(&lang);

    if let Some(tree) = parser.parse(content, None) {
        if let Ok(query) = Query::new(&lang, query_str) {
            let mut cursor = QueryCursor::new();
            let matches = cursor.matches(&query, tree.root_node(), content.as_bytes());
            for m in matches {
                for capture in m.captures {
                    if let Ok(text) = capture.node.utf8_text(content.as_bytes()) {
                        results.push(text.to_string());
                    }
                }
            }
        }
    }

    results.dedup();
    results
}

fn parse_file_structure(content: &str, ext: &str) -> Vec<String> {
    let mut parser = Parser::new();
    let mut results = Vec::new();

    let (lang, query_str) = match ext {
        "rs" => {
            let lang = tree_sitter_rust::language();
            (
                lang,
                "(function_item name: (identifier) @name)
                 (struct_item name: (type_identifier) @name)
                 (impl_item type: (type_identifier) @name)"
            )
        }
        "js" | "jsx" => {
            let lang = tree_sitter_javascript::language();
            (
                lang,
                "(function_declaration id: (identifier) @name)
                 (class_declaration id: (identifier) @name)
                 (method_definition name: (property_identifier) @name)"
            )
        }
        "ts" | "tsx" => {
            let lang = tree_sitter_typescript::language_typescript();
            (
                lang,
                "(function_declaration id: (identifier) @name)
                 (class_declaration id: (identifier) @name)
                 (method_definition name: (property_identifier) @name)
                 (interface_declaration name: (type_identifier) @name)"
            )
        }
        _ => return results,
    };

    let _ = parser.set_language(&lang);

    if let Some(tree) = parser.parse(content, None) {
        if let Ok(query) = Query::new(&lang, query_str) {
            let mut cursor = QueryCursor::new();
            let matches = cursor.matches(&query, tree.root_node(), content.as_bytes());
            for m in matches {
                for capture in m.captures {
                    if let Ok(text) = capture.node.utf8_text(content.as_bytes()) {
                        let node_type = capture.node.kind();
                        results.push(format!("{} ({})", text, node_type));
                    }
                }
            }
        }
    }

    results.dedup();
    results
}

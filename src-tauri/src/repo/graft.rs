use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use tree_sitter::{Parser, Query, QueryCursor};

/// Estructura para describir los detalles de un archivo en el mapa Graft.
#[derive(Debug, Clone)]
struct GraftNode {
    rel_path: String,
    score: u32,
    symbols: Vec<String>,
    dependencies: Vec<String>,
}

pub fn build_graft_graph(workspace_path: &str) -> Result<String, String> {
    let root = Path::new(workspace_path);
    if !root.is_dir() {
        return Err("Ruta de workspace inválida".to_string());
    }

    let graft_dir = root.join(".stark_graft");
    let _ = fs::create_dir_all(&graft_dir);

    // 1. Encontrar todos los archivos fuente
    let mut files = Vec::new();
    find_source_files(root, root, &mut files);

    let mut definitions: HashMap<String, String> = HashMap::new();
    let mut file_contents: HashMap<String, String> = HashMap::new();
    let mut file_symbols: HashMap<String, Vec<String>> = HashMap::new();

    // 2. Parsear símbolos
    for rel_path in &files {
        let abs_path = root.join(rel_path);
        if let Ok(content) = fs::read_to_string(&abs_path) {
            let extension = Path::new(rel_path)
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("");
            
            let symbols = parse_definitions(&content, extension);
            file_symbols.insert(rel_path.clone(), symbols.clone());
            for sym in symbols {
                definitions.insert(sym, rel_path.clone());
            }
            file_contents.insert(rel_path.clone(), content);
        }
    }

    // 3. Calcular dependencias y pesos de centralidad (in-degree PageRank simplificado)
    let mut file_scores: HashMap<String, u32> = HashMap::new();
    let mut file_dependencies: HashMap<String, Vec<String>> = HashMap::new();

    for rel_path in &files {
        file_scores.insert(rel_path.clone(), 0);
        file_dependencies.insert(rel_path.clone(), Vec::new());
    }

    for (rel_path, content) in &file_contents {
        let words = tokenize_content(content);
        let mut referenced_files = HashSet::new();
        for word in words {
            if let Some(target_file) = definitions.get(&word) {
                if target_file != rel_path {
                    referenced_files.insert(target_file.clone());
                }
            }
        }
        
        let deps: Vec<String> = referenced_files.iter().cloned().collect();
        file_dependencies.insert(rel_path.clone(), deps);

        for target_file in referenced_files {
            if let Some(score) = file_scores.get_mut(&target_file) {
                *score += 1;
            }
        }
    }

    // 4. Crear archivos Markdown por cada nodo (módulo/archivo)
    let mut nodes = Vec::new();
    for rel_path in &files {
        let score = *file_scores.get(rel_path).unwrap_or(&0);
        let symbols = file_symbols.get(rel_path).cloned().unwrap_or_default();
        let deps = file_dependencies.get(rel_path).cloned().unwrap_or_default();

        let node = GraftNode {
            rel_path: rel_path.clone(),
            score,
            symbols,
            dependencies: deps,
        };

        write_node_markdown(&graft_dir, &node)?;
        nodes.push(node);
    }

    // 5. Ordenar por puntuación para el índice
    nodes.sort_by(|a, b| b.score.cmp(&a.score).then_with(|| a.rel_path.cmp(&b.rel_path)));

    // 6. Escribir el Índice Global (graft_index.md)
    write_index_markdown(&graft_dir, &nodes)?;

    // Agregar el directorio .stark_graft al .gitignore
    let gitignore_path = root.join(".gitignore");
    if gitignore_path.exists() {
        if let Ok(mut content) = fs::read_to_string(&gitignore_path) {
            if !content.contains(".stark_graft") {
                content.push_str("\n# Stark Graft codebase memory\n.stark_graft/\n");
                let _ = fs::write(&gitignore_path, content);
            }
        }
    }

    Ok(format!("Grafo de contexto Graft generado exitosamente en '.stark_graft' con {} nodos.", nodes.len()))
}

fn write_node_markdown(graft_dir: &Path, node: &GraftNode) -> Result<(), String> {
    let md_path = graft_dir.join(format!("{}.md", node.rel_path));
    
    // Crear directorios padres si no existen
    if let Some(parent) = md_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let mut content = String::new();
    content.push_str(&format!("# Nodo del Grafo: {}\n\n", node.rel_path));
    content.push_str(&format!("* **Importancia / Score:** {}\n\n", node.score));

    content.push_str("## Símbolos Declarados\n\n");
    if node.symbols.is_empty() {
        content.push_str("*Ninguno detectado por tree-sitter.*\n\n");
    } else {
        for sym in &node.symbols {
            content.push_str(&format!("* `{}`\n", sym));
        }
        content.push_str("\n");
    }

    content.push_str("## Dependencias (Importa de)\n\n");
    if node.dependencies.is_empty() {
        content.push_str("*Este archivo no depende de otros archivos locales.*\n\n");
    } else {
        for dep in &node.dependencies {
            content.push_str(&format!("* [{}]({}.md)\n", dep, dep));
        }
        content.push_str("\n");
    }

    fs::write(&md_path, content).map_err(|e| format!("Error escribiendo markdown de nodo: {}", e))?;
    Ok(())
}

fn write_index_markdown(graft_dir: &Path, nodes: &[GraftNode]) -> Result<(), String> {
    let index_path = graft_dir.join("graft_index.md");
    let mut content = String::new();
    content.push_str("# Índice del Grafo del Repositorio (Graft)\n\n");
    content.push_str("Este archivo provee un mapa estructural determinista de los módulos y dependencias de la base de código.\n\n");
    content.push_str("| Archivo | Relevancia (PageRank) | Símbolos Clave | Dependencias |\n");
    content.push_str("|---|---|---|---|\n");

    for node in nodes {
        let sym_count = node.symbols.len();
        let dep_count = node.dependencies.len();
        content.push_str(&format!(
            "| [{}]({}.md) | {} | {} símbolos | {} dependencias |\n",
            node.rel_path, node.rel_path, node.score, sym_count, dep_count
        ));
    }

    fs::write(&index_path, content).map_err(|e| format!("Error escribiendo índice Graft: {}", e))?;
    Ok(())
}

// Helpers copiados/reutilizados de map.rs para no acoplar modificaciones
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

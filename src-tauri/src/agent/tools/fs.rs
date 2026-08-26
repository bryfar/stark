use std::fs;
use std::path::Path;
use serde_json::Value;
use crate::agent::tools::Tool;

/// Herramienta para leer archivos con límites acotados de memoria (estilo FX Vercel).
pub struct ReadFileTool;

impl Tool for ReadFileTool {
    fn name(&self) -> &str {
        "read_file"
    }

    fn description(&self) -> &str {
        "Lee el contenido de un archivo dentro del workspace. Límite de 400 líneas por defecto."
    }

    fn parameters_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": { "type": "string" },
                "offset_lines": { "type": "integer" },
                "limit_lines": { "type": "integer" }
            },
            "required": ["path"]
        })
    }

    fn is_read_only(&self, _args: &Value) -> bool {
        true
    }

    fn is_destructive(&self, _args: &Value) -> bool {
        false
    }

    fn call(&self, args: Value, workspace_path: &str) -> Result<String, String> {
        let path_str = args["path"].as_str().ok_or("Parámetro 'path' inválido")?;
        let root = Path::new(workspace_path);
        let abs_path = root.join(path_str);

        // Validar límite del sandbox (no salir del workspace)
        if !abs_path.starts_with(root) {
            return Err("Acceso denegado: fuera del workspace".to_string());
        }

        let content = fs::read_to_string(&abs_path)
            .map_err(|e| format!("Error leyendo archivo: {}", e))?;

        let offset = args["offset_lines"].as_u64().unwrap_or(0) as usize;
        let limit = args["limit_lines"].as_u64().unwrap_or(400) as usize;

        let lines: Vec<&str> = content.lines().collect();
        if offset >= lines.len() {
            return Ok("--- Fin de archivo (offset fuera de rango) ---".to_string());
        }

        let end = std::cmp::min(offset + limit, lines.len());
        let mut result = String::new();
        for i in offset..end {
            // Truncar línea si excede 2000 caracteres
            let line = lines[i];
            if line.len() > 2000 {
                result.push_str(&line[..2000]);
                result.push_str("... [línea truncada a 2000 chars]\n");
            } else {
                result.push_str(line);
                result.push('\n');
            }
        }

        if end < lines.len() {
            result.push_str(&format!(
                "\n--- Truncado: mostrando líneas {}-{}. Usa offset_lines={} para continuar ---",
                offset, end, end
            ));
        }

        Ok(result)
    }
}

/// Herramienta para editar archivos de forma precisa requiriendo coincidencia exacta (estilo FX Vercel).
pub struct EditFileTool;

impl Tool for EditFileTool {
    fn name(&self) -> &str {
        "edit_file"
    }

    fn description(&self) -> &str {
        "Edita un archivo reemplazando exactamente una cadena de texto (old_string) por otra (new_string)."
    }

    fn parameters_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "path": { "type": "string" },
                "old_string": { "type": "string" },
                "new_string": { "type": "string" }
            },
            "required": ["path", "old_string", "new_string"]
        })
    }

    fn is_read_only(&self, _args: &Value) -> bool {
        false
    }

    fn is_destructive(&self, _args: &Value) -> bool {
        false
    }

    fn call(&self, args: Value, workspace_path: &str) -> Result<String, String> {
        let path_str = args["path"].as_str().ok_or("Parámetro 'path' inválido")?;
        let old_str = args["old_string"].as_str().ok_or("Parámetro 'old_string' inválido")?;
        let new_str = args["new_string"].as_str().ok_or("Parámetro 'new_string' inválido")?;

        let root = Path::new(workspace_path);
        let abs_path = root.join(path_str);

        if !abs_path.starts_with(root) {
            return Err("Acceso denegado: fuera del workspace".to_string());
        }

        let content = fs::read_to_string(&abs_path)
            .map_err(|e| format!("Error leyendo archivo para edición: {}", e))?;

        // Validar unicidad de old_string para evitar reemplazos accidentales masivos
        let occurrences = content.matches(old_str).count();
        if occurrences == 0 {
            return Err("No se encontró coincidencia exacta para 'old_string'".to_string());
        } else if occurrences > 1 {
            return Err("Múltiples coincidencias para 'old_string'. Sea más específico para asegurar reemplazo único.".to_string());
        }

        let updated_content = content.replace(old_str, new_str);
        fs::write(&abs_path, updated_content)
            .map_err(|e| format!("Error escribiendo archivo modificado: {}", e))?;

        Ok(format!("Archivo '{}' editado con éxito.", path_str))
    }
}

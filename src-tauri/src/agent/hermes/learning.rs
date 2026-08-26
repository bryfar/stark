use std::fs;
use std::path::Path;

pub struct HermesLearningLoop;

impl HermesLearningLoop {
    /// Obtiene la ruta del archivo de reglas del repositorio.
    fn rules_path(workspace_path: &str) -> std::path::PathBuf {
        Path::new(workspace_path).join(".stark_graft").join("learning_rules.md")
    }

    /// Lee las reglas de codificación aprendidas para el repositorio.
    pub fn read_rules(workspace_path: &str) -> String {
        let path = Self::rules_path(workspace_path);
        if path.exists() {
            fs::read_to_string(path).unwrap_or_default()
        } else {
            String::new()
        }
    }

    /// Guarda una nueva regla o actualización en las reglas del repositorio.
    pub fn learn_rule(workspace_path: &str, new_rule: &str) -> Result<(), String> {
        let path = Self::rules_path(workspace_path);
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        let mut current_rules = Self::read_rules(workspace_path);
        if current_rules.is_empty() {
            current_rules = "# Reglas de Codificación Aprendidas por Hermes\n\n\
                             Este archivo contiene patrones del repositorio identificados automáticamente.\n\n".to_string();
        }

        current_rules.push_str(&format!("* {}\n", new_rule));

        fs::write(&path, current_rules)
            .map_err(|e| format!("Error escribiendo regla aprendida: {}", e))?;
        Ok(())
    }
}

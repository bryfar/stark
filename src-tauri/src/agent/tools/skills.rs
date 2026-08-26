use serde_json::Value;
use crate::agent::tools::Tool;
use crate::skills::{list_all_skills, read_skill_content};

/// Herramienta para cargar habilidades bajo demanda (progressive disclosure, estilo Eve Vercel).
pub struct LoadSkillTool;

impl Tool for LoadSkillTool {
    fn name(&self) -> &str {
        "load_skill"
    }

    fn description(&self) -> &str {
        "Carga las instrucciones y procedimientos completos de una habilidad (skill) bajo demanda."
    }

    fn parameters_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "name": { "type": "string", "description": "Nombre de la habilidad a cargar" }
            },
            "required": ["name"]
        })
    }

    fn is_read_only(&self, _args: &Value) -> bool {
        true
    }

    fn is_destructive(&self, _args: &Value) -> bool {
        false
    }

    fn call(&self, args: Value, workspace_path: &str) -> Result<String, String> {
        let skill_name = args["name"].as_str().ok_or("Parámetro 'name' de la habilidad inválido.")?;
        let all_skills = list_all_skills(workspace_path);

        let target_skill = all_skills.iter().find(|s| s.name == skill_name)
            .ok_or_else(|| format!("No se encontró la habilidad '{}' en el espacio de trabajo.", skill_name))?;

        read_skill_content(&target_skill.path)
            .map_err(|e| format!("Error al leer contenido de la habilidad '{}': {}", skill_name, e))
    }
}

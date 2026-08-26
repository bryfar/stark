use crate::agent::permissions::modes::PermissionDecision;

pub struct LlmClassifier;

impl LlmClassifier {
    /// Clasificador LLM "last-chance reviewer" simplificado para evaluar el riesgo de la acción.
    pub async fn classify(
        &self,
        tool_name: &str,
        arguments_json: &str,
    ) -> PermissionDecision {
        let args_lower = arguments_json.to_lowercase();
        // Detección heurística rápida de comandos destructivos/riesgosos
        if args_lower.contains("rm ") 
            || args_lower.contains("rf ") 
            || args_lower.contains("delete") 
            || args_lower.contains("drop ") 
            || args_lower.contains("reset --hard") 
            || args_lower.contains("clean -f") 
        {
            return PermissionDecision::Ask(format!(
                "El revisor de seguridad (LLM Classifier) detectó riesgo crítico o destructivo en los argumentos de '{}'.",
                tool_name
            ));
        }
        PermissionDecision::Allow
    }
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStep {
    pub step_number: usize,
    pub description: String,
    pub is_completed: bool,
}

pub struct TaskDecomposer;

impl TaskDecomposer {
    /// Descompone una tarea compleja de alto nivel en una serie de subtareas secuenciales.
    /// Utiliza el mapa estructural del repositorio (Graft) si está disponible para afinar los pasos.
    pub fn decompose(instruction: &str, workspace_path: &str) -> Vec<TaskStep> {
        let mut steps = Vec::new();

        // 1. Intentar buscar indicios del mapa de Graft en la base de código
        let graft_index = std::path::Path::new(workspace_path).join(".stark_graft").join("graft_index.md");
        let has_graft = graft_index.exists();

        // 2. Desglose determinista heurístico inicial basado en la consulta
        let instruction_lower = instruction.to_lowercase();
        if instruction_lower.contains("refactor") || instruction_lower.contains("optimizar") {
            steps.push(TaskStep {
                step_number: 1,
                description: "Analizar el mapa de símbolos y dependencias usando Graft.".to_string(),
                is_completed: false,
            });
            steps.push(TaskStep {
                step_number: 2,
                description: "Modificar los archivos seleccionados para aplicar la optimización/refactorización.".to_string(),
                is_completed: false,
            });
            steps.push(TaskStep {
                step_number: 3,
                description: "Ejecutar la suite de compilación y pruebas para validar los cambios.".to_string(),
                is_completed: false,
            });
        } else if instruction_lower.contains("bug") || instruction_lower.contains("error") || instruction_lower.contains("fix") {
            steps.push(TaskStep {
                step_number: 1,
                description: "Localizar el error reproduciendo el fallo o inspeccionando los logs de auditoría.".to_string(),
                is_completed: false,
            });
            steps.push(TaskStep {
                step_number: 2,
                description: "Corregir la causa raíz en el código fuente.".to_string(),
                is_completed: false,
            });
            steps.push(TaskStep {
                step_number: 3,
                description: "Verificar la solución con pruebas de regresión locales.".to_string(),
                is_completed: false,
            });
        } else {
            // Plan general
            if has_graft {
                steps.push(TaskStep {
                    step_number: 1,
                    description: "Revisar la arquitectura del código en .stark_graft/graft_index.md.".to_string(),
                    is_completed: false,
                });
            }
            steps.push(TaskStep {
                step_number: if has_graft { 2 } else { 1 },
                description: format!("Ejecutar la instrucción del usuario: '{}'", instruction),
                is_completed: false,
            });
            steps.push(TaskStep {
                step_number: if has_graft { 3 } else { 2 },
                description: "Asegurar integridad ejecutando los tests del repositorio.".to_string(),
                is_completed: false,
            });
        }

        steps
    }
}

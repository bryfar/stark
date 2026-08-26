use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum PermissionMode {
    Plan,
    Manual,
    AcceptEdits,
    Auto,
    Bypass,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum PermissionDecision {
    Allow,
    Deny(String),
    Ask(String),
}

impl PermissionMode {
    /// Evalúa la decisión de permiso pura basada en el modo y las propiedades de la herramienta.
    pub fn decide(&self, is_read_only: bool, is_destructive: bool, tool_name: &str) -> PermissionDecision {
        match self {
            PermissionMode::Bypass => PermissionDecision::Allow,
            PermissionMode::Plan => {
                if is_read_only {
                    PermissionDecision::Allow
                } else {
                    PermissionDecision::Deny("El modo Plan solo permite operaciones de lectura.".to_string())
                }
            }
            PermissionMode::Manual => {
                if is_read_only {
                    PermissionDecision::Allow
                } else {
                    PermissionDecision::Ask(format!("¿Permitir ejecución de la herramienta '{}'?", tool_name))
                }
            }
            PermissionMode::AcceptEdits => {
                if is_read_only {
                    PermissionDecision::Allow
                } else if tool_name == "edit_file" || tool_name == "write_file" {
                    PermissionDecision::Allow
                } else {
                    PermissionDecision::Ask(format!("¿Permitir ejecución del comando/herramienta '{}'?", tool_name))
                }
            }
            PermissionMode::Auto => {
                if is_read_only {
                    PermissionDecision::Allow
                } else if is_destructive {
                    PermissionDecision::Ask(format!("La herramienta '{}' tiene impacto irreversible.", tool_name))
                } else {
                    PermissionDecision::Allow
                }
            }
        }
    }
}

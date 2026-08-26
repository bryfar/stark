pub mod fs;
pub mod shell;
pub mod skills;
pub mod input;
pub mod desktop;
pub mod seams;
pub mod web_search;
pub mod browser_use;

use serde_json::Value;

/// Trait unificado para las herramientas del agente (inspirado en tool_dispatch.zig).
pub trait Tool: Send + Sync {
    /// Nombre de la herramienta.
    fn name(&self) -> &str;

    /// Descripción corta (<=1KB).
    fn description(&self) -> &str;

    /// JSON Schema de parámetros.
    fn parameters_schema(&self) -> Value;

    /// Indica si la invocación con ciertos argumentos es puramente de lectura.
    fn is_read_only(&self, args: &Value) -> bool;

    /// Indica si la invocación realiza una acción irreversible o destructiva.
    fn is_destructive(&self, args: &Value) -> bool;

    /// Ejecuta la herramienta. Retorna el resultado plano o un mensaje de error legible.
    fn call(&self, args: Value, workspace_path: &str) -> Result<String, String>;
}

/// Registro y despachador de herramientas.
pub struct ToolRegistry {
    tools: Vec<Box<dyn Tool>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self { tools: Vec::new() }
    }

    pub fn register(&mut self, tool: Box<dyn Tool>) {
        self.tools.push(tool);
    }

    pub fn lookup(&self, name: &str) -> Option<&dyn Tool> {
        self.tools.iter().map(|t| t.as_ref()).find(|t| t.name() == name)
    }

    pub fn list_schemas(&self) -> Value {
        let schemas: Vec<Value> = self.tools.iter().map(|t| {
            serde_json::json!({
                "name": t.name(),
                "description": t.description(),
                "input_schema": t.parameters_schema(),
            })
        }).collect();
        Value::Array(schemas)
    }
}

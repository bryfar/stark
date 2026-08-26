use serde_json::Value;
use std::sync::Arc;
use crate::agent::tools::Tool;
use crate::eventsink::EventSink;
use crate::sandbox::{execute_sandboxed_command, SandboxMode};

/// Herramienta para ejecutar comandos de terminal de forma segura dentro del sandbox (bwrap/firejail).
pub struct ShellTool {
    sink: Arc<dyn EventSink>,
}

impl ShellTool {
    pub fn new(sink: Arc<dyn EventSink>) -> Self {
        Self { sink }
    }
}

impl Tool for ShellTool {
    fn name(&self) -> &str {
        "shell"
    }

    fn description(&self) -> &str {
        "Ejecuta un comando de terminal en un entorno aislado por sandbox (bubblewrap)."
    }

    fn parameters_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "command": { "type": "string" }
            },
            "required": ["command"]
        })
    }

    fn is_read_only(&self, _args: &Value) -> bool {
        false
    }

    fn is_destructive(&self, args: &Value) -> bool {
        let cmd = args["command"].as_str().unwrap_or("").to_lowercase();
        cmd.contains("rm ") 
            || cmd.contains("rf ") 
            || cmd.contains("delete") 
            || cmd.contains("drop ") 
            || cmd.contains("clean ") 
            || cmd.contains("reset ")
    }

    fn call(&self, args: Value, workspace_path: &str) -> Result<String, String> {
        let cmd_str = args["command"].as_str().ok_or("Parámetro 'command' inválido")?;

        // Ejecutar de forma asíncrona pero bloqueando para el dispatch del agente (bucle por turnos)
        let rt = tokio::runtime::Handle::current();
        let sink = Arc::clone(&self.sink);
        let workspace_path_str = workspace_path.to_string();
        let cmd_str_clone = cmd_str.to_string();

        let result = rt.block_on(async move {
            execute_sandboxed_command(
                &cmd_str_clone,
                &workspace_path_str,
                SandboxMode::Perimeter,
                300, // 5 minutos de timeout por defecto
                sink
            ).await
        });

        match result {
            Ok(res) => {
                if res.exit_code == 0 {
                    Ok(res.stdout)
                } else {
                    Err(format!("Exit code {}. stderr: {}", res.exit_code, res.stderr))
                }
            }
            Err(e) => Err(format!("Error de ejecución en sandbox: {}", e))
        }
    }
}

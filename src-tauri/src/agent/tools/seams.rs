use crate::sandbox::{execute_sandboxed_command, SandboxMode};
use crate::eventsink::SharedSink;
use std::sync::Arc;

/// Interfaz abstracta para la ejecución de comandos (Seams pattern).
pub trait TerminalProvider: Send + Sync {
    fn execute(&self, command: &str, workspace_path: &str) -> Result<String, String>;
}

/// Implementación 1: Ejecución en Sandbox (por defecto en producción).
pub struct SandboxedTerminalProvider {
    pub sink: SharedSink,
}

impl TerminalProvider for SandboxedTerminalProvider {
    fn execute(&self, command: &str, workspace_path: &str) -> Result<String, String> {
        let rt = tokio::runtime::Handle::current();
        let sink = Arc::clone(&self.sink);
        let workspace_str = workspace_path.to_string();
        let cmd_str = command.to_string();

        let result = rt.block_on(async move {
            execute_sandboxed_command(
                &cmd_str,
                &workspace_str,
                SandboxMode::Perimeter,
                300,
                sink
            ).await
        });

        match result {
            Ok(res) if res.exit_code == 0 => Ok(res.stdout),
            Ok(res) => Err(format!("Exit code {}. stderr: {}", res.exit_code, res.stderr)),
            Err(e) => Err(format!("Error en sandbox: {}", e))
        }
    }
}

/// Implementación 2: Ejecución directa en Host (bypass sandbox).
pub struct LocalTerminalProvider;

impl TerminalProvider for LocalTerminalProvider {
    fn execute(&self, command: &str, workspace_path: &str) -> Result<String, String> {
        let rt = tokio::runtime::Handle::current();
        let cmd_str = command.to_string();
        let workspace_str = workspace_path.to_string();

        let result = rt.block_on(async move {
            tokio::process::Command::new("sh")
                .arg("-c")
                .arg(&cmd_str)
                .current_dir(workspace_str)
                .output()
                .await
        });

        match result {
            Ok(out) if out.status.success() => Ok(String::from_utf8_lossy(&out.stdout).to_string()),
            Ok(out) => Err(format!("Falló. stderr: {}", String::from_utf8_lossy(&out.stderr))),
            Err(e) => Err(format!("Error de ejecución: {}", e))
        }
    }
}

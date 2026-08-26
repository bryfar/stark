use crate::eventsink::SharedSink;
use serde::{Deserialize, Serialize};
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::time::{timeout, Duration};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SandboxMode {
    SynchronizedCopy,
    Perimeter,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalChunk {
    pub stream: String, // "stdout" | "stderr"
    pub line: String,
}

pub async fn execute_sandboxed_command(
    cmd_str: &str,
    workspace_path: &str,
    mode: SandboxMode,
    timeout_secs: u64,
    sink: SharedSink,
) -> Result<ExecutionResult, String> {
    // Si bwrap o firejail existen en el sistema, envolver el comando
    let mut bwrap_cmd = Command::new("bwrap");
    bwrap_cmd
        .arg("--ro-bind")
        .arg("/")
        .arg("/")
        .arg("--dev")
        .arg("/dev")
        .arg("--proc")
        .arg("/proc")
        .arg("--bind")
        .arg(workspace_path)
        .arg(workspace_path)
        .arg("--chdir")
        .arg(workspace_path);

    if mode == SandboxMode::Perimeter {
        bwrap_cmd.arg("--unshare-net");
    }

    bwrap_cmd.arg("bash").arg("-c").arg(cmd_str);

    bwrap_cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = match bwrap_cmd.spawn() {
        Ok(c) => c,
        Err(_) => {
            // Fallback directo a bash si bwrap no está instalado en la distro del usuario
            let mut fallback_cmd = Command::new("bash");
            fallback_cmd
                .arg("-c")
                .arg(cmd_str)
                .current_dir(workspace_path)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            fallback_cmd
                .spawn()
                .map_err(|e| format!("Error iniciando subproceso terminal: {}", e))?
        }
    };

    let stdout = child.stdout.take().ok_or("No se pudo capturar stdout")?;
    let stderr = child.stderr.take().ok_or("No se pudo capturar stderr")?;

    let stdout_sink = Arc::clone(&sink);
    let stderr_sink = Arc::clone(&sink);

    let stdout_task = tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        let mut captured = String::new();
        while let Ok(Some(line)) = reader.next_line().await {
            captured.push_str(&line);
            captured.push('\n');
            stdout_sink.emit(
                "terminal:stdout",
                serde_json::to_value(TerminalChunk {
                    stream: "stdout".to_string(),
                    line,
                })
                .unwrap_or_default(),
            );
        }
        captured
    });

    let stderr_task = tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        let mut captured = String::new();
        while let Ok(Some(line)) = reader.next_line().await {
            captured.push_str(&line);
            captured.push('\n');
            stderr_sink.emit(
                "terminal:stderr",
                serde_json::to_value(TerminalChunk {
                    stream: "stderr".to_string(),
                    line,
                })
                .unwrap_or_default(),
            );
        }
        captured
    });

    let exec_future = async {
        let status = child.wait().await.map_err(|e| e.to_string())?;
        let stdout_str = stdout_task.await.map_err(|e| e.to_string())?;
        let stderr_str = stderr_task.await.map_err(|e| e.to_string())?;
        Ok::<ExecutionResult, String>(ExecutionResult {
            exit_code: status.code().unwrap_or(-1),
            stdout: stdout_str,
            stderr: stderr_str,
        })
    };

    match timeout(Duration::from_secs(timeout_secs), exec_future).await {
        Ok(res) => {
            let exit_code = match &res {
                Ok(r) => r.exit_code,
                Err(_) => -1,
            };
            sink.emit("terminal:exit", serde_json::json!(exit_code));
            res
        }
        Err(_) => {
            let _ = child.kill().await;
            sink.emit("terminal:exit", serde_json::json!(-1));
            Err(format!(
                "El comando excedió el tiempo límite de ejecución ({:?}s)",
                timeout_secs
            ))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sandbox_mode_serialization() {
        let mode = SandboxMode::Perimeter;
        let json = serde_json::to_string(&mode).unwrap();
        let deserialized: SandboxMode = serde_json::from_str(&json).unwrap();
        assert_eq!(mode, deserialized);
    }
}

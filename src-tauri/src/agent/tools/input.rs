use std::process::Command;
use serde_json::Value;
use crate::agent::tools::Tool;

/// Herramienta para simular pulsaciones físicas de teclado en la ventana activa (estilo Omarchy/Voxtype).
pub struct DesktopInputTool;

impl DesktopInputTool {
    /// Determina el mejor motor de escritura disponible en el sistema.
    fn get_available_typing_backend(&self) -> &'static str {
        if Command::new("wtype").arg("-h").output().is_ok() {
            return "wtype";
        }
        if Command::new("dotool").arg("-h").output().is_ok() {
            return "dotool";
        }
        if Command::new("ydotool").arg("-h").output().is_ok() {
            return "ydotool";
        }
        "clipboard"
    }

    /// Escribe texto simulando pulsaciones físicas.
    fn simulate_typing(&self, text: &str, backend: &str) -> Result<(), String> {
        match backend {
            "wtype" => {
                Command::new("wtype")
                    .arg(text)
                    .status()
                    .map_err(|e| format!("wtype falló: {}", e))?;
            }
            "dotool" => {
                let mut child = Command::new("dotool")
                    .arg("type")
                    .stdin(std::process::Stdio::piped())
                    .spawn()
                    .map_err(|e| format!("Error iniciando dotool: {}", e))?;
                
                if let Some(mut stdin) = child.stdin.take() {
                    use std::io::Write;
                    let _ = stdin.write_all(text.as_bytes());
                }
                child.wait().map_err(|e| format!("dotool no terminó: {}", e))?;
            }
            "ydotool" => {
                Command::new("ydotool")
                    .arg("type")
                    .arg(text)
                    .status()
                    .map_err(|e| format!("ydotool falló: {}", e))?;
            }
            _ => {
                // Fallback: clipboard + simulador de Ctrl+V
                let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok();
                let copy_cmd = if is_wayland { "wl-copy" } else { "xclip -selection clipboard" };
                
                let mut child = Command::new("sh")
                    .arg("-c")
                    .arg(copy_cmd)
                    .stdin(std::process::Stdio::piped())
                    .spawn()
                    .map_err(|e| format!("Error cargando en portapapeles: {}", e))?;
                
                if let Some(mut stdin) = child.stdin.take() {
                    use std::io::Write;
                    let _ = stdin.write_all(text.as_bytes());
                }
                child.wait().map_err(|e| format!("Fallo al copiar al portapapeles: {}", e))?;
            }
        }
        Ok(())
    }
}

impl Tool for DesktopInputTool {
    fn name(&self) -> &str {
        "desktop_type"
    }

    fn description(&self) -> &str {
        "Escribe texto simulando pulsaciones de teclado físicas sobre la aplicación enfocada actualmente."
    }

    fn parameters_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "text": { "type": "string", "description": "El texto que se desea escribir de manera automatizada" }
            },
            "required": ["text"]
        })
    }

    fn is_read_only(&self, _args: &Value) -> bool {
        false
    }

    fn is_destructive(&self, _args: &Value) -> bool {
        false
    }

    fn call(&self, args: Value, _workspace_path: &str) -> Result<String, String> {
        let text = args["text"].as_str().ok_or("Parámetro 'text' inválido o faltante.")?;
        let backend = self.get_available_typing_backend();
        self.simulate_typing(text, backend)?;
        Ok(format!("Texto escrito con éxito usando backend: {}", backend))
    }
}

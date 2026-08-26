use std::process::Command;
use serde_json::Value;
use crate::agent::tools::Tool;

/// Herramienta para realizar acciones abstractas de control sobre el sistema de escritorio.
pub struct DesktopControlTool;

impl Tool for DesktopControlTool {
    fn name(&self) -> &str {
        "desktop_control"
    }

    fn description(&self) -> &str {
        "Ejecuta controles abstractos de escritorio: capture (captura de pantalla), audio_mute (silenciar audio), active_window (obtener ventana activa)."
    }

    fn parameters_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "action": { "type": "string", "enum": ["capture", "audio_mute", "active_window"], "description": "Acción de control a ejecutar" }
            },
            "required": ["action"]
        })
    }

    fn is_read_only(&self, args: &Value) -> bool {
        args["action"].as_str() == Some("active_window")
    }

    fn is_destructive(&self, _args: &Value) -> bool {
        false
    }

    fn call(&self, args: Value, _workspace_path: &str) -> Result<String, String> {
        let action = args["action"].as_str().ok_or("Parámetro 'action' inválido o faltante.")?;

        match action {
            "capture" => {
                let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok();
                let output_path = "/tmp/stark_screenshot.png";
                
                let status = if is_wayland {
                    Command::new("grim").arg(output_path).status()
                } else {
                    Command::new("maim").arg(output_path).status()
                };

                match status {
                    Ok(s) if s.success() => Ok(format!("Captura de pantalla tomada con éxito y guardada en '{}'", output_path)),
                    _ => Err("Error al capturar la pantalla. Compruebe que grim o maim estén instalados.".to_string())
                }
            }
            "audio_mute" => {
                let res = Command::new("pactl")
                    .args(["set-sink-mute", "@DEFAULT_SINK@", "toggle"])
                    .status();

                match res {
                    Ok(s) if s.success() => Ok("El estado de silencio de audio fue alternado con éxito.".to_string()),
                    _ => Err("Error alternando el silencio del audio. Asegúrese de que pulseaudio/pipewire está activo.".to_string())
                }
            }
            "active_window" => {
                let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok();
                if is_wayland {
                    let out = Command::new("hyprctl").arg("activewindow").output();
                    if let Ok(o) = out {
                        return Ok(String::from_utf8_lossy(&o.stdout).to_string());
                    }
                }
                
                let out = Command::new("xdotool").args(["getactivewindow", "getwindowname"]).output();
                match out {
                    Ok(o) => Ok(String::from_utf8_lossy(&o.stdout).to_string()),
                    _ => Err("No se pudo detectar la ventana enfocada. Instale xdotool o compruebe el compositor.".to_string())
                }
            }
            _ => Err("Acción de control desconocida.".to_string())
        }
    }
}

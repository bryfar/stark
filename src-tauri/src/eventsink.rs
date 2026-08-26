//! Sink de eventos del agente: desacopla el bucle de ejecución de la vista.
//!
//! Antes de este módulo, `AgentRuntime` y `sandbox` sostenían un `AppHandle`
//! de Tauri y emitan directo al webview, lo que hacía imposible correr el
//! agente headless (CLI) o en pruebas sin webview. Ahora todo productor de
//! eventos depende solo del trait [`EventSink`] y la vista es un detalle.

use serde_json::Value;
use std::io::Write;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

/// Destino abstracto de los eventos del runtime del agente.
///
/// Object-safe a propósito: `AgentRuntime`, `ShellTool` y `sandbox` lo guardan
/// como `Arc<dyn EventSink>` para poder intercambiar webview, CLI y tests.
pub trait EventSink: Send + Sync {
    /// Emite un evento con nombre y payload serializado.
    ///
    /// Los productores tratan el fallo como no fatal (los call sites actuales
    /// ya ignoraban el resultado de `AppHandle::emit`).
    fn emit(&self, event: &str, payload: Value);
}

/// Sink de producción: reenvía al webview via el bus de eventos de Tauri.
pub struct WebviewSink {
    app: AppHandle,
}

impl WebviewSink {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }
}

impl EventSink for WebviewSink {
    fn emit(&self, event: &str, payload: Value) {
        let _ = self.app.emit(event, payload);
    }
}

/// Sink headless: una línea por evento hacia un writer arbitrario.
///
/// Con `json = true` imprime el contrato JSONL `{"event":..,"data":..}` (una
/// línea por evento, mismo contrato que los eventos IPC). Con `json = false`
/// imprime texto legible para humanos. El writer es genérico para poder
/// probar contra un buffer en memoria.
pub struct CliSink<W: Write + Send + 'static> {
    writer: std::sync::Mutex<W>,
    json: bool,
}

impl Default for CliSink<std::io::Stdout> {
    fn default() -> Self {
        Self::stdout(false)
    }
}

impl CliSink<std::io::Stdout> {
    pub fn stdout(json: bool) -> Self {
        Self {
            writer: std::sync::Mutex::new(std::io::stdout()),
            json,
        }
    }
}

impl<W: Write + Send + 'static> CliSink<W> {
    pub fn with_writer(writer: W, json: bool) -> Self {
        Self {
            writer: std::sync::Mutex::new(writer),
            json,
        }
    }

    /// Representación textual de un evento agent-step para modo humano.
    fn render_step_text(step: u32, stage: &str, details: Option<&str>) -> String {
        match details {
            Some(d) => format!("[step {}] {}: {}", step, stage, d),
            None => format!("[step {}] {}", step, stage),
        }
    }
}

impl<W: Write + Send + 'static> EventSink for CliSink<W> {
    fn emit(&self, event: &str, payload: Value) {
        let mut w = match self.writer.lock() {
            Ok(w) => w,
            Err(_) => return,
        };
        let result: std::io::Result<()> = if self.json {
            let line = serde_json::json!({ "event": event, "data": payload }).to_string();
            w.write_all(line.as_bytes()).and_then(|_| w.write_all(b"\n"))
        } else if event == "agent-step" && payload["stage"].is_string() {
            writeln!(
                w,
                "{}",
                Self::render_step_text(
                    payload["step"].as_u64().unwrap_or(0) as u32,
                    payload["stage"].as_str().unwrap_or("?"),
                    payload["details"].as_str()
                )
            )
        } else {
            writeln!(w, "[{}] {}", event, payload)
        };
        let _ = result;
        let _ = w.flush();
    }
}

/// Alias cómodo para los dueños de un sink compartido.
pub type SharedSink = Arc<dyn EventSink>;

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    /// Buffer compartido para capturar lo que el sink escribe.
    #[derive(Clone, Default)]
    struct SharedBuf(Arc<Mutex<Vec<u8>>>);

    impl Write for SharedBuf {
        fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
            self.0.lock().unwrap().extend_from_slice(buf);
            Ok(buf.len())
        }
        fn flush(&mut self) -> std::io::Result<()> {
            Ok(())
        }
    }

    fn emit_sample_events(json: bool) -> String {
        let buf = SharedBuf::default();
        let sink = CliSink::with_writer(buf.clone(), json);
        sink.emit(
            "agent-step",
            serde_json::json!({ "step": 1, "stage": "start", "details": "hola" }),
        );
        sink.emit("terminal:exit", serde_json::json!(0));
        let out = {
            let guard = buf.0.lock().unwrap();
            String::from_utf8(guard.clone()).unwrap()
        };
        out
    }

    #[test]
    fn json_mode_emits_one_jsonl_line_per_event() {
        let out = emit_sample_events(true);
        let mut lines = out.lines();

        let first: Value = serde_json::from_str(lines.next().unwrap()).unwrap();
        assert_eq!(first["event"], "agent-step");
        assert_eq!(first["data"]["step"], 1);
        assert_eq!(first["data"]["stage"], "start");
        assert_eq!(first["data"]["details"], "hola");

        let second: Value = serde_json::from_str(lines.next().unwrap()).unwrap();
        assert_eq!(second["event"], "terminal:exit");
        assert_eq!(second["data"], 0);

        assert_eq!(lines.next(), None, "exactamente una línea por evento");
    }

    #[test]
    fn text_mode_renders_human_steps_without_json() {
        let out = emit_sample_events(false);
        assert!(
            out.contains("[step 1] start: hola"),
            "formato humano esperado, obtuve: {:?}",
            out
        );
        assert!(!out.contains("\"event\""), "texto, no JSONL");
    }

    #[test]
    fn sinks_are_shareable_as_dyn_event_sink() {
        // Garantía estructural del refactor: cualquier sink vive detrás de dyn EventSink.
        let sinks: Vec<Arc<dyn EventSink>> =
            vec![Arc::new(CliSink::stdout(false)), Arc::new(CliSink::stdout(true))];
        for sink in sinks {
            sink.emit("agent-step", serde_json::json!({ "stage": "done" }));
        }
    }
}

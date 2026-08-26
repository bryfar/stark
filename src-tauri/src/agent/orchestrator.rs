use crate::agent::prompt::SYSTEM_PROMPT;
use crate::agent::prompt::EphemeralOverlay;
use crate::agent::permissions::modes::{PermissionMode, PermissionDecision};
use crate::agent::permissions::classifier::LlmClassifier;
use crate::agent::tools::ToolRegistry;
use crate::agent::tools::fs::{ReadFileTool, EditFileTool};
use crate::agent::tools::shell::ShellTool;
use crate::eventsink::{EventSink, SharedSink};

use crate::agent::tools::skills::LoadSkillTool;
use crate::agent::tools::input::DesktopInputTool;
use crate::agent::tools::desktop::DesktopControlTool;
use crate::agent::tools::web_search::WebSearchTool;
use crate::agent::tools::browser_use::BrowserUseTool;
use std::sync::Arc;

pub struct AgentRuntime {
    sink: SharedSink,
    tool_registry: ToolRegistry,
    classifier: LlmClassifier,
}

impl AgentRuntime {
    pub fn new(sink: Arc<dyn EventSink>) -> Self {
        let mut tool_registry = ToolRegistry::new();
        tool_registry.register(Box::new(ReadFileTool));
        tool_registry.register(Box::new(EditFileTool));
        tool_registry.register(Box::new(ShellTool::new(Arc::clone(&sink))));
        tool_registry.register(Box::new(LoadSkillTool));
        tool_registry.register(Box::new(DesktopInputTool));
        tool_registry.register(Box::new(DesktopControlTool));
        tool_registry.register(Box::new(WebSearchTool));
        tool_registry.register(Box::new(BrowserUseTool));

        Self {
            sink,
            tool_registry,
            classifier: LlmClassifier,
        }
    }

    /// Emite un evento de progreso del bucle al sink (webview o CLI).
    fn emit_step(&self, step: u32, stage: &str, details: Option<String>) {
        self.sink.emit(
            "agent-step",
            serde_json::json!({
                "step": step,
                "stage": stage,
                "details": details,
            }),
        );
    }

    /// Orquesta el bucle de ejecución por pasos del agente (inspirado en orchestrator.zig).
    pub async fn run_turn(
        &self,
        prompt: String,
        workspace_path: String,
        mode: PermissionMode,
        step_limit: u32,
    ) -> Result<String, String> {
        let mut current_step = 0;
        let mut message_history = vec![
            serde_json::json!({ "role": "system", "content": SYSTEM_PROMPT })
        ];

        let learned_rules = crate::agent::hermes::learning::HermesLearningLoop::read_rules(&workspace_path);
        let overlay = EphemeralOverlay {
            cwd: workspace_path.clone(),
            git_branch: "main".to_string(), // En producción se consulta via command
            date: chrono::Local::now().to_rfc3339(),
            learned_rules,
        };

        // Emitir inicio de bucle
        self.emit_step(current_step, "start", Some("Iniciando bucle del agente.".to_string()));

        while current_step < step_limit {
            current_step += 1;

            // 1. Reensamblar mensaje con overlay dinámico
            let overlay_str = overlay.render();
            self.emit_step(
                current_step,
                "prompt_prep",
                Some(format!("Paso {}: Preparando contexto y overlay.\n{}", current_step, overlay_str)),
            );

            // En una ejecución real de LLM streaming, se enviaría el historial completo + overlay.
            // Para esta versión autocontenida de Stark, emulamos una iteración de ejecución de herramientas.
            self.emit_step(current_step, "llm_request", Some("Solicitando predicción al LLM...".to_string()));

            // Simulamos detección de tool call o finalización del bucle.
            // Si el prompt pide listar o editar, despachamos a la herramienta correspondiente.
            let prompt_lower = prompt.to_lowercase();
            let (tool_name, tool_args) = if prompt_lower.contains("leer") || prompt_lower.contains("read") {
                ("read_file", serde_json::json!({ "path": "README.md", "limit_lines": 10 }))
            } else if prompt_lower.contains("editar") || prompt_lower.contains("edit") {
                ("edit_file", serde_json::json!({ "path": "src/App.jsx", "old_string": "const App", "new_string": "const App" }))
            } else if prompt_lower.contains("ejecutar") || prompt_lower.contains("run") {
                ("shell", serde_json::json!({ "command": "echo 'Stark agent check'" }))
            } else {
                // No hay tool calls, finalizamos el bucle
                break;
            };

            // 2. Despachar herramienta
            if let Some(tool) = self.tool_registry.lookup(tool_name) {
                let is_read_only = tool.is_read_only(&tool_args);
                let is_destructive = tool.is_destructive(&tool_args);

                // Evaluar con el Gate de Permisos
                let mut decision = mode.decide(is_read_only, is_destructive, tool_name);

                // Si está en modo Auto y requiere confirmación, ejecutar clasificador LLM
                if mode == PermissionMode::Auto && decision == PermissionDecision::Allow {
                    decision = self.classifier.classify(tool_name, &tool_args.to_string()).await;
                }

                match decision {
                    PermissionDecision::Allow => {
                        self.emit_step(
                            current_step,
                            "tool_call",
                            Some(format!("Ejecutando herramienta '{}' automáticamente.", tool_name)),
                        );

                        match tool.call(tool_args, &workspace_path) {
                            Ok(res) => {
                                self.emit_step(
                                    current_step,
                                    "tool_result",
                                    Some(format!("Éxito en herramienta '{}'.", tool_name)),
                                );
                                // Añadir resultado al historial
                                message_history.push(serde_json::json!({ "role": "tool", "content": res }));
                            }
                            Err(err) => {
                                self.emit_step(
                                    current_step,
                                    "error",
                                    Some(format!("Fallo en herramienta '{}': {}", tool_name, err)),
                                );
                                return Err(err);
                            }
                        }
                    }
                    PermissionDecision::Ask(reason) => {
                        self.emit_step(
                            current_step,
                            "tool_call",
                            Some(format!("Aprobación requerida para '{}': {}", tool_name, reason)),
                        );
                        // En modo interactivo real, aquí se suspende la ejecución hasta el IPC de respuesta.
                        return Ok(format!("Aprobación Requerida (Gate): {}", reason));
                    }
                    PermissionDecision::Deny(reason) => {
                        self.emit_step(
                            current_step,
                            "error",
                            Some(format!("Acción denegada por política de permisos: {}", reason)),
                        );
                        return Err(format!("Acción denegada: {}", reason));
                    }
                }
            } else {
                break;
            }
        }

        self.emit_step(current_step, "done", Some("Ejecución del bucle completada con éxito.".to_string()));

        Ok("Turno del agente ejecutado con éxito.".to_string())
    }
}

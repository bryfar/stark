use crate::agent::tools::Tool;
use serde_json::Value;
use std::process::Command;
use std::path::Path;

pub struct BrowserUseTool;

impl Tool for BrowserUseTool {
    fn name(&self) -> &str {
        "browser_use"
    }

    fn description(&self) -> &str {
        "Navega y ejecuta automatizaciones visuales en sitios web utilizando Playwright en segundo plano."
    }

    fn parameters_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "task": {
                    "type": "string",
                    "description": "La instrucción o tarea de automatización a realizar (ej. 'Buscar Stark Agent en Google y traerme el primer link')."
                },
                "provider": {
                    "type": "string",
                    "description": "El nombre del proveedor de LLM a utilizar (openai, anthropic, gemini, ollama)."
                },
                "model": {
                    "type": "string",
                    "description": "El nombre del modelo de lenguaje."
                }
            },
            "required": ["task"]
        })
    }

    fn is_read_only(&self, _args: &Value) -> bool {
        true
    }

    fn is_destructive(&self, _args: &Value) -> bool {
        false
    }

    fn call(&self, args: Value, workspace_path: &str) -> Result<String, String> {
        let task = args["task"].as_str().ok_or("Parámetro 'task' inválido")?;
        let provider = args["provider"].as_str().unwrap_or("openai");
        let model = args["model"].as_str().unwrap_or("gpt-4o");

        let api_key = crate::storage::providers_store::load_api_key(provider).ok().flatten();
        let base_url = crate::storage::providers_store::get_provider(provider)
            .ok()
            .flatten()
            .and_then(|p| p.base_url);

        let runner_path = Path::new(workspace_path).join("tools").join("browser_use_runner.py");
        if !runner_path.exists() {
            return Err("Error: No se encontró el script sidecar tools/browser_use_runner.py".to_string());
        }

        let payload = serde_json::json!({
            "task": task,
            "provider": provider,
            "model": model,
            "api_key": api_key,
            "base_url": base_url
        });

        let payload_str = serde_json::to_string(&payload)
            .map_err(|e| format!("Error serializando payload: {}", e))?;

        let output = Command::new(&runner_path)
            .arg(&payload_str)
            .current_dir(runner_path.parent().unwrap())
            .output()
            .map_err(|e| format!("Error ejecutando browser-use: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        if output.status.success() {
            if let Ok(res_json) = serde_json::from_str::<Value>(&stdout) {
                if let Some(res) = res_json["final_result"].as_str() {
                    return Ok(res.to_string());
                }
            }
            Ok(stdout)
        } else {
            Err(format!("Browser-Use falló: {}\n{}", stderr, stdout))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_browser_use_metadata() {
        let tool = BrowserUseTool;
        assert_eq!(tool.name(), "browser_use");
        assert!(tool.is_read_only(&serde_json::Value::Null));
        assert!(!tool.is_destructive(&serde_json::Value::Null));
    }

    #[test]
    fn test_browser_use_requires_task() {
        let tool = BrowserUseTool;
        let args = serde_json::json!({});
        let res = tool.call(args, "/tmp");
        assert!(res.is_err());
        assert_eq!(res.err().unwrap(), "Parámetro 'task' inválido");
    }
}

use crate::agent::tools::Tool;
use serde_json::Value;
use std::env;

pub struct WebSearchTool;

impl Tool for WebSearchTool {
    fn name(&self) -> &str {
        "web_search"
    }

    fn description(&self) -> &str {
        "Busca información en tiempo real en internet usando Tavily API y retorna una síntesis limpia en Markdown."
    }

    fn parameters_schema(&self) -> Value {
        serde_json::json!({
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "La consulta de búsqueda a realizar."
                },
                "max_results": {
                    "type": "integer",
                    "description": "Número máximo de resultados (por defecto 5)."
                }
            },
            "required": ["query"]
        })
    }

    fn is_read_only(&self, _args: &Value) -> bool {
        true
    }

    fn is_destructive(&self, _args: &Value) -> bool {
        false
    }

    fn call(&self, args: Value, _workspace_path: &str) -> Result<String, String> {
        let query = args["query"].as_str().ok_or("Parámetro 'query' inválido")?;
        let max_results = args["max_results"].as_u64().unwrap_or(5) as usize;

        // Intentar obtener la API key de Tavily desde el entorno o el almacén cifrado
        let api_key = env::var("TAVILY_API_KEY")
            .or_else(|_| crate::storage::load_encrypted_value("tavily_api_key"))
            .map_err(|_| {
                "Error: No se encontró la API Key de Tavily. Por favor configura la variable de entorno TAVILY_API_KEY o guárdala en el Vault."
                    .to_string()
            })?;

        let client = reqwest::blocking::Client::new();
        let payload = serde_json::json!({
            "api_key": api_key,
            "query": query,
            "max_results": max_results,
            "search_depth": "basic",
            "include_answer": true
        });

        let resp = client
            .post("https://api.tavily.com/search")
            .json(&payload)
            .send()
            .map_err(|e| format!("Error en conexión con Tavily: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("Tavily respondió con error HTTP: {}", resp.status()));
        }

        let result_json: Value = resp
            .json()
            .map_err(|e| format!("Error parseando respuesta de Tavily: {}", e))?;

        let mut markdown_output = String::new();

        if let Some(answer) = result_json["answer"].as_str() {
            markdown_output.push_str(&format!("### Síntesis Rápida:\n{}\n\n", answer));
        }

        markdown_output.push_str("### Resultados de la búsqueda:\n\n");

        if let Some(results) = result_json["results"].as_array() {
            for (idx, r) in results.iter().enumerate() {
                let title = r["title"].as_str().unwrap_or("Sin Título");
                let url = r["url"].as_str().unwrap_or("#");
                let content = r["content"].as_str().unwrap_or("");
                markdown_output.push_str(&format!(
                    "{}. **[{}]({})**\n   {}\n\n",
                    idx + 1,
                    title,
                    url,
                    content
                ));
            }
        } else {
            markdown_output.push_str("No se encontraron resultados de búsqueda.\n");
        }

        Ok(markdown_output)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_web_search_metadata() {
        let tool = WebSearchTool;
        assert_eq!(tool.name(), "web_search");
        assert!(tool.is_read_only(&serde_json::Value::Null));
        assert!(!tool.is_destructive(&serde_json::Value::Null));
    }

    #[test]
    fn test_web_search_requires_query() {
        let tool = WebSearchTool;
        let args = serde_json::json!({});
        let res = tool.call(args, "/tmp");
        assert!(res.is_err());
        assert_eq!(res.err().unwrap(), "Parámetro 'query' inválido");
    }

    #[test]
    fn test_web_search_missing_key() {
        let tool = WebSearchTool;
        let args = serde_json::json!({
            "query": "rust programming language"
        });
        
        // Ensure no Tavily env key is present during this test block
        let original_key = std::env::var("TAVILY_API_KEY");
        std::env::remove_var("TAVILY_API_KEY");

        let res = tool.call(args, "/tmp");
        assert!(res.is_err());
        assert!(res.err().unwrap().contains("No se encontró la API Key"));

        // Restore env key if it was present
        if let Ok(key) = original_key {
            std::env::set_var("TAVILY_API_KEY", key);
        }
    }
}

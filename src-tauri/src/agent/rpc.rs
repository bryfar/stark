use tokio::net::TcpListener;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use serde_json::Value;
use std::sync::Arc;
use tauri::AppHandle;
use crate::agent::AgentRuntime;
use crate::agent::permissions::modes::PermissionMode;
use crate::eventsink::WebviewSink;

pub struct RpcServer {
    app: AppHandle,
    port: u16,
}

impl RpcServer {
    pub fn new(app: AppHandle, port: u16) -> Self {
        Self { app, port }
    }

    /// Inicia el servidor RPC de Stark en un hilo en segundo plano (estilo pi.dev).
    pub async fn start(self) {
        let addr = format!("127.0.0.1:{}", self.port);
        let listener = match TcpListener::bind(&addr).await {
            Ok(l) => l,
            Err(_) => return, // Silencioso si el puerto está ocupado o no disponible
        };

        let app_shared = Arc::new(self.app);

        tokio::spawn(async move {
            while let Ok((stream, _)) = listener.accept().await {
                let app = Arc::clone(&app_shared);
                tokio::spawn(async move {
                    let (reader, mut writer) = tokio::io::split(stream);
                    let mut buf_reader = BufReader::new(reader);
                    let mut line = String::new();

                    while let Ok(n) = buf_reader.read_line(&mut line).await {
                        if n == 0 {
                            break;
                        }

                        let response = match serde_json::from_str::<Value>(&line) {
                            Ok(req) => {
                                let command = req["command"].as_str().unwrap_or("");
                                match command {
                                    "run_step" => {
                                        let instruction = req["payload"]["instruction"].as_str().unwrap_or("");
                                        let workspace = req["payload"]["workspace"].as_str().unwrap_or(".");
                                        
                                        // Ejecutar paso usando el runtime del agente
                                        let runtime = AgentRuntime::new(Arc::new(WebviewSink::new((*app).clone())));
                                        match runtime.run_turn(instruction.to_string(), workspace.to_string(), PermissionMode::Auto, 5).await {
                                            Ok(stdout) => serde_json::json!({
                                                "status": "success",
                                                "result": stdout
                                            }),
                                            Err(err) => serde_json::json!({
                                                "status": "error",
                                                "message": err
                                            })
                                        }
                                    }
                                    "ping" => serde_json::json!({
                                        "status": "success",
                                        "result": "pong"
                                    }),
                                    _ => serde_json::json!({
                                        "status": "error",
                                        "message": format!("Comando desconocido: {}", command)
                                    })
                                }
                            }
                            Err(e) => serde_json::json!({
                                "status": "error",
                                "message": format!("JSON inválido: {}", e)
                            })
                        };

                        let mut resp_bytes = serde_json::to_vec(&response).unwrap_or_default();
                        resp_bytes.push(b'\n');
                        if writer.write_all(&resp_bytes).await.is_err() {
                            break;
                        }
                        line.clear();
                    }
                });
            }
        });
    }
}

use crate::local::catalog::{CatalogEntry, Tier};
use crate::local::setup;
use std::net::TcpListener;
use std::process::Stdio;
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tokio::sync::Mutex as AsyncMutex;

const HOST: &str = "127.0.0.1";
const HEALTH_TIMEOUT_SECS: u64 = 120;

/// KV-cache backbone type: q8_0 halves the KV footprint versus f16 with
/// negligible quality loss, keeping the chat under the Tier RAM trench.
const CACHE_TYPE: &str = "q8_0";

/// Default context window per hardware tier (in tokens). Tension: a longer
/// window helps `repo_context` injection but costs RAM in the KV cache.
pub fn default_ctx_size(tier: Tier) -> usize {
    match tier {
        Tier::Lite => 4096,
        Tier::Basic => 8192,
        Tier::Standard => 16384,
        Tier::Pro => 32768,
    }
}

/// Minimum free-RAM cushion (MB) we insist on above the model blob before
/// running at the tier's full context window.
const RAM_CUSHION_MB: u64 = 512;

/// Arguments passed to `llama-server` for a catalog entry, tuned to the running
/// machine's available RAM. Pure so the exact invoke line is unit-testable.
///
/// - KV-cache is quantized to `q8_0` (halves KV memory vs f16).
/// - If available RAM cannot cover the model + cushion, the context window is
///   halved once (a single, deterministic clamp; no retry loop).
pub fn server_args(entry: &CatalogEntry, available_ram_mb: u64) -> Vec<String> {
    let mut ctx = default_ctx_size(entry.tier);
    let covered = available_ram_mb.saturating_sub(entry.ram_mb) >= RAM_CUSHION_MB;
    if !covered {
        ctx /= 2;
    }
    vec![
        "-c".to_string(),
        ctx.to_string(),
        "--cache-type-k".to_string(),
        CACHE_TYPE.to_string(),
        "--cache-type-v".to_string(),
        CACHE_TYPE.to_string(),
    ]
}

struct RunningServer {
    port: u16,
    model_id: String,
    child: tokio::process::Child,
}

impl RunningServer {
    fn alive(&mut self) -> bool {
        matches!(self.child.try_wait(), Ok(None))
    }

    fn kill(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

/// Cheap sync mirror of the running server, readable from any thread without
/// holding the async lock (used by status probes and app-exit cleanup).
struct ServerInfo {
    port: u16,
    pid: Option<u32>,
    model_id: Option<String>,
}

/// The authoritative handle. Held across spawn+health so two concurrent
/// `ensure_running` calls never start two servers.
static SERVER: OnceLock<AsyncMutex<Option<RunningServer>>> = OnceLock::new();
static INFO: OnceLock<Mutex<Option<ServerInfo>>> = OnceLock::new();

fn server_state() -> &'static AsyncMutex<Option<RunningServer>> {
    SERVER.get_or_init(|| AsyncMutex::new(None))
}

fn info_state() -> &'static Mutex<Option<ServerInfo>> {
    INFO.get_or_init(|| Mutex::new(None))
}

fn set_info_with_model(port: u16, pid: Option<u32>, model_id: String) {
    *info_state().lock().unwrap() = Some(ServerInfo {
        port,
        pid,
        model_id: Some(model_id),
    });
}

fn clear_info() {
    *info_state().lock().unwrap() = None;
}

pub fn base_url(port: u16) -> String {
    format!("http://{}:{}/v1", HOST, port)
}

fn health_url(port: u16) -> String {
    format!("http://{}:{}/health", HOST, port)
}

/// Sync status probe: the running server's OpenAI-compatible base URL, if any.
pub fn server_url_str() -> Option<String> {
    info_state().lock().unwrap().as_ref().map(|i| base_url(i.port))
}

/// Sync status probe: the catalog id of the model currently loaded, if any.
pub fn loaded_model_id() -> Option<String> {
    info_state().lock().unwrap().as_ref().and_then(|i| i.model_id.clone())
}

fn free_port() -> Result<u16, String> {
    let listener = TcpListener::bind((HOST, 0)).map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    drop(listener);
    Ok(port)
}

async fn wait_for_health(port: u16) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;
    let deadline = tokio::time::Instant::now() + Duration::from_secs(HEALTH_TIMEOUT_SECS);
    loop {
        if let Ok(resp) = client.get(health_url(port)).send().await {
            if resp.status().is_success() {
                return Ok(());
            }
        }
        if tokio::time::Instant::now() >= deadline {
            return Err(format!(
                "El motor local no respondio en {}s. Comprueba el modelo y el binario.",
                HEALTH_TIMEOUT_SECS
            ));
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    }
}

/// Kill the running server and clear state. Async (owns the child handle).
pub async fn stop_async() {
    let mut guard = server_state().lock().await;
    if let Some(mut server) = guard.take() {
        server.kill();
    }
    clear_info();
}

/// Kill the running server from a sync context (e.g. app exit). Sends SIGTERM
/// to the stored PID; the async handle is dropped and reaped by the OS on exit.
pub fn kill_sync() {
    if let Some(info) = info_state().lock().unwrap().take() {
        if let Some(pid) = info.pid {
            let _ = std::process::Command::new("kill")
                .args(["-TERM", &pid.to_string()])
                .output();
        }
    }
    *server_state().blocking_lock() = None;
}

/// Spawn (or reuse) a persistent llama-server for the catalog entry and return
/// the OpenAI-compatible base URL it is listening on. Restarts the server when a
/// different model is requested or the child has exited. Serialized so a burst
/// of local requests cannot start two servers.
pub async fn ensure_running(entry: &CatalogEntry) -> Result<String, String> {
    let mut guard = server_state().lock().await;

    if let Some(server) = guard.as_mut() {
        if server.model_id == entry.id && server.alive() {
            return Ok(base_url(server.port));
        }
    }

    if let Some(mut old) = guard.take() {
        old.kill();
    }
    clear_info();

    let bin = setup::binary_path();
    if !bin.exists() {
        return Err("El binario llama-server no esta instalado. Ejecuta local_setup.".to_string());
    }
    let model = setup::model_path(entry);
    if !model.exists() {
        return Err(format!(
            "El modelo {} no esta descargado. Ejecuta local_setup.",
            entry.id
        ));
    }

    let port = free_port()?;
    let bin_dir = bin
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| std::path::PathBuf::from("/tmp"));

    // Honour the Tier RAM trench (A1): request the tier's default context and a
    // q8_0 KV-cache, halving the window when available RAM is tight.
    let tuned = server_args(entry, crate::hardware::detect_hardware_tier().available_ram_mb);

    let child = tokio::process::Command::new(&bin)
        .current_dir(bin_dir)
        .args(["-m"])
        .arg(&model)
        .args(["--host", HOST, "--port", &port.to_string(), "-ngl", "0"])
        .args(tuned)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Error lanzando llama-server: {}", e))?;

    let pid = child.id();
    match wait_for_health(port).await {
        Ok(()) => {
            set_info_with_model(port, pid, entry.id.clone());
            *guard = Some(RunningServer {
                port,
                model_id: entry.id.clone(),
                child,
            });
            Ok(base_url(port))
        }
        Err(e) => {
            let mut dead = child;
            let _ = dead.kill();
            let _ = dead.wait();
            Err(e)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(tier: Tier, ram_mb: u64) -> CatalogEntry {
        CatalogEntry {
            id: "test".to_string(),
            repo: "repo".to_string(),
            file: "model.gguf".to_string(),
            bits: 2,
            quant: "Q2_K".to_string(),
            ram_mb,
            tier,
        }
    }

    #[test]
    fn base_url_format() {
        assert_eq!(base_url(11434), "http://127.0.0.1:11434/v1");
    }

    #[test]
    fn free_port_returns_ranged_port() {
        let port = free_port().unwrap();
        assert!((1..=65535).contains(&port));
    }

    #[test]
    fn ctx_size_follows_tier_linearly() {
        assert_eq!(default_ctx_size(Tier::Lite), 4096);
        assert_eq!(default_ctx_size(Tier::Basic), 8192);
        assert_eq!(default_ctx_size(Tier::Standard), 16384);
        assert_eq!(default_ctx_size(Tier::Pro), 32768);
    }

    #[test]
    fn server_args_use_full_window_when_ram_covered() {
        let e = entry(Tier::Standard, 2800);
        let args = server_args(&e, 20000);
        // ctx-size 16384, then q8_0 KV cache backbone.
        assert_eq!(
            args,
            vec![
                "-c", "16384",
                "--cache-type-k", "q8_0",
                "--cache-type-v", "q8_0",
            ]
        );
    }

    #[test]
    fn server_args_halve_window_when_ram_tight() {
        let e = entry(Tier::Standard, 2800);
        // Only 3200 MB available -> model (2800) leaves a 400 MB cushion
        // (below the 512 MB minimum), so the window is halved.
        let args = server_args(&e, 3200);
        assert_eq!(
            args,
            vec![
                "-c", "8192",
                "--cache-type-k", "q8_0",
                "--cache-type-v", "q8_0",
            ]
        );
    }

    #[test]
    fn server_args_keep_exact_layout_with_q8_cache() {
        let e = entry(Tier::Lite, 450);
        let args = server_args(&e, 8192);
        // 4 args lined as "-c <ctx> --cache-type-k q8_0 --cache-type-v q8_0".
        assert_eq!(args.len(), 6);
        assert_eq!(args[0], "-c");
        assert_eq!(args[2], "--cache-type-k");
        assert_eq!(args[3], "q8_0");
        assert_eq!(args[5], "q8_0");
    }
}

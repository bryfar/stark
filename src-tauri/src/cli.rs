//! CLI headless de stark: `stark prompt [--yolo] "<task>"`.
//!
//! Contrato público congelado en ADR 0002. El mismo binario despacha aquí
//! antes de levantar el webview (`lib.rs::run`), así que no hay IPC ni
//! ventana: los eventos del runtime salen por [`CliSink`].
//!
//! Exit codes: 0 tarea terminada · 1 error de runtime · 2 presupuesto/auth.

use crate::agent::orchestrator::AgentRuntime;
use crate::agent::permissions::modes::PermissionMode;
use crate::eventsink::CliSink;
use std::path::{Path, PathBuf};

/// Límite de pasos del bucle para tareas headless (los callers interactivos
/// usan 5; una tarea unattended pide más margen).
const CLI_STEP_LIMIT: u32 = 25;

pub const EXIT_OK: i32 = 0;
pub const EXIT_ERROR: i32 = 1;
pub const EXIT_BUDGET_OR_AUTH: i32 = 2;

/// Resultado de resolver la gate de consentimiento de `--yolo` (ADR 0002).
#[derive(Debug, PartialEq, Eq)]
pub enum YoloConsent {
    /// Consentimiento previo ya registrado o ack presente: proceder en Bypass.
    Granted,
    /// Primera vez sin ack: denegar con instrucciones explícitas.
    Required,
}

/// ¿Dónde debe arrancar una tarea lanzada desde `$HOME`?
///
/// Los agentes se niegan a recordar confianza para `$HOME`, así que un launch
/// desde home rebota a `~/Work` si existe (regla copiada de omarchy-agent).
/// Devuelve None cuando no aplica o no hay a donde ir.
pub fn workdir_for_launch(cwd: &Path, home: &Path) -> Option<PathBuf> {
    if cwd != home {
        return None;
    }
    let work = home.join("Work");
    if work.is_dir() {
        Some(work)
    } else {
        None
    }
}

/// Gate de `--yolo`: nunca persistente sin ack explícito.
///
/// - Sin marker y sin ack (`--i-understand` o env var) => [`YoloConsent::Required`].
/// - Con ack, o con marker de consentimiento previo => [`YoloConsent::Granted`]
///   (y en ese caso se persiste el marker).
pub fn resolve_yolo_consent(
    acknowledged: bool,
    env_acknowledged: bool,
    consent_marker_exists: bool,
    write_marker: impl FnOnce() -> Result<(), String>,
) -> Result<YoloConsent, String> {
    if consent_marker_exists || acknowledged || env_acknowledged {
        if !consent_marker_exists {
            write_marker()?;
        }
        Ok(YoloConsent::Granted)
    } else {
        Err(
            "--yolo ejecuta tareas sin pedir permiso. La primera vez exige confirmación \
             explícita: repite con --i-understand, o exporta STARK_ACK_YOLO=1."
                .to_string(),
        )
    }
}

fn storage_root() -> PathBuf {
    PathBuf::from(".crafter_storage")
}

fn yolo_consent_marker() -> PathBuf {
    storage_root().join("yolo-consent")
}

fn read_env_yolo_ack() -> bool {
    std::env::var("STARK_ACK_YOLO")
        .map(|v| !v.is_empty() && v != "0" && v.to_lowercase() != "false")
        .unwrap_or(false)
}

struct PromptArgs {
    task: String,
    mode: PermissionMode,
    cwd: Option<PathBuf>,
    json: bool,
    yolo: bool,
    yolo_ack: bool,
    help: bool,
}

fn parse_prompt_args<I: Iterator<Item = String>>(mut args: I) -> Result<PromptArgs, String> {
    let mut parsed = PromptArgs {
        task: String::new(),
        mode: PermissionMode::Manual,
        cwd: None,
        json: false,
        yolo: false,
        yolo_ack: false,
        help: false,
    };

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--yolo" => parsed.yolo = true,
            "--i-understand" => parsed.yolo_ack = true,
            "--json" => parsed.json = true,
            "--mode" => {
                let value = args
                    .next()
                    .ok_or_else(|| "El flag --mode requiere plan|build".to_string())?;
                parsed.mode = match value.as_str() {
                    "plan" => PermissionMode::Plan,
                    "build" => PermissionMode::Manual,
                    other => return Err(format!("Modo desconocido '{}'. Usa plan|build.", other)),
                };
            }
            "--cwd" => {
                let value = args
                    .next()
                    .ok_or_else(|| "El flag --cwd requiere una ruta".to_string())?;
                parsed.cwd = Some(PathBuf::from(value));
            }
            "-h" | "--help" | "help" => parsed.help = true,
            _ => {
                // El primer posicional es la tarea; el resto se concatena,
                // igual que `omarchy agent prompt "a b"`.
                if !parsed.task.is_empty() {
                    parsed.task.push(' ');
                }
                parsed.task.push_str(&arg);
            }
        }
    }

    Ok(parsed)
}

const USAGE: &str = "Uso: stark prompt [--yolo] [--i-understand] [--mode plan|build] [--cwd <dir>] [--json] \"<task>\"";

/// Punto de entrada del subcomando. Devuelve Some(exit_code) si el proceso fue
/// consumido por la CLI, None si debe arrancar la GUI.
pub fn dispatch_from_args(argv: Vec<String>) -> Option<i32> {
    match argv.get(1).map(String::as_str) {
        Some("prompt") => Some(run_prompt(&argv[2..])),
        // Reservado para futuras subcommands; hoy cualquier otra cosa abre la GUI.
        _ => None,
    }
}

fn run_prompt(rest: &[String]) -> i32 {
    let parsed = match parse_prompt_args(rest.iter().cloned()) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("{}", e);
            eprintln!("{}", USAGE);
            return EXIT_ERROR;
        }
    };

    if parsed.help || parsed.task.is_empty() {
        eprintln!("{}", USAGE);
        return if parsed.help { EXIT_OK } else { EXIT_ERROR };
    }

    // Regla ~/Work antes de tocar disco relativo (.crafter_storage es CWD-relative).
    if let Some(cwd) = parsed.cwd.clone() {
        if let Err(e) = std::env::set_current_dir(&cwd) {
            eprintln!("No se pudo cambiar al directorio {}: {}", cwd.display(), e);
            return EXIT_ERROR;
        }
    }
    if let Some(home) = dirs_next::home_dir() {
        if let Some(work) = workdir_for_launch(&std::env::current_dir().unwrap_or_default(), &home) {
            if let Err(e) = std::env::set_current_dir(&work) {
                eprintln!("Aviso: no se pudo entrar en ~/Work: {}", e);
            }
        }
    }

    // Presupuesto del free tier agotado => fallo de budget, no de runtime.
    if crate::storage::usage::is_over_free_limit() {
        eprintln!(
            "Presupuesto diario del free tier agotado ({} tokens). Configura una API key para continuar.",
            crate::storage::usage::FREE_TIER_DAILY_TOKENS
        );
        return EXIT_BUDGET_OR_AUTH;
    }

    let mode = if parsed.yolo {
        let marker_path = yolo_consent_marker();
        let exists = marker_path.exists();
        match resolve_yolo_consent(parsed.yolo_ack, read_env_yolo_ack(), exists, || {
            std::fs::create_dir_all(&storage_root())
                .and_then(|_| std::fs::write(&marker_path, b"consent\n"))
                .map_err(|e| format!("No se pudo registrar el consentimiento: {}", e))
        }) {
            Ok(YoloConsent::Granted) => PermissionMode::Bypass,
            Ok(YoloConsent::Required) => unreachable!(),
            Err(msg) => {
                eprintln!("{}", msg);
                return EXIT_ERROR;
            }
        }
    } else {
        parsed.mode
    };

    println!(
        "stark prompt · modo {}{} · tarea: {}",
        match mode {
            PermissionMode::Plan => "plan",
            PermissionMode::Bypass => "bypass",
            _ => "build",
        },
        if parsed.yolo { " (UNATTENDED · BYPASS)" } else { "" },
        parsed.task
    );

    let sink = CliSink::stdout(parsed.json);
    let runtime = AgentRuntime::new(std::sync::Arc::new(sink));

    match tokio_rt().block_on(runtime.run_turn(
        parsed.task.clone(),
        ".".to_string(),
        mode,
        CLI_STEP_LIMIT,
    )) {
        Ok(result) => {
            if !parsed.json {
                println!("{}", result);
            } else {
                println!(
                    "{}",
                    serde_json::json!({ "event": "done", "data": { "result": result } })
                );
            }
            EXIT_OK
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            EXIT_ERROR
        }
    }
}

fn tokio_rt() -> tokio::runtime::Runtime {
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("No se pudo crear el runtime tokio para la CLI")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn tmpdir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("stark-cli-test-{}-{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn parses_flags_and_positional_task() {
        let args = parse_prompt_args(
            ["--json", "--yolo", "--mode", "plan", "arregla", "el", "bug"]
                .iter()
                .map(|s| s.to_string()),
        )
        .unwrap();
        assert!(args.json);
        assert!(args.yolo);
        assert_eq!(args.mode, PermissionMode::Plan);
        assert_eq!(args.task, "arregla el bug");
    }

    #[test]
    fn defaults_to_build_mode_without_yolo() {
        let args = parse_prompt_args(["hola"].iter().map(|s| s.to_string())).unwrap();
        assert_eq!(args.mode, PermissionMode::Manual);
        assert!(!args.yolo);
    }

    #[test]
    fn rejects_unknown_mode() {
        assert!(parse_prompt_args(["--mode", "yolo-mode", "x"].iter().map(|s| s.to_string())).is_err());
    }

    #[test]
    fn empty_task_is_error_but_help_exits_ok() {
        let empty = parse_prompt_args(std::iter::empty()).unwrap();
        assert_eq!(empty.task, "");
        let help = parse_prompt_args(["--help"].iter().map(|s| s.to_string())).unwrap();
        assert!(help.help);
    }

    #[test]
    fn launches_from_home_redirect_to_work_dir() {
        let home = tmpdir("home");
        let work = home.join("Work");
        fs::create_dir_all(&work).unwrap();

        assert_eq!(
            workdir_for_launch(&home, &home),
            Some(work.clone()),
            "desde $HOME con ~/Work existente debe redirigir"
        );
        let project = tmpdir("project");
        assert_eq!(
            workdir_for_launch(&project, &home),
            None,
            "fuera de $HOME no toca nada"
        );

        fs::remove_dir_all(&work).unwrap();
        assert_eq!(
            workdir_for_launch(&home, &home),
            None,
            "sin ~/Work no hay redirección"
        );
    }

    #[test]
    fn yolo_first_use_requires_explicit_ack_then_persists() {
        let dir = tmpdir("consent");
        let marker = dir.join("yolo-consent");

        // Primera vez sin ack: denegada.
        let err = resolve_yolo_consent(false, false, false, || Ok(())).unwrap_err();
        assert!(err.contains("--i-understand"));

        // Con flag de ack: concedida y persiste marker.
        let result = resolve_yolo_consent(true, false, false, || {
            fs::write(&marker, b"consent").map_err(|e| e.to_string())
        });
        assert_eq!(result.unwrap(), YoloConsent::Granted);
        assert!(marker.exists());

        // Siguientes veces: marker basta.
        let again = resolve_yolo_consent(false, false, true, || Ok(()));
        assert_eq!(again.unwrap(), YoloConsent::Granted);

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn yolo_env_ack_grants_without_flag() {
        let result = resolve_yolo_consent(false, true, false, || Ok(()));
        assert_eq!(result.unwrap(), YoloConsent::Granted);
    }

    #[test]
    fn dispatch_ignores_gui_launch() {
        assert_eq!(dispatch_from_args(vec!["stark".into()]), None);
        assert_eq!(dispatch_from_args(vec!["stark".into(), "gui".into()]), None);
    }
}

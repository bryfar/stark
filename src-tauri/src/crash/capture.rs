use std::process::Command;

/// Snapshot of crash context captured from the system at the moment of diagnosis.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CrashContext {
    pub timestamp: String,
    pub hostname: String,
    pub kernel: String,
    pub os_release: String,
    pub uptime: String,
    pub memory: String,
    pub recent_crashes: Vec<CrashEntry>,
    pub coredump_info: Option<String>,
}

/// A single crash entry from the system journal.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CrashEntry {
    pub timestamp: String,
    pub pid: String,
    pub name: String,
    pub signal: String,
    pub message: String,
}

/// Capture crash context from the system: journal entries, coredump info,
/// memory, kernel, uptime. Used by `crash_diagnose` to build the diagnosis
/// prompt for the orchestrator.
pub fn capture_crash_context() -> CrashContext {
    CrashContext {
        timestamp: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        hostname: run_cmd("hostname"),
        kernel: run_cmd_args("uname", &["-r"]),
        os_release: read_file_or_fallback("/etc/os-release", "unknown"),
        uptime: run_cmd_args("uptime", &["-p"]),
        memory: run_cmd_args("free", &["-h"]),
        recent_crashes: list_recent_crashes(),
        coredump_info: latest_coredump_info(),
    }
}

/// Format a CrashContext into a markdown body suitable for a GitHub issue.
pub fn format_issue_body(ctx: &CrashContext) -> String {
    let mut body = String::new();
    body.push_str(&format!("## Crash Report — {}\n\n", ctx.timestamp));
    body.push_str(&format!("**Hostname:** {}\n", ctx.hostname));
    body.push_str(&format!("**Kernel:** {}\n", ctx.kernel));
    body.push_str(&format!("**Uptime:** {}\n\n", ctx.uptime));

    body.push_str("### OS Release\n");
    body.push_str(&format!("```\n{}\n```\n\n", ctx.os_release));

    body.push_str("### Memory\n");
    body.push_str(&format!("```\n{}\n```\n\n", ctx.memory));

    if !ctx.recent_crashes.is_empty() {
        body.push_str("### Recent Crashes (journal)\n");
        body.push_str("| Timestamp | PID | Name | Signal | Message |\n");
        body.push_str("|-----------|-----|------|--------|---------|\n");
        for c in &ctx.recent_crashes {
            body.push_str(&format!(
                "| {} | {} | {} | {} | {} |\n",
                c.timestamp, c.pid, c.name, c.signal, c.message
            ));
        }
        body.push('\n');
    }

    if let Some(ref info) = ctx.coredump_info {
        body.push_str("### Latest Coredump\n");
        body.push_str(&format!("```\n{}\n```\n", info));
    }

    body.push_str("---\n*Captured by stark crash diagnosis.*\n");
    body
}

/// File a GitHub issue with the crash context using `gh`.
pub fn file_github_issue(ctx: &CrashContext, repo: &str) -> Result<String, String> {
    let title = format!(
        "Crash: {} signal at {}",
        ctx.recent_crashes
            .first()
            .map(|c| c.signal.as_str())
            .unwrap_or("unknown"),
        ctx.timestamp
    );
    let body = format_issue_body(ctx);

    let output = Command::new("gh")
        .args([
            "issue",
            "create",
            "--repo",
            repo,
            "--title",
            &title,
            "--body",
            &body,
            "--label",
            "crash,needs-triage",
        ])
        .output()
        .map_err(|e| format!("Failed to run gh: {}", e))?;

    if output.status.success() {
        let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(url)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("gh issue create failed: {}", stderr))
    }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

fn run_cmd(bin: &str) -> String {
    run_cmd_args(bin, &[])
}

fn run_cmd_args(bin: &str, args: &[&str]) -> String {
    Command::new(bin)
        .args(args)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| " unavailable".to_string())
}

fn read_file_or_fallback(path: &str, fallback: &str) -> String {
    std::fs::read_to_string(path)
        .map(|c| c.trim().to_string())
        .unwrap_or_else(|_| fallback.to_string())
}

/// List recent crash entries from the systemd journal (last 10 entries with
/// signal=SIGNAL or MESSAGE_ID=coredump).
fn list_recent_crashes() -> Vec<CrashEntry> {
    // journalctl -o json --no-pager -n 100 — look for crash-like entries
    let output = match Command::new("journalctl")
        .args([
            "--no-pager",
            "-o",
            "json",
            "-n",
            "100",
            "--quiet",
        ])
        .output()
    {
        Ok(o) if o.status.success() => String::from_utf8_lossy(&o.stdout).to_string(),
        _ => return vec![],
    };

    let mut entries = Vec::new();
    for line in output.lines() {
        let json: serde_json::Value = match serde_json::from_str(line) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let msg = json["MESSAGE"].as_str().unwrap_or("");
        let msg_id = json["MESSAGE_ID"].as_str().unwrap_or("");
        let transport = json["_SYSTEMD_UNIT"].as_str().unwrap_or("");
        let comm = json["_COMM"].as_str().unwrap_or("");

        // Filter: keep entries that look like crashes (coredump, signal, segfault)
        let is_crash = msg_id == "fc2e22bc6ee647b6b9007629f1da713d"
            || msg.contains("Segfault")
            || msg.contains("signal")
            || msg.contains("coredump")
            || comm == "systemd-coredump";

        if !is_crash {
            continue;
        }

        // Ignore our own machinery
        if comm.contains("stark") || transport.contains("stark") {
            continue;
        }

        entries.push(CrashEntry {
            timestamp: json["__REALTIME_TIMESTAMP"]
                .as_str()
                .and_then(|ts| ts.parse::<i64>().ok())
                .map(|us| {
                    let secs = us / 1_000_000;
                    chrono::DateTime::from_timestamp(secs, 0)
                        .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
                        .unwrap_or_else(|| us.to_string())
                })
                .unwrap_or_else(|| "unknown".to_string()),
            pid: json["_PID"].as_str().unwrap_or("?").to_string(),
            name: comm.to_string(),
            signal: extract_signal(msg),
            message: truncate(msg, 200),
        });

        if entries.len() >= 10 {
            break;
        }
    }

    entries
}

/// Try to extract signal name from a message string.
/// Matches patterns like "signal 11 (SEGV)" or "terminated with signal 11".
fn extract_signal(msg: &str) -> String {
    if let Some(pos) = msg.find("signal ") {
        let rest = &msg[pos + 7..];
        let word: String = rest.chars().take_while(|c| c.is_alphanumeric() || *c == '_').collect();
        // Only accept if it starts with a digit (numeric signal like 11, 6, etc.)
        if !word.is_empty() && word.chars().next().map_or(false, |c| c.is_ascii_digit()) {
            return word;
        }
    }
    "unknown".to_string()
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}…", &s[..max])
    }
}

/// Query coredumpctl for the latest coredump info.
fn latest_coredump_info() -> Option<String> {
    let output = Command::new("coredumpctl")
        .args(["info", "-n", "1"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if stdout.trim().is_empty() {
        return None;
    }
    Some(stdout)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_issue_body_includes_header() {
        let ctx = CrashContext {
            timestamp: "2026-08-26 12:00:00".into(),
            hostname: "testbox".into(),
            kernel: "6.10.0".into(),
            os_release: "CachyOS".into(),
            uptime: "up 3 hours".into(),
            memory: "total 16G".into(),
            recent_crashes: vec![],
            coredump_info: None,
        };
        let body = format_issue_body(&ctx);
        assert!(body.contains("Crash Report"));
        assert!(body.contains("testbox"));
    }

    #[test]
    fn extract_signal_from_message() {
        assert_eq!(extract_signal("Process 1234 (foo) of user 1000 terminated with signal 11 (SEGV)"), "11");
        assert_eq!(extract_signal("no signal here"), "unknown");
    }

    #[test]
    fn truncate_short_string() {
        assert_eq!(truncate("hello", 10), "hello");
    }

    #[test]
    fn truncate_long_string() {
        let s = "a".repeat(200);
        let t = truncate(&s, 100);
        // 100 ASCII chars + '…' (3 bytes UTF-8) = 103 bytes, 101 chars
        assert_eq!(t.chars().count(), 101);
        assert!(t.ends_with('…'));
    }
}

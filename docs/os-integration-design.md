# OS Integration Design — borrowed from Omarchy v4

Status: PROPOSAL (not implemented)
Source of truth for Omarchy internals: https://github.com/basecamp/omarchy @ `quattro` (MIT)
Scope: 4 features — headless CLI + default-agent registration, usage records + panel, crash diagnosis, bundled skills.

---

## 0. Context

Omarchy v4 integrates AI coding agents at the OS level. Four of its mechanisms are worth replicating in stark:

1. **Default agent** — one launcher, per-agent yolo flags, fixed window app-id, `~/Work` trust workaround.
2. **Agents panel** — collectors write self-describing JSON records; the panel is a dumb renderer that "picks up any record that lands in the directory regardless of who wrote it".
3. **Crash diagnosis** — a journalctl follower keyed on systemd-coredump's MESSAGE_ID, toast → click → agent runs the `diagnose-crash` skill.
4. **Skills** — bundled SKILL.md guides symlinked into `~/.claude/skills`, `~/.codex/skills`, `~/.pi/agent/skills`, `~/.agents/skills`.

Decision already taken: **we copy the yolo/auto-approve behavior** (opt-in flag), diverging from guardrail #4 wording. See §1.4 and pending decision #1.

---

## 1. Feature A — Headless CLI + default-agent registration

### 1.1 Current state (blockers)

- `AgentRuntime::new(app: AppHandle)` couples the whole agent loop to the Tauri webview (`src-tauri/src/agent/orchestrator.rs:15`).
- `PermissionMode::Bypass` already exists and returns `Allow` for everything (`src-tauri/src/agent/permissions/modes.rs:23`).
- `main.rs` goes straight into `tauri::Builder` — no argv dispatch.

### 1.2 Design

**EventSink trait** (new `src-tauri/src/eventsink.rs`):

```rust
#[async_trait]
pub trait EventSink: Send + Sync + 'static {
    fn emit(&self, event: StreamEvent) -> Result<(), String>;
}

pub struct WebviewSink { app: AppHandle }   // wraps current emit calls
pub struct CliSink { stdout: Stdout }       // one StreamEvent per JSONL line
```

`AgentRuntime` stops holding `AppHandle`; it holds `Arc<dyn EventSink>`. This is also what makes the agent testable without a webview.

**Subcommand dispatch** — same binary, decided _before_ `tauri::Builder` runs:

```bash
stark                                  # GUI (current behavior)
stark prompt [flags] "<task>"          # headless, unattended
```

Flags:

| Flag                 | Meaning                                    |
| -------------------- | ------------------------------------------ |
| `--yolo`             | `PermissionMode::Bypass` — never asks      |
| `--mode plan\|build` | default `build`                            |
| `--cwd <dir>`        | workspace override (defaults to PWD)       |
| `--json`             | CliSink JSONL output instead of human text |

Exit codes: `0` task finished, `1` runtime error, `2` budget/auth failure.

**`~/Work` rule** (copied verbatim from `bin/omarchy-agent`): when `PWD == $HOME` and `$HOME/Work` exists, chdir there first — agents refuse to persist trust for `$HOME`, so launching from home re-prompts every time.

**Desktop integration**: fixed window app-id `com.stark.agent` so Hyprland/KWin window rules and themes can target every stark window uniformly.

### 1.3 Omarchy registration (distribution play)

- Publish the binary via mise-compatible channel (GitHub releases backend: `github:bryfar/crafter-text-demo`).
- Upstream PR to `basecamp/omarchy`: add `stark)` arm to the `case` in `bin/omarchy-agent` (`command=(stark prompt --yolo ...)`), a row in `manual/17-ai.md`, and an alias `s='stark prompt --yolo'` next to `c`/`cx`/`cy`.
- Timing: after the CLI ships in a tagged release (pending decision #3).

### 1.4 Yolo safety posture

`--yolo` is **per-launch opt-in**, never persisted:

1. First ever use of `--yolo` prints a one-time warning requiring `--yolo --i-understand` (or env `STARK_ACK_YOLO=1`) — then remembers consent in `.crafter_storage/config.json`.
2. When a GUI session attaches to a yolo-launched workspace, the chat header renders a persistent `UNATTENDED · BYPASS` badge fed by a `chat-token` meta event.
3. Sandbox timeout + output limits stay mandatory even in Bypass (guardrail #4 keeps its teeth where it matters most).

---

## 2. Feature B — Usage records + panel

### 2.1 Record contract (schema v1 — byte-compatible with Omarchy)

Extracted from `bin/omarchy-agent-usage-claude` (`record = {...}` block):

```json
{
  "schemaVersion": 1,
  "id": "stark",
  "name": "Stark",
  "updatedAt": "2026-08-22T17:00:00+00:00",
  "ready": true,
  "hasLocalStats": true,
  "tierLabel": "Free",
  "usageStatusText": "",
  "authHelpText": "",
  "limits": [{ "label": "Daily free tier", "percent": 0.37, "resetsAt": "" }],
  "todayPrompts": 12,
  "todaySessions": 3,
  "todayTotalTokens": 48210,
  "todayTokensByModel": { "claude-sonnet-4": 30000, "llama3:8b": 18210 },
  "recentDays": [{ "date": "2026-08-16", "messageCount": 21004 }],
  "modelUsage": {
    "claude-sonnet-4": {
      "inputTokens": 120000,
      "outputTokens": 34000,
      "cacheReadInputTokens": 8000,
      "cacheCreationInputTokens": 1500
    }
  },
  "totalPrompts": 812,
  "totalSessions": 96,
  "activeDays": 41,
  "activeDates": ["2026-07-01", "2026-07-02"]
}
```

Notes inherited from their contract:

- `limits[].percent` is **0..1**, not 0..100.
- `recentDays[].messageCount` holds a **token total** despite the legacy name — do not "fix" it, or synced merges double-count.
- `activeDates` must be present (union-merge across machines needs dates, not counts).
- Optional `"scope": "account"` marks account-global stats (merged by widest-value, not summed). Not needed for stark V1 (machine-local by definition).

### 2.2 Writer

New `src-tauri/src/storage/usage_records.rs`, fed by the existing `record_usage` path (`storage/usage.rs:66`) extended with per-model buckets and a rolling 30-day history:

- Path: `${XDG_STATE_HOME:-~/.local/state}/stark/agents/usage/stark.json`
- Atomic write: `mktemp` in same dir + `rename` (their exact trick — unique temp per writer, several processes may write concurrently once headless CLI lands).
- Perms: dir `0700`, file `0644`.

**Omarchy mirror**: setting `mirrorToOmarchy` with values `auto` (default) / `on` / `off`. In `auto`, if `~/.local/state/omarchy/agents/usage/` exists → write the same record there too. Their panel ingests it untouched; zero QML written by us.

### 2.3 Own panel (UI)

- `HeaderBar.jsx` gains a usage glyph that **renders only when a record exists** (their self-hiding rule — never ship an always-on icon).
- New `UsagePanel.jsx` dropup (DESIGN.md: dropups only): today total bolded, tokens-by-model bars scaled to heaviest model, last-7-days rows, free-tier meter.
- Panel reads the record file via `usage_get_record`; refresh button fires `usage_refresh { force }` which recomputes and emits `usage:updated`.

### 2.4 Limits

V1: only stark-native limits — free-tier daily cap (`FREE_TIER_DAILY_TOKENS`) as `percent = used / 10_000`. Anthropic OAuth usage-endpoint probing (like their Claude collector) deferred to V2 — needs Claude Code credentials on disk and adds network surface.

### 2.5 Privacy note

Records are pure counters — no prompts, no content, no paths beyond the state dir. Proposal: exempt usage stats from at-rest encryption (guardrail #5), matching Omarchy's world-readable cache convention. Pending decision #2.

---

## 3. Feature C — Crash diagnosis

### 3.1 Watcher

New module `src-tauri/src/crash/`:

- `watcher.rs`: tokio task spawns
  `journalctl --user -f -n 0 -o json MESSAGE_ID=fc2e22bc6ee647b6b90729ab34a250b1`
  (that constant is systemd-coredump's well-known MESSAGE_ID, see `systemd.journal-fields(7)`).
- Parses `COREDUMP_COMM`, `COREDUMP_PID`, `COREDUMP_EXE`, `COREDUMP_SIGNAL_NAME`, `_UID`.
- Filters (copied from `omarchy-crash-watch`):
  - `_UID == current uid` (daemons are a sysadmin problem)
  - ignore our own machinery (`stark`, `stark-crash*`)
  - dedupe per program name over 60 s — and only count the window after a _delivered_ notification
  - `-n 0` so restarts never replay old crashes
- Emits `crash:detected { pid, name, signal, exe }` and fires a desktop notification via `tauri-plugin-notification`. Click routes back into the app and invokes `crash_diagnose`.

Lifecycle V1: watcher lives inside the app, started at boot when `settings.crashCaptureEnabled` (default on), toggled live from Settings. **Not** a systemd service yet — documented limitation: crashes while stark is closed are not announced (pending decision #4).

### 3.2 Diagnose flow

`diagnose.rs`:

1. Gather facts: `coredumpctl info <pid>`, `coredumpctl list` tail (pattern vs one-off).
2. Build the prompt from the embedded `diagnose-crash` skill (§4) — establish facts → rule out OOM (`free -h`, journal) → correlate timestamps with fs mtimes/package updates → read non-crashing threads → symbolize via debuginfod when possible.
3. Kick off a normal orchestrator turn in a dedicated chat session titled `Crash diagnosis: <name>`, streamed through the standard `chat-token` pipeline.

Permission mode for the diagnosis session: **Manual** (default). The few needed commands (`coredumpctl`, `gdb -batch`, `free -h`, `journalctl`) surface as regular approval prompts — no new allowlist mechanism, consistent with guardrail #4 (pending decision #5 offers a read-only preset alternative).

### 3.3 Privacy rules baked into the skill (inherited from Omarchy's)

A core dump is a verbatim memory copy: passwords, tokens, documents. Rules: extract only to `mktemp`, delete afterwards, never leave cores in `/tmp`; report what evidence _proves_ vs _infers_; never invent symbol names; leave the system as found.

---

## 4. Feature D — Bundled skills

The loader already scans `<workspace>/.agents/skills`, `<workspace>/.gemini/skills`, `~/.agents/skills`, `~/.gemini/skills` (`src-tauri/src/skills/loader.rs:72-78`). We add two pieces:

### 4.1 Bundled skills (shipped inside the binary)

```
src-tauri/src/skills/bundled/
├── stark/
│   └── SKILL.md        # customize stark itself: providers, modes, .crafter_storage layout
└── diagnose-crash/
    ├── SKILL.md        # §3 flow, adapted from Omarchy (MIT, attribution in header)
    └── reporting.md    # when/how to file upstream (optional stub)
```

Embedded via `include_str!`, materialized to `~/.local/share/stark/skills/<name>/` on first run (idempotent, version-stamped) so users can read/edit them.

### 4.2 Symlink installer

Command `skills_install_symlinks` creates symlinks so external harnesses pick the skills up:

| Target                     | Created as |
| -------------------------- | ---------- |
| `~/.claude/skills/stark`   | symlink    |
| `~/.codex/skills/stark`    | symlink    |
| `~/.pi/agent/skills/stark` | symlink    |
| `~/.agents/skills/stark`   | symlink    |

Never overwrites existing real directories; skips + reports conflicts. Settings toggle per target.

Frontmatter convention copied from Omarchy: aggressive trigger lists in `description:` ("Use when… Triggers: …") because harnesses match on that field.

---

## 5. IPC contracts

| Command                   | Direction | Input                    | Output                                       | Events                  |
| ------------------------- | --------- | ------------------------ | -------------------------------------------- | ----------------------- |
| `crash_set_watcher`       | UI → Rust | `{ enabled: bool }`      | `()`                                         | `crash:detected`        |
| `crash_diagnose`          | UI → Rust | `{ pid: u32 }`           | `{ session_id: string }`                     | `chat-token` (existing) |
| `usage_get_record`        | UI → Rust | —                        | `UsageRecord`                                | —                       |
| `usage_refresh`           | UI → Rust | `{ force: bool }`        | `UsageRecord`                                | `usage:updated`         |
| `skills_install_symlinks` | UI → Rust | `{ targets?: string[] }` | `{ installed: string[], skipped: string[] }` | —                       |

Headless CLI uses **no IPC**: `CliSink` serializes the same `StreamEvent`s to stdout as JSONL — identical event contract, different sink.

---

## 6. Module map (new code)

```
src-tauri/src/
├── eventsink.rs              # EventSink trait, WebviewSink, CliSink   (Feature A)
├── cli.rs                    # argv dispatch BEFORE tauri::Builder     (Feature A)
├── crash/
│   ├── mod.rs                # feature flag, settings glue            (Feature C)
│   ├── watcher.rs            # journalctl follower + dedupe           (Feature C)
│   └── diagnose.rs           # coredumpctl facts + prompt builder     (Feature C)
├── agent/orchestrator.rs     # refactor: AppHandle -> Arc<dyn EventSink>
└── storage/usage_records.rs  # schema-v1 writer + omarchy mirror      (Feature B)
src/components/UsagePanel.jsx                                           (Feature B)
src/components/HeaderBar.jsx   # usage glyph                            (Feature B)
docs/adr/0002-os-integration.md                                        (this doc's decisions)
```

Build order: **A (eventsink refactor) → C (crash) → B (records+panel) → D (skills)**. The eventsink refactor unlocks headless, and crash diagnosis rides on the existing chat pipeline; records/panel and skills are independent leaves.

---

## 7. Decisions (resolved — see ADR 0002)

1. **Guardrail amendment** — accepted. Guardrail #4 now reads "explicit approval, unless the user opts into bypass per launch" (`--yolo`, never persisted, consent on first use + `UNATTENDED · BYPASS` badge; sandbox timeout/output limits stay mandatory).
2. **Usage stats encryption** — exempt from at-rest encryption. Pure counters only; plaintext `0644` under XDG_STATE is required de facto for Omarchy panel compatibility.
3. **Upstream PR timing** — deferred until stark publishes a tagged release artifact installable via mise GitHub backend; local diff prepared meanwhile.
4. **Crash watcher lifecycle** — V1 in-app only (limitation documented: crashes while stark is closed are not announced); `stark-crash-watch` systemd user service deferred to V2.
5. **Diagnosis permission mode** — plain Manual with normal approval prompts; the read-only `Diagnostic` preset was rejected (collides with "no allowlists").
6. **Binary/subcommand naming** — frozen: `stark prompt [--yolo] [--mode plan|build] [--cwd <dir>] [--json] "<task>"`.

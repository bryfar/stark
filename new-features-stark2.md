# Stark 2.0 — New Features & Architecture

> **Tagline:** "Your machine, your AI"

---

## Table of Contents

1. [Vision](#vision)
2. [What Devin Does (Complete Map)](#what-devin-does)
3. [What Stark Already Has](#what-stark-already-has)
4. [The Gap Analysis](#gap-analysis)
5. [Architecture](#architecture)
6. [Vertical 1: Agent Intelligence](#vertical-1-agent-intelligence)
7. [Vertical 2: Multi-Agent Orchestration](#vertical-2-multi-agent-orchestration)
8. [Vertical 3: Developer Workflow](#vertical-3-developer-workflow)
9. [Cross-Cutting Concerns](#cross-cutting-concerns)
10. [Marketing: All Features by Mode](#marketing-all-features-by-mode)
11. [Implementation Order](#implementation-order)
12. [Sources](#sources)

---

## Vision

Stark is a **local-first, multi-mode AI coding agent** built with Tauri 2 (Rust) + Preact. Unlike cloud-dependent competitors, Stark runs entirely on the user's machine with zero telemetry, AES-256-GCM encryption, and multi-provider support (OpenAI, Anthropic, Gemini, Ollama).

**Stark 2.0** transforms Stark from a basic coding assistant into a full autonomous engineering platform — matching and exceeding Devin's capabilities while maintaining the local-first, privacy-first philosophy.

**Core value props:**

- Local-first (no cloud dependency)
- Multi-provider (no vendor lock-in)
- Multi-mode (Chat, Code, Design)
- Encrypted at rest (AES-256-GCM)
- Hardware-aware (auto-detects best local models)
- Open (extensible via Skills, Agents, Playbooks)

---

## What Devin Does (Complete Map)

### Products

| Product          | Description                                       |
| ---------------- | ------------------------------------------------- |
| Devin Cloud      | Autonomous agent in cloud VMs                     |
| Devin Desktop    | IDE with agent command center (formerly Windsurf) |
| Devin CLI        | Local terminal agent with cloud handoff           |
| Devin Review     | AI code review for PRs                            |
| Devin Windows VM | Build/test Windows apps natively                  |
| Security Swarm   | Parallel vulnerability scanning                   |
| DeepWiki         | Auto-generated architecture docs                  |
| FrontierCode     | Enterprise tier                                   |

### 30 Features Mapped

| #   | Feature              | Description                                         |
| --- | -------------------- | --------------------------------------------------- |
| 1   | Interactive Planning | Plan before execute, user reviews/approves          |
| 2   | Playbooks            | Reusable prompts with steps, criteria, guardrails   |
| 3   | Knowledge            | Persistent instructions across all sessions         |
| 4   | Dynamic Workflows    | Deterministic scripts for multi-stage orchestration |
| 5   | Session Analysis     | Analyze past sessions, extract patterns             |
| 6   | Scheduling           | Recurring or one-time automated sessions            |
| 7   | Auto-triage          | Persistent agent monitoring and routing             |
| 8   | Secrets Manager      | Encrypted credentials, never exposed to LLM         |
| 9   | Security Profiles    | Network/tool restrictions per session               |
| 10  | Stacked PRs          | Large changes split into ordered, reviewable PRs    |
| 11  | Testing & Video      | E2E testing with video proof                        |
| 12  | Browser Auth         | Save browser profiles for reuse                     |
| 13  | Devin MCP            | Server for programmatic access                      |
| 14  | Handoff CLI→Cloud    | Local to cloud transition                           |
| 15  | Outposts             | Self-hosted infrastructure                          |
| 16  | Android Emulator     | Build/run Android apps                              |
| 17  | Windows VM           | Build/test Windows apps                             |
| 18  | DeepWiki             | Auto architecture diagrams + docs                   |
| 19  | Session Insights     | Actionable feedback for improvement                 |
| 20  | Plugin Marketplace   | Bundles of skills with governance                   |
| 21  | Hooks                | Pre/post shell commands at workflow points          |
| 22  | AGENTS.md            | Directory-scoped instructions                       |
| 23  | Codemaps             | Hierarchical codebase visualization                 |
| 24  | Vibe and Replace     | Natural language find/replace                       |
| 25  | AI Commit Messages   | Generate meaningful commit messages                 |
| 26  | App Deploys          | Deploy web apps to public URLs                      |
| 27  | Memories & Rules     | Persistent context between conversations            |
| 28  | Worktrees            | Git worktrees for parallel tasks                    |
| 29  | Subagents            | Independent foreground/background agents            |
| 30  | Adaptive Router      | Intelligent model selection per task                |

### Devin's Architecture (from repos)

| Pattern               | Source    | Description                                 |
| --------------------- | --------- | ------------------------------------------- |
| Event Sourcing        | OpenHands | Append-only immutable event log             |
| Fire-and-Forget       | Open-SWE  | Dispatch tasks, get completion signals      |
| Middleware Hooks      | Both      | before_model / after_tool / after_agent     |
| Subagent Isolation    | OpenHands | Separate context per subtask                |
| Context Condensation  | OpenHands | LLM-based summarization (2x cost reduction) |
| Deterministic IDs     | Open-SWE  | Stable thread IDs from inputs               |
| Crash Recovery        | Open-SWE  | Checkpoint + resume from last state         |
| Workspace Abstraction | OpenHands | Local vs sandboxed, same interface          |
| Tool System           | OpenHands | Action/Observation pattern, extensible      |

---

## What Stark Already Has

### Modes

| Mode       | Components                   | Capabilities                                                                      |
| ---------- | ---------------------------- | --------------------------------------------------------------------------------- |
| **Chat**   | ChatView                     | Plan/Build/Cowork agent modes, Skills, Agents, Voice, @mentions, File attachments |
| **Code**   | CodeView                     | Terminal, File browser, Agent loop (step-based), Shell execution, Permissions     |
| **Design** | DesignView + DesignChatPanel | HTML preview, Presets, Element picker, Artifact types                             |

### Backend (Rust)

| Module             | Capabilities                                                       |
| ------------------ | ------------------------------------------------------------------ |
| agent/orchestrator | Step-based agent loop                                              |
| agent/tools        | ReadFile, EditFile, Shell, LoadSkill, DesktopInput, DesktopControl |
| agent/hermes       | Learning loop                                                      |
| agent/permissions  | Modes + LLM classifier                                             |
| providers          | OpenAI, Anthropic, Gemini, Ollama, Local, OpenAI-compatible        |
| storage            | Chats, Config, AES-256-GCM encryption                              |
| sandbox            | bubblewrap/firejail                                                |
| repo               | Graft graph, indexer                                               |
| local              | Ollama catalog, hardware detection                                 |

### Frontend (Preact)

| Component       | Purpose                  |
| --------------- | ------------------------ |
| ChatView        | General AI conversation  |
| CodeView        | Code-specific agent loop |
| DesignView      | Design preview + presets |
| DesignChatPanel | Design-specific chat     |
| SessionTabs     | Tab management           |
| DiffModal       | Change preview           |
| TerminalModal   | Embedded terminal        |
| Sidebar         | Navigation               |
| HeaderBar       | Controls                 |

### Existing Features with Current Marketing

| Feature              | Current Name      | Status  |
| -------------------- | ----------------- | ------- |
| Agent modes          | Plan/Build/Cowork | Working |
| Terminal integration | Terminal          | Working |
| File browser         | File Explorer     | Working |
| Voice dictation      | Voice             | Working |
| @mentions            | @Mention          | Working |
| Skills system        | Skills            | Working |
| Custom agents        | Agents            | Working |
| Diff preview         | DiffView          | Working |
| Multi-provider       | Multi-Provider    | Working |
| Offline mode         | Local Mode        | Working |
| Encryption           | Vault             | Working |
| Hardware detection   | Smart Detect      | Working |
| Design presets       | Presets           | Working |
| Element picker       | Pick & Edit       | Working |
| HTML preview         | Live Preview      | Working |
| Artifact types       | Artifacts         | Working |

---

## Gap Analysis

### Features Devin Has, Stark Doesn't (Priority)

| Priority | Feature                  | Vertical |
| -------- | ------------------------ | -------- |
| HIGH     | Interactive Planning     | V1       |
| HIGH     | Event Sourcing           | V1       |
| HIGH     | Adaptive Router          | V1       |
| HIGH     | Context Condensation     | V1       |
| HIGH     | Playbooks                | V1       |
| HIGH     | Knowledge                | V1       |
| HIGH     | Memories & Rules         | V1       |
| HIGH     | Fire-and-Forget Dispatch | V2       |
| HIGH     | Subagent Spawning        | V2       |
| HIGH     | Dynamic Workflows        | V2       |
| HIGH     | Worktrees                | V2       |
| HIGH     | Stacked PRs              | V3       |
| HIGH     | AI Commit Messages       | V3       |
| HIGH     | Security Profiles        | V3       |
| HIGH     | Secrets Manager          | V3       |
| HIGH     | Hooks                    | V3       |
| MEDIUM   | Session Analysis         | V2       |
| MEDIUM   | Scheduling               | V2       |
| MEDIUM   | Testing & Video          | V3       |
| MEDIUM   | Session Insights         | V2       |
| MEDIUM   | Browser Auth             | V3       |
| LOW      | Plugin Marketplace       | Future   |
| LOW      | Android Emulator         | Future   |
| LOW      | Windows VM               | Future   |
| LOW      | App Deploys              | Future   |
| LOW      | Data Analyst Agent       | Future   |

---

## Architecture

### Current State

```
STARK CURRENT
├── FRONTEND (Preact)
│   ├── ChatView
│   ├── CodeView
│   ├── DesignView
│   ├── DesignChatPanel
│   └── Modals...
│
├── BACKEND (Rust / Tauri 2)
│   ├── agent/
│   │   ├── orchestrator.rs
│   │   ├── context.rs
│   │   ├── events.rs
│   │   ├── prompt.rs
│   │   ├── rpc.rs
│   │   ├── permissions/
│   │   ├── tools/
│   │   └── hermes/
│   ├── providers/
│   ├── storage/
│   ├── sandbox/
│   ├── repo/
│   ├── local/
│   └── commands/
│
└── STATE (App.jsx)
    ├── currentMode: 'chat' | 'code' | 'design'
    ├── codeSessions[]
    ├── designSessions[]
    ├── conversations[]
    ├── agentMode: 'plan' | 'build' | 'cowork'
    ├── workspacePath
    └── fileTree[]
```

### New Architecture

```
STARK 2.0
│
├── ═══════════════════════════════════════════
│   VERTICAL 1: AGENT INTELLIGENCE
│   ═══════════════════════════════════════════
│
│   agent/
│   ├── eventsourcing.rs     ← Event Sourcing
│   │   └── Append-only event log
│   │   └── Crash recovery via replay
│   │   └── Time-travel debugging
│   │
│   ├── condenser.rs         ← Context Condensation
│   │   └── Token-counting
│   │   └── LLM-based summarizer
│   │   └── 2x cost reduction
│   │
│   ├── planning.rs          ← Interactive Planning
│   │   └── PlanTaskTool
│   │   └── Plan struct: steps[], files[], criteria[]
│   │   └── User review modal
│   │
│   └── memories.rs          ← Memories & Rules
│       └── Persist context between sessions
│       └── Auto-generated memories
│       └── User-defined rules
│
│   providers/
│   └── router.rs            ← Adaptive Router
│       └── Task analysis → model selection
│       └── Price-performance optimization
│       └── Fallback chains
│
│   Frontend:
│   ├── PlanReviewModal
│   └── SessionInsightsPanel
│
│
├── ═══════════════════════════════════════════
│   VERTICAL 2: MULTI-AGENT ORCHESTRATION
│   ═══════════════════════════════════════════
│
│   agent/
│   ├── dispatcher.rs        ← Fire-and-Forget Dispatch
│   │   └── tokio::spawn per task
│   │   └── Deterministic thread IDs
│   │   └── Completion signals via Tauri events
│   │
│   ├── subagent.rs          ← Subagent Spawning
│   │   └── Separate context per subtask
│   │   └── Shared filesystem (worktree)
│   │   └── Independent conversation state
│   │
│   ├── workflow.rs          ← Dynamic Workflows
│   │   └── Deterministic scripts
│   │   └── Structured results between stages
│   │   └── Resume from checkpoint
│   │
│   ├── scheduler.rs         ← Scheduling
│   │   └── Cron-like recurring tasks
│   │   └── One-time scheduled sessions
│   │
│   ├── reconcile.rs         ← Reconciliation
│   │   └── Cancel stale tasks
│   │   └── Timeout stuck agents
│   │
│   └── analytics.rs         ← Session Analysis
│       └── Analyze past sessions
│       └── Extract patterns
│       └── Generate insights
│
│   repo/
│   └── worktree.rs          ← Git Worktrees
│       └── Auto worktrees per task
│       └── Shared .git object DB
│       └── Conflict-free parallel work
│
│   Frontend:
│   ├── SwarmPanel
│   ├── WorkflowBuilder
│   └── SchedulerModal
│
│
├── ═══════════════════════════════════════════
│   VERTICAL 3: DEVELOPER WORKFLOW
│   ═══════════════════════════════════════════
│
│   repo/
│   ├── stacked.rs           ← Stacked PRs
│   │   └── Split large changes
│   │   └── Ordered, reviewable PRs
│   │   └── Dependencies between PRs
│   │
│   └── commit.rs            ← AI Commit Messages
│       └── Analyze changes
│       └── Generate conventional commits
│
│   agent/
│   ├── security.rs          ← Security Profiles
│   │   └── Network restrictions
│   │   └── Tool restrictions
│   │   └── Per-session security
│   │
│   ├── hooks.rs             ← Hooks (pre/post)
│   │   └── Shell commands at key points
│   │   └── Logging, security, validation
│   │
│   └── testing.rs           ← Testing & Video
│       └── E2E test execution
│       └── Video recording proof
│       └── Test coverage analysis
│
│   storage/
│   └── secrets.rs           ← Secrets Manager
│       └── Encrypted credential storage
│       └── Per-session secrets
│       └── Never exposed to LLM
│
│   Frontend:
│   ├── StackedPRsView
│   ├── SecurityPanel
│   └── TestRunnerPanel
│
│
├── ═══════════════════════════════════════════
│   CROSS-CUTTING
│   ═══════════════════════════════════════════
│
│   agent/
│   ├── middleware.rs        ← Middleware System
│   │   └── before_model / after_tool / after_agent
│   │   └── Tool error handling
│   │   └── Message queue mid-run
│   │
│   └── workspace.rs         ← Workspace Abstraction
│       └── LocalWorkspace
│       └── SandboxedWorkspace
│       └── Same trait interface
│
│   Tauri Events:
│   ├── task:complete
│   ├── task:failed
│   ├── agent:step
│   ├── plan:ready
│   └── swarm:update
```

### Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    STARK APP                             │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ CHAT     │  │ CODE     │  │ DESIGN   │              │
│  │ MODE     │  │ MODE     │  │ MODE     │              │
│  │          │  │          │  │          │              │
│  │ plan     │  │ agent    │  │ design   │              │
│  │ build    │  │ loop     │  │ chat     │              │
│  │ cowork   │  │ terminal │  │ preview  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│       └──────────────┼──────────────┘                    │
│                      │                                   │
│         ┌────────────▼────────────┐                     │
│         │    AGENT CORE (Rust)    │                     │
│         │                         │                     │
│         │  Event Sourcing         │                     │
│         │  Middleware             │                     │
│         │  Tool Registry          │                     │
│         │  Dispatcher             │                     │
│         │  Subagent Pool          │                     │
│         │  Condenser              │                     │
│         └───────────┬────────────┘                     │
│                     │                                   │
│         ┌───────────▼────────────┐                     │
│         │    PROVIDERS (LLM)     │                     │
│         │  Adaptive Router       │                     │
│         │  OpenAI | Anthropic |  │                     │
│         │  Gemini | Ollama    |  │                     │
│         │  Local  | SWE-1.7   |  │                     │
│         └───────────┬────────────┘                     │
│                     │                                   │
│         ┌───────────▼────────────┐                     │
│         │    STORAGE (Encrypted) │                     │
│         │  chats | secrets |     │                     │
│         │  config | events |     │                     │
│         │  memories | playbooks  │                     │
│         └────────────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

## Vertical 1: Agent Intelligence

### 1.1 Event Sourcing (Time Travel)

**What:** Append-only immutable event log for all agent interactions.

**Why:** Enables crash recovery, time-travel debugging, session replay, and analytics.

**Implementation:**

- New module: `src-tauri/src/agent/eventsourcing.rs`
- Events stored as `serde_json::Value` in SQLite
- Types: Message, Action, Observation, SystemPrompt, Condensation
- Sub-millisecond persist latency

**Marketing:**

- Name: **Time Travel**
- Tagline: "Replay any session, debug any failure"
- Metric: "Zero data loss"

### 1.2 Interactive Planning (Plan Mode)

**What:** Before executing, agent investigates codebase and presents structured plan for user review.

**Why:** Prevents wasted work, catches misunderstandings early, gives user control.

**Implementation:**

- New module: `src-tauri/src/agent/planning.rs`
- New tool: `PlanTaskTool`
- Plan struct: `steps[]`, `files[]`, `criteria[]`, `estimated_effort`
- Frontend: `PlanReviewModal` — edit, approve, reject steps

**Marketing:**

- Name: **Plan Mode**
- Tagline: "See the plan before code is written"
- Metric: "80% fewer wasted iterations"

### 1.3 Adaptive Router (Smart Router)

**What:** Intelligent model selection based on task type, complexity, and cost.

**Why:** Right model for right task = better results + lower costs.

**Implementation:**

- New module: `src-tauri/src/providers/router.rs`
- Task analysis → model matching
- Price-performance optimization
- Fallback chains (if model fails, try next)
- User can override

**Marketing:**

- Name: **Smart Router**
- Tagline: "Right model, right task, right price"
- Metric: "40% cost reduction"

### 1.4 Context Condensation (Memory)

**What:** Automatic summarization of long conversations to manage context window.

**Why:** Long sessions become expensive and ineffective without condensation.

**Implementation:**

- New module: `src-tauri/src/agent/condenser.rs`
- Token-counting condenser
- LLM-based summarizer
- Keeps recent messages intact
- Preserves key information

**Marketing:**

- Name: **Memory**
- Tagline: "Long sessions without long costs"
- Metric: "2x cheaper long tasks"

### 1.5 Playbooks

**What:** Reusable prompts with steps, success criteria, and guardrails.

**Why:** Consistent results for recurring tasks, faster onboarding.

**Implementation:**

- Enhance existing Skills system
- Add `success_criteria` and `guardrails` fields
- Playbook gallery (community + org-specific)
- Attach to sessions via prompt

**Marketing:**

- Name: **Playbooks**
- Tagline: "Reusable recipes for recurring tasks"
- Metric: "10x faster onboarding"

### 1.6 Knowledge (Context Engine)

**What:** Persistent instructions and context that agent references in all sessions.

**Why:** Agent learns your codebase conventions, not just code.

**Implementation:**

- Enhance existing AGENTS.md
- Auto-index codebase patterns
- Knowledge deduplication
- Trigger-based activation

**Marketing:**

- Name: **Context Engine**
- Tagline: "Stark learns your codebase, not just your code"
- Metric: "3x fewer clarifications"

### 1.7 Memories & Rules

**What:** Context that persists between conversations, auto-generated and user-defined.

**Why:** No re-explanation of decisions, conventions, or preferences.

**Implementation:**

- Enhance `src-tauri/src/agent/hermes/`
- Auto-generated memories from sessions
- User-defined rules (global/workspace/system levels)
- Priority hierarchy

**Marketing:**

- Name: **Memories**
- Tagline: "Context that persists between sessions"
- Metric: "Zero re-explanation"

---

## Vertical 2: Multi-Agent Orchestration

### 2.1 Fire-and-Forget Dispatch (Dispatch)

**What:** Dispatch tasks to background agents, get completion signals.

**Why:** Assign tasks and work on other things.

**Implementation:**

- New module: `src-tauri/src/agent/dispatcher.rs`
- `tokio::spawn` per task
- Deterministic thread IDs from inputs
- Completion signals via Tauri events (`task:complete`, `task:failed`)
- Progress tracking

**Marketing:**

- Name: **Dispatch**
- Tagline: "Assign tasks, close your laptop"
- Metric: "5x throughput"

### 2.2 Subagent Spawning (Swarm)

**What:** Coordinator agent delegates to parallel sub-agents with isolated contexts.

**Why:** Complex tasks decomposed into parallel subtasks.

**Implementation:**

- New module: `src-tauri/src/agent/subagent.rs`
- Separate context window per subtask
- Shared filesystem (worktree)
- Independent conversation state
- Parent monitors children

**Marketing:**

- Name: **Swarm**
- Tagline: "A team of agents for every engineer"
- Metric: "8 parallel agents"

### 2.3 Dynamic Workflows (Workflows)

**What:** Deterministic scripts that orchestrate multiple agent sessions with fan-out/fan-in.

**Why:** Complex multi-stage tasks with structured results between stages.

**Implementation:**

- New module: `src-tauri/src/agent/workflow.rs`
- Python-like scripts (markdown-based)
- Fan-out: parallel execution
- Fan-in: combine results
- Resume from checkpoint

**Marketing:**

- Name: **Workflows**
- Tagline: "Deterministic scripts for complex orchestrations"
- Metric: "18 months → 8 days"

### 2.4 Git Worktrees (Worktrees)

**What:** Automatic git worktrees for parallel tasks, sharing .git object database.

**Why:** Parallel work without merge conflicts.

**Implementation:**

- New module: `src-tauri/src/repo/worktree.rs`
- Auto-create worktree per task
- Shared .git objects
- Sequential merge strategy
- Conflict detection

**Marketing:**

- Name: **Worktrees**
- Tagline: "Parallel work without merge conflicts"
- Metric: "Zero conflict overhead"

### 2.5 Scheduling (Scheduler)

**What:** Recurring or one-time automated agent sessions.

**Why:** Automate nightly tests, weekly maintenance, daily health checks.

**Implementation:**

- New module: `src-tauri/src/agent/scheduler.rs`
- Cron-like expressions
- One-time scheduled tasks
- Notification on completion
- Pause/resume

**Marketing:**

- Name: **Scheduler**
- Tagline: "Automate recurring engineering tasks"
- Metric: "Set and forget"

### 2.6 Session Analysis (Insights)

**What:** Analyze past sessions to understand what worked, what failed, and why.

**Why:** Continuous improvement, pattern extraction, playbook refinement.

**Implementation:**

- New module: `src-tauri/src/agent/analytics.rs`
- Session outcome analysis
- Pattern extraction
- Actionable recommendations
- Compare sessions

**Marketing:**

- Name: **Insights**
- Tagline: "Learn from every session"
- Metric: "30% fewer failures"

### 2.7 Reconciliation

**What:** Safety net that cancels stale tasks and timeouts stuck agents.

**Why:** Prevent threads from being permanently locked by crashed operations.

**Implementation:**

- New module: `src-tauri/src/agent/reconcile.rs`
- Periodic sweep of stale tasks
- Cancel stuck agents
- Notify user of failures

**Marketing:** Internal feature, no separate marketing.

---

## Vertical 3: Developer Workflow

### 3.1 Stacked PRs

**What:** Split large changes into ordered, reviewable pull requests.

**Why:** Easier code review, smaller diffs, incremental merging.

**Implementation:**

- New module: `src-tauri/src/repo/stacked.rs`
- Analyze change scope
- Split into logical units
- Define dependencies between PRs
- Sequential merge

**Marketing:**

- Name: **Stacked PRs**
- Tagline: "Large changes, reviewable chunks"
- Metric: "3x faster reviews"

### 3.2 AI Commit Messages (Smart Commits)

**What:** Generate meaningful conventional commit messages from code changes.

**Why:** Consistent git history without manual effort.

**Implementation:**

- New module: `src-tauri/src/repo/commit.rs`
- Analyze git diff
- Generate conventional commit format
- User can edit before commit
- Bulk commit support

**Marketing:**

- Name: **Smart Commits**
- Tagline: "Meaningful messages, zero effort"
- Metric: "100% conventional commits"

### 3.3 Security Profiles (Security Shield)

**What:** Restrict network, tools, and git access per session.

**Why:** Enterprise security, compliance, defense in depth.

**Implementation:**

- New module: `src-tauri/src/agent/security.rs`
- Network allowlist/blocklist
- Tool restrictions
- Git/GitHub CLI restrictions
- Per-session profiles

**Marketing:**

- Name: **Security Shield**
- Tagline: "Every session, hardened by default"
- Metric: "72% vulnerability catch rate"

### 3.4 Secrets Manager (Vault)

**What:** Encrypted credential storage, per-session secrets, never exposed to LLM.

**Why:** Secure access to APIs, databases, services without leaking credentials.

**Implementation:**

- New module: `src-tauri/src/storage/secrets.rs`
- AES-256-GCM encryption
- Per-session secret injection
- Never in prompt context
- Audit trail

**Marketing:**

- Name: **Vault**
- Tagline: "Credentials secure, never exposed"
- Metric: "Zero leaked secrets"

### 3.5 Hooks (Guardrails)

**What:** Shell commands executed at key workflow points (pre/post).

**Why:** Logging, security controls, validation, enterprise governance.

**Implementation:**

- New module: `src-tauri/src/agent/hooks.rs`
- Pre-model hooks
- Post-tool hooks
- Post-agent hooks
- Configurable per session

**Marketing:**

- Name: **Guardrails**
- Tagline: "Pre/post commands for enterprise control"
- Metric: "SOC 2 compliance"

### 3.6 Testing & Video (Proof Mode)

**What:** E2E test execution with video recordings as proof.

**Why:** Verify behavior, catch regressions, provide evidence.

**Implementation:**

- New module: `src-tauri/src/agent/testing.rs`
- Test runner integration
- Video recording (browser use)
- Coverage analysis
- Proof artifacts

**Marketing:**

- Name: **Proof Mode**
- Tagline: "Video proof that it works"
- Metric: "10-15x test velocity"

---

## Cross-Cutting Concerns

### Middleware System

**What:** Hooks around agent execution for deterministic behaviors.

**Implementation:**

- New module: `src-tauri/src/agent/middleware.rs`
- Traits: `before_model`, `after_tool`, `after_agent`
- Tool error handling
- Message queue mid-run (inject follow-up messages)

### Workspace Abstraction

**What:** Same agent code runs locally or sandboxed, only workspace type changes.

**Implementation:**

- New module: `src-tauri/src/agent/workspace.rs`
- Trait: `Workspace` with `execute_command`, `file_upload`, `file_download`
- `LocalWorkspace` — direct subprocess
- `SandboxedWorkspace` — bubblewrap/firejail
- Factory pattern: `Conversation::new(agent, workspace)`

### Tauri Events System

**What:** Event-driven communication between backend and frontend.

**Events:**

- `task:complete` — Task finished successfully
- `task:failed` — Task failed
- `agent:step` — Agent progress update
- `plan:ready` — Plan ready for review
- `swarm:update` — Swarm status update

---

## Marketing: All Features by Mode

### Chat Mode (12 features)

| #   | Feature              | Name              | Tagline                                          | Metric                        |
| --- | -------------------- | ----------------- | ------------------------------------------------ | ----------------------------- |
| 1   | Interactive Planning | Plan Mode         | "See the plan before code is written"            | "80% fewer wasted iterations" |
| 2   | Playbooks            | Playbooks         | "Reusable recipes for recurring tasks"           | "10x faster onboarding"       |
| 3   | Knowledge            | Context Engine    | "Stark learns your codebase, not just your code" | "3x fewer clarifications"     |
| 4   | Memories & Rules     | Memories          | "Context that persists between sessions"         | "Zero re-explanation"         |
| 5   | Adaptive Router      | Smart Router      | "Right model, right task, right price"           | "40% cost reduction"          |
| 6   | Context Condensation | Memory            | "Long sessions without long costs"               | "2x cheaper long tasks"       |
| 7   | Agent modes          | Plan/Build/Cowork | "Three modes for every workflow"                 | "Match your style"            |
| 8   | @mentions            | @Mention          | "Reference any file, any skill"                  | "Precision context"           |
| 9   | Skills system        | Skills            | "Extend Stark with custom abilities"             | "500+ community skills"       |
| 10  | Custom agents        | Agents            | "Build your own AI specialists"                  | "Your rules, your agent"      |
| 11  | Voice dictation      | Voice             | "Speak your intent, Stark executes"              | "Hands-free coding"           |
| 12  | Secrets Manager      | Vault             | "Credentials secure, never exposed"              | "Zero leaked secrets"         |

### Code Mode (20 features)

| #   | Feature              | Name            | Tagline                                            | Metric                         |
| --- | -------------------- | --------------- | -------------------------------------------------- | ------------------------------ |
| 1   | Event Sourcing       | Time Travel     | "Replay any session, debug any failure"            | "Zero data loss"               |
| 2   | Interactive Planning | Plan Mode       | "See the plan before code is written"              | "80% fewer wasted iterations"  |
| 3   | Playbooks            | Playbooks       | "Reusable recipes for recurring tasks"             | "10x faster onboarding"        |
| 4   | Knowledge            | Context Engine  | "Stark learns your codebase, not just your code"   | "3x fewer clarifications"      |
| 5   | Memories & Rules     | Memories        | "Context that persists between sessions"           | "Zero re-explanation"          |
| 6   | Adaptive Router      | Smart Router    | "Right model, right task, right price"             | "40% cost reduction"           |
| 7   | Context Condensation | Memory          | "Long sessions without long costs"                 | "2x cheaper long tasks"        |
| 8   | Fire-and-Forget      | Dispatch        | "Assign tasks, close your laptop"                  | "5x throughput"                |
| 9   | Subagent Spawning    | Swarm           | "A team of agents for every engineer"              | "8 parallel agents"            |
| 10  | Dynamic Workflows    | Workflows       | "Deterministic scripts for complex orchestrations" | "18 months → 8 days"           |
| 11  | Git Worktrees        | Worktrees       | "Parallel work without merge conflicts"            | "Zero conflict overhead"       |
| 12  | Session Analysis     | Insights        | "Learn from every session"                         | "30% fewer failures"           |
| 13  | Scheduling           | Scheduler       | "Automate recurring engineering tasks"             | "Set and forget"               |
| 14  | Stacked PRs          | Stacked PRs     | "Large changes, reviewable chunks"                 | "3x faster reviews"            |
| 15  | AI Commit Messages   | Smart Commits   | "Meaningful messages, zero effort"                 | "100% conventional commits"    |
| 16  | Security Profiles    | Security Shield | "Every session, hardened by default"               | "72% vulnerability catch rate" |
| 17  | Hooks                | Guardrails      | "Pre/post commands for enterprise control"         | "SOC 2 compliance"             |
| 18  | Testing & Video      | Proof Mode      | "Video proof that it works"                        | "10-15x test velocity"         |
| 19  | Terminal             | Terminal        | "Full shell access, sandboxed"                     | "Run anything safely"          |
| 20  | File Explorer        | File Explorer   | "Navigate your codebase visually"                  | "Instant context"              |

### Design Mode (6 features)

| #   | Feature              | Name         | Tagline                                      | Metric                                |
| --- | -------------------- | ------------ | -------------------------------------------- | ------------------------------------- |
| 1   | Adaptive Router      | Smart Router | "Right model, right task, right price"       | "40% cost reduction"                  |
| 2   | Context Condensation | Memory       | "Long sessions without long costs"           | "2x cheaper long tasks"               |
| 3   | Design presets       | Presets      | "Start from proven templates"                | "Landing, app, dashboard — one click" |
| 4   | Element picker       | Pick & Edit  | "Click any element, tell Stark to change it" | "Visual-first editing"                |
| 5   | HTML preview         | Live Preview | "See changes in real-time"                   | "Instant feedback"                    |
| 6   | Artifact types       | Artifacts    | "Prototypes, pitch decks, hype frames"       | "One tool, many outputs"              |

### Existing Features (Marketing Improved)

| Feature            | Current Name   | New Name       | New Tagline                                       |
| ------------------ | -------------- | -------------- | ------------------------------------------------- |
| Multi-provider     | Multi-Provider | Multi-Provider | "OpenAI, Anthropic, Gemini, Ollama — your choice" |
| Offline mode       | Local Mode     | Local Mode     | "Full AI power, zero internet"                    |
| Encryption         | Vault          | Vault          | "Military-grade encryption at rest"               |
| Hardware detection | Smart Detect   | Smart Detect   | "Automatically picks the best local model"        |
| Diff preview       | DiffView       | DiffView       | "Review every change before apply"                |

---

## Implementation Order

### Phase 1: Agent Intelligence (Months 1-2)

| Week  | Task                                | Module                            |
| ----- | ----------------------------------- | --------------------------------- |
| 1-2   | Event Sourcing foundation           | `eventsourcing.rs`                |
| 3-4   | Interactive Planning (PlanTaskTool) | `planning.rs` + `PlanReviewModal` |
| 5-6   | Adaptive Router                     | `router.rs`                       |
| 7-8   | Context Condensation                | `condenser.rs`                    |
| 9-10  | Playbooks enhancement               | Enhance skills system             |
| 11-12 | Knowledge + Memories                | `memories.rs` + enhance hermes    |

### Phase 2: Multi-Agent Orchestration (Months 2-3)

| Week  | Task                        | Module                          |
| ----- | --------------------------- | ------------------------------- |
| 13-14 | Fire-and-Forget Dispatch    | `dispatcher.rs`                 |
| 15-16 | Subagent Spawning           | `subagent.rs`                   |
| 17-18 | Dynamic Workflows           | `workflow.rs`                   |
| 19-20 | Git Worktrees               | `worktree.rs`                   |
| 21-22 | Scheduling + Reconciliation | `scheduler.rs` + `reconcile.rs` |
| 23-24 | Session Analysis            | `analytics.rs`                  |

### Phase 3: Developer Workflow (Months 3-4)

| Week  | Task               | Module        |
| ----- | ------------------ | ------------- |
| 25-26 | Stacked PRs        | `stacked.rs`  |
| 27-28 | AI Commit Messages | `commit.rs`   |
| 29-30 | Security Profiles  | `security.rs` |
| 31-32 | Secrets Manager    | `secrets.rs`  |
| 33-34 | Hooks              | `hooks.rs`    |
| 35-36 | Testing & Video    | `testing.rs`  |

---

## Sources

### Repos Analyzed

| Repo                     | License     | Key Patterns Adopted                                                                         |
| ------------------------ | ----------- | -------------------------------------------------------------------------------------------- |
| OpenHands (All Hands AI) | MIT         | Event Sourcing, Tool System, Workspace Abstraction, Subagent Isolation, Context Condensation |
| Open-SWE (LangChain AI)  | Open Source | Fire-and-Forget, Deterministic IDs, Crash Recovery, Middleware, Reconciliation               |
| Devin (Cognition AI)     | Proprietary | 30 features mapped, Marketing naming, Architecture reference                                 |

### Documentation Referenced

- Devin Docs: https://docs.devin.ai/
- Devin Release Notes: https://docs.devin.ai/release-notes/overview
- OpenHands Architecture: SDK, Event System, Tool System
- Open-SWE Architecture: Dispatch, Sandbox, GitHub Integration

### Key Architectural Decisions

1. **Event Sourcing is the foundation** — everything is an immutable event
2. **Sandboxing is opt-in** — local first, isolation optional
3. **Tools are the extension point** — sub-agents, MCP, custom behaviors = tools
4. **Stateless agents + stateful conversations** — agents serializable, conversations mutable
5. **Context condensation is essential** — 2x cost reduction for long sessions
6. **Security is layered** — annotations + analysis + confirmation

---

## Technical References — Exact File Paths for Cloning/Replication

### RULES AND GUIDELINES

**When replicating code from repos:**

1. **DO** study the architecture and data flow, then rewrite in Rust idiomatically
2. **DO** adopt the same trait/interface patterns but use Rust traits instead of Python ABCs
3. **DO** keep the same conceptual model (Event, Tool, Workspace) but adapt to Tauri IPC
4. **DON'T** copy Python code 1:1 — Rust has different patterns (ownership, async, traits)
5. **DON'T** import LangGraph/LangChain dependencies — use `tokio` + `async-trait` natively
6. **DON'T** use Docker for sandboxing — use bubblewrap/firejail (already in Stark)
7. **DO** map Python `@before_model` hooks to Rust middleware traits
8. **DO** map Python Pydantic models to Rust `serde` structs
9. **DO** map Python async/await to Rust `tokio` async
10. **DO** keep the same file organization: agent/, tools/, middleware/, etc.

---

### OPEN-SWE REPO — Exact File Paths

**Repository:** `langchain-ai/open-swe` (branch: `main`)
**Language:** Python → **Target:** Rust (Stark)
**Framework:** LangGraph + Deep Agents → **Target:** tokio + async-trait

#### 1. Dispatch System

| What              | File                      | Functions                                                           | Lines |
| ----------------- | ------------------------- | ------------------------------------------------------------------- | ----- |
| Task dispatch     | `agent/dispatch.py`       | `dispatch_agent_run()`, `create_durable_run()`, `_dispatch_input()` | ~340  |
| Run input builder | `agent/input_messages.py` | `RunInput`, `build_run_input()`                                     | —     |

**Rust equivalent:**

```
src-tauri/src/agent/dispatcher.rs
├── dispatch_task(task: Task) -> TaskHandle
├── create_durable_run(config: RunConfig) -> RunId
└── build_run_input(source: &str, payload: &Value) -> RunInput
```

#### 2. Agent Graph / Server

| What               | File                    | Functions                                                   | Lines |
| ------------------ | ----------------------- | ----------------------------------------------------------- | ----- |
| Main agent factory | `agent/server.py`       | `get_agent()`, `traced_agent()`                             | ~2200 |
| Sandbox management | `agent/server.py`       | `ensure_sandbox_for_thread()`, `reset_sandbox_for_thread()` | —     |
| Subagent creation  | `agent/server.py`       | `_general_purpose_subagent()`, `_browser_subagent()`        | —     |
| Graph re-exports   | `agent/graphs/agent.py` | `from agent.server import get_agent`                        | —     |

**Rust equivalent:**

```
src-tauri/src/agent/orchestrator.rs (existing, enhance)
├── get_agent(config: AgentConfig) -> AgentRuntime
├── ensure_workspace(thread_id: &str) -> Workspace
└── spawn_subagent(parent: &AgentState, desc: &str) -> JoinHandle
```

#### 3. Sandbox Integration

| What               | File                                  | Functions                               | Lines |
| ------------------ | ------------------------------------- | --------------------------------------- | ----- |
| Sandbox factory    | `agent/utils/sandbox.py`              | `create_sandbox()`, `SANDBOX_FACTORIES` | ~100  |
| LangSmith provider | `agent/integrations/langsmith.py`     | `create_langsmith_sandbox()`            | ~750  |
| Local provider     | `agent/integrations/local.py`         | `create_local_sandbox()`                | ~50   |
| Sandbox runtime    | `agent/runtime/sandbox.py`            | `ensure_sandbox_for_thread()`           | ~30   |
| Sandbox settings   | `agent/dashboard/sandbox_settings.py` | `get_admin_base_snapshot_id()`          | ~100  |

**Rust equivalent:**

```
src-tauri/src/agent/workspace.rs (new)
├── trait Workspace { execute_command(), file_upload(), file_download() }
├── LocalWorkspace (direct subprocess)
└── SandboxedWorkspace (bubblewrap/firejail)
```

#### 4. Thread ID Generation

| What              | File                  | Functions                                                                                                                      | Lines |
| ----------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----- |
| Deterministic IDs | `agent/thread_ids.py` | `slack_thread_id()`, `linear_issue_thread_id()`, `github_issue_thread_id()`, `reviewer_thread_id()`, `thread_id_from_branch()` | ~70   |

**Rust equivalent:**

```
src-tauri/src/agent/dispatcher.rs
├── generate_thread_id(source: &str, key: &str) -> Uuid
│   ├── Uses uuid5 (SHA-based) for stable IDs
│   └── thread_id_from_branch() extracts UUID from branch name
```

#### 5. Completion Handling

| What               | File                  | Functions                                                                              | Lines |
| ------------------ | --------------------- | -------------------------------------------------------------------------------------- | ----- |
| Completion webhook | `agent/completion.py` | `handle_run_completion()`, `_post_failure_reply()`, `_schedule_success_cost_refresh()` | ~350  |

**Rust equivalent:**

```
src-tauri/src/agent/completion.rs (new)
├── handle_completion(run_id: RunId, status: Status)
│   ├── On success: emit task:complete event
│   └── On failure: emit task:failed event + notify user
└── Idempotent per run_id
```

#### 6. Scheduler & Reconciliation

| What            | File                           | Functions                      | Lines |
| --------------- | ------------------------------ | ------------------------------ | ----- |
| Scheduler graph | `agent/scheduler.py`           | `get_scheduler()`, `_launch()` | ~75   |
| Reconciliation  | `agent/reconcile.py`           | `reconcile_stale_runs()`       | ~120  |
| Scheduled runs  | `agent/dashboard/schedules.py` | `launch_scheduled_agent_run()` | ~700  |

**Rust equivalent:**

```
src-tauri/src/agent/scheduler.rs (new)
├── launch_scheduled_task(schedule: Schedule) -> TaskHandle
├── reconcile_stale_tasks()
│   └── Cancel tasks pending > 30min
└── Uses tokio::time::interval for cron-like scheduling
```

#### 7. Middleware Stack

| What                | File                                      | Functions                            | Lines |
| ------------------- | ----------------------------------------- | ------------------------------------ | ----- |
| Middleware registry | `agent/middleware/__init__.py`            | Lazy-loading module registry         | ~100  |
| Message queue       | `agent/middleware/check_message_queue.py` | `check_message_queue_before_model()` | ~340  |
| Tool error handler  | `agent/middleware/tool_error_handler.py`  | `awrap_tool_call()`                  | ~150  |
| Model timeout       | `agent/middleware/model_call_timeout.py`  | Timeout enforcement                  | —     |
| Plan mode           | `agent/middleware/plan_mode.py`           | Excludes mutating tools              | —     |
| PR creation guard   | `agent/middleware/pr_creation_guard.py`   | Blocks shell PR fallbacks            | ~270  |
| Workflow push guard | `agent/middleware/workflow_push_guard.py` | Approval for workflow changes        | ~500  |

**Middleware inventory (22 total):**

- `check_message_queue_before_model` — inject follow-up messages
- `DynamicToolMiddleware` — lazy tool loading
- `ExcludeToolsMiddleware` — tool filtering
- `ModelCallTimeoutMiddleware` — model call timeout
- `ModelFallbackMiddleware` — model fallback on failure
- `notify_step_limit_reached` — limit notification
- `PlanModeMiddleware` — plan mode activation
- `PullRequestCreationGuardMiddleware` — PR creation guard
- `PrepareRunState` / `BasePrepareRunMiddleware` — pre-run setup
- `refresh_github_proxy_before_model` — proxy refresh
- `RepairOrphanedToolCallsMiddleware` — orphan repair
- `SanitizeFireworksMessagesMiddleware` — provider compat
- `SanitizeOpenAIResponsesMiddleware` — OpenAI compat
- `SanitizeThinkingBlocksMiddleware` — thinking blocks
- `SanitizeToolInputsMiddleware` — tool input cleanup
- `StableToolResultOrderMiddleware` — deterministic ordering
- `settle_review_check_on_exit` — review cleanup
- `SubdirAgentsReadMiddleware` — subdirectory agents
- `task_on_failure` / `task_retry_on` — retry logic
- `TimeoutWrapupMiddleware` — graceful timeout
- `ToolErrorMiddleware` — error handling
- `WorkflowPushGuardMiddleware` — workflow push guard

**Rust equivalent:**

```
src-tauri/src/agent/middleware.rs (new)
├── trait Middleware: Send + Sync {
│   ├── async fn before_model(&self, state: &mut AgentState) -> Result<()>
│   ├── async fn after_tool(&self, state: &mut AgentState, tool: &ToolCall) -> Result<()>
│   └── async fn after_agent(&self, state: &AgentState) -> Result<()>
│   }
├── MessageQueueMiddleware — inject follow-up messages
├── ToolErrorMiddleware — graceful error handling
├── ModelTimeoutMiddleware — timeout enforcement
├── PlanModeMiddleware — exclude mutating tools
└── SecurityMiddleware — network/tool restrictions
```

#### 8. GitHub Integration

| What                | File                                    | Functions                                                                     | Lines |
| ------------------- | --------------------------------------- | ----------------------------------------------------------------------------- | ----- |
| PR creation tool    | `agent/tools/open_pull_request.py`      | `open_pull_request()`, `_resolve_pr_author_token()`, `_preflight_pr_access()` | ~400  |
| PR guard middleware | `agent/middleware/pr_creation_guard.py` | `is_pr_creation_fallback_command()`                                           | ~270  |
| GitHub App utils    | `agent/utils/github_app.py`             | `get_github_app_installation_token()`                                         | —     |

**Rust equivalent:**

```
src-tauri/src/repo/github.rs (new)
├── create_pull_request(branch: &str, title: &str, body: &str) -> Result<PrUrl>
├── add_pr_comment(pr_url: &str, comment: &str) -> Result<()>
└── Uses gh CLI or direct API calls with user's auth
```

---

### OPENHANDS REPO — Exact File Paths

**Repository:** `All-Hands-AI/OpenHands`
**Language:** Python → **Target:** Rust (Stark)
**SDK:** `openhands-sdk/`

#### 1. Event System

| What               | File Path                                          | Key Classes                                                                                                 | Lines |
| ------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----- |
| Event hierarchy    | `openhands-sdk/openhands/sdk/event/`               | `Event`, `MessageEvent`, `ActionEvent`, `ObservationEvent`, `SystemPromptEvent`, `CondensationSummaryEvent` | —     |
| Event base         | `openhands-sdk/openhands/sdk/event/event.py`       | `Event(id, timestamp, source)`                                                                              | —     |
| Action events      | `openhands-sdk/openhands/sdk/event/action.py`      | `ActionEvent(thought, reasoning_content, tool_calls)`                                                       | —     |
| Observation events | `openhands-sdk/openhands/sdk/event/observation.py` | `ObservationEvent`, `UserRejectObservation`, `AgentErrorEvent`                                              | —     |
| LLM events         | `openhands-sdk/openhands/sdk/event/llm.py`         | `LLMConvertibleEvent(to_llm_message())`                                                                     | —     |

**Rust equivalent:**

```
src-tauri/src/agent/eventsourcing.rs (new)
├── enum Event {
│   ├── Message(MessageEvent),
│   ├── Action(ActionEvent),
│   ├── Observation(ObservationEvent),
│   ├── SystemPrompt(SystemPromptEvent),
│   ├── Condensation(CondensationEvent),
│   └── Internal(InternalEvent),
│   }
├── struct ConversationState {
│   ├── events: Vec<Event>,        // append-only log
│   ├── metadata: ConversationMeta, // mutable
│   └── stats: ConversationStats,
│   }
├── persist_event(event: &Event, db: &SqlitePool) -> Result<()>
├── load_events(thread_id: &str, db: &SqlitePool) -> Result<Vec<Event>>
└── replay_events(thread_id: &str, db: &SqlitePool) -> Result<ConversationState>
```

#### 2. Tool System

| What             | File Path                                                | Key Classes                                                 | Lines |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------- | ----- |
| Tool definitions | `openhands-sdk/openhands/sdk/tool/`                      | `ToolDefinition`, `ToolExecutor`, `Action`, `Observation`   | —     |
| Tool registry    | `openhands-sdk/openhands/sdk/tool/registry.py`           | `register_tool()`, `ToolRegistry.resolve()`                 | —     |
| Bash tool        | `openhands-sdk/openhands/sdk/tool/bash/`                 | `BashTool`, `BashAction`, `BashObservation`, `BashExecutor` | —     |
| File editor      | `openhands-sdk/openhands/sdk/tool/file_editor/`          | `FileEditorTool`, `FileEditorAction`                        | —     |
| Glob tool        | `openhands-sdk/openhands/sdk/tool/glob/`                 | `GlobTool` (readOnly, idempotent)                           | —     |
| Grep tool        | `openhands-sdk/openhands/sdk/tool/grep/`                 | `GrepTool` (readOnly, idempotent)                           | —     |
| Browser tool     | `openhands-sdk/openhands/sdk/tool/browser/`              | `BrowserTool` (openWorld)                                   | —     |
| Task tracker     | `openhands-sdk/openhands/sdk/tool/task_tracker/`         | `TaskTrackerTool`                                           | —     |
| Planning editor  | `openhands-sdk/openhands/sdk/tool/planning_file_editor/` | `PlanningFileEditorTool`                                    | —     |

**Tool annotations:**

```
readOnlyHint:     glob=True, grep=True, execute_bash=False
destructiveHint:  file_editor=True, execute_bash=True
idempotentHint:   glob=True, grep=True
openWorldHint:    execute_bash=True, browser=True
```

**Rust equivalent (enhance existing):**

```
src-tauri/src/agent/tools/mod.rs (existing, enhance)
├── trait Tool: Send + Sync {
│   ├── fn name(&self) -> &str
│   ├── fn description(&self) -> &str
│   ├── fn parameters_schema(&self) -> Value
│   ├── fn is_read_only(&self, args: &Value) -> bool
│   ├── fn is_destructive(&self, args: &Value) -> bool
│   ├── fn call(&self, args: Value, workspace: &str) -> Result<String, String>
│   └── fn annotations(&self) -> ToolAnnotations  // NEW
│   }
├── struct ToolAnnotations {
│   ├── read_only_hint: bool,
│   ├── destructive_hint: bool,
│   ├── idempotent_hint: bool,
│   └── open_world_hint: bool,
│   }
└── Add new tools:
    ├── PlanTaskTool (planning.rs)
    ├── SearchTool (codebase search)
    ├── BrowserTool (computer use)
    └── SubAgentTool (subagent delegation)
```

#### 3. Agent Loop

| What           | File Path                                                            | Key Classes                                 | Lines |
| -------------- | -------------------------------------------------------------------- | ------------------------------------------- | ----- |
| Agent base     | `openhands-sdk/openhands/sdk/agent/`                                 | `Agent`, `step()` method                    | —     |
| Single-step    | `openhands-sdk/openhands/sdk/agent/agent.py`                         | `step()` — atomic, interruptible, stateless | —     |
| Reasoning loop | The loop: pending → condense → query LLM → parse → execute → observe | —                                           | —     |

**The `step()` flow:**

```
1. Pending actions? → Execute → Return
2. Has condenser? → Condense if needed
3. Query LLM with messages
4. Parse response → ActionEvents or MessageEvent
5. Need confirmation? → Set WAITING_FOR_CONFIRMATION
6. Execute actions → Create ObservationEvents
```

**Rust equivalent (enhance existing):**

```
src-tauri/src/agent/orchestrator.rs (existing, enhance)
├── async fn step(&mut self, state: &mut ConversationState) -> StepResult
│   ├── 1. Check pending actions
│   ├── 2. Apply condenser if needed
│   ├── 3. Query LLM (via provider router)
│   ├── 4. Parse response into actions
│   ├── 5. Execute tools via ToolRegistry
│   └── 6. Return observations
└── Stateless agent, stateful ConversationState
```

#### 4. Workspace Abstraction

| What                 | File Path                                                            | Key Classes                                                              | Lines |
| -------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----- |
| Workspace base       | `openhands-sdk/openhands/sdk/workspace/`                             | `BaseWorkspace`, `execute_command()`, `file_upload()`, `file_download()` | —     |
| Local workspace      | `openhands-sdk/openhands/sdk/workspace/local.py`                     | `LocalWorkspace` — direct subprocess                                     | —     |
| Remote workspace     | `openhands-sdk/openhands/sdk/workspace/remote.py`                    | `RemoteWorkspace` — HTTP API calls                                       | —     |
| Docker workspace     | `openhands-sdk/openhands/sdk/workspace/docker.py`                    | `DockerWorkspace` — auto-spawn containers                                | —     |
| Conversation factory | Pattern: `Conversation(agent, workspace)` returns typed conversation | —                                                                        | —     |

**Rust equivalent:**

```
src-tauri/src/agent/workspace.rs (new)
├── #[async_trait]
│   trait Workspace: Send + Sync {
│   ├── async fn execute_command(&self, cmd: &str) -> CommandResult
│   ├── async fn file_upload(&self, local: &Path, remote: &str) -> Result<()>
│   └── async fn file_download(&self, remote: &str, local: &Path) -> Result<()>
│   }
├── struct LocalWorkspace { cwd: PathBuf }
├── struct SandboxedWorkspace { cwd: PathBuf, sandbox_mode: SandboxMode }
└── fn create_workspace(mode: SandboxMode, cwd: PathBuf) -> Box<dyn Workspace>
```

#### 5. Context Condensation

| What           | File Path                                                | Key Classes                                     | Lines |
| -------------- | -------------------------------------------------------- | ----------------------------------------------- | ----- |
| Condenser base | `openhands-sdk/openhands/sdk/context/`                   | `Condenser`, `condense()` method                | —     |
| LLM summarizer | `openhands-sdk/openhands/sdk/context/llm_summarizing.py` | `LLMSummarizingCondenser(max_size, keep_first)` | —     |
| Token counting | Built into condenser                                     | Triggers when > max_size events                 | —     |

**How it works:**

```
1. Keep recent messages intact
2. Preserve first N events (system prompts)
3. Summarize older content using LLM
4. Emit CondensationSummaryEvent
5. Result: 2x cost reduction, equivalent performance
```

**Rust equivalent:**

```
src-tauri/src/agent/condenser.rs (new)
├── trait Condenser: Send + Sync {
│   ├── fn should_condense(&self, state: &ConversationState) -> bool
│   └── async fn condense(&self, state: &ConversationState) -> Result<ConversationState>
│   }
├── struct TokenCountingCondenser { max_tokens: usize, keep_first: usize }
├── struct LLMSummarizingCondenser { llm: Box<dyn Provider>, max_size: usize }
└── Integration: called in orchestrator.step() before LLM query
```

#### 6. Subagent Delegation

| What          | File Path                                     | Key Classes                        | Lines |
| ------------- | --------------------------------------------- | ---------------------------------- | ----- |
| Subagent tool | `openhands-sdk/openhands/sdk/subagent/`       | `SubAgentTool`, delegation pattern | —     |
| Parent-child  | Parent conversation spawns child conversation | Child inherits model + workspace   | —     |
| Concurrency   | `tool_concurrency_limit=8`                    | Up to 8 parallel delegations       | —     |

**Rust equivalent:**

```
src-tauri/src/agent/subagent.rs (new)
├── struct SubAgent {
│   ├── id: Uuid,
│   ├── parent_id: Option<Uuid>,
│   ├── state: ConversationState,
│   ├── workspace: Box<dyn Workspace>,
│   └── handle: JoinHandle<AgentResult>,
│   }
├── async fn spawn_subagent(parent: &AgentState, task: &str) -> SubAgent
├── async fn wait_subagent(sub: &SubAgent) -> AgentResult
└── async fn message_subagent(sub: &SubAgent, msg: &str) -> Result<()>
```

#### 7. Stuck Detection

| What             | File Path                                         | Key Classes                               | Lines |
| ---------------- | ------------------------------------------------- | ----------------------------------------- | ----- |
| Pattern matching | `openhands-sdk/openhands/sdk/agent/`              | Sliding window detecting repeated actions | —     |
| Recovery         | Triggers alternative strategies on loop detection | —                                         | —     |

**Rust equivalent:**

```
src-tauri/src/agent/orchestrator.rs (enhance)
├── struct StuckDetector {
│   ├── window: VecDeque<ActionHash>,
│   ├── threshold: usize,
│   └── strategies: Vec<Box<dyn RecoveryStrategy>>,
│   }
├── fn detect_stuck(&mut self, action: &ActionEvent) -> bool
└── fn suggest_recovery(&self) -> RecoveryAction
```

---

### STARK FILES — Exact Paths to Modify/Create

#### Existing Files to Enhance

| File                                  | Enhancement               | What to Add                                                   |
| ------------------------------------- | ------------------------- | ------------------------------------------------------------- |
| `src-tauri/src/agent/orchestrator.rs` | Event sourcing foundation | `ConversationState`, append-only event log, `step()` refactor |
| `src-tauri/src/agent/tools/mod.rs`    | Tool annotations          | `ToolAnnotations` struct, `annotations()` method              |
| `src-tauri/src/agent/tools/shell.rs`  | Sandbox integration       | Workspace trait usage                                         |
| `src-tauri/src/agent/tools/fs.rs`     | Workspace trait           | Adapt to `Workspace` trait                                    |
| `src-tauri/src/agent/hermes/`         | Memories & Rules          | Persistent context, auto-generated memories                   |
| `src-tauri/src/providers/mod.rs`      | Adaptive router           | `Router` struct, task analysis                                |
| `src-tauri/src/sandbox/mod.rs`        | Workspace abstraction     | `SandboxedWorkspace` impl                                     |
| `src-tauri/src/repo/`                 | Worktrees, stacked PRs    | `worktree.rs`, `stacked.rs`                                   |
| `src-tauri/src/storage/`              | Secrets manager           | `secrets.rs`                                                  |

#### New Files to Create

| File                                   | Vertical | What It Does                   |
| -------------------------------------- | -------- | ------------------------------ |
| `src-tauri/src/agent/eventsourcing.rs` | V1       | Event log, persistence, replay |
| `src-tauri/src/agent/planning.rs`      | V1       | PlanTaskTool, plan struct      |
| `src-tauri/src/agent/condenser.rs`     | V1       | Context condensation           |
| `src-tauri/src/agent/memories.rs`      | V1       | Persistent memories & rules    |
| `src-tauri/src/providers/router.rs`    | V1       | Adaptive model routing         |
| `src-tauri/src/agent/dispatcher.rs`    | V2       | Fire-and-forget dispatch       |
| `src-tauri/src/agent/subagent.rs`      | V2       | Subagent spawning              |
| `src-tauri/src/agent/workflow.rs`      | V2       | Dynamic workflows              |
| `src-tauri/src/agent/scheduler.rs`     | V2       | Cron-like scheduling           |
| `src-tauri/src/agent/reconcile.rs`     | V2       | Stale task cleanup             |
| `src-tauri/src/agent/analytics.rs`     | V2       | Session analysis               |
| `src-tauri/src/agent/workspace.rs`     | Cross    | Workspace trait + impls        |
| `src-tauri/src/agent/middleware.rs`    | Cross    | Middleware trait + stack       |
| `src-tauri/src/agent/completion.rs`    | Cross    | Completion signals             |
| `src-tauri/src/repo/worktree.rs`       | V2       | Git worktrees                  |
| `src-tauri/src/repo/stacked.rs`        | V3       | Stacked PRs                    |
| `src-tauri/src/repo/commit.rs`         | V3       | AI commit messages             |
| `src-tauri/src/agent/security.rs`      | V3       | Security profiles              |
| `src-tauri/src/storage/secrets.rs`     | V3       | Encrypted secrets              |
| `src-tauri/src/agent/hooks.rs`         | V3       | Pre/post hooks                 |
| `src-tauri/src/agent/testing.rs`       | V3       | Test execution + video         |

#### New Frontend Components

| File                                      | What It Does                      |
| ----------------------------------------- | --------------------------------- |
| `src/components/PlanReviewModal.jsx`      | Review/edit plan before execution |
| `src/components/SwarmPanel.jsx`           | Manage team of agents             |
| `src/components/WorkflowBuilder.jsx`      | Visual workflow builder           |
| `src/components/SchedulerModal.jsx`       | Configure schedules               |
| `src/components/StackedPRsView.jsx`       | View PR stack                     |
| `src/components/SecurityPanel.jsx`        | Security settings per session     |
| `src/components/TestRunnerPanel.jsx`      | Test execution + video            |
| `src/components/SessionInsightsPanel.jsx` | Post-session feedback             |

---

### DATA STRUCTURES REFERENCE

#### Event (from OpenHands)

```python
# Python (OpenHands)
class Event:
    id: str
    timestamp: datetime
    source: str

class LLMConvertibleEvent(Event):
    def to_llm_message() -> Message

class ActionEvent(LLMConvertibleEvent):
    thought: str
    reasoning_content: str
    tool_calls: list[ToolCall]

class ObservationEvent(ObservationBaseEvent):
    content: str  # to_llm_content()
```

```rust
// Rust (Stark target)
#[derive(Serialize, Deserialize, Clone)]
pub enum Event {
    Message(MessageEvent),
    Action(ActionEvent),
    Observation(ObservationEvent),
    SystemPrompt(SystemPromptEvent),
    Condensation(CondensationEvent),
}

#[derive(Serialize, Deserialize, Clone)]
pub struct MessageEvent {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub role: Role,  // User | Assistant | System
    pub content: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ActionEvent {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub thought: String,
    pub tool_calls: Vec<ToolCall>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ObservationEvent {
    pub id: Uuid,
    pub timestamp: DateTime<Utc>,
    pub action_id: Uuid,
    pub content: String,
    pub is_error: bool,
}
```

#### Tool (from OpenHands)

```python
# Python (OpenHands)
class ToolDefinition(ABC):
    name: str
    action: type[Action]
    observation: type[Observation]
    executor: ToolExecutor

    @classmethod
    def create(cls, conv_state, **kwargs) -> list["ToolDefinition"]:
        ...

class ToolExecutor(ABC):
    async def __call__(self, action: Action) -> Observation: ...
```

```rust
// Rust (Stark target)
pub trait Tool: Send + Sync {
    fn name(&self) -> &str;
    fn description(&self) -> &str;
    fn parameters_schema(&self) -> Value;
    fn is_read_only(&self, args: &Value) -> bool;
    fn is_destructive(&self, args: &Value) -> bool;
    fn annotations(&self) -> ToolAnnotations;
    fn call(&self, args: Value, workspace: &str) -> Result<String, String>;
}

pub struct ToolAnnotations {
    pub read_only_hint: bool,
    pub destructive_hint: bool,
    pub idempotent_hint: bool,
    pub open_world_hint: bool,
}
```

#### Middleware (from Open-SWE)

```python
# Python (Open-SWE)
@before_model
async def check_message_queue_before_model(state):
    # Read queued messages from store
    # Inject as HumanMessages before next model call
    return {"messages": [...]}

class ToolErrorMiddleware:
    async def awrap_tool_call(self, tool_call):
        try:
            return await tool_call()
        except SandboxClientError:
            return error_payload(recovery="sandbox_unreachable")
```

```rust
// Rust (Stark target)
#[async_trait]
pub trait Middleware: Send + Sync {
    async fn before_model(&self, state: &mut AgentState) -> Result<()> {
        Ok(())  // default no-op
    }
    async fn after_tool(&self, state: &mut AgentState, tool: &ToolCall) -> Result<()> {
        Ok(())
    }
    async fn after_agent(&self, state: &AgentState) -> Result<()> {
        Ok(())
    }
}

pub struct MessageQueueMiddleware;
pub struct ToolErrorMiddleware;
pub struct ModelTimeoutMiddleware { timeout: Duration }
pub struct PlanModeMiddleware;
pub struct SecurityMiddleware { profile: SecurityProfile }
```

#### Workspace (from OpenHands)

```python
# Python (OpenHands)
class BaseWorkspace(ABC):
    async def execute_command(self, cmd: str, timeout: int) -> ExecuteResponse: ...
    async def file_upload(self, local: str, remote: str): ...
    async def file_download(self, remote: str, local: str): ...

class LocalWorkspace(BaseWorkspace):
    # Direct subprocess execution

class DockerWorkspace(BaseWorkspace):
    # Container subprocess execution
```

```rust
// Rust (Stark target)
#[async_trait]
pub trait Workspace: Send + Sync {
    async fn execute_command(&self, cmd: &str) -> CommandResult;
    async fn file_upload(&self, local: &Path, remote: &str) -> Result<()>;
    async fn file_download(&self, remote: &str, local: &Path) -> Result<()>;
    fn cwd(&self) -> &Path;
}

pub struct LocalWorkspace { cwd: PathBuf }
pub struct SandboxedWorkspace { cwd: PathBuf, mode: SandboxMode }
```

---

### CLONING WORKFLOW

```
Step 1: Clone repos to /tmp for study
├── git clone https://github.com/All-Hands-AI/OpenHands.git /tmp/openhands
├── git clone https://github.com/langchain-ai/open-swe.git /tmp/open-swe
└── DO NOT modify these — study only

Step 2: Study architecture
├── Read the exact files listed above
├── Understand data flow (Event → Action → Observation)
├── Map Python patterns to Rust equivalents
└── Document decisions in code comments

Step 3: Rewrite in Rust
├── Create new files in src-tauri/src/agent/
├── Use Rust idioms (traits, enums, async)
├── Use existing Stark patterns (serde, tokio, Tauri IPC)
├── Test each module independently
└── Integrate into orchestrator

Step 4: Verify
├── cargo check (type safety)
├── cargo test (unit tests)
├── cargo tauri build (integration)
└── Manual testing in UI
```

---

_Document generated from grilling session — 2026-08-26_
_Stark 2.0 Architecture & Features_
_Technical references: OpenHands (MIT) + Open-SWE (Open Source)_

# Crafter — Agent Instructions

## Project Overview

**Crafter** is a lightweight, model-agnostic AI coding agent for Linux desktops. Built with **Tauri 2 (Rust backend)** + **Svelte 5 (frontend compiled to vanilla JS)**. Target: <500MB RAM idle, <5s startup, runs on old hardware.

**Core value props:** Multi-provider (OpenAI, Anthropic, Gemini, Ollama local), Plan/Build modes with visual diff approval, sandboxed terminal (bubblewrap/firejail), AES-256-GCM encryption at rest, hardware detection for Ollama model tiers.

---

## Stack & Architecture

| Layer | Technology | Notes |
|-------|------------|-------|
| Shell | Tauri 2 (Rust) | Native desktop, modular plugins |
| Frontend | Svelte 5 + Tailwind CSS 4 | Compiles to vanilla JS, no VDOM runtime |
| Runtime | Bun | Package manager + runtime (faster than npm) |
| Language | TypeScript (frontend), Rust (backend) | Strict typing throughout |

**Project Structure:**
```
crafter-repo/
├── src-tauri/               # Backend Rust
│   ├── src/
│   │   ├── main.rs          # Entrypoint
│   │   ├── lib.rs
│   │   ├── providers/       # LLM adapters (OpenAI, Anthropic, Gemini, Ollama)
│   │   ├── commands/        # Tauri commands exposed to UI
│   │   ├── agent/           # Plan/Build logic
│   │   ├── repo/            # Gitignore-aware indexer
│   │   ├── storage/         # AES-256-GCM + Argon2 + Keyring
│   │   └── sandbox/         # bubblewrap/firejail executor
│   └── Cargo.toml
├── src/                     # Frontend Svelte 5
│   ├── lib/
│   │   ├── components/      # Chat, toggles, diff, editor
│   │   ├── stores/          # Global state (Svelte 5 runes)
│   │   └── api/             # Tauri command client
│   ├── app.html
│   └── main.ts
├── vite.config.ts
├── package.json
├── svelte.config.js
└── tsconfig.json
```

---

## Key Documentation Files

| File | Purpose | When to Reference |
|------|---------|-------------------|
| `goal.md` | Objectives, stack, verification criteria, build order | Product requirements, scope decisions |
| `tech-design.md` | Architecture, modules, data flow, dependencies, risks | Implementation details, module boundaries |
| `spec.md` | Exhaustive spec: 21 user stories, implementation decisions, testing | Feature specs, acceptance criteria |
| `shaping.md` | Hierarchical requirements, 3 forms evaluated, fit check, slicing | Prioritization, trade-offs, vertical slices |
| `breadboarding.md` | Places, UI affordances, code affordances, data stores, Mermaid flow | UI/UX mapping, IPC contracts, state management |
| `DESIGN.md` | Stark design system: colors, typography, components, vibe engineering | UI implementation, styling, component library |
| `grill-me.md` | Previous grilling session decisions (Preact/WebKitGTK path) | Historical context only — **Form A (Svelte 5) selected** |

---

## Skills to Use

Load these skills when working on this project:

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `implement` | Building features from spec | Vertical slice implementation (V1-V4) |
| `tdd` | Test-first development | Provider adapters, crypto, sandbox modules |
| `code-review` | Reviewing changes | Standards + spec compliance |
| `design-an-interface` | Designing new APIs/modules | Provider trait, IPC commands, store interfaces |
| `vercel-react-best-practices` | Frontend performance | Svelte 5 reactivity, streaming optimization |
| `diagnosing-bugs` | Debugging hard issues | Memory leaks, streaming stalls, sandbox failures |
| `domain-modeling` | Defining domain terms | Ubiquitous language for agent, sandbox, crypto domains |
| `setup-pre-commit` | First-time setup | Husky + lint-staged + typecheck + tests |
| `setup-ts-deep-modules` | Architecture enforcement | Deep module boundaries in Rust packages |

**Do NOT use:** `vercel-optimize`, `vercel-react-native-skills`, `vercel-cli-with-tokens`, `deploy-to-vercel` — not a Vercel/Next.js project.

---

## Development Commands

```bash
# Frontend
bun install              # Install deps
bun run dev              # Dev server (Vite + Tauri)
bun run build            # Typecheck + build frontend
bun run lint             # ESLint + Prettier
bun run typecheck        # tsc --noEmit

# Backend
cd src-tauri
cargo check              # Typecheck Rust
cargo test               # Unit tests
cargo tauri build        # Production binary (AppImage)

# Full stack
bun run tauri dev        # Runs both frontend + backend
```

---

## Coding Conventions

### Rust (Backend)
- **Async:** `tokio` + `async-trait` for provider trait
- **Error handling:** `Result<T, String>` for Tauri commands, `anyhow` internally
- **Serialization:** `serde` + `serde_json` for all IPC payloads
- **Streaming:** `futures::Stream` + Tauri `emit` for token events
- **Crypto:** `argon2` (Argon2id), `aes-gcm` (AES-256-GCM), `keyring` (Secret Service)
- **Hardware:** `sysinfo` for RAM/CPU, parse `nvidia-smi`/`vulkaninfo` for VRAM
- **Sandbox:** Spawn `bubblewrap`/`firejail` as external binaries via `tokio::process::Command`
- **Testing:** Mock HTTP with `wiremock`, test vectors for crypto, integration tests for sandbox

### Svelte 5 (Frontend)
- **Reactivity:** Runes (`$state`, `$derived`, `$effect`) — no legacy stores
- **Components:** Single-file `.svelte` with `<script lang="ts">`
- **Styling:** Tailwind CSS 4 (CSS-first config), design tokens from `DESIGN.md`
- **Icons:** **Lucide Icons only** (`lucide-svelte`), `strokeWidth={1.75}`
- **Typography:** **100% monospace** — Berkeley Mono / IBM Plex Mono / JetBrains Mono
- **Colors:** Strict monochrome neutral + warm earth primary (`#8c6253`) — **no blue/cyan accents**
- **Dropdowns:** **Dropup only** — `bottom: calc(100% + 6px)` (never downward)
- **No emojis, no text brackets** on any UI label/button (per DESIGN.md guardrails)
- **State:** Split `configStore` (provider, model, mode, reasoning) + `conversationStore` (messages, tokens, streaming buffer)

### IPC Contracts (Tauri Commands)
| Command | Direction | Input | Events Emitted |
|---------|-----------|-------|----------------|
| `send_chat_message` | UI → Rust | `SendChatPayload` | `chat-token` (`StreamEvent`) |
| `edit:apply` | UI → Rust | `{ action_id }` | `edit:success` |
| `terminal:execute` | UI → Rust | `{ command, sandbox_mode }` | `terminal:stdout`, `terminal:stderr`, `terminal:exit` |
| `crypto:unlock` | UI → Rust | `{ passphrase }` | `crypto:ready` |
| `hardware:detect` | UI → Rust | — | `hardware:info` |
| `providers_list` | UI → Rust | — | returns `Vec<ProviderConfig>` (presets fallback) |
| `providers_seed_presets` | UI → Rust | — | — |
| `providers_save` | UI → Rust | `ProviderSavePayload` | — |
| `providers_delete` | UI → Rust | `{ id }` | — |
| `providers_detect_models` | UI → Rust | `{ provider_id }` | returns `Vec<LocalModelInfo>` |
| `providers_install_model` | UI → Rust | `{ model_name }` | runs `ollama pull` |

---

## Vertical Slices (Implementation Order)

1. **Slice V1 — MVP Chat & Multi-Provider SSE**
   - Tauri shell + Svelte 5 + 4 provider adapters + streaming chat
   - Affordances: U1, U2, U5, U6, U7, N1, N2, S1, S2

2. **Slice V2 — Plan/Build Modes & Diff Approval**
   - Repo indexer + prompt builder + DiffModal (P2) + real file mutations
   - Affordances: U4, U12, U13, U14, N3, N4, N5, N6, N7, S3, S4

3. **Slice V3 — Crypto & Security**
   - Argon2 + AES-256-GCM + Keyring + UnlockModal (P4) fallback
   - Affordances: U19, U20, N10, N11, S6

4. **Slice V4 — Terminal Sandbox & Hardware Detection**
   - `bubblewrap`/`firejail` executor + `sysinfo` hardware tiers
   - Affordances: U11, U15, U16, U17, U18, N8, N9, N12, S5

---

## Testing Standards

- **Test only external behavior** — rendered output, DOM presence, callbacks, IPC events
- **Never test implementation details** (private functions, internal state)
- **LLM adapters:** Mock HTTP/SSE responses + smoke tests with real credentials
- **Crypto:** Verify decrypt(encrypt(plaintext)) == plaintext, reject invalid keys
- **Sandbox:** Test subprocess spawn, timeout enforcement, stdout/stderr capture
- **Frontend:** `bun run build` must pass; Vitest + Happy-DOM + `@testing-library/svelte`

---

## Guardrails (Invariants)

1. **Memory budget:** Idle <500MB RAM — avoid loading full repo into memory; stream files by range
2. **UI latency:** <50ms/frame — chunk token emits (~50ms batches), no blocking work on main thread
3. **Privacy:** Zero telemetry. API keys only in Keyring (Argon2id-derived master key). Local-only mode via Ollama.
4. **Sandbox:** Every command requires explicit user approval. No allowlists. Timeout + output limits mandatory.
5. **Encryption:** All persisted state (chats, config, logs) encrypted at rest. Plaintext fallback only with visible warning + 0600 perms.
6. **Design:** Monochrome + warm earth primary only. Lucide icons stroke 1.75. Dropup menus. No emojis/brackets. Newsreader serif for display, Inter for body, JetBrains Mono for code.
7. **Linux-only:** No Windows/macOS code paths. `bubblewrap` requires `newuidmap`/`newgidmap` (document kernel requirements).

---

## Common Tasks & Where to Start

| Task | Entry Point |
|------|-------------|
| Add new LLM provider | `src-tauri/src/providers/mod.rs` (implement `Provider` trait) |
| Add Tauri command | `src-tauri/src/commands/` + register in `lib.rs` |
| New UI component | `src/lib/components/` + follow DESIGN.md tokens |
| New store/state | `src/lib/stores/` (Svelte 5 runes) |
| Fix streaming latency | `src-tauri/src/providers/*.rs` (chunk emits) + `src/lib/stores/conversationStore.ts` |
| Debug sandbox failure | `src-tauri/src/sandbox/` + check `bubblewrap`/`firejail` availability |
| Update design tokens | `DESIGN.md` + Tailwind config + component classes |

---

## References

- Tauri 2 docs: https://tauri.app/v2/
- Svelte 5 runes: https://svelte.dev/docs/svelte/runes
- Lucide Svelte: https://lucide.dev/guide/packages/lucide-svelte
- argon2 crate: https://docs.rs/argon2
- aes-gcm crate: https://docs.rs/aes-gcm
- sysinfo crate: https://docs.rs/sysinfo
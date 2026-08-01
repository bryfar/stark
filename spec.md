---
shaping: true
breadboarding: true
spec: true
---

# Crafter — Especificación Técnica Exhaustiva (Spec Document)

> **Ubicación del archivo:** [`/home/bryan/Downloads/Repos/crafter-repo/spec.md`](file:///home/bryan/Downloads/Repos/crafter-repo/spec.md)  
> **Fuentes analizadas:** [`goal.md`](file:///home/bryan/Downloads/Repos/crafter-repo/goal.md), [`tech-design.md`](file:///home/bryan/Downloads/Repos/crafter-repo/tech-design.md), [`grill-me.md`](file:///home/bryan/Downloads/Repos/crafter-repo/grill-me.md), [`shaping.md`](file:///home/bryan/Downloads/Repos/crafter-repo/shaping.md), [`breadboarding.md`](file:///home/bryan/Downloads/Repos/crafter-repo/breadboarding.md).

---

## Problem Statement

Los desarrolladores que trabajan en distribuciones Linux sufren con los agentes de codificación actuales (como VS Code Copilot, Cursor, etc.), los cuales consumen cantidades excesivas de memoria RAM (más de 1.5–3 GB en reposo), imponen el uso exclusivo de proveedores cloud específicos sin privacidad, y carecen de un entorno de ejecución de comandos (terminal) verdaderamente aislado y ligero. Esto deja a los usuarios con equipos de bajos recursos o con requisitos estrictos de privacidad sin una solución eficiente, rápida y transparente.

---

## Solution

**Crafter** es un agente de codificación AI modelo-agnóstico en formato de aplicación de escritorio súper ligera para Linux. Basado en **Tauri v2** (backend Rust) y **Svelte 5** (frontend compilado a JS nativo sin runtime VDOM), Crafter garantiza un consumo en reposo menor a 300–500 MB de RAM y un arranque en menos de 5 segundos. 

Permite conectar alternativamente a OpenAI, Anthropic, Google Gemini y modelos locales vía Ollama. Incluye separación clara entre **Modo Plan** (análisis sin mutación) y **Modo Build** (edición de código con aprobación visual de diffs), así como un **terminal sandbox** basado en `bubblewrap`/`firejail` y cifrado en reposo AES-256-GCM.

---

## User Stories

1. As a Linux developer, I want a lightweight desktop coding agent (<500MB RAM), so that I can code smoothly even on low-resource hardware.
2. As a privacy-conscious developer, I want to use local models via Ollama 100% offline, so that my source code never leaves my machine.
3. As a developer using multiple LLM services, I want to toggle between OpenAI, Anthropic, Gemini, and Ollama in real-time, so that I can choose the best model for each task.
4. As a developer, I want to select specific sub-models (e.g., `gpt-4o`, `claude-3-5-sonnet`, `qwen2.5-coder`), so that I have fine-grained control over model capabilities and costs.
5. As a developer, I want an optional Chain-of-Thought (reasoning) mode, so that the agent explains its step-by-step logic before returning answers.
6. As a developer, I want a Plan Mode, so that I can receive architectural diagnostics without modifying any files on disk.
7. As a developer, I want a Build Mode with a visual Diff Modal, so that I can inspect and approve file modifications before they are written to disk.
8. As a developer, I want an autonomous session permission mode, so that the agent can apply multiple sequential edits without repeatedly prompting me, while keeping an auditable log.
9. As a developer, I want an automatic repository indexer (gitignore-aware), so that the agent understands the file tree without loading the whole codebase into context.
10. As a developer, I want a heuristic file context selection mechanism, so that only the files relevant to the active prompt are sent to the LLM.
11. As a developer, I want to attach custom text, PDF, log, or image files to my prompt, so that I can provide extra context to multimodal models.
12. As a developer, I want terminal command execution inside a Linux kernel sandbox (`bubblewrap`/`firejail`), so that build and test commands run safely without damaging my system.
13. As a developer, I want a Synchronized Copy sandbox mode, so that tests run on a clone of the repo before applying changes to the real repository.
14. As a developer, I want a Perimeter sandbox mode, so that network and system resources are isolated while granting direct read-write access to the local project directory.
15. As a developer, I want live streaming of terminal stdout/stderr with execution timeouts, so that long-running commands never hang the application.
16. As a developer, I want AES-256-GCM encryption at rest for chat history, settings, and logs, so that sensitive local data remains encrypted on disk.
17. As a developer, I want API keys stored in the Linux Secret Service / Keyring via Argon2id key derivation, so that credentials are fully secured.
18. As a developer, I want an in-memory passphrase fallback modal when Secret Service is unavailable, so that I can use the application securely on headless or minimal Linux setups.
19. As a developer, I want automatic hardware detection (RAM/VRAM/CPU), so that Crafter recommends the optimal local Ollama model tier for my system.
20. As a developer, I want a real-time token usage counter per session, so that I can monitor token consumption based on provider-reported usage.
21. As a developer, I want a Skills loader, so that I can inject modular markdown/JSON instruction files into the agent's prompt context.

---

## Implementation Decisions

### 1. Backend Rust Modules (`src-tauri/src/`)

- **`providers::*` Module:**
  - Trait `Provider`:
    ```rust
    #[async_trait]
    pub trait Provider: Send + Sync {
        async fn chat_stream(
            &self,
            payload: SendChatPayload,
            app: AppHandle,
        ) -> Result<(), String>;
    }
    ```
  - Implementaciones concretas para `OpenAIProvider`, `AnthropicProvider`, `GeminiProvider` y `OllamaProvider`.
  - Contrato de comunicación vía Tauri Emitter emitiendo eventos `chat-token` con la estructura `StreamEvent` (`token`, `usage`, `error`, `done`).

- **`sandbox::*` Module:**
  - Integración con comandos `bubblewrap` / `firejail` en Linux.
  - Modos `SandboxMode::SynchronizedCopy` y `SandboxMode::Perimeter`.
  - Captura asíncrona de `stdout`/`stderr` con limitación de búfer y timeout configurable.

- **`storage::*` Module:**
  - Derivación de clave mediante Argon2id.
  - Cifrado simétrico AES-256-GCM para almacenamiento persistente de estados y secretos.
  - Integración con crate `secret-service` / Keyring con fallback en memoria.

- **`hardware::*` Module:**
  - Uso de `sysinfo` para lectura de memoria RAM disponible, cores CPU y métricas VRAM.
  - Mapeo automático a Ollama Tiers: *Lite* (<4GB), *Basic* (4–8GB), *Standard* (8–16GB), *Pro* (>16GB).

### 2. Frontend Contracts & Architecture (`src/`)

- **Svelte 5 / Preact Component Architecture:**
  - `$state` / Runes o Reactivity Hooks para renderizado sin bloqueo (<50ms latencia de UI por frame).
  - Estado global dividido en `configStore` (proveedor, modelo, modo plan/build, reasoning) y `conversationStore` (mensajes, tokens gastados, búfer de streaming).
  - Componentes principales: `HeaderBar`, `Sidebar`, `ChatView`, `CodeView`, `DesignView`, `DiffModal` (P2), `TerminalModal` (P3) y `UnlockModal` (P4).

### 3. Protocolo de Comandos e IPC Tauri

| Comando Tauri | Dirección | Payload Entrada | Eventos Emitidos |
|---------------|-----------|-----------------|------------------|
| `send_chat_message` | UI → Rust | `SendChatPayload` | `chat-token` (`StreamEvent`) |
| `edit:apply` | UI → Rust | `{ action_id: string }` | `edit:success` |
| `terminal:execute` | UI → Rust | `{ command: string, sandbox_mode: string }` | `terminal:stdout`, `terminal:stderr`, `terminal:exit` |
| `crypto:unlock` | UI → Rust | `{ passphrase: string }` | `crypto:ready` |
| `hardware:detect` | UI → Rust | N/A | `hardware:info` |

---

## Testing Decisions

### 1. Criterios de Calidad de Pruebas
- Las pruebas deben verificar únicamente el comportamiento externo de los módulos y contratos IPC/API, nunca los detalles de implementación interna.
- Los adaptadores LLM se probarán aislando llamadas HTTP simuladas (mocking de respuestas SSE) y con smoke tests de endpoints reales cuando haya credenciales disponibles.
- El módulo de cifrado comprobará la simetría descifrando de vuelta el texto plano original y rechazando claves no válidas.

### 2. Módulos bajo Pruebas
- `src-tauri/src/providers/*`: Pruebas de deserialización de JSON, emisión de eventos `StreamEvent` y manejo de errores HTTP.
- `src-tauri/src/storage/*`: Pruebas de derivación Argon2id y cifrado/descifrado AES-256-GCM.
- `src-tauri/src/sandbox/*`: Pruebas de invocación de subprocesos aislados y captura de timeouts.
- Frontend: Build tests estáticos sin errores (`bun run build`).

### 3. Prior Art
- Patrones de prueba de Tauri IPC con eventos simulados (`tauri::test::mock_builder`).
- Suite de pruebas de cifrado estándar Rust (`aes-gcm` y `argon2` crates test vectors).

---

## Out of Scope

- Empaquetado instalable binario (archivos `.AppImage`, `.deb`, `.rpm`, `.snap` o `.flatpak`) para distribuciones Linux.
- Sincronización multi-dispositivo en la nube o almacenamiento en servidores externos de Crafter.
- Funcionalidades de colaboración en equipo en tiempo real (multi-cursor o chat multi-usuario).
- Soporte para sistemas operativos distintos de Linux (Windows o macOS están fuera de alcance en esta fase).

---

## Further Notes

- Se ha priorizado la arquitectura monolítica en Tauri 2 por ofrecer el mejor rendimiento de memoria (<300–500MB en reposo) frente a soluciones desacopladas con demonios en segundo plano o entornos Electron.
- La extensión de habilidades (*Skills*) lee cualquier carpeta `.agents/skills/` o `.gemini/skills/` tanto a nivel local del repositorio como global en el sistema del usuario.

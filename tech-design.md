# Tech Design

## Stack

- **Shell:** Tauri 2 (Rust) — backend de escritorio.
- **Frontend:** Preact (JSX, runtime VDOM ~3 KB gz).
- **UI:** Preact + Tailwind CSS 4 (ligero). Sin Next.js, sin React.
- **Tooling:** Bun (runtime/package manager, más rápido y ligero que npm), TypeScript en frontend, Rust para el core.

## Estructura del proyecto

```
stark/
├── src-tauri/               # Backend Rust
│   ├── src/
│   │   ├── main.rs          # Entrypoint Tauri
│   │   ├── lib.rs
│   │   ├── providers/       # Adaptadores LLM
│   │   │   ├── mod.rs       # Trait Provider + OpenAICompatibleProvider genérico
│   │   │   ├── types.rs     # ProviderConfig, ProviderKind, LocalModelInfo
│   │   │   ├── anthropic.rs
│   │   │   ├── gemini.rs
│   │   │   └── ollama.rs
│   │   ├── commands/        # Comandos expuestos a la UI (tauri::command)
│   │   │   ├── mod.rs
│   │   │   ├── chat.rs
│   │   │   ├── files.rs     # Repo index, tree, lectura de archivos
│   │   │   ├── edit.rs      # Edición con aprobación + log de cambios
│   │   │   ├── terminal.rs  # Ejecución de comandos (sandbox)
│   │   │   ├── hardware.rs  # Detección RAM/VRAM/CPU
│   │   │   └── crypto.rs    # Cifrado en reposo + keyring
│   │   ├── agent/           # Lógica del agente (plan/build)
│   │   │   ├── mod.rs
│   │   │   ├── plan.rs
│   │   │   └── build.rs
│   │   ├── repo/            # Index (tree) del repositorio
│   │   │   ├── mod.rs
│   │   │   └── indexer.rs
│   │   ├── storage/         # Conversaciones cifradas, config, providers
│   │   │   ├── mod.rs
│   │   │   ├── encrypted_store.rs
│   │   │   └── providers_store.rs  # Lista de providers + API keys (AES-256-GCM)
│   │   └── sandbox/         # bubblewrap/firejail
│   │       ├── mod.rs
│   │       ├── copy.rs      # Modo copia sincronizada
│   │       └── perimeter.rs # Modo perimetral
│   └── Cargo.toml
├── src/                     # Frontend Preact (JSX)
│   ├── main.jsx             # Entry point (mounts <App/>)
│   ├── App.jsx              # Global state, tabs, modals orchestration
│   ├── components/          # Chat, toggles, editor de plan, diff, modals, pages
│   ├── styles/              # main.css (Stark design tokens)
│   └── i18n.js
├── vite.config.js
├── package.json
└── tsconfig.json
```

## Backend Rust — módulos

### Providers (adaptadores LLM)

- Trait `Provider` con métodos: `chat_stream`, `chat` (no-stream), `models()`, `usage()`.
- Cada adaptador traduce al formato del proveedor:
  - **OpenAICompatible (genérico):** POST `{base_url}/chat/completions` (streaming SSE) con `Bearer` — cubre OpenAI, Groq, OpenRouter, LM Studio, Ollama (endpoint `/v1`).
  - **Anthropic:** API `/messages` (streaming SSE, header `anthropic-version`).
  - **Gemini:** API `generateContent`/`streamGenerateContent` (SDK o REST).
  - **Ollama:** API local `/api/chat` (OpenAI-compatible + nativa), modo solo-local.
- **Streaming:** eventos `token`, `usage`, `done` → eventos Tauri `emit` a la UI.
- **Tokens:** usa los `usage` reportados por cada proveedor (informativo).

### Gestión de proveedores (multi-provider configurable)

- Los providers son **datos gestionables por el usuario**: nombre, tipo, `base_url`, lista de modelos y API key opcional.
- Persistidos cifrados (AES-256-GCM) en `storage::providers_store` → `.crafter_storage/providers_list.enc` + `api_key_{id}.enc`.
- Presets precargados: Ollama, OpenAI, Anthropic, Gemini, Groq, OpenRouter, Mistral, LM Studio.
- **Modelos locales (Ollama):** `providers_detect_models` consulta `GET /api/tags`; `providers_install_model` ejecuta `ollama pull <model>` vía `tokio::process::Command`.
- `send_chat_message` enruta dinámico: Anthropic/Gemini a sus adaptadores; el resto al adapter OpenAI-compatible usando `base_url` + API key guardados.

### Agent (plan/build)

- **Plan mode:** construye contexto (tree + archivos relevantes), pide análisis/plan al LLM, NO edita.
- **Build mode:** propone una _acción_ ("voy a modificar X, Y, Z"), espera aprobación del usuario
  vía evento Tauri; al aprobar, aplica la edición y registra en el log de cambios.
- El agente razona paso a paso (system prompt de chain-of-thought) para cualquier modelo.

### Repo indexer

- Construye un tree del repo (gitignore-aware). Cacheado en disco (local, reconstruible).
- Selección de archivos relevantes por tarea (heurística por nombre/ruta/dependencias).

### Terminal (sandbox)

- Ejecuta comandos con **timeout** y **límite de salida** (stdout/stderr acotado).
- Dos modos:
  - **Copia sincronizada:** corre contra copia del repo; al aprobar se sincroniza al real.
  - **Perimetral:** bubblewrap/firejail aísla red/recursos con acceso RW al repo real.
- Aprobación manual por comando desde la UI.

### Hardware detection

- Lee RAM total/VRAM/CPU vía crates (`sysinfo`, `nvidia-smi`/vulkan para VRAM).
- Mapea a tiers de modelos Ollama (tabla del goal). Se refinará con benchmarks reales.

### Crypto + storage

- Clave maestra derivada de passphrase (Argon2), guardada en keyring (Secret Service/libsecret).
- Conversaciones, log de cambios y config cifrados en reposo (AES-256-GCM).
- Fallback sin keyring: passphrase por arranque; si se rechaza, archivo plano 0600 + warning.

## Frontend Preact — componentes

- **Chat:** lista de mensajes con streaming de tokens (markdown + código).
- **Toggle LLM:** proveedor + modelo + modo de razonamiento (persistido en config cifrada).
- **ProviderManagerModal:** modal de gestión de proveedores (form nombre/tipo/base_url/modelos/API key), presets precargados y catálogo de modelos locales con detección + botón Instalar (`ollama pull`).
- **Modo Plan/Build:** switcher de modo.
- **Diff/APproval:** panel de aprobación de acciones (ediciones, comandos) con diff visible.
- **Contador de tokens** por sesión.
- **Skills:** cargador de archivos de instrucciones al prompt.
- **Adjuntos:** selector de archivos/PDF/logs/imágenes (límite de tamaño).
- **Hardware:** indicador de tier de modelo local sugerido.

## Flujo de datos principal (chat)

1. UI envía mensaje → `command chat:send` (Rust), con `provider_id` + `model` seleccionados.
2. Rust carga la config del provider desde `providers_store` (base_url + API key) y resuelve el adaptador (Anthropic/Gemini/OpenAI-compatible/Ollama).
3. Rust construye contexto: `repo:index` + `repo:relevant` + adjuntos + skills.
4. `agent` decide modo (Plan/Build).
5. `provider:chat_stream` → eventos `token` → UI renderiza streaming.
6. En Build mode: el agente emite `action:propose` → UI muestra diff → usuario aprueba →
   `edit:apply` → log de cambios.
7. `provider:usage` → UI actualiza contador de tokens.

## Dependencias Rust candidatas

- `tauri`, `tauri-plugin-shell` (terminal controlado), `tauri-plugin-store`.
- `reqwest` (HTTP streaming), `futures` (streaming), `serde`/`serde_json`.
- `keyring` (Secret Service), `argon2`, `aes-gcm`, `rand` (crypto).
- `sysinfo` (hardware), `notify` (watch de repo si aplica).
- `bubblewrap`/`firejail` como binarios externos (no crates).

## Riesgos y mitigaciones

- **WebKitGTK en distros viejas:** verificar que Tauri 2 soporte la versión mínima de
  WebKitGTK en distros objetivo; documentar dependencias de sistema.
- **Latencia streaming:** eventos Tauri son asíncronos; chunkear tokens (p. ej. ~50ms) para
  no saturar el event loop.
- **Memoria 300–500MB:** evitar cargar archivos grandes del repo al completo en memoria;
  leer por rangos. Preact (~3 KB gz) ayuda a mantener el frontend pequeño.
- **Sandbox sin root:** bubblewrap requiere `newuidmap`/`newgidmap` (userns). Documentar
  requisitos del kernel y fallback perimetral degradado.

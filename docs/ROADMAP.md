# Progreso y Roadmap — Motor Local, Cuantización y Handoff

> Estado: **los bloques implementados compilan y corren limpio.** Backend `cargo test` 101/101 (sin warnings), frontend `bun run test` 12/12, `bun run build` OK. E2E real verificado contra NVIDIA NIM (streaming + no-streaming).
> Contexto: replicar la arquitectura de Cactus (Engine/Graph/Kernels/Quants) en Linux x86_64 con llama.cpp, motor híbrido y handoff a nube.

---

## 1. Completado y verificado

### 1.1 Investigación y decisión de arquitectura

- **`docs/adr/0001-local-runtime.md`** — ADR aceptado: Cactus es ARM64-only (issues #655/#312, PR #768 abortado), se **aprende** su diseño y se replica en x86 con **llama.cpp/ggml** (Graph↔ggml, Kernels↔ggml CPU, CQ↔GGUF IQ/Q2). Motor v1 = subproceso `llama-server`; binding en-proceso `llama_cpp_2` como fase 2.
- URLs de binario y modelos **verificadas** contra releases/HP reales (llama.cpp `b10361-bin-ubuntu-x64.tar.gz`; Qwen2.5 GGUF oficial con `q2_k` confirmado, patrón bartowski `IQ2_XXS`).

### 1.2 Catálogo QAT-first por tier — `src-tauri/src/local/catalog.rs`

- `Tier { Lite, Basic, Standard, Pro }` y `CatalogEntry { id, repo, file, bits, quant, ram_mb, tier }` con `download_url()` HF.
- Lite→0.5B Q2_K · Basic→1.5B Q2_K · Standard→7B IQ2_XXS/Q4_K_M · Pro→14B-Coder IQ2_XXS/Q4_K_M. `default_for_tier` elige menor bits.

### 1.3 Setup — `src-tauri/src/local/setup.rs`

- Descarga binario `llama-server` (tar.gz) + GGUF del tier con progreso emitido (`local-setup-progress`), patrón de `voice/mod.rs` (whisper.cpp). Copia de `.so` hermanos a `~/.local/share/crafter/local/dist/`, chmod 0755. Estado vía `local_status`.

### 1.4 Manager del motor — `src-tauri/src/local/manager.rs`

- Puerta efímera, spawn persistente `llama-server -m … --host 127.0.0.1 --port … -ngl 0`, health-poll `/health` (120s), reuso por modelo.
- **Correcciones de robustez**: `tokio::sync::Mutex` a través de spawn+health (sin doble servidor ante requests concurrentes), kill del child si health falla, y `RunEvent::Exit` + `kill_sync()` (SIGTERM por PID) para que el servidor **no quede huérfano al cerrar la app**.

### 1.5 Integración de proveedor — `providers/mod.rs`, `lib.rs`

- `ProviderKind::Local` + `parse_kind("local")`, `LocalProvider` (resuelve catálogo → `ensure_running` → delega en `OpenAICompatibleProvider` SSE). Errores locales se emiten como `chat-token` (no se tragan).
- Comandos Tauri: `local_catalog`, `local_setup`, `local_status`, `local_start`, `local_stop`.
- `send_chat_message` con arm `"local"` + bypass del free-tier.

### 1.6 Frontend

- **`ModelSelectorModal.jsx`**: sección "Crafter Local" (instalar con progreso en vivo, catálogo filtrado por tier, selección de modelo) + sección colapsable **"Cuantizar modelo propio"** (picker GGUF vía plugin dialog, selector de outtype desde backend, calibración opcional, log de pasos).
- **`ChatView.jsx`**: `isLocal` incluye `'local'`, model options desde `local_catalog`, y **handoff a nube**: al terminar una respuesta local se evalúa `assess_confidence` y si es baja aparece banner con motivo + botón "Escalar a nube" (reenvía la conversación al primer proveedor cloud configurado).

### 1.7 Pipeline de cuantización — `src-tauri/src/local/quantize.rs`

- `SUPPORTED_OUTTYPES` (16 tipos, prioriza baja densidad), `quant_bits`, constructores de argv puros (`quantize_argv`, `imatrix_argv`), `run_tool` (timeout 10 min, últimas 8 líneas de stderr).
- `run_pipeline`: valida outtype/fuente → genera imatrix (`llama-imatrix`) con calibración del usuario o `DEFAULT_CALIBRATION` embebida → cuantiza con `llama-quantize --imatrix`.
- Comandos: `quantize_outtypes`, `quantize_run`.

### 1.8 Handoff por confianza — `providers/router.rs`

- `assess_confidence` v1: vacío, respuesta trivial corta, y 30 marcadores de incertidumbre (ES + EN). Exponado como comando `assess_confidence`.
- **Señal v2**: `assess_confidence_with_logprobs` + `perplexity_from_logprobs` — perplejidad media (`exp(-mean log p)`) de los logprobs por token de `llama-server`; `perplexity > 25` marca la respuesta como low-confidence con motivo numérico. El comando Tauri acepta `logprobs` opcionales (sin cambios en la UI).

### 1.9 Tests reales (sin "pruebas falsas")

- Catálogo: unicidad de ids, cobertura por tier, default por bits, URL HF. Manager: formato URL, puerto libre. Quantize: validación de outtypes, orden exacto de argv con/sin imatrix, argv de imatrix, error de binario ausente, rechazo de outtype inválido **sin ejecutar**. Confianza: 5 casos (vacío, incertidumbre ES/EN, corto, respuesta válida corta, respuesta normal).

---

## 2. Lo que falta (pendiente)

| #   | Pendiente                         | Dónde                  | Notas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | --------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ~~**Spike CQ propio**~~           | `docs/cq-spike.md`     | **Hecho (B):** investigación cerrada — codebook propio NO justificado; i-quants + imatrix cubren la calidad CQ en x86.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2   | ~~**`classify_tier` QAT-first**~~ | `hardware/mod.rs`      | **Hecho (A2):** `default_local` + `parse_tier` apuntan al catálogo QAT.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 3   | **Auto-fallback local→nube**      | `ChatView.jsx`         | **Hecho (E2):** toggle opt-in `stark.auto_escalate` (default manual). Auto-escalada tras evaluar `assess_confidence`.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 4   | ~~**Señal v2 de perplexidad**~~   | `assess_confidence`    | **Hecho (B):** `perplexity_from_logprobs` + `PERPLEXITY_HIGH` en `providers/router.rs`, comando `assess_confidence` acepta `logprobs` opcionales; 5 tests nuevos.                                                                                                                                                                                                                                                                                                                                                                                                           |
| 5   | ~~**Tuning de RAM**~~             | `local/manager.rs`     | **Hecho (A1):** `server_args` puro + `--ctx-size` por tier (4096–32768) + kv-cache `q8_0` + clamp `RAM_CUSHION_MB`.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6   | ~~**Integridad de descargas**~~   | `local/setup.rs`       | **Hecho (A3):** SHA-256 hardcodeado del binario + sanity `MIN_DOWNLOAD_BYTES`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 7   | ~~**i18n**~~                      | ChatView/Modal         | **Hecho (A4):** strings nuevos traducidos es/en (`chat.*`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 8   | ~~**Smoke test end-to-end**~~     | manual (parcial)       | **Hecho 2026-08-15:** `cargo build` linkea, binario arranca sin panic bajo display, Rust 100/100 + frontend 12/12. **Generación real E2E cerrada** con endpoint NVIDIA NIM (OpenAI-compatible): preset `nvidia-nim` añadido (proveedor+modelos verificados contra `/v1/models`), tests de integración opt-in `live_endpoint_e2e_non_streaming` + `live_endpoint_e2e_streaming` pasan contra el endpoint real (llave vía `CRAFTER_LIVE_E2E_KEY`, nunca commiteada). **Pendiente menor:** `bun run tauri dev` manual con un GGUF descargado para el motor local llama-server. |
| 8b  | ~~**Code review A–E**~~           | working tree vs `HEAD` | **Hecho 2026-08-12 (review Standards + Spec):** `XIcon` sin importar (runtime), `chat_id: None` en gate/error events, Anthropic/Gemini sin abort ni `chat_id`, gate E1 de 4h inerte. **Fixes aplicados y verdes:** import `X`, `chat_id` propagado en lib.rs gate, abort+`chat_id` en `AnthropicProvider`/`GeminiProvider`, re-detección E1 gated por staleness.                                                                                                                                                                                                            |
| 9   | ~~**Persistencia de selección**~~ | App.jsx/`configStore`  | **Hecho 2026-08-12:** provider/modelo persistidos en `localStorage` (`stark.selected_provider` / `stark.selected_model`), lazy init + persistencia en `onSelect`.                                                                                                                                                                                                                                                                                                                                                                                                           |
| 10  | ~~**Abort de stream + Stop**~~    | `providers/abort.rs`   | **Hecho (C1/C2):** registro por `chat_id`, `chat_tracked` SSE, `chat_abort`, botón Stop, filtro por sesión en `chat-token`.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 11  | ~~**Setup cancelable**~~          | `local/cancel.rs`      | **Hecho (B):** flag + `tokio::select!`, `local_setup_cancel`, evento `local-setup-cancelled`, botón Cancelar.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 12  | ~~**Sesiones en árbol**~~         | `storage/chats.rs`     | **Hecho (D1/D2-b):** `parent_id`/`kind`, `chat_fork`/`chat_tree`/`chat_compact` + mappers en `App.jsx`. UI de árbol diferida.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 13  | ~~**Catálogo refrescable**~~      | ModelSelectorModal     | **Hecho (E1):** botón Refrescar + `lastCheckedAt` 4h en `localStorage`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 14  | **`loaded_model` en status**      | `local/manager.rs`     | **Hecho (B):** `ServerInfo.model_id` + badge "Modelo cargado" en modal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

---

## 3. Próximos pasos

### 3.1 Inmediatos (del plan base)

1. Tuning de RAM del motor (kv-cache q8 + `--ctx-size` por tier) y `classify_tier` apuntando al catálogo QAT. **Hecho.**
2. Checksum SHA-256 de descargas. **Hecho.**
3. Auto-fallback local→nube en `router.rs`. **Hecho.**
4. i18n de los strings nuevos. **Hecho.**
5. Smoke test end-to-end real. **Hecho con endpoint NVIDIA NIM (ver tabla #8);** `bun run tauri dev` con GGUF local queda como opcional manual si quieres validar el motor llama-server end-to-end.
6. Señal v2 de perplexidad. **Hecho.**
7. Spike CQ propio. **Cerrado (investigación, ver `docs/cq-spike.md`).**

### 3.2 Plan adicional — Ingeniería de `earendil-works/pi` (`packages/coding-agent`)

**Objetivo:** revisar y observar cómo pi (87.7k★) diseña el agente de código — qué componentes usan, cómo y por qué — y extraer patrones aplicables a Crafter (Tauri/Preact/Rust).

**Qué es pi:** harness de terminal mínimo y agresivamente extensible. Core delgado (herramientas `read/write/edit/bash/grep/find/ls`), sin sub-agents/plan-mode/MCP en el core: se añaden por extensiones/skills/paquetes. Corre en 4 modos: interactivo, print/JSON, **RPC** (integración de procesos) y **SDK** (embebido). Soporta **llama.cpp router server** (`/llama` descarga/carga/descarga modelos, `/model` los selecciona).

**Puntos de ingeniería a estudiar (con su mapeo a Crafter):**

| #   | Patrón de pi                                                                                                      | Cómo lo usa                                                                           | Por qué lo usa                                                               | Mapeo a Crafter                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| A   | **Integración llama.cpp router** (`docs/llama-cpp.md`, `/llama` + `/model`)                                       | Descarga modelos, los carga en slots del router server, los descarga para liberar RAM | Una sola API OpenAI-compatible + gestión explícita de carga/descarga por RAM | Extender `local/manager.rs`: slots, `unload`, y progreso de descarga con cancelación |
| B   | **Sesiones JSONL en árbol** (`docs/session-format.md`, `/tree`, `/fork`, `/clone`, branching por `id`/`parentId`) | Sesión = archivo JSONL, ramas en el mismo archivo                                     | Historial completo preservado; compactación _lossy_ solo de vista            | Migrar `storage/chats.rs` a JSONL + branching + `/tree`                              |
| C   | **Compaction** (`docs/compaction.md`, `/compact`, auto por overflow)                                              | Resume mensajes viejos, conserva los recientes; auto cuando se acerca al límite       | Gestionar ventanas de contexto largas                                        | Detector de overflow + resumen en `send_chat_message`                                |
| D   | **Cola de mensajes + abort** (steering/follow-up, Escape cancela)                                                 | Enter encola _steering_, Alt+Enter _follow-up_, Escape aborta                         | UX de control sin romper el turno del agente                                 | `ChatView.jsx`: cancelar generación local (kill del stream) + encolar                |
| E   | **Catálogo de modelos refrescable** (`pi update --models`, `docs/models.md`, `docs/custom-provider.md`)           | Catálogos por proveedor se refrescan solos; auth por subscription o API key           | No hardcodear modelos; adaptarse a cambios de free-tier                      | Reutilizar `providers/router.rs::merge_catalog` + comando refresh                    |
| F   | **Extensiones/tools** (`docs/extensions.md`, `registerTool/registerCommand/on(event)`)                            | Herramientas = módulos TS; el core no las embebe                                      | Mantener el core mínimo; añadir capacidades sin forkear                      | Herramientas del Build mode de Crafter como plugins registrables                     |
| G   | **RPC mode / SDK** (`docs/rpc.md`, `docs/sdk.md`)                                                                 | JSONL estricto por stdin/stdout; `createAgentSession`                                 | Integrar desde cualquier lenguaje / apps                                     | Backend Crafter expuesto vía comandos Tauri (ya análogo)                             |
| H   | **Thinking levels** (`--thinking off..max`)                                                                       | Niveles de razonamiento por modelo                                                    | Ajustar coste/latencia                                                       | Mapear `reasoning` actual a niveles                                                  |
| I   | **Trust de proyecto** (`/trust`, `defaultProjectTrust`)                                                           | Antes de cargar recursos del proyecto pregunta/toma decisión                          | Seguridad: no ejecutar extensiones de proyectos no confiados                 | Gate de permisos para `skills`/extensiones de workspace                              |
| J   | **`@earendil-works/pi-ai`, `pi-agent-core`, `pi-tui`**                                                            | Paquetes desacoplados: LLM toolkit / framework agente / TUI                           | Separación de capas → testable                                               | Inspirar el desacople providers/agent/ui en Rust                                     |

**Por qué estudiarlo:** pi resuelve los mismos problemas que Crafter está abordando (proveedores múltiples, integración llama.cpp local, gestión de contexto, seguridad) pero con una filosofía opuesta en la capa de UI (terminal minimalista + extensible vs. desktop Tauri). Crafter puede tomar **los patrones de núcleo** (sesiones JSONL, compactación, gestión de modelos llama.cpp, cola/abort) manteniendo su UX de escritorio.

**Fase 1 — Revisión (solo lectura, generar hallazgos):**

1. Leer `docs/llama-cpp.md`, `docs/session-format.md`, `docs/compaction.md`, `docs/providers.md`, `docs/extensions.md` en `packages/coding-agent`.
2. Revisar el código de: gestión del router llama.cpp (descarga/carga/descarga de modelos), `SessionManager`/ramas JSONL, compaction, y cola de mensajes.
3. Comparar contra `local/`, `storage/chats.rs` y `ChatView.jsx` actuales; escribir un doc de hallazgos con qué adoptar tal cual, qué adaptar y qué descartar.

**Fase 2 — Adopción priorizada (en orden de impacto):**

1. **Sesiones JSONL en árbol + compactación** para `storage/chats.rs` (alta fidelidad de contexto en chats largos).
2. **Gestión de RAM del router llama.cpp** al estilo `/llama`: descarga con cancelación, `unload`, y selección de modelo cargado.
3. **Abort del stream local** (Escape cancela) en `ChatView`.
4. **Catálogo de modelos refrescable** por proveedor (`providers_detect_models` ya existe; añadir refresh manual + refresh periódico).
5. **Gate de confianza** para skills/extensiones de workspace (replicar `defaultProjectTrust`).

**Fase 3 — Spike CQ (paralelo, no bloqueante):**

- Investigar un codebook de cuantización propio estilo CQ en Rust y comparar calidad/bit vs. IQ2_XXS/Q2_K en un subset de capas.

---

## 4. Referencias

- ADR motor local: `docs/adr/0001-local-runtime.md`
- Pi coding-agent: https://github.com/earendil-works/pi/tree/main/packages/coding-agent
- Pi llama.cpp: https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/llama-cpp.md
- Pi sessions/compaction/extensions/providers: `docs/session-format.md`, `docs/compaction.md`, `docs/extensions.md`, `docs/providers.md`, `docs/models.md`, `docs/rpc.md`, `docs/sdk.md`
- Pi packages: `@earendil-works/pi-ai`, `@earendil-works/pi-agent-core`, `@earendil-works/pi-tui`

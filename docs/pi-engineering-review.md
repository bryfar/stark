# Revisión de ingeniería: earendil-works/pi (packages/coding-agent)

> Fuentes primarias bajo `/tmp/opencode/pi` (clon shallow de earendil-works/pi, tag v0.84.1).
> En este documento todas las rutas son relativas a `/tmp/opencode/pi`.
> Documento de hechos (fact-finding): describe qué hace el código y cómo, sin evaluaciones ni recomendaciones.
> Verificación cruzada de patrón objetivo para Crafter (Tauri 2 + Rust + Preact, agente de IA de escritorio para Linux):
> router llama.cpp descarga/carga/descarga, sesiones JSONL con id/parentId, compactación/resumen, cola de mensajes (steering/follow-up) + aborto con Escape, refresco de catálogo de proveedores + listado de modelos, y registro de tools/extensiones.

---

## 1. Resumen de arquitectura

Cuatro paquetes monorepo (npm workspaces con Bun), cada uno un "deep module":

| Paquete                           | Directorio              | Rol                                                                                                                                                                                                                                                                                  |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@earendil-works/pi-ai`           | `packages/ai`           | API LLM unificada: adaptadores de compat por proveedor, tipos `Provider`/`Model`/`Usage`, catálogos de modelos generados por proveedor, `ModelsStore` (firma `{read,write,delete}`), utilidades de retry/overflow/streams, auth (credenciales + helpers + context/credential-store). |
| `@earendil-works/pi-agent-core`   | `packages/agent`        | Bucle de agente puro (`agent-loop.ts`) + envoltura `Agent` con estado (cola steering/follow-up, emisión de eventos, ejecución de tools) + `harness/` reutilizable (`AgentHarness`, sesiones jsonl, tools) usado por `pi-server`.                                                     |
| `@earendil-works/pi-tui`          | `packages/tui`          | Biblioteca TUI con render diferencial: `Component`/`Container`/`TUI`, terminal, teclas/keybindings, autocompletado, editor.                                                                                                                                                          |
| `@earendil-works/pi-coding-agent` | `packages/coding-agent` | Capa de aplicación/composición: CLI (`bin: pi`), `AgentSession` (harness de agente enriquecido), `SessionManager` (JSONL en árbol), compactación, `ModelRuntime`/catálogos remotos, extensiones, tools de archivo/terminal, modos (interactive/print/json/rpc/sdk).                  |

Convención clave de composición: `AgentSession` (capa de aplicación) importa tipos y el `Agent` stateful de `pi-agent-core`, y los tipos compat de `pi-ai`:

- `packages/coding-agent/src/core/agent-session.ts:20-40` importa `Agent`, `AgentMessage`, `AgentState`, `AgentTool` de `@earendil-works/pi-agent-core` y `contentText`, tipos `Model`, `Usage`, `isContextOverflow` de `@earendil-works/pi-ai`.

El TUI interactivo compone primitivas de `pi-tui`:

- `packages/coding-agent/src/modes/interactive/interactive-mode.ts:25-45` importa `Component`, `Container`, `Markdown`, `ProcessTerminal`, `setKeybindings`, `TUI`, `TuiAltScreen`, `TuiMainScreen`, etc., además de `TuiLayouts` (spinners, breadcrumbs, estatus, etc.).

`packages/coding-agent/package.json:46-51` declara deps `@earendil-works/pi-agent-core`, `@earendil-works/pi-ai`, `@earendil-works/pi-tui`.

---

## 2. Hallazgos por área

### 2.1 Router llama.cpp: descarga, carga, descarga

El agente NO descarga ni gestiona el servidor llama.cpp; es un _cliente_ thin del router `llama-server` con el flag `--models-dir` y SIN `--model` (modeo router). Toda la gestión de modelos se hace por la API REST del router.

- `docs/llama-cpp.md:1-18` documenta el modo router: `llama-server --models-dir ~/models` (sin `--model`), devuelve `{"data":[{id,status,...}]}` desde `GET /models`; opciones `--no-models-autoload`, `--jinja`, `-ngl 999`, `-c 32768`; modelos multi-shard/multimodales en subdirectorios.
- El proveedor se registra como extensión embebida:
  - `packages/coding-agent/src/extensions/llama/index.ts:42-45` registra el proveedor `LLAMA_PROVIDER_ID` con base URL por defecto `http://127.0.0.1:8080` (`provider.ts:13-15`).
  - `packages/coding-agent/src/extensions/llama/index.ts:181-227` registra el comando `/llama` y su UI (lista, descarga, carga, descarga).
- Operaciones REST contra el router (`client.ts`):
  - `client.ts:182-190` `list()` → `GET /models`.
  - `client.ts:192-223` `load()` → `POST /models/load`, `unload()` → `POST /models/unload`, `download()` → `POST /models`.
  - `client.ts:242-245` `watch()` → `GET /models/sse` (colas de progreso de descarga/carga).
  - `client.ts:247-286` `loadAndWait(modelId)` → `POST /models/load` + polling de estado cada 250 ms.
  - `client.ts:288-331` `downloadAndWait()` → `POST /models` con `id` de segmento de descarga + SSE/polling cada 500 ms.
- Descubrimiento y descarga HuggingFace:
  - `huggingface.ts:47-66` resolución de token HF: `HF_TOKEN` env de BUN/env, luego rutas de archivo (`HF_TOKEN_PATH`, y rutas estándar de huggingface_cli), con mensaje instructivo si falta.
  - `huggingface.ts:100-115` `search(query)` contra el endpoint de búsqueda HF; `huggingface.ts:118-131` `details(id)` para extraer `gated`, `quantizations`, `pipeline_tag`.
- Mapeo a modelos de pi (`provider.ts`):
  - `provider.ts:28-52` `toPiModel() → Model<"openai-completions">`: `contextWindow` desde `meta.n_ctx ?? meta.n_ctx_train ?? 128000`, costos 0, `reasoning:false`, `compat.supportsStore/supportsDeveloperRole/supportsReasoningEffort = false`.
  - `provider.ts:62` y `provider.ts:135-137` — SOLO los modelos con `status.value === "loaded"` son expuestos como `Model` disponibles para el chat.
- Control explícito y sin mutación silenciosa:
  - `docs/llama-cpp.md:81` — la UI pregunta antes de descargar/cargar; nunca descarga implícitamente, nunca descarga modelos no usados; nunca elimina archivos; un modelo solo se puede descargar una vez a la vez.
  - `index.ts:150-165` — selección de cuantización entre las disponibles de HF (`Q4_K_M`, etc.); aviso para repos `gated` (`index.ts:142-149`).

### 2.2 Sesiones JSONL con id/parentId (árbol)

Sesiones como archivo JSONL por directorio de trabajo (por cwd), con encabezado de metadatos y entradas enlazadas por `id`/`parentId`.

- Formato y versiones:
  - `docs/session-format.md:189-304` — tipos de entrada: `message`, `model_change`, `thinking_level_change`, `compaction`, `branch_summary`, `label`, `session_info`, `custom`, `custom_message`.
  - `docs/session-format.md:306-318` — árbol v2 mediante campos `id`/`parentId` en cada entrada; ramas creadas por mensajes followers.
  - Migraciones automáticas al cargar: v1→v2 convierte lista lineal en árbol (genera ids, `parentId=prevId`, convierte `firstKeptEntryIndex`→`firstKeptEntryId` en entradas de compactación), v2→v3 renombra rol `hookMessage`→`custom`:
    - `packages/coding-agent/src/core/session-manager.ts:230-257` `migrateV1ToV2()`, `:259-275` `migrateV2ToV3()`, `:281-291` `migrateToCurrentVersion()` (encabezado `version ?? 1`).
- Store en `SessionManager`:
  - `session-manager.ts:855-930` — clase con `byId` (Map), `leafId`, `labelsById`.
  - `session-manager.ts:476-480` `getDefaultSessionDirPath()` → `~/.pi/agent/sessions/--<cwd>--/<timestamp>_<uuid>.jsonl`.
  - `session-manager.ts:1014-1042` `_persist()` — el JSONL se escribe en LOTE (creación del archivo con `openSync(...,"wx")` reescribiendo todas las entradas acumuladas y luego `appendFileSync`) solo una vez que llega el PRIMER mensaje assistant; antes de eso `flushed=false` y no se crea archivo (sesiones vacías no tocan disco).
- Compresión a contexto del LLM:
  - `session-manager.ts:418-454` `buildContextEntries()` — recorre el camino hoja→raíz (`buildSessionPath`), detecta la última entrada `compaction` y (si existe) corta todo lo anterior a su `firstKeptEntryId`; el resumen de compactación sustituye al historial antiguo, `branch_summary`/`label` quedan fuera del contexto.
  - `session-manager.ts:461-470` `buildSessionContext()` — `buildContextEntries().flatMap(sessionEntryToContextMessages)` (convierte cada entrada en `AgentMessage`, los `custom` a role `user`), y adicionalmente resuelve `thinkingLevel`/`model` desde las etiquetas/`session_info` del camino (`getSessionContextSettings`, `:467`).
  - Búfer de I/O acotado de sesión: lectura por trozos con `SESSION_READ_BUFFER_SIZE = 1 MB` y scan de encabezado limitado a 1 MB (`session-manager.ts:491-494`).
- Ramificación:
  - `session-manager.ts:1381-1405` `branchWithSummary()` — añade `BranchSummaryEntry { type:"branch_summary", id, parentId, fromId, summary, details, usage, fromHook }`.
  - `session-manager.ts:1412-1512` `createBranchedSession()` — extrae trayectoria raíz→hoja, filtra `LabelEntry`, re-encadena `parentId` en archivo nuevo (fork): el árbol vive en el archivo JSONL original y las ramas viajan a archivos propios.

### 2.3 Compactación y resúmenes

La compactación mantiene reciente el contexto resumiendo lo antiguo. La lógica es pura y sin efectos (header del archivo: "Pure functions for compaction logic. The session manager handles I/O, and after compaction the session is reloaded", `compaction.ts:1-6`).

- Disparadores:
  - `compaction.ts:235-238` `shouldCompact(contextTokens, contextWindow, settings)` → `contextTokens > contextWindow - settings.reserveTokens`.
  - `compaction.ts:128-135` — `DEFAULT_COMPACTION_SETTINGS`: `reserveTokens: 16384`, `keepRecentTokens: 20000`.
  - Dos razones en `agent-session.ts:1962-2022` `_checkCompaction()`: (1) `"overflow"` → `isContextOverflow(assistantMessage, contextWindow) || isRecoverableLength(assistantMessage, model.maxTokens)`; recuperable con `stopReason !== "stop"` (output truncado bajo el límite deseado): elimina el mensaje assistant del estado del agente (permanece en el archivo de sesión) y compacta con AUTO-reintento una vez (`willRetry`, flag `_overflowRecoveryAttempted`, `agent-session.ts:329`, `:1994-2022`); (2) `"threshold"` → compactar, sin auto-retry (el mensaje ya se completó; `agent.continue()` no continua desde assistant, `:1991-1992`).
  - `_checkCompaction()` se ejecuta para cada mensaje assistant completado (`agent-session.ts:1098`, `:1209`); skip si settings lo deshabilitan, si el mensaje está abortado, si el asistente es de otro modelo (no estimar contexto en cómputo), o si el mensaje es más reciente que la última entrada de compactación (`:1962-1986`).
- Corte (cut point):
  - `compaction.ts:403-461` `findCutPoint()` — camina hacia atrás acumulando `estimateTokens()` (§ 278-306: chars/4; roles `custom`/`toolResult`/`bashExecution`/`branchSummary`/`compactionSummary`), para cuando `>= keepRecentTokens`, y redondea al mismo `cutPoint` válido más cercano. Retorna `{ firstKeptEntryIndex, turnStartIndex, isSplitTurn }`.
  - `compaction.ts:308-336` — roles válidos de corte: `user`, `assistant`, `bashExecution`, `custom`, `branchSummary`, `compactionSummary`; NUNCA `toolResult` (deben seguir a su toolCall).
  - Turns divididos: si el corte cae a mitad de un turno, `compaction.ts:845-882` genera DOS resúmenes (prefijo + sufijo) con prompt dedicado `TURN_PREFIX_SUMMARIZATION_PROMPT` (`compaction.ts:795-808`) y combina en una sola entrada `CompactionEntry` con mensajes prefijo/sufijo distintos.
- Formato estructurado del resumen:
  - `compaction.ts:467-498` `SUMMARIZATION_PROMPT` — formato EXACTO: `## Goal / ## Constraints & Preferences / ## Progress (Done/In Progress/Blocked) / ## Key Decisions / ## Next Steps / ## Critical Context`; instrucciones de preservar rutas/funciones exactas y mensajes de error.
  - `compaction.ts:500-537` `UPDATE_SUMMARIZATION_PROMPT` — actualización ITERATIVA: resumen anterior se pasa en `<previous-summary>`, reglas de fusión (PRESERVAR todo lo existente, mover Progress, actualizar Next Steps).
- Trackeo de archivos leídos/modificados:
  - `compaction.ts:42-70` `FileOperations`/persistencia por entrada — seguimiento acumulativo entre compactions.
  - `packages/coding-agent/src/core/compaction/utils.ts:12-24` extracción de `read`/`edit`/`write` de bloques `toolCall` de mensajes assistant; `utils.ts:62-67` `computeFileLists()` → `{readFiles, modifiedFiles}`.
  - `utils.ts:89-99` — resultados de tool truncados a 2000 chars antes de serializar; `utils.ts:109-150` `serializeConversation()` transforma mensajes a texto plano para que el modelo NO pueda "continuar" (una declaración literal).
- Contexto retenido y reconstrucción:
  - `compaction.ts:905-910` — la entrada `CompactionEntry` guarda no solo el resumen sino el `retainedTail` (punto de control del contexto reciente byte-basado) para reconstruir sin caminar por entradas previas; ver `docs/session-format.md:237-248` (y `321-342` para branch_summary).
  - `docs/compaction.md:219-253` — detalle del formato del resumen y de cómo `SessionManager` inserta la entrada de compactación en contexto.
- Generación del summary LLM:
  - `compaction.ts:562-581` `completeSummarization()` — usa `fresh uuidv7` como `sessionId` y `cacheRetention: "none"` (¡los prompts one-off de resumen no deben ensuciar la caché de prompts del proveedor), llama vía `retryAssistantCall`.
  - `docs/compaction.md:275-345` — las extensiones pueden interceptar con `session_before_compact` (modificar el conjunto de mensajes o petición) o `*_after_compact`.
- Resumen de ramas (`/tree`): `packages/coding-agent/src/core/compaction/branch-summarization.ts` usa el MISMO formato estructurado con su propio prompt; reserva `skipPrompt` para ramas cortas.
  - `packages/coding-agent/src/core/settings-manager.ts:797-800` — defaults de resumen de rama: `reserveTokens: 16384`, `skipPrompt`.
  - `settings-manager.ts:10-17` — defaults de compactación en `CompactionSettings`: `enabled`, `reserveTokens: 16384`, `keepRecentTokens: 20000`.

### 2.4 Cola de mensajes (steering/follow-up) y aborto con Escape

El usuario puede escribir mientras el agente trabaja; el destino del texto depende del modo (`steer` vs `followUp`). Escape aborta y devuelve el texto a la caja de edición.

- Cola pura en pi-agent-core:
  - `packages/agent/src/agent.ts:125-159` `class PendingMessageQueue` con `drain(mode)` — mode `"all"` drena todo, mode `"one-at-a-time"` devuelve UN mensaje por turno.
  - `packages/agent/src/agent.ts:231-232` — default `"one-at-a-time"`.
  - `packages/agent/src/agent.ts:475-482` — el `Agent` expone `getSteeringMessages`/`getFollowUpMessages` al config del loop.
- Materialización del loop:
  - `packages/agent/src/agent-loop.ts:166-173` — encuesta steering al INICIO del loop (comentario: "el usuario pudo escribir mientras esperaba").
  - `packages/agent/src/agent-loop.ts:259-268` — tras CADA turno drena steering; luego, solo si el agente se detendría, drena follow-up.
- Semántica en `AgentSession`:
  - `packages/coding-agent/src/core/agent-session.ts:1335-1354` `steer()` — se entrega SIEMPRE después de los tool calls del turno assistant actual y antes de la siguiente llamada al LLM; expande skills/prompt templates; rechaza comandos de extensión (`_throwIfExtensionCommand`).
  - `agent-session.ts:1363-1373` `followUp()` — se entrega solo cuando no quedan tool calls NI mensajes de steering.
  - `agent-session.ts:1379-1408` — `_queueSteer`/`_queueFollowUp` apilan agent messages `{role:"user", content: text}`; se emite evento `queue_update` (`agent-session.ts:571-573`) para el contador de la UI.
- Aborto:
  - `packages/coding-agent/src/modes/interactive/interactive-mode.ts:2772-2798` — manejador de Escape: si `session.isStreaming` → `restoreQueuedMessagesToEditor({abort:true})`; si `isBashRunning` → `session.abortBash()`; si está en modo bash → sale del modo; doble-Escape con editor vacío (<500 ms) → `/tree`, `/fork` o por setting.
  - `agent-session.ts:1550-1552` `async abort()` → `this.agent.abort()`; `abortBash()` corta todos los `AbortController` de bash activos (`:2842-2845`, `isBashRunning` = tamaño del set, `:2848-2850`). Al reemplazar una sesión, el turno abortado se persiste antes de quedarse en el archivo saliente (`agent-session-runtime.ts:168-172`).
- Entrada: Enter (acción `app.message.send`, caja en streaming) → `session.prompt(text, { streamingBehavior:"steer" })` (`interactive-mode.ts:3037-3047`); Alt+Enter (acción `app.message.followUp`) encola follow-up que espera a que el agente termine (`interactive-mode.ts:2815`, `:3964-3974`).
- Durante compactación, el texto se encola igual con `queueCompactionMessage(text, "steer"|"followUp")` (`interactive-mode.ts:3030-3036`, `:3964`).

### 2.5 Proveedores y refresco de catálogo

- Catálogo integrado generado:
  - `packages/ai/src/providers/` — ~40 proveedores, cada uno con `.models.ts` con catálogo de modelos estático (generado); `packages/ai/src/model-catalog.ts` `flattenModelCatalog()` los fusiona.
  - `packages/ai/src/models-store.ts` — interfaz `ModelsStore {read,write,delete}` con metadatos `lastModified`, `checkedAt`, `etag` (etag reenviado como `If-None-Match`).
- Refresco remoto (overlay desde pi.dev):
  - `packages/coding-agent/src/core/remote-catalog-provider.ts:6-7` — `DEFAULT_CATALOG_BASE_URL = "https://pi.dev"`, `REMOTE_CATALOG_REFRESH_INTERVAL_MS = 4h`.
  - `remote-catalog-provider.ts:9-17` `mergeModels()` — reemplaza por id de modelo preservando el orden de línea base; `:19-31` `parseCatalog()`; `:33-42` `remoteModels()` usa `entry.lastModified` vs `localGeneratedAt`.
  - `packages/coding-agent/src/core/models-store.ts:46-146` `FileModelsStore` — "Locked JSON-backed storage for dynamically refreshed provider catalogs" en `~/.pi/agent/models-store.json` (no el catálogo base estático).
- Orquestación:
  - `model-runtime.ts:200-211` — crea ModelRuntime con `allowModelNetwork` y `refreshOnCreate !== false`; `:690-705` `refresh({allowNetwork})` delega en `this.models.refresh()`.
  - `model-registry.ts:32-52` — `ModelRegistry` es un facade síncrono "exposed to extensions"; el core usa `ModelRuntime` directamente; `refresh()`, `getAll()`, `getAvailable()`.
  - `package-manager-cli.ts:397-423` `refreshModelCatalogs()` — `pi update --models`: `ModelRuntime.refresh({ allowNetwork:true, force:true })` con timeout de 15 s (AbortController) y errores por proveedor.
- Credenciales:
  - `auth-storage.ts:23` `AUTH_FILE_WRITE_OPTIONS { encoding:"utf-8", mode:0o600 }`; `:57` mkdir de `~/.pi/agent` con `0o700`; `:63-64` `writeFile` + `chmodSync(0o600)`, escrituras con bloqueo.
  - `docs/providers.md:310-317` orden de resolución: flag CLI `--api-key` → `~/.pi/agent/auth.json` → variables de entorno.
- Modelos personalizados / proveedores custom:
  - `docs/models.md:9-40` — `~/.pi/agent/models.json`; mínimo `{providers:{ollama:{baseUrl, api:"openai-completions", apiKey:"ollama", models:[{id}]}}}`.
  - `docs/models.md:13-18` — flags `compat.supportsDeveloperRole` / `compat.supportsReasoningEffort` para servidores OpenAI-compat sin esa capacidad.
  - `provider-composer.ts:1-22` — extensión `registerProvider` soporta implementaciones custom de `streamSimple`, `headers`, OAuth (`login/refreshToken/getApiKey/modifyModels`).

### 2.6 Tools y extensiones

- Tools de primer nivel (`AgentTool` de pi-agent-core): `read`, `write`, `edit`, `edit-diff`, `bash`, `grep`, `find`, `ls`, `truncate` en `src/core/tools/`; registro en `tools/index.ts:96-134`.
- Truncación acotada (memory-safe):
  - `packages/coding-agent/src/core/tools/truncate.ts:11-13` — `DEFAULT_MAX_LINES=2000`, `DEFAULT_MAX_BYTES=50*1024`, `GREP_MAX_LINE_LENGTH=500`; trunca cabeza o cola, nunca corta líneas a medias; "whichever limit is hit first".
  - `tools/output-accumulator.ts:49-70` — acumulador de streaming con memoria acotada: mantiene una cola rodante de `2*maxBytes` del tail decodificado y abre un archivo temporal SOLO cuando el output debe verse completo (bash); usa `decoder` UTF-8 de streaming para no partir multibyte.
  - `tools/bash.ts:25-26` `MAX_TIMEOUT_MS = 2_147_483_647`; `bash.ts:90-127` `exec(onData, signal, timeout, env)`; la descripción de la tool documenta que el output se trunca a 2000 líneas/50 KB y que el output completo se guarda en archivo temporal si se truncó (referenciado desde el tool-result).
  - `tools/read.ts:218,294-314` — soporta `offset`/`limit`, redimensiona imágenes, trunca a 2000 líneas/50 KB y sugiere `"continue with offset"` para completar archivos grandes.
  - Overflow: `packages/ai/src/utils/overflow.ts:134,171` — `isContextOverflow()` / `isRecoverableLength()`; doc-comment con patrones de error por proveedor (Mistral/OpenRouter/Together/llama.cpp/LM Studio/Kimi/DS4/DashScope; poco fiable para z.ai/Xiaomi MiMo/Ollama).
  - Retry: `packages/ai/src/utils/retry.ts` — regexes separados `NON_RETRYABLE` vs `RETRYABLE` (429/500/502/503/504/524/errores de red/overloaded/rate limit/insufficient_quota).
- Carga de extensiones:
  - `packages/coding-agent/src/core/extensions/loader.ts:436-463` `loadExtensionModule()` — `createJiti(import.meta.url, { moduleCache:false, ... })`; en el binario Bun usa `virtualModules`, en fuente TS usa `tsconfigPaths`, en build Node usa alias de dist; `import(extensionPath, {default:true})` exigiendo factory.
  - `loader.ts:469-485` `createExtension()` — mantiene `handlers`, `tools`, `messageRenderers`, `entryRenderers`, `commands`, `flags` en Maps.
  - `docs/extensions.md:277-348` — ciclo de vida de eventos (`project_trust`, `session_before_*`/`session_after_*`, `before_agent_start`, `keyboard_*`, `tool_call` (rechazable) / `tool_result` (modificable), `context_system_prompt`/`context_keep`/`context`) y registro de API (`registerTool`, `registerCommand`, `appendEntry`, `on`, `ctx.ui.prompt`).
- Filtros de tools en CLI: `--tools`, `--exclude-tools`, `--no-builtin-tools` (`packages/coding-agent/README.md:581-585`).

### 2.7 Confianza del proyecto y seguridad

- No hay sandbox en el agente: corre con los permisos del usuario (`docs/security.md:1-4`, "not a sandbox").
- `project_trust` es un GATE de "qué recursos del proyecto se cargan", no de ejecución:
  - `docs/security.md:13-28` — al confiar en un directorio se cargan `.pi/settings.json`, `.pi/extensions/skills/prompts/themes`, `SYSTEM.md`/`APPEND_SYSTEM.md`, y ancestros `.agents/skills`; los AGENTS.md/CLAUDE.md se cargan SIEMPRE.
  - `docs/security.md:18-29` — default `"ask"` (o `always`/`never`); decisiones guardadas en `~/.pi/agent/trust.json` por directorio canónico.
  - `src/core/project-trust.ts` + `src/core/trust-manager.ts` — máquina de estado `unknown/agreed/rejected/outdated` con digests de archivos de confianza (settings/skills/prompts/themes + SYSTEM.md) y re-prompt en cambios.
  - Ratio: el objetivo es la inyección de prompt vía config del proyecto; el código local se ejecuta igual sin aprobación.
- Almacenamiento de credenciales: `auth.json` 0600, `~/.pi/agent` 0700, bloqueo de escritura (`auth-storage.ts:23,57,63-64`).

---

## 3. Fronteras y trade-offs observados

Límites deliberados del agente (leíble en README y docs; no están implementados):

- Sin sub-agentes, plan mode, to-dos, MCP, modal de aprobación de permisos ni bash en background: `packages/coding-agent/README.md:494-510` — el modelo mental es "extienda a través de extensiones/skills/paquetes de prompts/temas en lugar de añadir features core".
- Sin sandbox integrado: `docs/security.md:31-37` — un sandbox parcial in-process es peor que ninguno; la contención real se delega a contenedores/el SO (`containerization.md`).
- Sesión: archivo JSONL único por cwd en vez de DB; la compactación es "pérdida de información documentada" pero el archivo completo PERMANECE en disco (la compactación solo cambia lo que entra en contexto del LLM).
- Límites de memoria: el acumulador de output bash y los archivos de sesión son acotados, pero `read` carga el archivo completo en memoria antes de truncar el contexto (no es memory-safe a nivel de guardrail de RAM — relevante para el presupuesto <500 MB de Crafter).
- Confianza del proyecto = gate de carga, NO frontera de seguridad (solo inyección de config).
- El catálogo de modelos es "generado" (`packages/ai/src/models.generated.ts` y `image-models.generated.ts`); el overlay remoto (pi.dev) se refresca cada 4 h.
- Composición por capas estrictas: la lógica de sesión vive en coding-agent (no en pi-agent-core); pi-agent-core guarda la cola pura y herramientas genéricas; pi-tui es solo presentación. El embedding en Node recomienda usar `AgentSession` directamente en lugar del subproceso RPC (`docs/rpc.md:5`).

---

## 4. Fuentes primarias

Documentación:

- `packages/coding-agent/docs/llama-cpp.md`
- `packages/coding-agent/docs/session-format.md`
- `packages/coding-agent/docs/compaction.md`
- `packages/coding-agent/docs/providers.md`
- `packages/coding-agent/docs/models.md`
- `packages/coding-agent/docs/extensions.md`
- `packages/coding-agent/docs/security.md`
- `packages/coding-agent/docs/rpc.md`
- `packages/coding-agent/docs/containerization.md`
- `packages/coding-agent/README.md`

Código (coding-agent):

- `src/core/session-manager.ts`, `src/core/agent-session.ts`, `src/core/agent-session-runtime.ts`, `src/core/agent-session-services.ts`
- `src/core/compaction/compaction.ts`, `branch-summarization.ts`, `utils.ts`
- `src/core/extensions/loader.ts`, `runner.ts`, `types.ts`
- `src/core/tools/` (`bash.ts`, `read.ts`, `write.ts`, `edit.ts`, `edit-diff.ts`, `grep.ts`, `find.ts`, `ls.ts`, `truncate.ts`, `output-accumulator.ts`, `file-mutation-queue.ts`)
- `src/core/model-runtime.ts`, `model-registry.ts`, `models-store.ts`, `remote-catalog-provider.ts`, `provider-composer.ts`, `auth-storage.ts`, `settings-manager.ts`
- `src/extensions/llama/` (`index.ts`, `client.ts`, `provider.ts`, `huggingface.ts`, `ui.ts`)
- `src/modes/interactive/interactive-mode.ts` (+ `components/`)
- `src/server/create-harness.ts`, `src/package-manager-cli.ts`, `src/cli.ts`, `src/main.ts`

Código (paquetes base):

- `packages/ai/src/types.ts`, `compat.ts`, `model-catalog.ts`, `models-store.ts`, `oauth.ts`, `utils/overflow.ts`, `utils/retry.ts`, `providers/`
- `packages/agent/src/agent-loop.ts`, `agent.ts`, `harness/`, `session/`
- `packages/tui/src/tui.ts`, `terminal.ts`, `keys.ts`, `keybindings.ts`, `editor-component.ts`, `autocomplete.ts`

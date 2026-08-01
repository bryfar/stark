# Goal

## Objective

Construir un agente de codificación AI modelo-agnóstico, en una aplicación de escritorio
basada en **Tauri 2** (backend en Rust + frontend web en **Svelte 5**), que funcione en
cualquier distribución de Linux y que sea **súper ligero**: debe correr fluidamente en hardware
antiguo y en los dispositivos más modestos, sin importar que no sean antiguos.

## Stack

- **Shell:** Tauri 2 (Rust).
- **Frontend:** Svelte 5 (compila a Vanilla JS, sin runtime DOM virtual, bundles pequeños).

## Goals

### Modelo-agnóstico
- Conectar a OpenAI, Anthropic, Google Gemini y modelos locales vía Ollama, seleccionables por sesión.
- **Toggle de selección de LLM** en la UI.
- **Selección de modelo dentro del proveedor** (p. ej. o1-mini vs gpt-4o en OpenAI; claude-thinking vs claude-sonnet en Anthropic).

### Estilo de respuesta
- El agente **razona paso a paso antes de responder**, para cualquier modelo (mediante system prompt / chain-of-thought en el prompt).

### Contexto
- **Index (tree) + archivos relevantes a la tarea**, estilo opencode.
- **Opción manual** de añadir archivos/adjuntar por parte del usuario.
- No se envía el repo completo de forma automática.

### Detección de hardware y modelos locales
- La app detecta RAM/VRAM/CPU del dispositivo vía Tauri y **propone modelos Ollama adaptados** por tiers.
- Los tiers se validarán y refinarán con **benchmarks reales de Ollama** (uso de memoria y calidad por modelo). Tabla inicial:

| RAM total | Tier | Modelos locales sugeridos |
|---|---|---|
| < 4GB | Lite | Phi-3-mini, Qwen2.5 0.5B/1.5B (Q4) |
| 4–8GB | Basic | Qwen2.5 3B, Llama 3.2 3B (Q4) |
| 8–16GB | Standard | Llama 3.1 8B (Q4) |
| > 16GB | Pro | DeepSeek-Coder 14B+ (Q4) |

### Modo flexible
- **Modo Plan:** analiza y planea sin modificar archivos.
- **Modo Build:** aplica ediciones reales en el repositorio local del usuario (estilo opencode / Claude Code).
- El usuario puede elegir el **modo de razonamiento** tanto en Plan mode como en Build mode.

### Permisos y edición
- El agente edita el **repositorio local del usuario**.
- **Aprobación por acción del agente:** el agente anuncia "voy a modificar X, Y, Z" y el usuario aprueba el conjunto antes de proceder.
- El usuario puede otorgar **permiso libre que dura toda la sesión** (con log de cambios visible en la UI).

### Terminal (seguro)
- El agente tiene **acceso a terminal** y ejecuta comandos (build, tests, debug).
- Los comandos se ejecutan en un **sandbox** con **bubblewrap / firejail**, de dos modos:
  - **Copia sincronizada:** los tests/builds corren contra una copia del repo que se sincroniza con el real; el usuario aprueba y se aplica al real.
  - **Perimetral:** aísla red/recursos con acceso de lectura/escritura al repo real (protege la máquina, no el repo).
- **Aprobación manual por comando** (sin allowlist automática).
- El agente **ve la salida del comando (stdout/stderr)** y actúa sobre ella.
- **Timeout y límite de salida** por comando para no congelar la app.

### Control de privacidad
- Sin telemetría: **no compartir código fuera del proveedor elegido** (nada nuestro, sin telemetría de la app).
- Con proveedores cloud el código **se sube** a sus servidores; la UI **lo indica claramente**.
- La app no envía más que el contexto necesario a la tarea.
- **Modo solo-local** con Ollama para privacidad total.
- Cifrado **en reposo** de todo el estado sensible (conversaciones, log de cambios, config) en disco: se descifran al cargar, se re-cifran al guardar.
- Claves API guardadas en **keyring del sistema (Secret Service / libsecret)**.
- **Clave maestra:** derivada de una **passphrase del usuario** definida en el primer arranque, guardada en el keyring (modelo Bitwarden).
- **Fallback sin keyring:** si Secret Service no está disponible, requerir la passphrase en cada arranque (clave en memoria, nunca en disco); si el usuario la rechaza, archivo plano con permisos 0600 + warning visible. Nunca silencioso.
- El **index del repo** (tree) se cachea localmente en disco (reconstruible); no se comparte fuera de la máquina.

### Integración avanzada
- Capa de adaptadores por proveedor.
- **Contador de tokens gastados** por sesión: usa los `usage` reportados por cada proveedor (preciso), **informativo** (sin límite configurable).
- **Skills:** archivo de instrucciones (markdown/JSON con nombre, descripción y pasos) que se carga al prompt cuando el usuario lo pide (estilo claude-code skills).
- **Adjuntos:** texto, PDF, logs, código e imágenes (multimodal) con límite de tamaño.

## Verificación

- `tauri build` produce un binario de Linux funcional.
- Smoke test contra cada proveedor (OpenAI, Anthropic, Gemini, Ollama) con key válida o endpoint
  local y retorna una completion.
- **Arranque:** UI interactiva en **3–5s máximo** en hardware de bajos recursos.
- **Memoria en reposo:** **300–500MB** en máquinas antiguas.
- **Respuesta:** streaming de tokens sin que la UI se congele (latencia de UI < 50ms por frame).
- Modo Build realiza una edición real de archivos; modo Plan devuelve un plan sin modificar archivos.
- Tiers de modelos locales validados con benchmarks reales de Ollama.

## Orden de construcción

- **MVP:** app Tauri (Rust + Svelte 5) arranca con los **4 proveedores desde el día 1** (OpenAI, Anthropic, Gemini, Ollama), chat con streaming, modos Plan/Build, edición con aprobación por acción.
- **Prioridad media:** terminal sandbox, skills, contador de tokens, detección de hardware.
- **Último en prioridad (sacrificable primero si el tiempo apremia):** adjuntos (texto, PDF, logs, imágenes).

## Alcance

- **En alcance:** la app de escritorio (core en Rust, adaptadores de proveedores, frontend en
  Svelte 5, modos Plan/Build, detección de hardware, permisos de edición, terminal sandbox con
  aprobación manual, privacidad, skills, adjuntos, contador de tokens, optimización de recursos).
- **Fuera de alcance (esta pasada):** empaquetado (AppImage/deb/rpm), sincronización en la nube,
  y funcionalidades de equipo.

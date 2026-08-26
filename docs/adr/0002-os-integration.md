# ADR 0002: Integración OS estilo Omarchy — CLI headless con yolo, usage records compatibles, crash diagnosis y skills embebidos

## Status

Aceptado.

## Context

Omarchy v4 (basecamp/omarchy, MIT) integra agentes de código a nivel OS: lanzador de agente default con flags yolo por agente, panel de uso alimentado por records JSON auto-descriptivos, diagnosis de crashes vía systemd-coredump y skills embebidos symlinkeados a los directorios estándar de cada harness. stark compite en ese mismo espacio (agente de código para desktop Linux) y adopta los cuatro mecanismos, adaptados a su arquitectura Tauri 2 + Preact y sus guardrails de seguridad/privacidad.

El diseño completo vive en `docs/os-integration-design.md`. Este ADR registra las decisiones que bloqueaban la implementación.

## Decisión

1. **Guardrail #4 se enmienda**: "Toda ejecución requiere aprobación explícita del usuario, **salvo bypass opt-in por launch** (`stark prompt --yolo`). El bypass nunca es persistente ni default." Mitigaciones obligatorias: consentimiento explícito la primera vez (`--yolo --i-understand` o `STARK_ACK_YOLO=1`, luego recordado en config), badge `UNATTENDED · BYPASS` visible en toda UI que adjunte la sesión, y límites de timeout/output del sandbox intactos.
2. **Los stats de uso quedan exentos del cifrado-at-rest** (guardrail #5). Son contadores puros (tokens/modelos/días, cero contenido) y la interoperabilidad con el panel de Omarchy exige JSON plano legible por su colector. Ubicación `${XDG_STATE_HOME}/stark/agents/usage/stark.json`, dir 0700 / fichero 0644. Chats, keys y logs siguen cifrados como hasta ahora.
3. **El PR upstream a basecamp/omarchy se difiere** hasta que exista un artefacto instalable en release taggeada (backend mise GitHub releases). Mientras tanto se prepara el diff local (`case` en `bin/omarchy-agent`, fila en `manual/17-ai.md`, alias `s`).
4. **Watcher de crashes V1 = in-app only** (task tokio dentro de la app, toggle en Settings). Limitación documentada: crashes con la app cerrada no se anuncian. El servicio `stark-crash-watch` systemd user queda como V2 opcional.
5. **Diagnosis de crash en modo Manual** con aprobaciones normales (coredumpctl/gdb/journalctl/free aparecen como prompts). Se rechaza el preset read-only con lista fija de comandos: colisiona con "no allowlists" del guardrail #4.
6. **Contrato público congelado**: `stark prompt [--yolo] [--mode plan|build] [--cwd <dir>] [--json] "<task>"`. Mismo binario, dispatch de argv antes de `tauri::Builder`. Exit codes: 0 fin, 1 error runtime, 2 budget/auth. El nombre `stark` queda fijado antes del PR upstream.

## Consecuencias

- **Positivas**: el refactor `EventSink` desbloquea CLI headless y testeabilidad sin webview; los records schema-v1 byte-compatibles dan presencia en la barra de Omarchy sin escribir QML propio; crash diagnosis reutiliza el pipeline chat-token existente; skills embebidos dan visibilidad de stark dentro de Claude Code/Codex/Pi sin instalar nada más.
- **Negativas/riesgos**: `--yolo` reduce la fricción de aprobación a cambio de superficie de riesgo real (aceptado explícitamente por el owner); la exención de cifrado de stats requiere nota visible en Settings para no erosionar la promesa privacy-first; watcher in-app deja fuera crashes con la app cerrada; el PR upstream depende del calendario de releases de Omarchy.
- **Guardrails preservados**: presupuesto de memoria intacto (watcher es un stream journalctl, no polling); latencia no afectada (dedupe y `-n 0`); Linux-only (journalctl/systemd-coredump son Linux-only por definición).

## Alcance acordado

- Orden de build: A (eventsink+CLI) → C (crash) → B (records+panel) → D (skills).
- Fuera de alcance V1: probe OAuth de límites Anthropic, servicio systemd, sync multi-máquina del panel propio.

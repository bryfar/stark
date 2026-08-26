# Grill New Release — Capa de Proveedores + Slice Siguiente

Sesión de grilling del 2026-08-06. Decisiones tomadas, una a una, antes de implementar.

---

## Contexto

Crafter (agente AI para Linux, Tauri 2 + Svelte 5). Objetivo de la sesión: endurecer la
**capa de proveedores** antes de construir sobre ella, y decidir el siguiente slice de
características. Se investigaron los patrones de opencode, KiloCode, Cline y OpenHands,
más el reference `opencode-reference.md` del proyecto.

## Hallazgo de mercado (verificado con curl el 2026-08-06)

Ningún endpoint "free anónimo / cero-auth" responde hoy:

| Proveedor                                    | Estado verificado                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| Pollinations legacy (`text.pollinations.ai`) | 402 "budget too low" / 404 modelo; deprecation a `enter.pollinations.ai` |
| Pollinations `enter.pollinations.ai`         | respuesta vacía                                                          |
| OpenRouter `Authorization: Bearer public`    | 401 "Missing Authentication header"                                      |
| OpenRouter sin header                        | 401 "No cookie auth credentials found"                                   |
| Groq free anónimo                            | 401 invalid_api_key                                                      |

**Conclusión:** el "universal free" real en 2026 no es acceso anónimo — es
**cuenta gratuita del usuario + su key gratuita** (openCode Zen, KiloCode Auto Free,
Cline API) o **modelos locales** (Ollama). Todos los vendors que ofrecen "free real"
absorben el coste a cambio de usar los datos del usuario para entrenar (advertencia
visible) o de créditos promocionales temporales.

## Decisiones de la capa de proveedores

### Q1 — Alcance de la fase: C. Endurecer proveedores primero, luego elegir slice.

### Q2 — Catálogo de modelos: B.

Fetch `/models` en vivo desde cada provider al abrir el selector, con **fallback a las
listas hardcodeadas** cuando el fetch falle o el provider no lo exponga.

### Q3 — Filtro por auth: A.

Selector filtra por estado de auth del usuario:

- Sin API key → solo se muestran modelos gratis.
- Con API key → catálogo completo del provider.
- Un modelo de pago sin key no aparece (cero errores sorpresa).

### Q4 — Rate-limit (429): A.

Detectar 429 → **cola corta con backoff (15s/30s/60s) y reintento automático**,
cancelable por el usuario. Si vuelve a fallar → sugerir cambiar de modelo/provider.
NO hay fallback automático a otro modelo (evita degradación silenciosa de calidad).

### Q5 — Trae-tu-API (BYOK): C.

- Camino principal: **presets** + pegar API key (OpenAI, Anthropic, Gemini, Groq,
  Mistral, OpenRouter, etc.).
- Camino avanzado: panel colapsable "Añadir proveedor custom" para cualquier endpoint
  **OpenAI-compatible** (base_url editable, nombre, modelos). Reutiliza
  `ProviderKind::OpenAICompatible`.

### Q6/Q7 — Almacenamiento de secrets: A.

API keys **cifradas con AES-256-GCM** bajo master key derivado con Argon2id de la
passphrase del usuario, en `.crafter_storage/api_key_<id>.enc`, perms 0600.
Keyring/Secret Service = mejora futura opcional. **AGENTS.md guardrail 3 actualizado**
para reflejar la implementación real (era: "API keys only in Keyring").

### Q8 — Cómo se determina "gratis": A (heurística por provider).

- OpenRouter: leer `pricing == 0` o sufijo `:free` del fetch `/models`.
- Pollinations: lista hardcodeada (todos gratis).
- Providers con key (OpenAI/Anthropic/Gemini): sin key quedan ocultos del flujo free.

### Q9 — Primer arranque: A con auto-detección.

- Si `ollama` está instalado y corriendo → promoverlo arriba (local, privado).
- Si no → onboarding de 3 tarjetas: [Ollama local] · [Cuenta gratis BYOK: Gemini/Groq
  free — directo al provider, privado] · [Gateways free de terceros con advertencia de
  datos: openCode Zen / Kilo Auto Free].

### Q10 — Streaming Pollinations: A.

Tolerar respuesta no-SSE como un solo chunk (flujo no se rompe).

### Q12 — Onboarding "universal free": A.

Cuenta gratuita del provider + pegar su key gratuita. "Universal free" = costo cero,
no cero-auth. Ver hallazgo de mercado.

### Q13/Q14 — "Stark Dreams" como router local: D + A.

- **Stark Dreams NO es un provider conectable** (no se llama "Zen", no se expone como
  tal). Es el **router interno / modo de agregación** del app.
- Un **modelo lógico** (ej. "kimi-k2") declara su orden de providers con
  `provider.order` y si permite fallback (`allow_fallbacks`) — patrón de
  opencode-reference (bloque OpenRouter).
- El router hace: health-check, retry con backoff, cooldown de providers caídos,
  fallback solo en errores transitorios de disponibilidad.
- **Fallback = A**: solo en 429, 5xx, timeout, modelo caído, red.
  **NUNCA** en 401/403 (auth key del usuario) ni 400 (mala petición).
- Opción por modelo `zero_data_only` (solo providers sin retención de datos) —
  alineado con el guardrail de privacidad.

### Patrones del reference aplicados

- Interfaz provider uniforme: `{ id, name, baseURL, apiKey, headers, models: { id: {name, limit:{context,output}} } }`.
- Router por modelo: `options.provider.order` + `allow_fallbacks`.
- `small_model` / default para tareas de fondo (titulado de sesión) — usar un modelo
  local/barato, no el principal.

---

## Slice siguiente — PENDIENTE DE DECISIÓN

La pregunta Q15 (¿V2 Plan/Build+diffs, cerrar V3 crypto en UI, o V4 sandbox+hardware?)
quedó **abierta** al cierre de la sesión. No se eligió aún.

Candidatos:

- **V2** — Plan/Build + diff approval (repo indexer + prompt builder + DiffModal +
  mutaciones reales). La identidad del producto. Depende de la capa de proveedores
  (cerrada).
- **V3** — Cerrar crypto en la UI (UnlockModal + plaintext-warning). La crypto ya
  existe y pasa 20/20 tests; solo falta exponerla.
- **V4** — Terminal sandbox (bubblewrap/firejail) + hardware detection (sysinfo).

Recomendación del grilling: **V2**, con posible sprint corto de crypto-UI antes si se
quiere la crypto visible como venta.

## Pregunta abierta adicional

- Decisiones de UI/UX del DiffModal (estilo diff, aprobación, modo Plan vs Build) no
  se han grillado aún — deberían cerrarse antes de implementar V2.

# Grilling UX Redesign — Decisiones Acordadas (Crafter/Stark)

Sesión de grilling para el rediseño de la shell responsive, el prompt container de los 3 modos (Chat / Code / Design), el modal de modelos, dictado por voz, y la biblioteca de assets del modo Design.

Estado: **cerrado** — decisiones P1 a P8g acordadas. Pendiente solo de implementación.

---

## P1 — Piso de tamaño de ventana ("35% de la pantalla")

- **Decisión:** Combinación de A + C.
  - **A:** `minWidth` ~**460px** — piso duro de la ventana. El "35%" se respeta de facto en pantallas ≥1315px; por debajo manda el piso de 460px.
  - **C:** La app **arranca maximizada** ("pantalla completa"). Si el usuario coloca otra app al lado (snap/tiling), la ventana **se adapta al espacio restante** de la pantalla.

## P1b — "Pantalla completa" al arrancar

- **Decisión:** **Maximizada** (`"maximized": true` en `tauri.conf.json`), no fullscreen real (F11).
  - Ocupa todo el escritorio, conserva el borde del WM, se puede redimensionar con los botones custom del header.
  - En WMs con snap/tiling (KDE, hyprland, i3), al colocar otra ventana al lado la app se reacomoda sola.
  - La opción de reducir a 35%/460px sigue disponible con los botones de la barra.

## P2 — Mecanismo de escalado (tipografía + UI) según el tamaño de ventana

- **Decisión:** **Opción A — escala global con `zoom` + `--ui-scale`.**
  - Un listener de `resize` en JS calcula el factor y setea `--ui-scale` en `:root`.
  - La app entera se achica proporcionalmente (tipografía, paddings, prompt, todo). Nada "se rompe", solo se ve más pequeña y limpia.
  - Cero migración de estilos (la UI está casi toda en `px`).
  - Complementa (no reemplaza) el reflow responsivo por breakpoints: sidebar→overlay, prompt container que se reorganiza.

## P3 — Sidebar

### P3a — Cuándo el sidebar pasa a modo overlay

- **Decisión:** **Opción A — por estado de maximizada.**
  - Maximizada → sidebar **persistente**.
  - No maximizada (reducida, acomodada al lado, snap) → sidebar **compacto/overlay**.
  - Implementación: eventos `maximize`/`unmaximize` de Tauri + fallback por ancho en preview de navegador.

### P3b — Apertura/cierre del overlay

- **Decisión:** **Opción A — hover abre + clic fija (pin).**
  - Hover sobre el icono del sidebar → abre el overlay.
  - Clic en el icono → **fija** (queda abierto aunque salgas).
  - Cierra con: salir de la zona del sidebar, `Escape`, o clic afuera.
  - El pin dura solo la sesión (no se persiste entre reinicios).

### P3c — Layout en tamaño completo

- **Decisión:** **Opción A — full-size conserva el layout actual.**
  - Modos (Chat/Code/Design) siguen en el **HeaderBar** (centro).
  - Sidebar persistente con su estructura actual (marca, Pages, Nuevo Chat, Historial, footer).
  - El overlay con el nuevo orden solo aparece en vista comprimida.

### P3d — Nueva página "Projects"

- **Decisión:** **Opción A — página stub/placeholder** (igual que Plugin Hub e Integrations).
  - El contenido real llega cuando exista la biblioteca de assets del modo Design.
  - Aparece en la lista de Pages (sidebar full-size y overlay).

### Orden del overlay (definido por el usuario)

En la vista comprimida, el sidebar overlay muestra, de arriba a abajo:
1. Las **3 opciones de modos** (Chat / Code / Design) en la parte superior.
2. El botón **Nuevo Chat**.
3. La lista de **Pages** (Home, Design System, Plugin Hub, **Projects**, Integrations).
4. La lista de **Historial**.

Detalles de diseño del overlay: modal flotante encima del contenido, con **blur** (backdrop-filter) y **bordes con gradiente**.

---

## P4 — Botón `+` del modo Chat (agrupa Adjuntar + Skills)

- **Decisión:** **Opción A — `+` abre un menú dropup** con:
  - "Adjuntar archivos" → dispara el file picker.
  - "Skill" → sub-menú con las skills disponibles.
  - Respeta la regla de dropup-only.
- Las selecciones activas (skill o adjuntos) se muestran como **pills al lado del `+`** (como hoy).

## P5 — Selector Plan/Build (modo Chat)

- **Decisión:** **Opción A — toggle segmentado de 2** (Plan | Build), colocado justo al lado del `+` en la zona izquierda.
- Los 5 estados del "Select Mode" quedan **exclusivos del modo Code**.

## P6 — Modal de selección de modelos

### P6a — Relación con el ProviderManagerModal existente

- **Decisión:** **Opción A — dos modales con roles distintos.**
  - Nuevo modal = **selector** (local arriba, remoto debajo, sección "Añadir Custom Provider").
  - `ProviderManagerModal` = gestión avanzada (editar, API keys, borrar).
  - "Añadir Custom Provider" abre el manager en modo "nuevo proveedor".
  - El **engranaje del toolbar desaparece**: la entrada de gestión vive dentro del modal de modelos.

### P6b — Estructura interna del modal

- **Decisión:** **Opción A + botón de instalar.**
  - Secciones verticales por proveedor.
  - Primero **"Local" (Ollama)** con **detección en vivo** vía `GET /api/tags` (si responde muestra modelos reales; si no, cae a la lista configurada).
  - Después los **proveedores remotos** (Anthropic, OpenAI, Gemini, etc., en orden de config).
  - **Un clic en un modelo selecciona proveedor + modelo y cierra el modal.**
  - Al final: sección **"Añadir Custom Provider"** → abre el manager en modo nuevo.
  - Botón **"Instalar modelo"** en la sección Local (reusa `providers_install_model` → `ollama pull`).

### P6c — Ubicación del toggle "CoT Thinking"

- **Decisión:** **Opción A — queda visible en el prompt container**, al lado del Plan/Build en la zona izquierda.

### P6d — Dictado por voz y grabación

- **Decisión:** **Opción A — local-first con whisper local.**
  - El botón de micrófono graba con `MediaRecorder`/`getUserMedia` y manda el clip a un **nuevo comando Tauri** que ejecuta `whisper`/`whisper.cpp` del sistema si está instalado.
  - El texto transcrito entra directo al prompt.
  - Si no hay micrófono o `whisper`, el botón queda **deshabilitado con tooltip** ("Instala whisper para dictado").
  - **"Grabar audio" = dictado que se transcribe al prompt** (no es adjuntar un archivo de audio).

### P6e — Interacción del micrófono y swap a enviar

- **Decisión:** **Opción A.**
  - Campo vacío → se muestra el **micrófono**.
  - Clic → empieza a grabar (estado "grabando" visible); otro clic → detiene y transcribe.
  - Con texto → el mic **desaparece** y aparece el botón circular de **flecha ↑** para enviar.
  - Al enviar, si el campo queda vacío → vuelve el mic.
  - El botón "Enviar" con texto actual se reemplaza por la flecha.

### P6f — Sobrantes del prompt container de Chat

- **Decisión:** **Opción A.**
  - Mantener **contador de tokens compacto** en la esquina inferior izquierda (sin el hint de teclado).
  - Mantener la **fila de chips de sugerencias** (plugins) solo cuando el campo de prompt está vacío.

---

## P7 — Modo Code

### P7a / P7b — Los 3 botones superiores

- **Decisión:** (combinación de respuestas)
  - **"Where Stark Run"** = selector de **destino de ejecución**: **Local / SSH**. (WSL queda **fuera** — ver P7b.)
  - **"Work Directory"** = muestra la carpeta de trabajo activa; al hacer clic abre **folder picker** para cambiarla.
  - **"Add another folder"** = agrega carpetas al workspace (**multi-root**, estilo VS Code).

### P7b — Contradicción WSL vs. Linux-only

- **Decisión:** **Opción A — destinos Local + SSH.**
  - WSL es tecnología de Windows y el proyecto es **Linux-only** (guardrail #7). En Linux puro `wsl` no existe.
  - SSH sí: ejecutar comandos vía `ssh host` desde el backend con la misma sandbox/captura de salida.
  - WSL se deja fuera del selector (o deshabilitado con tooltip "solo en Windows").
  - Para el folder picker se necesita agregar el plugin **`tauri-plugin-dialog`** (no está instalado).

### P7c — "Select Mode" (5 estados) y el guardrail de seguridad

- **Decisión:** **mapa de 5 modos aceptado** (escalonamiento de permisos):
  - **Manual** — el agente propone y **cada acción pide aprobación** (ediciones y comandos). Es el modo actual.
  - **Plan** — el agente solo analiza/propone, **nunca ejecuta**.
  - **Accept Edits** — las **ediciones se aplican automáticamente** (registradas en historial/diff); los **comandos de terminal siguen pidiendo aprobación**.
  - **Auto** — ediciones auto + **comandos auto-aprobados** (equivalente a "sí a todo").
  - **Bypass Permissions** — el más permisivo: **ignora los modales de aprobación**.
  - Escala: `Plan < Manual < Accept Edits < Auto < Bypass Permissions`.
- **IMPORTANTE:** esto es una **excepción consciente al guardrail #4** (cada comando requiere aprobación explícita). Se documenta como decisión; NO violar en silencio. Los límites de timeout/límites de salida del sandbox se mantienen siempre.

### P7d — Aviso al activar modos peligrosos

- **Decisión:** **Opción A.**
  - Al cambiar a **Auto** o **Bypass Permissions** → **diálogo de confirmación** ("Vas a permitir que Stark ejecute sin aprobaciones. ¿Continuar?").
  - **Badge visible** en el prompt container mientras esté activo uno de esos modos.

### P7e — Estructura del prompt container en Code

- **Decisión:** **Opción A — sin swap en Code.**
  - Layout:
    ```
    [Where Stark Run] [Work Directory] [Add another folder]   ← fila superior
    ┌───────────────────────────────────────────┐
    │  textarea del prompt                       │
    │                          [flecha ↑ enviar] │   ← container (solo esto)
    └───────────────────────────────────────────┘
    [Select Mode ▾] [+] [mic]      ...      [select model]
    ```
  - El enviar está **siempre dentro** del container; el **mic de abajo queda fijo** (no se oculta al escribir).
  - La pantalla de chat es la misma que modo Chat; cambia solo el prompt container.

---

## P8 — Modo Design (cerrado)

### P8a — Menú `+` de Design: alcance real vs. stub

- **Decisión:** **Opción A** — menú completo con funcionalidad real en lo que ya hay infraestructura y stub con UI en lo pesado.
  - **Reales:** Adjuntar carpeta (folder picker → agrega referencia), Añadir `.fig` (file picker, se guarda como asset), Design systems (selector de DS disponibles), Skills (reusa lista de skills).
  - **Stub con UI:** GitHub remoto (modal que guarda la URL), Link código local, Referencia a otro proyecto, Conectores.

### P8b — Fuente de datos del two-pane inicial

- **Decisión:** **Opción A.**
  - **Templates** = los 9 presets existentes (`designPresets`).
  - **Design systems** = el DS **"Stark" integrado** (tokens de DESIGN.md) + los que el usuario agregue vía el menú `+` (`.fig`, design system).
  - Sin datos agregados se muestra solo "Stark" integrado.

### P8c — Origen de datos de la biblioteca de assets

- **Decisión:** **Opción A — biblioteca local escaneada por tipo.**
  - Una carpeta de assets (p. ej. `library/` dentro del workspace activo, configurable) se indexa por extensión: `.fig` → Design, `.mp4` → Video, `.png/.jpg` → Images, `.html`/carpetas → Projects/Deck, etc.
  - Metadatos (última vez visto, acceso) en un **índice JSON cifrado** (`storage_save`).
  - Permite después operaciones reales (duplicar/renombrar archivos).

### P8d — Columnas "all owners" y "access"

- **Decisión:** **Opción A — conservar con semántica local.**
  - `owner` = usuario actual, `access` = "private" (informativos). Listos para multi-usuario real en el futuro.

### P8e — Pestañas de sesión

- **Decisión:** **Opción C — pestañas en Code y Design.**
  - Cada sesión se abre con una pestaña arriba del área de chat.
  - **Design:** cada proyecto/sesión es una pestaña con su historial de prompts y su canvas.
  - **Code:** cada sesión es una pestaña (historial de prompts + consola).
  - **Chat:** mantiene la lista de historial en el sidebar (sin pestañas).

### P8f — Estructura general del modo Design (dos estados)

- **Decisión:** **Opción A — estructura de dos estados confirmada.**
  - **Estado "Biblioteca" (vista inicial, sin proyecto activo):** prompt container de Design arriba + container dividido en dos (design systems + templates) + grid de assets con filtros/buscador. Sin canvas, sin pestañas.
  - **Estado "Sesión activa":** pestaña(s) de sesión arriba del área de chat + prompt container + canvas de diseño (DesignView). Iniciar un proyecto (click en template/asset o "nuevo proyecto") abre una pestaña con su canvas; enviar un prompt desde la vista biblioteca también crea/abre una sesión.

### P8g — Detalles finales del prompt container de Design

- **Decisión:** confirmados los 4 puntos:
  - **Sin micrófono** en Design (el dictado queda en Chat y Code). El prompt container de Design tiene: menú `+`, botón de template, botón de modelo, botón de enviar.
  - El **botón de template** abre un modal con **vista previa en vivo** de los 9 presets; al elegir uno se carga como base de la sesión.
  - Al **adjuntar un design system** aparece como **pill al lado del `+`**.
  - **Carpeta de biblioteca** por defecto: `library/` dentro del workspace activo (configurable luego).

---

## Notas de implementación / entorno

- **Ventana:** `minWidth: 460`, `maximized: true` en `tauri.conf.json`.
- **Plugins a agregar:** `tauri-plugin-dialog` (folder picker para Work Directory / Add another folder / adjuntar carpeta en Design).
- **Backend nuevo necesario:**
  - Comando Tauri para ejecutar `whisper`/`whisper.cpp` (dictado).
  - Comando(s) para ejecutar comandos vía **SSH** (destino remoto de "Where Stark Run").
  - Workspace multi-root (lista de carpetas + raíz activa), persistido (vía `storage_save` cifrado).
- **Guardrails que se tocan:**
  - #4 (aprobación explícita): excepción consciente con Auto / Bypass Permissions + confirmación y badge.
  - #6 (diseño): el overlay usa blur + gradiente en bordes, sigue siendo monochrome + earth.
- **Reglas de diseño a respetar:** dropup-only, sin emojis/brackets en labels, Lucide stroke 1.75, monospace.

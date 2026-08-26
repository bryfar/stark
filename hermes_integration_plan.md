# Plan de Integración y Diseño Técnico: Arnés Hermes para Stark 2.0

Este documento especifica la arquitectura, especificaciones técnicas y fases de desarrollo para integrar las capacidades completas del arnés de **Hermes** en **Stark**, mejorando sus tres modos operativos (**Chat**, **Code**, y **Design**) mediante un control inteligente de contexto, interacción por voz en tiempo real, permisos automatizados de consentimiento único y almacenamiento estructurado de sesiones en árbol.

---

## 1. Objetivos del Proyecto

- **Identidad Funcional:** Reconstruir de manera nativa la lógica y arquitectura del arnés de Hermes (basado en el modelo de agentes asíncronos y compactación de memoria persistente) directamente en el backend de Rust (Tauri 2) y frontend de Preact, sin clonación de dependencias externas.
- **Voz en Tiempo Real (Micrófono Siempre Activo):** Permitir al usuario interactuar mediante voz sin presionar botones constantemente, implementando Detección de Actividad de Voz (VAD) local en el backend y streaming asíncrono hacia Whisper.
- **Consentimiento Único para Computer Use:** Evitar ventanas emergentes repetitivas al solicitar permisos para herramientas de terminal o de escritorio, permitiendo la aprobación automática tras un único consentimiento del usuario por sesión o de forma permanente.
- **Gestión del Contexto e Historial Resiliente:** Habilitar un almacenamiento de sesiones basado en JSONL estructurado en forma de árbol (con referencias `id`/`parentId`), permitiendo bifurcaciones (branching) y retrocesos de estado.

---

## 2. Arquitectura de Componentes de Hermes

El arnés se divide en un núcleo de backend escrito en Rust (dentro del ecosistema Tauri 2) y un conjunto de componentes interactivos y estados en el frontend (Preact).

```mermaid
graph TD
    A[Frontend: Preact UI] -->|Modo Continuo / Eventos| B(Tauri Core Commands)
    B --> C{Orquestador de Permisos}
    C -->|Bypass Permanente Activado| D[Ejecución Directa de Tools]
    C -->|Confirmación Única Requerida| E[Modal de Aprobación Global]

    SubGraph Hilos de Backend (Rust)
        F[Audio Stream Listener - CPAL] -->|Buffer de Audio| G[VAD Engine]
        G -->|Segmento de Silencio Detectado| H[Whisper transcripción]
        H -->|Texto de Comando| I[Orquestador / Hermes Learning Loop]
        I -->|Actualiza Reglas| J[(learning_rules.md)]
    End

    D --> K[(Sesiones JSONL - Estructura Árbol)]
```

---

## 3. Especificaciones Técnicas por Módulo

### 3.1. Módulo de Voz en Tiempo Real (Real-time Continuous Voice)

- **Ubicación:** [`src-tauri/src/voice/mod.rs`](file:///home/bryan/Downloads/Repos/crafter-repo/src-tauri/src/voice/mod.rs) (Backend) y [`src/components/VoiceAssistantModal.jsx`](file:///home/bryan/Downloads/Repos/crafter-repo/src/components/VoiceAssistantModal.jsx) (Frontend).
- **Funcionamiento Técnico:**
  - Un hilo en segundo plano captura el flujo de audio del hardware del sistema utilizando la biblioteca `cpal`.
  - Se implementa un algoritmo ligero de **Voice Activity Detection (VAD)** basado en el umbral de energía (Root Mean Square - RMS) para segmentar el audio hablado de los silencios.
  - Al detectar silencio después del habla, el fragmento de audio acumulado se convierte temporalmente a formato WAV mono (16 kHz, 16 bits) y se envía a la función de transcripción local de `whisper-cli`.
  - La transcripción resultante se emite al frontend a través de eventos de Tauri (`voice-speech-processed`) para ser procesada inmediatamente por el orquestador como si fuera una entrada de teclado.
- **Control del Usuario:** Interruptor en la UI "Modo Escucha Activa" (Toggle `continuous_mic`). Al estar encendido, el micrófono no se apaga tras procesar un comando.

### 3.2. Consentimiento Único para Computer Use

- **Ubicación:** [`src-tauri/src/agent/permissions/`](file:///home/bryan/Downloads/Repos/crafter-repo/src-tauri/src/agent/permissions/) and [`src/components/TerminalModal.jsx`](file:///home/bryan/Downloads/Repos/crafter-repo/src/components/TerminalModal.jsx).
- **Funcionamiento Técnico:**
  - Se crea el estado `auto_approve_computer_use: bool` y se almacena en el estado mutable global de la aplicación.
  - Al intentar ejecutar comandos que requieren interactuar con la computadora (herramientas destructivas o del sistema como `Shell`, `DesktopControl`, `DesktopInput`), Stark verificará este flag.
  - Si el flag es `false` y el modo de permiso requiere aprobación, se lanzará una solicitud en la UI con una opción adicional: _"Permitir todas las acciones de computadora automáticamente en esta sesión"_.
  - Si el usuario activa la opción y la aprueba, el flag pasa a `true`, y el evaluador de permisos [`PermissionMode::decide`](file:///home/bryan/Downloads/Repos/crafter-repo/src-tauri/src/agent/permissions/modes.rs#L21) devolverá `PermissionDecision::Allow` de manera inmediata para todas las herramientas de sistema subsiguientes en la sesión.

### 3.3. Árbol de Sesiones JSONL (Session Tree & Branching)

- **Ubicación:** [`src-tauri/src/agent/eventsourcing.rs`](file:///home/bryan/Downloads/Repos/crafter-repo/src-tauri/src/agent/eventsourcing.rs) (Nuevo) y refactorización en [`src-tauri/src/agent/orchestrator.rs`](file:///home/bryan/Downloads/Repos/crafter-repo/src-tauri/src/agent/orchestrator.rs).
- **Funcionamiento Técnico:**
  - Se abandona el log plano lineal. Cada interacción (comando de entrada, salida del LLM, resultado de herramienta) se registra como un nodo con su `id` (UUID) y un puntero `parentId`.
  - Al iniciar una bifurcación de la conversación (Branch), se crea un nuevo archivo de sesión JSONL que enlaza su primer mensaje al `id` del nodo origen en el árbol principal.
  - La lectura del historial para construir el prompt del LLM recorre la ruta desde la hoja activa hasta la raíz del árbol, ignorando ramas alternativas. Esto reduce el consumo de tokens y optimiza la precisión del contexto.

### 3.4. Bucle de Aprendizaje y Memorias de Hermes

- **Ubicación:** [`src-tauri/src/agent/hermes/learning.rs`](file:///home/bryan/Downloads/Repos/crafter-repo/src-tauri/src/agent/hermes/learning.rs).
- **Funcionamiento Técnico:**
  - Al concluir tareas exitosamente, Hermes evalúa los archivos modificados y las instrucciones para resumir reglas de codificación nuevas.
  - Estas reglas se inyectan en el archivo `.stark_graft/learning_rules.md`.
  - **Mejora de Diseño:** En el modo **Design**, al estructurar nuevas interfaces o mockups, Hermes leerá el archivo de reglas de codificación para aplicar los lineamientos visuales, colores del tema e identidad gráfica del proyecto automáticamente en los componentes de Preact generados.

### 3.5. Sistema de Notificaciones Externas

- **Ubicación:** [`src-tauri/src/agent/hermes/notifiers.rs`](file:///home/bryan/Downloads/Repos/crafter-repo/src-tauri/src/agent/hermes/notifiers.rs).
- **Funcionamiento Técnico:**
  - Configuración de Webhooks de Discord/Slack y APIs de Telegram en el Vault cifrado de Stark.
  - Si se ejecuta un comando largo en modo Code, se envía un mensaje HTTP POST al canal configurado cuando la compilación o suite de pruebas termina, reportando éxito o indicando la línea del fallo.

---

## 4. Fases de Implementación y Hitos

### Fase 1: Automatización de Permisos y Voz Continua (Hitos 1-2)

1.  Modificar la UI en Preact para soportar un toggle de **Micrófono Siempre Activo** y actualizar el modal de confirmación de terminal con la casilla **"Aprobar siempre en esta sesión"**. -> **[COMPLETADO ✅]**
2.  Implementar el listener de audio continuo con VAD y la cola de transcripción asíncrona en Rust.
3.  Actualizar la lógica de [`PermissionMode`](file:///home/bryan/Downloads/Repos/crafter-repo/src-tauri/src/agent/permissions/modes.rs) para almacenar y aplicar el bypass de consentimiento una vez aprobado. -> **[COMPLETADO ✅]**

### Fase 2: Almacenamiento en Árbol y Bifurcación de Sesiones (Hitos 3-4)

1.  Implementar `eventsourcing.rs` in Rust para gestionar logs JSONL vinculados por `parentId`.
2.  Agregar soporte en el frontend para visualizar el árbol de la sesión y permitir al usuario retroceder a un paso previo para tomar una rama alternativa de refactorización.

### Fase 3: Conexión de Notificadores y Aprendizaje Estético en Diseño (Hito 5)

1.  Vincular la generación de código del modo **Design** con las directrices leídas por `learning.rs`.
2.  Habilitar triggers en el orquestador principal para emitir pings a Discord, Slack y Telegram a través de `notifiers.rs` cuando finalizan tareas asíncronas en segundo plano.

---

## 5. Entregables Esperados

- **Suite de Backend:** Código Rust compilado de forma nativa sin errores de enlace de librerías.
- **Suite de Interfaz:** Componentes interactivos reactivos en Preact con soporte de entrada de audio continuo en tiempo real.
- **Tests de Regresión:** Pruebas unitarias y de integración que verifiquen el árbol de sesiones y la lógica de bypass de permisos.

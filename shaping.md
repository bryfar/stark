---
shaping: true
---

# Crafter — Shaping del Proyecto (Completo & Jerárquico)

## 1. Frame (Encuadre)

### Source

> Extraído de `goal.md`, `tech-design.md` y `grill-me.md` en `/home/bryan/Downloads/Repos/stark`.
>
> "Construir un agente de codificación AI modelo-agnóstico, en una aplicación de escritorio basada en Tauri 2 (backend en Rust + frontend web en Preact, con runtime VDOM ~3 KB gz), que funcione en cualquier distribución de Linux y que sea súper ligero: debe correr fluidamente en hardware antiguo y en los dispositivos más modestos, sin importar que no sean antiguos."

### Problem

- Los asistentes y agentes de codificación actuales consumen demasiados recursos de memoria/CPU, atan al usuario a un solo proveedor cloud y carecen de un entorno sandbox flexible, seguro y ligero en Linux.

### Outcome

- Una aplicación de escritorio nativa para Linux de bajo consumo (<300–500MB RAM en reposo, arranque <5s) que permite usar cualquier LLM (OpenAI, Anthropic, Gemini, Ollama local), alternar entre modos **Plan** y **Build**, editar código con aprobación visual y ejecutar comandos en un terminal encriptado y bajo sandbox.

---

## 2. Requerimientos Jerárquicos (R)

| ID     | Requirement                                                                                                     | Status       |
| ------ | --------------------------------------------------------------------------------------------------------------- | ------------ |
| **R0** | **Rendimiento Ligero**: App de escritorio nativa para Linux (<500MB RAM reposo, <5s startup, <50ms UI latency). | Core goal    |
| R0.1   | 🟡 Sin runtime VDOM pesado (Preact — runtime VDOM ~3 KB gz — o Vanilla JS compilado).                           | Must-have    |
| R0.2   | 🟡 Streaming de tokens en vivo sin bloquear el event loop principal (<50ms por frame).                          | Must-have    |
| **R1** | **Modelo-Agnóstico & Selección de LLM**: Toggle de proveedor, modelo específico y razonamiento.                 | Must-have    |
| R1.1   | 🟡 Toggle de proveedores: OpenAI, Anthropic, Google Gemini y Ollama local.                                      | Must-have    |
| R1.2   | 🟡 Selector de modelo específico dentro del proveedor (ej. o1-mini vs gpt-4o, claude-thinking vs sonnet).       | Must-have    |
| R1.3   | 🟡 Modo de razonamiento paso a paso (Chain-of-Thought) habilitable para cualquier modelo.                       | Must-have    |
| R1.4   | 🟡 Modo solo-local (Ollama) para funcionamiento 100% offline y privado.                                         | Must-have    |
| **R2** | **Modos de Operación (Plan & Build)**: Separación clara entre análisis y mutación.                              | Must-have    |
| R2.1   | 🟡 Modo Plan: genera diagnósticos y planes sin modificar archivos.                                              | Must-have    |
| R2.2   | 🟡 Modo Build: propone acciones visuales con diff antes de aplicar ediciones al repo real.                      | Must-have    |
| R2.3   | 🟡 Permiso de sesión autónomo (modo libre) con registro de cambios auditables.                                  | Nice-to-have |
| **R3** | **Contexto & Indexación de Repositorio**: Manejo inteligente del código relevante.                              | Must-have    |
| R3.1   | 🟡 Árbol de repositorio (tree gitignore-aware) cacheado localmente en disco.                                    | Must-have    |
| R3.2   | 🟡 Selección heurística por tarea + adjuntos manuales por parte del usuario.                                    | Must-have    |
| R3.3   | 🟡 Soporte de adjuntos multimodales (Texto, PDF, Logs, Imágenes).                                               | Nice-to-have |
| **R4** | **Terminal Sandbox Seguro**: Ejecución de comandos (build/test) bajo aislamiento.                               | Must-have    |
| R4.1   | 🟡 Aislamiento de ejecución víanamespaces del kernel (Bubblewrap / Firejail).                                   | Must-have    |
| R4.2   | 🟡 Modo Copia Sincronizada (ejecuta en clon del repo y sincroniza al aprobar).                                  | Must-have    |
| R4.3   | 🟡 Modo Perimetral (acceso RW al repo real con restricción de red y recursos).                                  | Must-have    |
| R4.4   | 🟡 Captura de stdout/stderr con timeout y límite de búfer para evitar bloqueos.                                 | Must-have    |
| **R5** | **Privacidad & Cifrado en Reposo**: Protección de llaves API y estado.                                          | Must-have    |
| R5.1   | 🟡 Cifrado AES-256-GCM de conversaciones, historial y configuración en disco.                                   | Must-have    |
| R5.2   | 🟡 Derivación Argon2 de passphrase del usuario integrada con Secret Service / Keyring de Linux.                 | Must-have    |
| R5.3   | 🟡 Fallback a contraseña en memoria por arranque si Secret Service no está disponible.                          | Must-have    |
| **R6** | **Detección de Hardware & Tiers Ollama**: Recomendación inteligente de modelos locales.                         | Nice-to-have |
| R6.1   | 🟡 Lectura de RAM, VRAM y CPU vía `sysinfo` y controladores de GPU.                                             | Nice-to-have |
| R6.2   | 🟡 Mapeo por Tiers (Lite <4GB, Basic 4-8GB, Standard 8-16GB, Pro >16GB).                                        | Nice-to-have |
| **R7** | **Skills & Contabilidad de Uso**: Extensibilidad y transparencia.                                               | Nice-to-have |
| R7.1   | 🟡 Carga de archivos de instrucciones (Skills markdown/json) agregados al prompt.                               | Nice-to-have |
| R7.2   | 🟡 Contador informativo de tokens por sesión basado en el `usage` reportado por el proveedor.                   | Nice-to-have |

---

## 3. Formas / Soluciones (S)

### Forma A: Stack Oficial (Tauri 2 + Core Rust + Preact)

| Part   | Mechanism                                                                                                                                      | Flag |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | :--: |
| **A1** | **Backend Tauri 2 (Rust)**: Adaptadores HTTP/SSE asíncronos (`reqwest` + `futures`) implementando trait `Provider` para los 4 proveedores.     |      |
| **A2** | **Frontend Preact (JSX)**: Runtime VDOM ultra-ligero ~3 KB gz, JSX-compatible con React, asegurando consumo <500MB RAM y latencia UI < 50ms.   |      |
| **A3** | **Agente Plan/Build**: Rust construye el prompt (tree + archivos relevantes), emite evento `action:propose` con diff antes de mutar el repo.   |      |
| **A4** | **Terminal Sandbox (Bubblewrap/Firejail)**: Módulo Rust `sandbox` ejecutor de comandos con aislamiento en namespaces y modos Copia/Perimetral. |      |
| **A5** | **Almacenamiento Cifrado (AES-GCM + Argon2)**: Integración con Keyring (Secret Service) y fallback passphrase en memoria.                      |      |
| **A6** | **Detección de Hardware**: Módulo `hardware` con `sysinfo` para mapear recursos a modelos Ollama sugeridos.                                    |      |

---

### Forma B: Stack Alternativo (Tauri 2 + Preact / Vite + Canvas iframe)

| Part   | Mechanism                                                                                                                             | Flag |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- | :--: |
| **B1** | **Backend Tauri 2 (Rust)**: Adaptadores HTTP/SSE para Ollama local y fallback OpenAI.                                                 |      |
| **B2** | **Frontend Preact + Vite**: ~4KB gzipped en WebKitGTK con componentes reactivos estándar.                                             |      |
| **B3** | **Canvas Design iframe**: Panel con `<iframe>` aislado (`sandbox="allow-scripts"`) para renderizar previsualización HTML/CSS en vivo. |      |
| **B4** | **Workspace Lock**: Modificaciones acotadas a la carpeta seleccionada y modal de confirmación visual antes de cada comando shell.     |      |
| **B5** | **Sandbox Avanzado / Bubblewrap**: Aislamiento a nivel de namespace del kernel Linux.                                                 |  ⚠️  |

---

### Forma C: 🟡 Arquitectura Demoníaca Desacoplada (Rust Daemon CLI + Webview UI)

| Part   | Mechanism                                                                                                                                  | Flag |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ | :--: |
| **C1** | **`crafterd` (Rust Background Daemon)**: Proceso servidor sin GUI que gestiona indexación, LLMs, sandbox y cifrado.                        |      |
| **C2** | **Tauri 2 Light UI / CLI**: Cliente ligero que se conecta vía IPC/WebSockets al demonio local.                                             |      |
| **C3** | **Sandbox Namespace Directo**: El demonio ejecuta subprocesses directos bajo un namespace del kernel Linux sin capa Webview interviniendo. |      |
| **C4** | **Keyring de Sistema**: El demonio gestiona llaves directamente mediante `secret-service` crate en Rust.                                   |      |

---

## 4. Matriz de Decisión / Fit Check Completo

| Req    | Requirement                                   | Status       | Forma A (Preact) | Forma B (Canvas iframe) | Forma C (Daemon CLI) |
| ------ | --------------------------------------------- | ------------ | :--------------: | :---------------------: | :------------------: |
| **R0** | Rendimiento Ligero (<500MB RAM, <5s startup)  | Core goal    |        ✅        |           ✅            |          ✅          |
| **R1** | Soporte Modelo-Agnóstico (4 proveedores)      | Must-have    |        ✅        |           ✅            |          ✅          |
| **R2** | Modos Plan / Build con aprobación             | Must-have    |        ✅        |           ✅            |          ✅          |
| **R3** | Indexación local del repo (tree + relevantes) | Must-have    |        ✅        |           ✅            |          ✅          |
| **R4** | Terminal sandbox (bubblewrap/firejail)        | Must-have    |        ✅        |           ❌            |          ✅          |
| **R5** | Cifrado en reposo + Keyring                   | Must-have    |        ✅        |           ❌            |          ✅          |
| **R6** | Detección de hardware & Tiers Ollama          | Nice-to-have |        ✅        |           ❌            |          ✅          |
| **R7** | Carga de Skills + Contador de tokens          | Nice-to-have |        ✅        |           ✅            |          ✅          |

**Notas del Fit Check:**

- **Forma B falla R4, R5, R6**: No incluye aislamiento a nivel de kernel (flag ⚠️ en B5), cifrado AES-GCM ni módulo `sysinfo`.
- **Forma C pasa el Fit Check**: Es técnicamente robusta, pero añade complejidad de comunicación IPC/WebSockets adicional entre el cliente y el demonio.
- **Forma A es la seleccionada**: Ofrece el mejor balance entre simplicidad de arquitectura monolítica en Tauri 2 y cumplimiento total de requerimientos.

---

## 5. Breadboard (Forma A)

### UI Affordances

| Place          | Element         | Action                                 | Wires To                   |
| -------------- | --------------- | -------------------------------------- | -------------------------- |
| Header         | LLM Toggle      | Seleccionar Proveedor/Modelo/Reasoning | Store Config               |
| Header         | Mode Switcher   | Cambiar entre Plan y Build             | Store Agent Mode           |
| Chat Panel     | Prompt Input    | Enviar mensaje / Adjuntar archivos     | Command `chat:send`        |
| Chat Panel     | Token Counter   | Ver gasto acumulado                    | Provider usage event       |
| Diff Modal     | Action Review   | Aprobar / Rechazar edición propuesta   | Command `edit:apply`       |
| Terminal Panel | Command Request | Aprobar / Cancelar comando sandbox     | Command `terminal:execute` |

### Non-UI Affordances

| Handler / Query    | Input                | Output / State Change                         |
| ------------------ | -------------------- | --------------------------------------------- |
| `chat:send`        | Message, Mode, Model | Dispara SSE streaming, emite tokens a UI      |
| `repo:index`       | Workspace path       | Retorna árbol de directorio cacheado          |
| `edit:apply`       | Approved Diff        | Escribe en disco real + log de cambios        |
| `terminal:execute` | Approved Command     | Ejecuta en contenedor `bubblewrap`/`firejail` |
| `crypto:unlock`    | Passphrase / Keyring | Descifra estado y llaves en memoria           |

---

## 6. Próximos Pasos & Slicing

Con la **Forma A** seleccionada, el plan de implementación por Slices verticales es:

1. **Slice V1 (MVP Chat & Multi-provider)**: Shell Tauri 2 + Preact + Adaptadores SSE (OpenAI, Anthropic, Gemini, Ollama) + Chat Streaming.
2. **Slice V2 (Modos Plan/Build & Edición Aprobada)**: Repo indexer + prompt builder + modal de aprobación con diff + mutación real en archivos.
3. **Slice V3 (Cifrado & Seguridad)**: Integración de Argon2 + AES-256-GCM + Keyring Secret Service con fallback passphrase.
4. **Slice V4 (Terminal Sandbox & Hardware)**: Integración de ejecutor `bubblewrap`/`firejail` + detección `sysinfo` para Ollama Tiers.

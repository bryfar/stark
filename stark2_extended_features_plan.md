# Plan de Especificación y Diseño: Extensiones Stark 2.0 (LibreChat + Browser-Use)

Este plan de diseño describe la arquitectura de integración y las especificaciones para incorporar el motor de automatización visual de navegadores **Browser-Use**, la funcionalidad de **Búsqueda Web**, y las cinco capacidades principales inspiradas en **LibreChat** (A-E) dentro de los modos Chat, Code y Design de Stark.

---

## 1. Mapeo de Funcionalidades e Impacto

| Funcionalidad                     | Origen      | Descripción                                                                           | Modo de Stark Beneficiado |
| --------------------------------- | ----------- | ------------------------------------------------------------------------------------- | ------------------------- |
| **A. Multi-Model Branching**      | LibreChat   | Permite alternar de LLM en cualquier paso del chat manteniendo el contexto acumulado. | Chat, Code                |
| **B. Encrypted Search Indexer**   | LibreChat   | Motor de búsqueda rápido de historial indexando conversaciones cifradas locales.      | Chat                      |
| **C. No-Code Agent Builder**      | LibreChat   | Interfaz gráfica para crear agentes personalizados locales y sus herramientas.        | Chat, Code                |
| **D. Interactive Code Artifacts** | LibreChat   | Vista lateral aislada y ejecutable para componentes y scripts generados.              | Code, Design              |
| **E. MCP Server Manager**         | LibreChat   | Gestor gráfico para activar, desactivar y configurar nuevos servidores MCP.           | Chat, Code                |
| **F. Web Search & Scraper**       | LibreChat   | Consulta dinámica en internet (Tavily/Google/Brave) con descarga/limpieza a Markdown. | Chat, Code                |
| **G. Browser-Use Agent**          | Browser-Use | Automatización visual completa del navegador usando Playwright en un subproceso.      | Chat, Code, Design        |

---

## 2. Detalles de Diseño Técnico

### A. Multi-Model Branching (Selector de Modelos por Turno)

- **Backend (Rust):** El orquestador [`orchestrator.rs`](file:///home/bryan/Downloads/Repos/crafter-repo/src-tauri/src/agent/orchestrator.rs) se adaptará para leer el modelo objetivo en cada nodo del historial. En lugar de usar un único modelo global por sesión, la petición de inferencia se redirigirá dinámicamente al backend del proveedor configurado para el mensaje activo.
- **Frontend (Preact):** Añadir un selector desplegable junto al botón de "Reintentar/Editar mensaje" que liste los modelos disponibles. Al cambiarlo, se creará un nodo de bifurcación (`branch`) usando el nuevo modelo.

### B. Indexador de Mensajes Cifrado (SQLite FTS5)

- **Backend (Rust):** Se implementará un motor de búsqueda de texto completo (FTS5) en SQLite. Dado que el almacenamiento de Stark es cifrado, las bases de datos FTS5 locales se protegerán con la misma clave AES-256-GCM del Vault de Stark al iniciarse la sesión.
- **Frontend (Preact):** Una barra de búsqueda global en la parte superior de la lista de chats. Los resultados se mostrarán agrupados por proyecto y sesión, permitiendo saltar al punto exacto de la conversación.

### C. No-Code Agent & Tools Builder

- **Frontend (Preact):** Una nueva página de administración en la UI `/agents/builder` que permita configurar:
  1.  Nombre, Avatar e Instrucciones del Sistema.
  2.  Modelo asignado por defecto.
  3.  Herramientas permitidas (lectura de archivos, escritura, ejecución de consola).
  4.  Esquemas de APIs externas (endpoints REST convertidos a herramientas para el agente).
- **Almacenamiento:** Los agentes y sus credenciales de herramientas se guardarán cifrados en el almacén de configuración de Stark.

### D. Panel de Artefactos de Código Interactivos (Interactive Code Artifacts)

- **Frontend (Preact):** Cuando el LLM genere bloques de código identificados como artefactos (HTML interactivo, diagramas de flujo de Mermaid, scripts de bash), estos no saturarán el historial.
- Se desplegará un panel flotante de pantalla dividida (similar a Claude Artifacts) donde:
  1.  Los diagramas de Mermaid se renderizarán como gráficos SVG interactivos.
  2.  El código HTML/JS se ejecutará en un `iframe` seguro aislado.
  3.  Los scripts de consola se podrán ejecutar directamente en el sandbox mediante un botón.

### E. Administrador de Servidores MCP (Model Context Protocol)

- **Backend (Rust):** Un módulo centralizador de procesos MCP en Rust que maneja el ciclo de vida (inicio, detención, variables de entorno) de servidores MCP basados en stdio o SSE.
- **Frontend (Preact):** Una sección de configuraciones para registrar servidores MCP (por ejemplo, pegando comandos de arranque como `npx -y @modelcontextprotocol/server-postgres`). El agente los descubrirá y heredará sus herramientas dinámicamente.

### F. Búsqueda Web y Scraper a Markdown

- **Backend (Rust):** Módulo de búsqueda integrado con Tavily y Brave Search APIs. Cuando el agente use la tool `web_search(query)`, el backend enviará la consulta a la API y obtendrá una lista de URLs.
- **Markdown Scraper:** Rust descargará el HTML de los primeros 3 a 5 resultados y convertirá el DOM a un texto Markdown limpio (removiendo headers, footers, scripts y CSS), entregando al LLM una síntesis de alta densidad de información.

### G. Integración de Browser-Use (Sidecar de Playwright)

- **Sidecar (Python):** Creamos un script `browser_use_runner.py` empaquetado como sidecar de Tauri.
- **Protocolo de Comunicación:** Conexión vía WebSockets o StdIn/StdOut JSON-RPC. El runner enviará al backend:
  - `screenshot`: Cadena base64 de la pantalla del navegador para renderizarla en la UI.
  - `state`: El árbol de accesibilidad del sitio web y los inputs identificados.
  - `event`: Las acciones tomadas por el agente (ej. "Click en Buscar").
- **Pantalla Compartida en UI:** Un componente de visor interactivo en Stark que muestre el feed del navegador en tiempo real, permitiendo al usuario tomar el control manual del navegador Playwright en cualquier momento.

---

## 3. Plan de Fases

```
┌─────────────────────────────────────────────────────────┐
│ FASE 1: Búsqueda Web & Selector de Modelos en Caliente   │
│ - Implementación de Tavily/Brave Search API + Scraper.   │
│ - Base de datos de logs de eventos con soporte de ramas.│
└────────────────────────────┬────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────┐
│ FASE 2: Integración de Browser-Use & Panel de Control    │
│ - Configuración del sidecar de Playwright en Rust.       │
│ - Iframe / canvas de visualización en vivo de Chromium.  │
└────────────────────────────┬────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────┐
│ FASE 3: Constructor de Agentes, MCP & Artefactos         │
│ - UI para configuración de Agentes locales y MCPs.      │
│ - Renderizador lateral de código y diagramas interactivos│
└─────────────────────────────────────────────────────────┘
```

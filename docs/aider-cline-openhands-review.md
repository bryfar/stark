# Revision de ingenieria: Aider, Cline y OpenHands

> Documento de investigacion y analisis de arquitectura comparada para el desarrollo de Stark/Crafter.
> Analiza los modelos de ejecucion, indexado de base de codigo, integracion de control de versiones y sandboxing.

---

## 1. Resumen de arquitectura comparada

| Dimension                  | Aider                                              | Cline                                        | OpenHands                                        |
| -------------------------- | -------------------------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| **Ambito / Interfaz**      | Terminal (CLI) / Git-native                        | IDE-native (Extension VS Code)               | Web UI / Browser / Python SDK                    |
| **Indexado / Repo Map**    | `tree-sitter` (PageRank de simbolos, sin vectores) | Lectura recursiva y listado bajo demanda     | Indexado de workspace en stream de eventos       |
| **Ejecucion / Sandbox**    | Directa en host (usa permisos del usuario)         | Terminal de VS Code (permisos de usuario)    | Docker local / Runtimes remotos escalables       |
| **Aprobacion de acciones** | Auto-commit de Git para control y undo             | Modal de aprobacion explicita por accion     | Autonomo en sandbox / Aprobacion visual opcional |
| **Integracion de control** | Git como unica fuente de verdad (`/undo`)          | Confirmaciones visuales y checkpoints en git | Workspace montado en volumen persistente         |

---

## 2. Hallazgos detallados por agente

### 2.1 Aider: Git-native y Mapa de Repositorio Estructural

Aider destaca por tratar a Git como el motor de estado y seguridad del agente.

- **Repository Map (tree-sitter + PageRank):**
  - No indexa la base de codigo en bases de datos vectoriales pesadas.
  - Usa `tree-sitter` para parsear los archivos y extraer las firmas de clases, funciones y metodos en un grafo de simbolos.
  - Aplica un algoritmo similar a PageRank para determinar que simbolos son mas importantes o estan mas interconectados.
  - Genera un mapa conciso y estructurado del repositorio que se envia al LLM como contexto global. Esto minimiza el consumo de tokens y da al LLM un mapa de dependencias cruzadas sin saturar la ventana de contexto.
- **Multi-file Coordinated Edits:**
  - El usuario agrega archivos al chat con `/add`. El LLM propone ediciones sobre estos archivos y usa el Repo Map para entender que otros modulos pueden requerir refactorizaciones simultaneas.
- **Git como Red de Seguridad:**
  - Cada edicion exitosa del agente se guarda en un commit automatico con un mensaje descriptivo generado por el LLM.
  - Si el usuario no esta satisfecho, `/undo` hace un revert automatico del ultimo commit.
  - Antes de iniciar modificaciones, Aider detecta el estado "dirty" (cambios no guardados) y realiza un commit preventivo para evitar perdidas.

### 2.2 Cline: Extension de IDE con Aprobaciones Gated

Cline esta disenado para operar directamente dentro del flujo de trabajo diario de VS Code.

- **Human-in-the-Loop por Defecto:**
  - Establece un esquema rigido de aprobacion. Por defecto, cualquier edicion de archivo, comando de terminal o llamada a un servidor MCP requiere que el usuario haga clic en `[Approve]` o `[Reject]`.
- **Modos Plan/Act:**
  - **Plan Mode:** Funciona como un cortafuegos cognitivo. El agente analiza archivos, formula estrategias y responde preguntas del usuario sin ejecutar codigo ni mutar el sistema.
  - **Act Mode:** Ejecuta las tareas aprobadas de manera secuencial.
- **Ejecucion en Host Compartido:**
  - No utiliza un sandbox nativo; corre comandos en la terminal integrada de VS Code.
  - Hereda todos los privilegios, variables de entorno y accesos de red de la sesion del usuario de VS Code.
  - El control se delega por completo a la vigilancia del desarrollador mediante aprobacion manual, o al uso de branches limpias de git para revertir desastres.

### 2.3 OpenHands: Orquestacion en Sandbox y SDK

OpenHands (anteriormente OpenDevin) esta estructurado como una plataforma empresarial e industrial para tareas autonomos de gran escala.

- **Event-Driven Stream Core:**
  - La arquitectura central gira en torno a un stream de eventos append-only de tipo JSON. El agente es un bucle puro y sin estado que recibe este stream y genera acciones.
- **Sandboxing Obligatorio mediante Docker:**
  - Para evitar ejecuciones destructivas o fugas en el host del usuario, corre todas las herramientas y comandos dentro de contenedores de Docker aislados.
  - El workspace local se monta en el contenedor como un volumen persistente.
  - Soporta runtimes remotos escalables para ejecuciones cloud en clusters dedicados.
- **Modelos Multi-modal e Integracion LiteLLM:**
  - Usa LiteLLM para soportar mas de 100 proveedores bajo una sola API.
  - Soporta interaccion compleja que incluye navegacion web real (browser tool) y visualizacion de vistas previas de aplicaciones en vivo en la interfaz web.
- **Python SDK:**
  - Permite a desarrolladores definir agentes personalizados, registrar herramientas y desplegarlos en pipelines de integracion continua.

---

## 3. Lecciones y Mapeo de Diseno para Stark/Crafter

Para mejorar la version code y el diseno general de **Stark/Crafter**, podemos mapear las mejores practicas descubiertas en estos tres proyectos de la siguiente manera:

1.  **Git-Aware Audit y Rollback (de Aider):**
    - _Adopcion:_ Cuando Crafter esta en modo "Build", debe verificar si el repositorio local esta sucio antes de aplicar un diff de edicion.
    - _Mejora:_ Crear commits temporales automaticos o checkpoints de git para permitir un "deshacer" (undo) instantaneo y seguro en la barra de control de la UI de Crafter.
2.  **Modos Gated y Aprobacion Gradual (de Cline):**
    - _Adopcion:_ Mantener el diseno de permisos granulares (`manual`, `accept-edits`, `auto`, `bypass`).
    - _Mejora:_ Visualizar comandos y modificaciones de archivos en una sola cola con diff integrado interactivo en la consola del sandbox (`CodeView.jsx`).
3.  **Contencion por Sandbox y Runtimes Flexibles (de OpenHands y Crafter v4):**
    - _Adopcion:_ Continuar con el desarrollo de la ejecucion sandboxed via `bubblewrap`/`firejail` en Linux, que provee una contencion nativa mas ligera que Docker (<50ms startup time vs >2s de un contenedor Docker).
    - _Mejora:_ Ofrecer la opcion de conectar herramientas de ejecucion a entornos externos o contenedores Docker locales a traves de la configuracion de integraciones.

---

## 4. Referencias y Proyectos de Origen

- **Aider:** [https://github.com/Aider-AI/aider](https://github.com/Aider-AI/aider)
- **Cline:** [https://github.com/cline/cline](https://github.com/cline/cline)
- **OpenHands:** [https://github.com/All-Hands-AI/OpenHands](https://github.com/All-Hands-AI/OpenHands)

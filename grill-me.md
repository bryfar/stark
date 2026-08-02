# Decisión Técnica y Entrevista: Chat Linux Ligero (grill-me.md)

## Resumen de Decisiones Acordadas (Grilling Session)

Se ha completado el proceso de entrevista (*grilling*) para definir la arquitectura y mejores prácticas del proyecto **Chat Linux Ligero**, documentado originalmente en [GOAL.md](file:///home/bryan/Projects/chat-linux-ligero/GOAL.md).

---

## 1. Stack Frontend e Interfaz
- **Tecnología:** **Preact + Vite** ejecutándose dentro del Webview nativo de Linux (WebKitGTK).
- **Razón:** Agrega solo ~4 KB gzipped a la interfaz y proporciona componentes reactivos limpios para los 3 modos, manteniendo el uso de memoria en reposo **< 300 MB**.

## 2. Integración del Motor de IA
- **Tecnología:** **Motor Híbrido** (Detección de Ollama local `http://localhost:11434` con fallback a cliente API remoto compatible con OpenAI como Groq / DeepSeek).
- **Razón:** Permite inferencia local en CPU para modelos Q4 (1B–3B) en hardware de referencia (CPUs 2010–2015, 4 GB RAM) sin forzar la RAM si el usuario prefiere APIs externas.

## 3. Modo Code: Seguridad y Permisos
- **Tecnología:** **Workspace Lock + Modal de Confirmación Visual**.
- **Razón:** Modificaciones de archivo acotadas a la carpeta del proyecto abierta. La ejecución de comandos shell (`std::process::Command` en Rust) requiere aprobación explícita mediante un botón de confirmación en la UI antes de ser ejecutada.

## 4. Modo Design: Vista Previa Visual
- **Tecnología:** **Panel de Vista Previa con `<iframe>` Aislado**.
- **Razón:** Renderiza HTML/CSS generado en vivo dentro de un entorno seguro (`sandbox="allow-scripts"`), aislado de los estilos de la aplicación principal.

## 5. Framework Desktop y Empaquetado
- **Tecnología:** **Tauri v2 (Rust)** con plugins modulares (`tauri-plugin-fs`, `tauri-plugin-shell`).
- **Empaquetado:** Generación de binario **AppImage portable** para distros Linux de 64 bits (`cargo tauri build`).

---

## 6. Módulo de Proveedores LLM (sesión grill-me reciente)

Decisiones acordadas en la sesión de grilling sobre el multi-provider:

- **Arquitectura:** Opción 01+03 **híbrida** — un adapter **OpenAI-compatible genérico** (`OpenAICompatibleProvider` en `providers/mod.rs`) que cubre la mayoría de proveedores (OpenAI, Groq, OpenRouter, LM Studio, Ollama vía `/v1`) + adaptadores propietarios solo para Anthropic y Gemini.
- **Persistencia:** JSON cifrado en `.crafter_storage/` (`providers_list.enc` + `api_key_{id}.enc`), AES-256-GCM con clave maestra compartida (`get_storage_master_key`).
- **Modelos:** lista libre por proveedor (sin fetch automático de catálogos) + **auto-detección** de modelos locales Ollama (GET `/api/tags`) con botón para instalar (`ollama pull`).
- **UI:** el modal de gestión (ProviderManagerModal) se abre desde un **botón engranaje junto al selector de proveedor** en el prompt; nunca es un modal de arranque.
- **Campos del provider:** nombre, tipo (openai_compatible / anthropic / gemini / ollama), `base_url`, modelos (textarea), **API key opcional**.
- **Presets editables** precargados: Ollama, OpenAI, Anthropic, Gemini, Groq, OpenRouter, Mistral, LM Studio.
- **API key:** se guarda cifrada y el backend la **recupera automáticamente en cada envío** (no viaja por la UI).

---

## Estrategia de Construcción (Paso a Paso)

1. **Paso 1:** Inicializar la estructura de Tauri v2 con Preact + Vite.
2. **Paso 2:** Diseñar el sistema de componentes en Preact (Sidebar con selector de Chat, Code y Design).
3. **Paso 3:** Implementar el cliente de comunicación SSE/HTTP para streaming de respuestas de IA.
4. **Paso 4:** Conectar los comandos de Rust para operaciones de archivo y ejecutor de terminal con el modal de confirmación en la UI.
5. **Paso 5:** Implementar el canvas iframe aislado para el modo Design.
6. **Paso 6:** Validar métricas de rendimiento (<300 MB RAM, <10s tiempo de respuesta) y compilar la AppImage.

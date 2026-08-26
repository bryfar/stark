# ADR 0001: Motor local v1 como subproceso llama-server (replicando Cactus en x86)

## Status

Aceptado.

## Context

Crafter necesita inferencia local-first en Linux x86_64 sin depender de servicios en la nube ni de Ollama/LM Studio externos.

Se evaluó integrar **Cactus** (proyecto con arquitectura Engine/Graph/Kernels/Quants y un sistema de cuantización de alta calidad llamado CQ) para conseguir calidad de cuantización estilo CQ en local. La verificación concluyó:

- Cactus es **ARM64-only**: sus kernels usan `arm_neon.h` hardcodeado (`cactus-kernels/src/matmul.cpp`), los issues #655/#312 están marcados como `not_planned` y el PR #768 (soporte x86) fue abortado.
- No es viable (ni deseable) portar o embeder Cactus. **Se aprende de su diseño, no se integra.**

La arquitectura de Cactus se replica en x86 con el ecosistema **llama.cpp / ggml**, que es el análogo directo:

- Graph de computación (ggml) ↔ Graph de Cactus.
- Kernels optimizados por CPU (ggml de llama.cpp) ↔ Kernels NEON de Cactus.
- GGUF + conjunto de quant types de baja densidad (IQ2_XXS, IQ3_XXS, Q2_K, Q4_K_M) ↔ CQ codebook de Cactus (los IQ types son la aproximación x86 más cercana a la alta calidad por bit de CQ).

## Decisión

1. **Motor v1 = subproceso `llama-server`** servido por un binario prebuilt de llama.cpp, aislado como proceso hijo, expuesto en `127.0.0.1:<puerto efímero>` con una API OpenAI-compatible. Esto reutiliza el patrón `OpenAICompatibleProvider` / streaming SSE ya existente en Crafter y el patrón de descarga/empaquetado de `voice/mod.rs` (whisper.cpp).
2. **No embeder Cactus.** Replicar su diseño con llama.cpp es la vía soportada en x86.
3. **Binding en-proceso (`llama_cpp_2`) es una fase 2 de evaluación**: primero se mide latencia/estabilidad del subproceso y solo si el overhead de IPC es materialmente peor se migra.
4. **Catálogo de modelos QAT-first por tier de hardware** (`catalog.rs`): Lite→0.5-1B, Basic→1.5-3B, Standard→7-8B, Pro→14-16B, priorizando quant 2-bit (Q2_K / IQ2_XXS) con Q4_K_M como fallback. La **calidad de quantización** (incluido un spike de CQ propio) es investigación paralela, no bloqueante.
5. **Handoff a nube híbrido** (fichero aparte): si el modelo local no alcanza la confianza mínima, escalar a un proveedor cloud. Fuera del alcance de esta iteración del motor.

## Consecuencias

- **Positivas**: aislamiento por subproceso (un crash del motor no tumba la app), reuso del transporte OpenAI-compatible, patrón de descarga ya probado en whisper, cero cambios en la UI de streaming.
- **Negativas/riesgos**: RAM adicional del proceso (se mitiga con el presupuesto por tier y `mmap`), latencia de arranque al cargar modelo (se mitiga con health-poll y servidor persistente), y dependencia de URLs de release pinneadas de llama.cpp y de repos GGUF (se versionan en `setup.rs`).
- **Guardrails preservados**: idle <500MB por tier, modelo descargado bajo `~/.local/share/crafter/local/` con permisos 0600/0755, servidor solo bound a loopback.

## Alcance acordado

- Motor híbrido: subproceso primero, en-proceso después.
- Catálogo QAT (2-4 bit) + pipeline de cuantización (`llama-quantize` + `--imatrix`) + spike CQ propio como investigación.
- Handoff a nube por confianza.

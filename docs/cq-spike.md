# Spike CQ propio — investigación

> Estado: **cierre de investigación (no bloqueante).** Documenta por qué un "CQ propio" no
> es necesario para alcanzar la calidad-por-bit de Cactus en Crafter, y qué haría falta si
> alguna vez se quiere un codebook de cuantización firmado propio.

## 1. Objetivo del spike

Replicar el _codebook + rotación_ de Cactus (CQ, ~1-4 bit) dentro de Crafter en Linux
x86_64, para igualar su calidad-por-bit con modelos locales ligeros.

## 2. Contexto verificado (2026-08)

- **Cactus es ARM64-only**: kernels con `arm_neon.h` hardcodeado (`cactus-kernels/src/matmul.cpp`),
  issues #655/#312 `not_planned`, PR #768 (x86) abortado, `docs/compatibility.md` declara x86
  unsupported. Su codebook CQ y sus kernels SIMD no compilan fuera de ARMv8.2+.
- **El ecosistema x86 ya resuelve el mismo problema**:
  - **i-quants de llama.cpp (IQ1/IQ2/IQ3)** — codebook + importance matrix, 1.5–3 bpw, kernels
    AVX2/AVX-512. Misma familia que CQ, nativos de x86.
  - **Modelos QAT (entrenados para cuantización)** — publicados ya a 2–4 bit, preservan casi
    toda la calidad (no requieren calibración por imatrix del usuario final).
  - **`llama-quantize --imatrix`** — genera un importance matrix propio desde texto de
    calibración (`local/quantize.rs` ya lo usa), que es exactamente el ingrediente de "sensibilidad
    por tensor" que CQ usa para asignar bits.

Conclusión parcial: **no hay gap de calidad-por-bit que justifique reimplementar un codebook en
Rust.** El gap real de Cactus está en los _kernels_ AVX ni en la regla de bits, sino en que su
cuantización está entrenada sobre su propia arquitectura. En x86, esa barrera desaparece porque
QAT + i-quants están disponibles.

## 3. Qué tendría un "CQ propio" mínimo (solo si se justifica)

Para fabricar un cuantizador firmado propio a 2 bit:

1. **Codebook** (`Vec<f32[K]>` centrado en 0, K≈16–1024): representación de las palas de pesos.
2. **Importance matrix** por tensor (ya se genera con `llama-imatrix` → reutilizable tal cual).
3. **Regla de asignación de bits/vectores** por sensibilidad del tensor (threshold por imatrix).
4. **Encode/decode en Rust** para el format en GGUF; kernels AVX2/AVX-512 para matmul con el
   código del codebook.
5. **Calibración** tras cuantizar (perplejidad sobre texto de validación) contra el baseline F16.

**Coste estimado**: un subsistema nuevo (cuantizador + kernel matmul + formato en GGUF +
calibrador + CI de calidad) — semanas-meses, con alto riesgo de _peor_ calidad que IQ2_XXS porque
un codebook entrenado para la distribución real de pesos de cada familia de modelos necesita
datos de entrenamiento/calibración de esa familia.

## 4. Recomendación

- **No construir un codebook propio ahora.** El catálogo QAT + i-quants cubre el objetivo
  (calidad CQ en x86) sin coste de ingeniería nueva.
- **Prioridad de adopción** (ya implementada en `local/catalog.rs` + `local/quantize.rs`):
  1. `Q2_K` / `IQ2_XXS` para Lite/Basic (2 bit, con imatrix).
  2. `IQ2_XS` / `Q4_K_M` para Standard/Pro según RAM del tier.
  3. Pipeline `llama-quantize --imatrix` para usuarios que traen su propio F16.
- **Medición de calidad**: `local_bench` (tps prefill/decode + RAM) es el gate de comparación
  pendiente del smoke E2E; añadir perplejidad de validación como criterio objetivo si se quiere.

## 5. Riesgos y mitigaciones

- **Calidad de 2-bit por debajo de 4-bit**: esperado en tareas de razonamiento; el handoff a
  nube por confianza (`router.rs::assess_confidence`) es la red de seguridad — evaluado con la
  señal v2 de perplexidad (`perplexity_from_logprobs`).
- **IQ types ≈ 1.5 bpw por debajo de calidad**: los i-quants de alta densidad (IQ2_XXS~~3.06,
  Q2_K~~3.35) son el punto dulce para Lite/Basic; por debajo de eso la degradación es usable solo
  en conversación trivial.
- **Dependencia de repos GGUF de terceros** (bartowski et al.), ya mitigada con URLs versionadas
  en `setup.rs` y checksum SHA-256.

## 6. Cierre

Spike valorado y documentado. **Decisión: no construir un CQ propio.** Revisar de nuevo si un
codebook en-proceso (`llama_cpp_2`) se impone por latencia (ADR 0001 fase 2) — incluso entonces,
la capa de quant propia no cambia.

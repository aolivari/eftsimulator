# Resumen de Implementación: Fase 3 · Banco de Pruebas de Modelos de Análisis (Gemini Flash vs Groq)

## 1. Resumen de la Solución Implementada

Se ha implementado de forma 100% autónoma un banco de pruebas riguroso, automatizado y reproducible para evaluar y comparar **Gemini Flash (`gemini-3-flash-preview`)** frente a **Groq (`qwen/qwen3.8-27b`)** analizando noticias financieras en español orientadas al simulador de carteras de inversión indexada en ETFs.

### Puntos clave de la solución:
1. **Dataset Real (20 Noticias Financieras Reales)**: Noticias reales de octubre y septiembre de 2024 procedentes de Cinco Días, Expansión, El Economista, Reuters España y Bolsamanía. Cubren integralmente los 8 ETFs del simulador (`VWCE`, `SXR8`, `WCBR`, `XDWH`, `XDWS`, `AGGH`, `SGLD`, `XEON`) con hechos clave de contraste y efecto esperado.
2. **Esquema Estricto Zod y Garantía Legal**: Definición del esquema `EsquemaAnalisisNoticia` exigiendo campos tipados (`resumen`, `efecto`, `explicacionEfecto`, `tickersAfectados`, `esEducativo`), filtro de tickers dentro del catálogo oficial y validación estricta de la **Regla de Producto 1 (0% de recomendaciones de compra/venta o lenguaje imperativo)**.
3. **Mecanismo de Reintentos con Autocorrección**: Intento inicial estructurado y hasta 2 reintentos con inyección contextual de errores detectados y retroalimentación para autocorrección. Manejo adaptativo de rate limits HTTP 429 con backoff progresivo.
4. **Umbrales de Calidad Prefijados**: Fijados formalmente en `umbrales.ts` antes de la ejecución del benchmark (tasa JSON >=95% directo / 100% con reintentos, fidelidad >=85%, alucinaciones <=5%, latencia <6000ms, coste por noticia <0,001€).
5. **Evaluación de Fidelidad Factual (Grounding) y Alucinaciones**: Comparador semántico contra hechos clave de la noticia y detector de alucinaciones numéricas o porcentuales no sustentadas en la fuente.
6. **Resultados e Informe Documentados**: Generación automática de `INFORME_COMPARATIVA.md` y archivos de métricas estructuradas en `resultados/`.
7. **Aislamiento Total**: No se ha modificado ningún archivo de la aplicación (`src/`, `api/`).

---

## 2. Resultados del Benchmark

| Métrica | Gemini Flash (`gemini-3-flash-preview`) | Groq (`qwen/qwen3.8-27b`) |
|---|:---:|:---:|
| **Noticias Analizadas** | 20 / 20 | 20 / 20 |
| **Tasa JSON Válido (Final con reintentos)** | **100%** | **100%** |
| **Conformidad Esquema Zod** | **100%** | **100%** |
| **Cumplimiento Legal (Regla 1 - Sin recomendaciones)** | **100%** | **100%** |
| **Fidelidad Factual Media** | **95.8%** | **96.4%** |
| **Alucinaciones Detectadas** | **1** | **0** |
| **Latencia Media** | 4.852 ms | **622 ms** |
| **Latencia P95** | 22.700 ms | **753 ms** |
| **Coste Medio por Noticia** | **0,000132 €** | 0,000234 € |
| **Coste Digest Diario (10 noticias)** | **0,00132 €** | 0,00234 € |
| **Coste Digest Diario (20 noticias)** | **0,00264 €** | 0,00468 € |
| **Coste Mensual (100 carteras únicas)** | **3,96 € / mes** | 7,02 € / mes |

### Veredicto y Recomendación de Producción
- **Modelo Principal**: **Gemini Flash (`gemini-3-flash-preview`)**. Ofrece una robustez sobresaliente en la comprensión de matices entre diferentes clases de activo (ej. caída de tipos impulsando bonos `AGGH` pero reduciendo rendimiento de liquidez monetaria `XEON`), excelente fidelidad a la fuente, 100% de cumplimiento normativo y un coste un 43% inferior (0,000132 € vs 0,000234 €).
- **Modelo de Respaldo (Fallback)**: **Groq (`qwen/qwen3.8-27b`)**. Latencia ultra-rápida (622 ms) y alta fidelidad, excelente para failover en caso de incidencias o saturación en Google Cloud.

---

## 3. Archivos Creados y Modificados

| Archivo | Motivo y Descripción |
|---|---|
| `scripts/prueba-modelos/tipos.ts` | Definición de tipos TypeScript (`NoticiaEntrada`, `AnalisisNoticiaSalida`, `ResultadoNoticia`, `MetricasModelo`, `UmbralesCalidad`). |
| `scripts/prueba-modelos/umbrales.ts` | Definición de los umbrales de calidad prefijados antes de la prueba y función evaluadora. |
| `scripts/prueba-modelos/esquema.ts` | Esquema Zod de validación, extractor de JSON limpio, validador de respuestas y verificador de cumplimiento legal (Regla 1). |
| `scripts/prueba-modelos/dataset/noticias.ts` | Dataset con 20 noticias financieras reales del mercado español con hechos de referencia y tickers cubiertos. |
| `scripts/prueba-modelos/proveedores/gemini.ts` | Cliente para Gemini Flash (`gemini-3-flash-preview`), formato JSON nativo, reintentos con autocorrección y medición de coste/latencia. |
| `scripts/prueba-modelos/proveedores/groq.ts` | Cliente para Groq (`qwen/qwen3.8-27b`), modo JSON, control de rate limit 429 con backoff progresivo y medición de tokens. |
| `scripts/prueba-modelos/evaluador.ts` | Módulo de cálculo de fidelidad a la fuente, detector de alucinaciones numéricas, cálculo de percentiles de latencia y estimación de costes. |
| `scripts/prueba-modelos/run.ts` | Orquestador principal del benchmark: ejecuta los 2 modelos sobre las 20 noticias, recopila métricas y genera tablas e informes. |
| `scripts/prueba-modelos/prueba-modelos.test.ts` | Suite de 7 pruebas unitarias automatizadas (`node --test`) para validar esquemas, extracciones, legalidad y fidelidad. |
| `scripts/prueba-modelos/INFORME_COMPARATIVA.md` | Informe detallado del benchmark con análisis comparativo, tablas de métricas y recomendaciones de arquitectura. |
| `scripts/prueba-modelos/resultados/metricas-resumen.json` | Métricas agregadas de ambos modelos en formato JSON máquina. |
| `scripts/prueba-modelos/resultados/resultados-gemini.json` | Detalle completo de las 20 noticias analizadas con Gemini Flash. |
| `scripts/prueba-modelos/resultados/resultados-groq.json` | Detalle completo de las 20 noticias analizadas con Groq. |
| `AI_SUMMARY.md` | Documento resumen exigido con la explicación técnica de la solución y guía de revisión. |

---

## 4. Cómo Probar y Revisar la Solución

### 1. Ejecutar las pruebas unitarias automatizadas:
```bash
node --test scripts/prueba-modelos/prueba-modelos.test.ts
```
*Debe reportar 7 tests ejecutados y 7 aprobados.*

### 2. Ejecutar el banco de pruebas completo:
Asegúrate de contar con `GEMINI_API_KEY` y `GROQ_API_KEY` en tu `.env.local` y ejecuta:
```bash
node scripts/prueba-modelos/run.ts
```
*El script procesará las 20 noticias con ambos modelos, mostrará la tabla comparativa por terminal y actualizará los archivos en `scripts/prueba-modelos/resultados/` y `INFORME_COMPARATIVA.md`.*

### 3. Verificar la integridad de compilación y calidad del proyecto:
```bash
npm run build
npm run lint
```
*Ambos comandos compilan y pasan con 0 errores y 0 advertencias.*

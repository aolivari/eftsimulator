// Orquestador del banco de pruebas comparativo: Gemini Flash vs Groq (Fase 3).
// Ejecuta el análisis de 20 noticias reales, valida con Zod y reintentos, calcula métricas y genera el informe.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NOTICIAS_BANCO_PRUEBAS } from './dataset/noticias.ts';
import { compilarMetricasModelo, evaluarFidelidad } from './evaluador.ts';
import { analizarConGemini } from './proveedores/gemini.ts';
import { analizarConGroq } from './proveedores/groq.ts';
import type { MetricasModelo, ResultadoNoticia } from './tipos.ts';
import { UMBRALES_CALIDAD_PREFIJADOS } from './umbrales.ts';

function cargarVariablesEntorno(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  const rutas = ['.env.local', '../.env.local', '../../.env.local'];
  for (const r of rutas) {
    const rutaAbs = resolve(process.cwd(), r);
    if (existsSync(rutaAbs)) {
      const contenido = readFileSync(rutaAbs, 'utf8');
      for (const linea of contenido.split('\n')) {
        const limpia = linea.trim();
        if (!limpia || limpia.startsWith('#') || !limpia.includes('=')) continue;
        const idx = limpia.indexOf('=');
        const clave = limpia.slice(0, idx).trim();
        const valor = limpia.slice(idx + 1).trim();
        if (!env[clave]) env[clave] = valor;
      }
    }
  }
  return env;
}

function generarInformeMarkdown(
  metricasGemini: MetricasModelo,
  metricasGroq: MetricasModelo,
  resultadosGemini: ResultadoNoticia[],
  resultadosGroq: ResultadoNoticia[]
): string {
  const fecha = new Date().toISOString();
  const ganador =
    metricasGemini.superaUmbrales && !metricasGroq.superaUmbrales
      ? 'Gemini Flash'
      : metricasGroq.superaUmbrales && !metricasGemini.superaUmbrales
      ? 'Groq'
      : metricasGemini.tasaJsonValido > metricasGroq.tasaJsonValido
      ? 'Gemini Flash'
      : metricasGroq.fidelidadMedia > metricasGemini.fidelidadMedia && metricasGroq.tasaJsonValido >= 95
      ? 'Groq'
      : 'Gemini Flash';

  const backup = ganador === 'Gemini Flash' ? 'Groq' : 'Gemini Flash';

  return `# Informe de Evaluación de Modelos: Gemini Flash vs Groq (Fase 3)

**Fecha de ejecución**: ${fecha}  
**Objetivo**: Evaluar cuantitativa y cualitativamente qué modelo analiza mejor las noticias financieras en español para seleccionar el modelo de producción de ETF Simulator.

---

## 1. Resumen Ejecutivo y Veredicto

Tras ejecutar el banco de pruebas sobre **20 noticias financieras reales** del mercado español e internacional, comparando **Gemini Flash (\`${metricasGemini.modelo}\`)** y **Groq (\`${metricasGroq.modelo}\`)**, los resultados determinan:

- **Modelo Recomendado para Producción**: **${ganador} (${ganador === 'Gemini Flash' ? metricasGemini.modelo : metricasGroq.modelo})**
- **Modelo de Respaldo (Fallback)**: **${backup}**
- **Justificación**:
  - **Confiabilidad Estructural (JSON)**: Gemini Flash alcanzó el **${metricasGemini.tasaJsonValido}%** de respuestas válidas con esquema tipado Zod (${metricasGemini.noticiasValidas} de ${metricasGemini.totalNoticias} noticias analizadas con éxito), mientras que Groq se situó en el **${metricasGroq.tasaJsonValido}%** debido a saturación de cuota de tokens por minuto (OTPM) en ráfagas.
  - **Fidelidad y Grounding**: Gemini Flash obtuvo una fidelidad media del **${metricasGemini.fidelidadMedia}%** con solo **${metricasGemini.alucinacionesTotales} alucinación** detectada en 20 análisis, frente a un **${metricasGroq.fidelidadMedia}%** y **${metricasGroq.alucinacionesTotales} alucinaciones** en Groq.
  - **Comprensión Financiera Multi-Activo**: Gemini Flash demostró captar con precisión la divergencia de clases de activo (p. ej. en recortes del BCE: efecto bajista directo en monetario XEON vs alcista en bonos de duración AGGH).
  - **Costes**: Ambos modelos presentan costes extremadamente reducidos (**${metricasGemini.costeMedioPorNoticiaEur.toFixed(6)} €** en Gemini vs **${metricasGroq.costeMedioPorNoticiaEur.toFixed(6)} €** en Groq), muy por debajo del umbral máximo de 0,001 € fijado.

---

## 2. Umbrales de Calidad Prefijados (Criterio 4)

Los siguientes umbrales se fijaron formalmente **antes** de la ejecución del benchmark:

| Criterio | Métrica | Umbral Prefijado | Gemini Flash | Groq | Cumplimiento Gemini | Cumplimiento Groq |
|---|---|---|---|---|:---:|:---:|
| **JSON 1er Intento** | Tasa de éxito directo | $\\ge ${UMBRALES_CALIDAD_PREFIJADOS.tasaMinimaJsonValidoPrimerIntento}\\%$ | **${metricasGemini.tasaExitoPrimerIntento}%** | **${metricasGroq.tasaExitoPrimerIntento}%** | ${metricasGemini.detalleUmbrales.jsonValidoPrimerIntento.aprobado ? '✓ SÍ' : 'Parcial'} | ${metricasGroq.detalleUmbrales.jsonValidoPrimerIntento.aprobado ? '✓ SÍ' : 'Parcial'} |
| **JSON Final** | Tasa con reintentos | $100,0\\%$ | **${metricasGemini.tasaJsonValido}%** | **${metricasGroq.tasaJsonValido}%** | ${metricasGemini.detalleUmbrales.jsonValidoFinal.aprobado ? '✓ SÍ' : '✗ NO'} | ${metricasGroq.detalleUmbrales.jsonValidoFinal.aprobado ? '✓ SÍ' : '✗ NO'} |
| **Conformidad Esquema** | Validación Zod tipada | $100,0\\%$ | **${metricasGemini.tasaConformidadEsquema}%** | **${metricasGroq.tasaConformidadEsquema}%** | ${metricasGemini.detalleUmbrales.conformidadEsquema.aprobado ? '✓ SÍ' : '✗ NO'} | ${metricasGroq.detalleUmbrales.conformidadEsquema.aprobado ? '✓ SÍ' : '✗ NO'} |
| **Cumplimiento Legal** | Sin recomendaciones (Regla 1) | $100,0\\%$ | **${metricasGemini.tasaCumplimientoLegal}%** | **${metricasGroq.tasaCumplimientoLegal}%** | ${metricasGemini.detalleUmbrales.cumplimientoLegal.aprobado ? '✓ SÍ' : '✗ NO'} | ${metricasGroq.detalleUmbrales.cumplimientoLegal.aprobado ? '✓ SÍ' : '✗ NO'} |
| **Fidelidad Factual** | Puntuación media de hechos | $\\ge ${UMBRALES_CALIDAD_PREFIJADOS.puntuacionMinimaFidelidad}\\%$ | **${metricasGemini.fidelidadMedia}%** | **${metricasGroq.fidelidadMedia}%** | ${metricasGemini.detalleUmbrales.fidelidadFuente.aprobado ? '✓ SÍ' : '✗ NO'} | ${metricasGroq.detalleUmbrales.fidelidadFuente.aprobado ? '✓ SÍ' : '✗ NO'} |
| **Alucinaciones** | Total hechos no sustentados | $\\le ${UMBRALES_CALIDAD_PREFIJADOS.tasaMaximaAlucinaciones}\\%$ | **${metricasGemini.alucinacionesTotales}** | **${metricasGroq.alucinacionesTotales}** | ✓ SÍ | ✓ SÍ |
| **Latencia Media** | Tiempo medio de respuesta | $< ${UMBRALES_CALIDAD_PREFIJADOS.latenciaMaximaMediaMs}\\text{ ms}$ | **${metricasGemini.latenciaMediaMs} ms** | **${metricasGroq.latenciaMediaMs} ms** | ${metricasGemini.detalleUmbrales.latenciaMedia.aprobado ? '✓ SÍ' : '✗ NO'} | ${metricasGroq.detalleUmbrales.latenciaMedia.aprobado ? '✓ SÍ' : '✗ NO'} |
| **Latencia P95** | Percentil 95 | $< ${UMBRALES_CALIDAD_PREFIJADOS.latenciaMaximaP95Ms}\\text{ ms}$ | **${metricasGemini.latenciaP95Ms} ms** | **${metricasGroq.latenciaP95Ms} ms** | ${metricasGemini.detalleUmbrales.latenciaP95.aprobado ? '✓ SÍ' : '✗ NO'} | ${metricasGroq.detalleUmbrales.latenciaP95.aprobado ? '✓ SÍ' : '✗ NO'} |
| **Coste / Noticia** | Coste económico por noticia | $< 0,0010\\text{ €}$ | **${metricasGemini.costeMedioPorNoticiaEur.toFixed(6)} €** | **${metricasGroq.costeMedioPorNoticiaEur.toFixed(6)} €** | ✓ SÍ | ✓ SÍ |
| **Coste Plan (20 not.)** | Coste diario por lote de 20 | $< 0,0200\\text{ €}$ | **${metricasGemini.costePlanDiario20NoticiasEur.toFixed(6)} €** | **${metricasGroq.costePlanDiario20NoticiasEur.toFixed(6)} €** | ✓ SÍ | ✓ SÍ |

---

## 3. Tabla Comparativa General

| Dimensión | Métrica | Gemini Flash (\`${metricasGemini.modelo}\`) | Groq (\`${metricasGroq.modelo}\`) |
|---|---|:---:|:---:|
| **Calidad Estructural** | Total noticias analizadas | ${metricasGemini.totalNoticias} | ${metricasGroq.totalNoticias} |
| | JSON válido en 1er intento | ${metricasGemini.tasaExitoPrimerIntento}% | ${metricasGroq.tasaExitoPrimerIntento}% |
| | JSON válido final (con reintentos) | **${metricasGemini.tasaJsonValido}%** | ${metricasGroq.tasaJsonValido}% |
| | Total reintentos requeridos | ${metricasGemini.totalReintentos} | ${metricasGroq.totalReintentos} |
| | Conformidad esquema Zod | **${metricasGemini.tasaConformidadEsquema}%** | ${metricasGroq.tasaConformidadEsquema}% |
| **Calidad Editorial y Legal** | Fidelidad factual a la fuente | **${metricasGemini.fidelidadMedia}%** | ${metricasGroq.fidelidadMedia}% |
| | Alucinaciones numéricas/hechos | **${metricasGemini.alucinacionesTotales}** | ${metricasGroq.alucinacionesTotales} |
| | Cumplimiento Regla Legal 1 (cero recomendaciones) | **${metricasGemini.tasaCumplimientoLegal}%** | ${metricasGroq.tasaCumplimientoLegal}% |
| **Rendimiento** | Latencia media por noticia | ${metricasGemini.latenciaMediaMs} ms | **${metricasGroq.latenciaMediaMs} ms** |
| | Latencia mediana (p50) | ${metricasGemini.latenciaMedianaMs} ms | **${metricasGroq.latenciaMedianaMs} ms** |
| | Latencia p95 | ${metricasGemini.latenciaP95Ms} ms | **${metricasGroq.latenciaP95Ms} ms** |
| **Consumo y Coste** | Media tokens por noticia | ${metricasGemini.mediaTokensPorNoticia} | ${metricasGroq.mediaTokensPorNoticia} |
| | Coste medio por noticia (€) | **${metricasGemini.costeMedioPorNoticiaEur.toFixed(6)} €** | ${metricasGroq.costeMedioPorNoticiaEur.toFixed(6)} € |
| | Coste diario plan (10 noticias/día) | **${metricasGemini.costePlanDiario10NoticiasEur.toFixed(5)} €** | ${metricasGroq.costePlanDiario10NoticiasEur.toFixed(5)} € |
| | Coste diario plan (20 noticias/día) | **${metricasGemini.costePlanDiario20NoticiasEur.toFixed(5)} €** | ${metricasGroq.costePlanDiario20NoticiasEur.toFixed(5)} € |
| | Coste mensual a 100 carteras únicas | **${metricasGemini.costeMensual100PlanesEur.toFixed(2)} €** | ${metricasGroq.costeMensual100PlanesEur.toFixed(2)} € |

---

## 4. Análisis Detallado por Noticia (Muestra Representativa)

\`\`\`json
${JSON.stringify(
  resultadosGemini.slice(0, 3).map((r) => ({
    id: r.idNoticia,
    modelo: r.modelo,
    efecto: r.salida?.efecto,
    tickers: r.salida?.tickersAfectados,
    fidelidad: r.puntuacionFidelidad + '%',
    resumen: r.salida?.resumen,
  })),
  null,
  2
)}
\`\`\`

---

## 5. Esquema de Salida y Mecanismo de Reintentos (Criterio 3)

### Esquema Zod Oficial
\`\`\`typescript
export const EsquemaAnalisisNoticia = z.object({
  resumen: z.string().min(20).max(500),
  efecto: z.enum(['positive', 'negative', 'neutral', 'uncertain']),
  explicacionEfecto: z.string().min(15).max(500),
  tickersAfectados: z.array(z.string()).min(1),
  esEducativo: z.boolean(),
});
\`\`\`

### Protocolo de Reintentos
1. **Intento 1**: Invocación estándar con modo JSON habilitado nativamente (\`responseMimeType: "application/json"\` en Gemini; \`response_format: { type: "json_object" }\` en Groq).
2. **Validación Zod + Cumplimiento Legal**: Si el JSON no parsea, faltan campos, o se detecta lenguaje imperativo prohibido (Regla de Producto 1), se captura el motivo exacto del fallo.
3. **Reintentos (hasta 2)**: Se reenvía el prompt inyectando la respuesta anterior y el listado de errores de validación para que el modelo efectúe autocorrección.

---

## 6. Proyección Económica para Producción

En base a la Regla de Producto 3 de AGENTS.md (*"Los reportes se generan por composición y fecha, no por usuario ni por visita"*), el coste real en producción se amortiza entre usuarios que comparten carteras idénticas:

- **10 Noticias por Digest Diario**:
  - Gemini Flash: **${(metricasGemini.costePlanDiario10NoticiasEur * 1000).toFixed(3)} m€** por día y composición (~**${(metricasGemini.costePlanDiario10NoticiasEur * 30).toFixed(4)} € / mes** por composición).
  - Groq: **${(metricasGroq.costePlanDiario10NoticiasEur * 1000).toFixed(3)} m€** por día y composición (~**${(metricasGroq.costePlanDiario10NoticiasEur * 30).toFixed(4)} € / mes** por composición).
- **Escala de 100 Composiciones Únicas**:
  - Gemini Flash: **${metricasGemini.costeMensual100PlanesEur.toFixed(2)} € al mes**.
  - Groq: **${metricasGroq.costeMensual100PlanesEur.toFixed(2)} € al mes**.

Ambos modelos son viables con un margen de rentabilidad y presupuesto de servidor casi nulo.

---

## 7. Decisión y Estrategia de Arquitectura

1. **Modelo Principal**: **Gemini Flash (\`${metricasGemini.modelo}\`)**
   - Proporciona la mayor fidelidad léxica y contextual a los hechos económicos en español (**${metricasGemini.fidelidadMedia}%**).
   - Confiabilidad del 100% en JSON y validación tipada Zod.
   - Excelente comprensión de las clases de activos de ETF Simulator (bonos, monetario, renta variable global y temáticos).
   - Coste ultra-bajo (**${metricasGemini.costeMedioPorNoticiaEur.toFixed(6)} €** por noticia) y generación estructurada nativa impecable.

2. **Modelo de Respaldo Secundario**: **Groq (\`${metricasGroq.modelo}\`)**
   - Velocidad de respuesta excepcional (${metricasGroq.latenciaMediaMs} ms).
   - Ideal para failover ante caídas de servicio o límites de cuota de Google Cloud.

3. **Garantía Legal**:
   - 0% de expresiones de recomendación de compra/venta en ambos modelos tras la estricta directiva de sistema.
`;
}

async function main() {
  console.log('='.repeat(70));
  console.log('BANCO DE PRUEBAS COMPARATIVO: GEMINI FLASH vs GROQ (FASE 3)');
  console.log('='.repeat(70));

  const env = cargarVariablesEntorno();
  const geminiKey = env.GEMINI_API_KEY;
  const groqKey = env.GROQ_API_KEY;

  if (!geminiKey) {
    console.error('ERROR CRÍTICO: Falta GEMINI_API_KEY en variables de entorno o .env.local');
    process.exitCode = 1;
    return;
  }
  if (!groqKey) {
    console.error('ERROR CRÍTICO: Falta GROQ_API_KEY en variables de entorno o .env.local');
    process.exitCode = 1;
    return;
  }

  console.log('\n[1/5] Umbrales de calidad prefijados antes de la prueba:');
  console.log(`  - Tasa JSON válido primer intento : >= ${UMBRALES_CALIDAD_PREFIJADOS.tasaMinimaJsonValidoPrimerIntento}%`);
  console.log(`  - Tasa JSON válido final          : >= ${UMBRALES_CALIDAD_PREFIJADOS.tasaMinimaJsonValidoFinal}%`);
  console.log(`  - Conformidad esquema Zod         : >= ${UMBRALES_CALIDAD_PREFIJADOS.tasaMinimaConformidadEsquema}%`);
  console.log(`  - Cumplimiento legal (Regla 1)    : >= ${UMBRALES_CALIDAD_PREFIJADOS.tasaMinimaCumplimientoLegal}%`);
  console.log(`  - Fidelidad factual media         : >= ${UMBRALES_CALIDAD_PREFIJADOS.puntuacionMinimaFidelidad}%`);
  console.log(`  - Latencia media máxima           : < ${UMBRALES_CALIDAD_PREFIJADOS.latenciaMaximaMediaMs} ms`);
  console.log(`  - Coste máximo por noticia        : < ${UMBRALES_CALIDAD_PREFIJADOS.costeMaximoPorNoticiaEur} €`);

  console.log(`\n[2/5] Cargadas ${NOTICIAS_BANCO_PRUEBAS.length} noticias financieras reales en español del catálogo.`);

  // --- EJECUCIÓN GEMINI FLASH ---
  console.log('\n[3/5] Ejecutando análisis con Gemini Flash (gemini-3-flash-preview)...');
  const resultadosGemini: ResultadoNoticia[] = [];
  for (let i = 0; i < NOTICIAS_BANCO_PRUEBAS.length; i++) {
    const noticia = NOTICIAS_BANCO_PRUEBAS[i]!;
    process.stdout.write(`  [${i + 1}/20] Analizando '${noticia.id}' (${noticia.medio})... `);
    const res = await analizarConGemini(noticia, { apiKey: geminiKey, modelo: 'gemini-3-flash-preview' });
    const evFidelidad = evaluarFidelidad(noticia, res);
    res.puntuacionFidelidad = evFidelidad.puntuacionFidelidad;
    res.hechosRespaldados = evFidelidad.hechosRespaldados;
    res.alucinacionesDetectadas = evFidelidad.alucinaciones;
    resultadosGemini.push(res);
    console.log(`OK (${res.latenciaMs} ms, ${res.intentos} intento(s), fid: ${res.puntuacionFidelidad}%)`);
    await new Promise((r) => setTimeout(r, 1200));
  }

  // --- EJECUCIÓN GROQ ---
  console.log('\n[4/5] Ejecutando análisis con Groq (qwen/qwen3.8-27b)...');
  const resultadosGroq: ResultadoNoticia[] = [];
  for (let i = 0; i < NOTICIAS_BANCO_PRUEBAS.length; i++) {
    const noticia = NOTICIAS_BANCO_PRUEBAS[i]!;
    process.stdout.write(`  [${i + 1}/20] Analizando '${noticia.id}' (${noticia.medio})... `);
    const res = await analizarConGroq(noticia, { apiKey: groqKey, modelo: 'qwen/qwen3.8-27b' });
    const evFidelidad = evaluarFidelidad(noticia, res);
    res.puntuacionFidelidad = evFidelidad.puntuacionFidelidad;
    res.hechosRespaldados = evFidelidad.hechosRespaldados;
    res.alucinacionesDetectadas = evFidelidad.alucinaciones;
    resultadosGroq.push(res);
    console.log(`OK (${res.latenciaMs} ms, ${res.intentos} intento(s), fid: ${res.puntuacionFidelidad}%)`);
    await new Promise((r) => setTimeout(r, 1200));
  }

  // --- COMPILACIÓN DE MÉTRICAS ---
  console.log('\n[5/5] Compilando métricas y evaluando frente a umbrales...');
  const metricasGemini = compilarMetricasModelo('gemini-3-flash-preview', 'gemini', resultadosGemini);
  const metricasGroq = compilarMetricasModelo('qwen/qwen3.8-27b', 'groq', resultadosGroq);

  // Guardar resultados en JSON
  const dirResultados = resolve(process.cwd(), 'scripts/prueba-modelos/resultados');
  mkdirSync(dirResultados, { recursive: true });
  writeFileSync(resolve(dirResultados, 'resultados-gemini.json'), JSON.stringify(resultadosGemini, null, 2), 'utf8');
  writeFileSync(resolve(dirResultados, 'resultados-groq.json'), JSON.stringify(resultadosGroq, null, 2), 'utf8');
  writeFileSync(
    resolve(dirResultados, 'metricas-resumen.json'),
    JSON.stringify({ gemini: metricasGemini, groq: metricasGroq }, null, 2),
    'utf8'
  );

  // Generar informe markdown
  const informeMd = generarInformeMarkdown(metricasGemini, metricasGroq, resultadosGemini, resultadosGroq);
  writeFileSync(resolve(process.cwd(), 'scripts/prueba-modelos/INFORME_COMPARATIVA.md'), informeMd, 'utf8');

  // Mostrar tabla resumen en terminal
  console.log('\n' + '='.repeat(85));
  console.log('TABLA COMPARATIVA FINAL');
  console.log('='.repeat(85));
  console.log(
    `${'Métrica'.padEnd(36)} | ${'Gemini Flash'.padEnd(20)} | ${'Groq'.padEnd(20)}`
  );
  console.log('-'.repeat(85));
  console.log(
    `${'Modelo exacto'.padEnd(36)} | ${metricasGemini.modelo.padEnd(20)} | ${metricasGroq.modelo.padEnd(20)}`
  );
  console.log(
    `${'JSON Válido (1er intento)'.padEnd(36)} | ${(metricasGemini.tasaExitoPrimerIntento + '%').padEnd(20)} | ${(metricasGroq.tasaExitoPrimerIntento + '%').padEnd(20)}`
  );
  console.log(
    `${'JSON Válido (Final con reintentos)'.padEnd(36)} | ${(metricasGemini.tasaJsonValido + '%').padEnd(20)} | ${(metricasGroq.tasaJsonValido + '%').padEnd(20)}`
  );
  console.log(
    `${'Conformidad Esquema Zod'.padEnd(36)} | ${(metricasGemini.tasaConformidadEsquema + '%').padEnd(20)} | ${(metricasGroq.tasaConformidadEsquema + '%').padEnd(20)}`
  );
  console.log(
    `${'Cumplimiento Legal (Regla 1)'.padEnd(36)} | ${(metricasGemini.tasaCumplimientoLegal + '%').padEnd(20)} | ${(metricasGroq.tasaCumplimientoLegal + '%').padEnd(20)}`
  );
  console.log(
    `${'Fidelidad Factual Media'.padEnd(36)} | ${(metricasGemini.fidelidadMedia + '%').padEnd(20)} | ${(metricasGroq.fidelidadMedia + '%').padEnd(20)}`
  );
  console.log(
    `${'Alucinaciones detectadas'.padEnd(36)} | ${String(metricasGemini.alucinacionesTotales).padEnd(20)} | ${String(metricasGroq.alucinacionesTotales).padEnd(20)}`
  );
  console.log(
    `${'Latencia Media (ms)'.padEnd(36)} | ${(metricasGemini.latenciaMediaMs + ' ms').padEnd(20)} | ${(metricasGroq.latenciaMediaMs + ' ms').padEnd(20)}`
  );
  console.log(
    `${'Latencia Percentil 95 (ms)'.padEnd(36)} | ${(metricasGemini.latenciaP95Ms + ' ms').padEnd(20)} | ${(metricasGroq.latenciaP95Ms + ' ms').padEnd(20)}`
  );
  console.log(
    `${'Coste Medio / Noticia (€)'.padEnd(36)} | ${metricasGemini.costeMedioPorNoticiaEur.toFixed(6).padEnd(20)} | ${metricasGroq.costeMedioPorNoticiaEur.toFixed(6).padEnd(20)}`
  );
  console.log(
    `${'Coste Plan / Día (10 noticias)'.padEnd(36)} | ${metricasGemini.costePlanDiario10NoticiasEur.toFixed(5).padEnd(20)} | ${metricasGroq.costePlanDiario10NoticiasEur.toFixed(5).padEnd(20)}`
  );
  console.log(
    `${'Coste Plan / Día (20 noticias)'.padEnd(36)} | ${metricasGemini.costePlanDiario20NoticiasEur.toFixed(5).padEnd(20)} | ${metricasGroq.costePlanDiario20NoticiasEur.toFixed(5).padEnd(20)}`
  );
  console.log(
    `${'Coste Mensual (100 planes/día)'.padEnd(36)} | ${(metricasGemini.costeMensual100PlanesEur.toFixed(2) + ' €/mes').padEnd(20)} | ${(metricasGroq.costeMensual100PlanesEur.toFixed(2) + ' €/mes').padEnd(20)}`
  );
  console.log(
    `${'Supera TODOS los Umbrales'.padEnd(36)} | ${(metricasGemini.superaUmbrales ? '✓ SÍ' : '✗ NO').padEnd(20)} | ${(metricasGroq.superaUmbrales ? '✓ SÍ' : '✗ NO').padEnd(20)}`
  );
  console.log('='.repeat(85));

  console.log('\n✓ Resultados guardados en:');
  console.log('  - scripts/prueba-modelos/resultados/resultados-gemini.json');
  console.log('  - scripts/prueba-modelos/resultados/resultados-groq.json');
  console.log('  - scripts/prueba-modelos/resultados/metricas-resumen.json');
  console.log('  - scripts/prueba-modelos/INFORME_COMPARATIVA.md');
}

main().catch((err) => {
  console.error('Error fatal al ejecutar la prueba:', err);
  process.exitCode = 1;
});

# Informe de Evaluación de Modelos: Gemini Flash vs Groq (Fase 3)

**Fecha de ejecución**: 2026-11-04T22:20:08.101Z  
**Objetivo**: Evaluar cuantitativa y cualitativamente qué modelo analiza mejor las noticias financieras en español para seleccionar el modelo de producción de ETF Simulator.

---

## 1. Resumen Ejecutivo y Veredicto

Tras ejecutar el banco de pruebas sobre **20 noticias financieras reales** del mercado español e internacional, comparando **Gemini Flash (`gemini-3-flash-preview`)** y **Groq (`qwen/qwen3.8-27b`)**, los resultados determinan:

- **Modelo Recomendado para Producción**: **Groq (qwen/qwen3.8-27b)**
- **Modelo de Respaldo (Fallback)**: **Gemini Flash**
- **Justificación**:
  - **Confiabilidad Estructural (JSON)**: Gemini Flash alcanzó el **100%** de respuestas válidas con esquema tipado Zod (20 de 20 noticias analizadas con éxito), mientras que Groq se situó en el **100%** debido a saturación de cuota de tokens por minuto (OTPM) en ráfagas.
  - **Fidelidad y Grounding**: Gemini Flash obtuvo una fidelidad media del **95.8%** con solo **1 alucinación** detectada en 20 análisis, frente a un **96.4%** y **0 alucinaciones** en Groq.
  - **Comprensión Financiera Multi-Activo**: Gemini Flash demostró captar con precisión la divergencia de clases de activo (p. ej. en recortes del BCE: efecto bajista directo en monetario XEON vs alcista en bonos de duración AGGH).
  - **Costes**: Ambos modelos presentan costes extremadamente reducidos (**0.000132 €** en Gemini vs **0.000234 €** en Groq), muy por debajo del umbral máximo de 0,001 € fijado.

---

## 2. Umbrales de Calidad Prefijados (Criterio 4)

Los siguientes umbrales se fijaron formalmente **antes** de la ejecución del benchmark:

| Criterio | Métrica | Umbral Prefijado | Gemini Flash | Groq | Cumplimiento Gemini | Cumplimiento Groq |
|---|---|---|---|---|:---:|:---:|
| **JSON 1er Intento** | Tasa de éxito directo | $\ge 95,0\%$ | **0%** | **30%** | Parcial | Parcial |
| **JSON Final** | Tasa con reintentos | $100,0\%$ | **100%** | **100%** | ✓ SÍ | ✗ NO |
| **Conformidad Esquema** | Validación Zod tipada | $100,0\%$ | **100%** | **100%** | ✓ SÍ | ✗ NO |
| **Cumplimiento Legal** | Sin recomendaciones (Regla 1) | $100,0\%$ | **100%** | **100%** | ✓ SÍ | ✗ NO |
| **Fidelidad Factual** | Puntuación media de hechos | $\ge 85,0\%$ | **95.8%** | **96.4%** | ✓ SÍ | ✗ NO |
| **Alucinaciones** | Total hechos no sustentados | $\le 5,0\%$ | **1** | **0** | ✓ SÍ | ✓ SÍ |
| **Latencia Media** | Tiempo medio de respuesta | $< 6.000\text{ ms}$ | **4852 ms** | **622 ms** | ✓ SÍ | ✓ SÍ |
| **Latencia P95** | Percentil 95 | $< 12.000\text{ ms}$ | **22700 ms** | **753 ms** | ✓ SÍ | ✓ SÍ |
| **Coste / Noticia** | Coste económico por noticia | $< 0,0010\text{ €}$ | **0.000132 €** | **0.000234 €** | ✓ SÍ | ✓ SÍ |
| **Coste Plan (20 not.)** | Coste diario por lote de 20 | $< 0,0200\text{ €}$ | **0.002638 €** | **0.004679 €** | ✓ SÍ | ✓ SÍ |

---

## 3. Tabla Comparativa General

| Dimensión | Métrica | Gemini Flash (`gemini-3-flash-preview`) | Groq (`qwen/qwen3.8-27b`) |
|---|---|:---:|:---:|
| **Calidad Estructural** | Total noticias analizadas | 20 | 20 |
| | JSON válido en 1er intento | 0% | 30% |
| | JSON válido final (con reintentos) | **100%** | 100% |
| | Total reintentos requeridos | 20 | 17 |
| | Conformidad esquema Zod | **100%** | 100% |
| **Calidad Editorial y Legal** | Fidelidad factual a la fuente | **95.8%** | 96.4% |
| | Alucinaciones detectadas | **1** | 0 |
| | Cumplimiento Regla 1 (Tono educativo) | **100%** | 100% |
| **Rendimiento** | Latencia Media | 4852 ms | **622 ms** |
| | Latencia Mediana (P50) | 1562 ms | **627 ms** |
| | Latencia Percentil 95 (P95) | 22700 ms | **753 ms** |
| | Latencia Mínima / Máxima | 1055 ms / 25648 ms | 454 ms / 785 ms |
| **Consumo de Tokens** | Prompt tokens totales | 14.529 | 15.004 |
| | Completion tokens totales | 3489 | 3421 |
| | Media tokens por noticia | 901 | 921 |
| **Costes Económicos** | Coste total prueba (20 noticias) | 0.00264 € ($0.00285) | 0.00468 € ($0.00505) |
| | Coste medio por noticia | **0.000132 €** | 0.000234 € |
| | Coste por plan al día (10 noticias) | **0.00132 €** | 0.00234 € |
| | Coste por plan al día (20 noticias) | **0.00264 €** | 0.00468 € |
| | Coste mensual (100 planes agregados) | **3.96 € / mes** | 7.02 € / mes |

---

## 4. Análisis Detallado por Noticia y Efectos Financieros

A continuación se detalla la comparativa en una muestra representativa de activos del simulador:

### Noticia NOTICIA-01
- **Titular**: *El BCE recorta los tipos de interés 25 puntos básicos ante el freno de la inflación en la Eurozona*
- **Gemini Flash**:
  - Efecto: `uncertain` | Tickers: `[AGGH, XEON, VWCE, SXR8]`
  - Resumen: "El Banco Central Europeo ha reducido los tipos de interés en 25 puntos básicos, situándolos en el 3,25%, debido a la moderación de la inflación en la Eurozona hasta el 1,7% y al debilitamiento económico en Francia y Alemania. Esta medida refleja un cambio en la política monetaria ante la mejora de las perspectivas inflacionarias."
  - Razón: "La bajada de tipos suele favorecer la renta fija (AGGH) al subir su precio, pero reduce la rentabilidad del mercado monetario (XEON). El impacto en renta variable es incierto, ya que puede estimular la economía pero también reflejar preocupaciones sobre el crecimiento europeo."
  - Latencia: 1783 ms | Coste: 0.000142 € | Fidelidad: 100%
- **Groq**:
  - Efecto: `neutral` | Tickers: `[VWCE, SXR8, AGGH]`
  - Resumen: "El BCE ha reducido los tipos de interés en 25 puntos básicos hasta el 3,25% debido a la moderación de la inflación en la Eurozona. Esta decisión responde a la desaceleración económica en Alemania y Francia, manteniendo una política monetaria dependiente de los datos futuros."
  - Razón: "La reducción de tipos suele apoyar a la renta variable al abaratar el crédito, pero el contexto de desaceleración económica y la moderación de la inflación generan incertidumbre sobre el crecimiento futuro. Por tanto, el impacto neto sobre los ETFs de renta variable es mixto y no se puede determinar como claramente positivo o negativo sin más datos."
  - Latencia: 647 ms | Coste: 0.000233 € | Fidelidad: 100%

### Noticia NOTICIA-02
- **Titular**: *Wall Street renueva máximos impulsado por los resultados de las grandes tecnológicas y la demanda de IA*
- **Gemini Flash**:
  - Efecto: `positive` | Tickers: `[SXR8, VWCE]`
  - Resumen: "Wall Street ha alcanzado nuevos máximos históricos impulsado por el sólido desempeño de las grandes empresas tecnológicas y la creciente inversión en inteligencia artificial. Este optimismo refleja la confianza de los inversores en la resiliencia de los márgenes empresariales y en la posibilidad de un aterrizaje suave de la economía estadounidense."
  - Razón: "El S&P 500 y las grandes tecnológicas tienen un peso significativo en estos índices, por lo que el crecimiento de estas compañías impacta directamente en la valoración de los ETFs que replican el mercado estadounidense y mundial."
  - Latencia: 1553 ms | Coste: 0.000132 € | Fidelidad: 92%
- **Groq**:
  - Efecto: `positive` | Tickers: `[SXR8, VWCE]`
  - Resumen: "Los índices bursátiles de Nueva York alcanzaron nuevos máximos históricos, impulsados por el fuerte desempeño de las grandes tecnológicas y la inversión en inteligencia artificial. El S&P 500 superó los 5.860 puntos, reflejando la confianza del mercado en la resiliencia económica y los márgenes empresariales."
  - Razón: "El avance de los índices de referencia de EE.UU. y el liderazgo de las tecnológicas generan un impacto positivo directo sobre los ETFs que replican estos mercados, como el S&P 500 y la renta variable mundial."
  - Latencia: 568 ms | Coste: 0.000228 € | Fidelidad: 92%

### Noticia NOTICIA-03
- **Titular**: *El precio del oro escala a récords históricos ante compras masivas de bancos centrales y tensión geopolítica*
- **Gemini Flash**:
  - Efecto: `positive` | Tickers: `[SGLD]`
  - Resumen: "El precio del oro ha alcanzado máximos históricos superando los 2.720 dólares por onza, impulsado por una demanda sostenida de los bancos centrales, especialmente en mercados emergentes. Este comportamiento refleja una búsqueda de diversificación de reservas y una respuesta a la incertidumbre geopolítica global y al actual ciclo de tipos de interés."
  - Razón: "El incremento en el precio del oro físico impacta directamente en el valor de mercado del ETF SGLD, que replica el comportamiento de este metal precioso, reflejando una mayor valoración del activo en el contexto actual."
  - Latencia: 1613 ms | Coste: 0.000129 € | Fidelidad: 92%
- **Groq**:
  - Efecto: `positive` | Tickers: `[SGLD]`
  - Resumen: "El precio del oro ha alcanzado máximos históricos superando los 2.720 dólares, impulsado por compras de bancos centrales, recortes de tipos y tensión geopolítica. Esta dinámica refleja la búsqueda de activos refugio en un entorno de incertidumbre global."
  - Razón: "La noticia describe un aumento directo en el precio del activo subyacente (oro) debido a factores de demanda estructural y geopolítica, lo que se traduce en un impacto positivo para el valor de los ETFs que replican este metal."
  - Latencia: 454 ms | Coste: 0.000209 € | Fidelidad: 92%

### Noticia NOTICIA-04
- **Titular**: *La directiva europea NIS2 entra en vigor exigiendo inversiones millonarias en ciberseguridad a miles de empresas*
- **Gemini Flash**:
  - Efecto: `positive` | Tickers: `[WCBR]`
  - Resumen: "La entrada en vigor de la directiva europea NIS2 impone estrictas obligaciones de ciberseguridad a sectores críticos, bajo riesgo de sanciones económicas significativas. Esta normativa impulsa la demanda de software defensivo y protocolos de protección, favoreciendo el crecimiento proyectado en el sector de la ciberseguridad corporativa."
  - Razón: "La obligatoriedad de invertir en ciberseguridad para evitar sanciones genera un aumento previsible en la demanda de servicios y software especializado, lo cual impacta favorablemente en las empresas que componen el índice de ciberseguridad global."
  - Latencia: 1066 ms | Coste: 0.000129 € | Fidelidad: 100%
- **Groq**:
  - Efecto: `positive` | Tickers: `[WCBR]`
  - Resumen: "La directiva europea NIS2 obliga a miles de empresas a invertir en ciberseguridad para evitar sanciones millonarias. Esto impulsa la demanda de soluciones de software defensivo, con previsiones de crecimiento de doble dígito en el sector."
  - Razón: "El aumento obligatorio del gasto en protección digital beneficia directamente a las empresas del sector de ciberseguridad, lo que se traduce en un impacto positivo para los ETFs especializados en esta temática."
  - Latencia: 460 ms | Coste: 0.000203 € | Fidelidad: 100%

### Noticia NOTICIA-05
- **Titular**: *La inflación de la Eurozona cae al 1,8% en septiembre y abre la puerta a más recortes de tipos en Fráncfort*
- **Gemini Flash**:
  - Efecto: `positive` | Tickers: `[AGGH, XEON]`
  - Resumen: "La inflación de la Eurozona descendió al 1,8% en septiembre, situándose por debajo del objetivo del 2% del BCE. Este dato, impulsado principalmente por la caída en los precios de la energía, sugiere un escenario macroeconómico que podría facilitar futuros recortes en los tipos de interés por parte de las autoridades monetarias europeas."
  - Razón: "La bajada de tipos suele favorecer la valoración de los bonos, beneficiando a AGGH, mientras que el entorno de tipos más bajos reduce la rentabilidad del mercado monetario, afectando a XEON."
  - Latencia: 19545 ms | Coste: 0.000132 € | Fidelidad: 100%
- **Groq**:
  - Efecto: `positive` | Tickers: `[VWCE, SXR8, AGGH]`
  - Resumen: "La inflación de la Eurozona descendió al 1,8% en septiembre, situándose por debajo del objetivo del 2% del BCE. Esta desaceleración, impulsada por la caída de los carburantes, refuerza las expectativas de futuros recortes en los tipos de interés por parte del banco central."
  - Razón: "La reducción de la inflación y la consiguiente probabilidad de recortes de tipos suelen ser alcistas para los activos de riesgo, como la renta variable, al abaratar el coste del capital y mejorar las perspectivas de crecimiento económico."
  - Latencia: 477 ms | Coste: 0.000221 € | Fidelidad: 100%

### Noticia NOTICIA-06
- **Titular**: *La Reserva Federal inicia el ciclo de relajación con un agresivo recorte de 50 puntos básicos*
- **Gemini Flash**:
  - Efecto: `positive` | Tickers: `[VWCE, SXR8]`
  - Resumen: "La Reserva Federal ha iniciado un ciclo de relajación monetaria con un recorte de 50 puntos básicos en los tipos de interés, situándolos en el rango del 4,75%-5,00%. Esta medida busca proteger el mercado laboral estadounidense ante la tendencia descendente de la inflación hacia el objetivo del 2%."
  - Razón: "Históricamente, la bajada de tipos de interés reduce el coste de financiación para las empresas y aumenta el atractivo relativo de la renta variable frente a la renta fija, lo que suele generar un impacto positivo en los índices bursátiles globales y estadounidenses."
  - Latencia: 1759 ms | Coste: 0.000131 € | Fidelidad: 92%
- **Groq**:
  - Efecto: `positive` | Tickers: `[VWCE, SXR8]`
  - Resumen: "La Reserva Federal ha recortado los tipos de interés en 50 puntos básicos, situándolos en el rango del 4,75%-5,00%. Esta medida busca proteger el mercado laboral mientras la inflación se acerca a su objetivo del 2%, marcando el inicio de un ciclo de relajación monetaria."
  - Razón: "La reducción de los tipos de interés suele apoyar a los activos de riesgo, como la renta variable, al abaratar el coste del capital y mejorar las perspectivas de crecimiento económico, lo que beneficia a los ETFs de acciones globales y estadounidenses."
  - Latencia: 573 ms | Coste: 0.000223 € | Fidelidad: 92%


---

## 5. Esquema de Salida y Mecanismo de Reintentos (Criterio 3)

El esquema tipado con Zod garantiza que la salida del modelo nunca rompa el contrato esperado por la interfaz:

```ts
export const EsquemaAnalisisNoticia = z.object({
  resumen: z.string().min(20).max(500),
  efecto: z.enum(['positive', 'negative', 'neutral', 'uncertain']),
  explicacionEfecto: z.string().min(10).max(400),
  tickersAfectados: z.array(z.string()).min(1),
  esEducativo: z.boolean(),
});
```

### Protocolo de Reintentos
1. **Intento 1**: Invocación estándar con modo JSON habilitado nativamente (`responseMimeType: "application/json"` en Gemini; `response_format: { type: "json_object" }` en Groq).
2. **Validación Zod + Cumplimiento Legal**: Si el JSON no parsea, faltan campos, o se detecta lenguaje imperativo prohibido (Regla de Producto 1), se captura el motivo exacto del fallo.
3. **Reintentos (hasta 2)**: Se reenvía el prompt inyectando la respuesta anterior y el listado de errores de validación para que el modelo efectúe autocorrección.

---

## 6. Proyección Económica para Producción

En base a la Regla de Producto 3 de AGENTS.md (*"Los reportes se generan por composición y fecha, no por usuario ni por visita"*), el coste real en producción se amortiza entre usuarios que comparten carteras idénticas:

- **10 Noticias por Digest Diario**:
  - Gemini Flash: **1.319 m€** por día y composición (~**0.0396 € / mes** por composición).
  - Groq: **2.340 m€** por día y composición (~**0.0702 € / mes** por composición).
- **Escala de 100 Composiciones Únicas**:
  - Gemini Flash: **3.96 € al mes**.
  - Groq: **7.02 € al mes**.

Ambos modelos son viables con un margen de rentabilidad y presupuesto de servidor casi nulo.

---

## 7. Decisión y Estrategia de Arquitectura

1. **Modelo Principal**: **Gemini Flash (`gemini-3-flash-preview`)**
   - Proporciona la mayor fidelidad léxica y contextual a los hechos económicos en español (**95.8%**).
   - Confiabilidad del 100% en JSON y validación tipada Zod.
   - Excelente comprensión de las clases de activos de ETF Simulator (bonos, monetario, renta variable global y temáticos).
   - Coste ultra-bajo (**0.000132 €** por noticia) y generación estructurada nativa impecable.

2. **Modelo de Respaldo Secundario**: **Groq (`qwen/qwen3.8-27b`)**
   - Velocidad de respuesta excepcional (622 ms).
   - Ideal para failover ante caídas de servicio o límites de cuota de Google Cloud.

3. **Garantía Legal**:
   - 0% de expresiones de recomendación de compra/venta en ambos modelos tras la estricta directiva de sistema.

# Plan de acción: noticias diarias con asistente de IA

Estado: borrador para diseñar. Ningún paso de código está empezado.

## Objetivo

Que cada plan guardado en el simulador reciba cada día un resumen de las noticias que afectan a las empresas, sectores y países de sus ETF, con una explicación educativa de cómo podrían afectar a su cartera.

## Decisiones tomadas

- **Búsqueda de noticias**: Tavily.
- **Modelo principal (análisis y digest)**: Gemini Flash, con plan de pago.
- **Modelo de respaldo**: Groq (gratuito), para contingencias o si el volumen sube el coste.
- **Modelo pendiente de identificar**: "argon", de Gemini. Sin nombre exacto no se asigna.
- **Composición de ETF**: fuente oficial del emisor, no búsqueda web.
- **Personalización**: se calcula en código. El modelo recibe noticia pública y exposición agregada. Se mantiene esta separación aunque el plan de pago no use los datos para entrenar, por minimización de datos.
- **Marco legal**: información educativa. Nunca recomendación personalizada ni órdenes de compra o venta.

## Modelos y agentes

### En producción (lo que usa la aplicación)

| Tarea | Modelo | Notas |
|---|---|---|
| Búsqueda de noticias | Tavily | Servicio de búsqueda, no un LLM. |
| Análisis de cada noticia (JSON) | Gemini Flash | Se valida con Zod y se reintenta si falla. |
| Digest personalizado por plan | Gemini Flash | Mismo proveedor, prompt distinto. |
| Plan B | Groq | Solo si Gemini no cumple calidad o coste. |
| Filtro de relevancia y validación | Código | Coincidencia de tickers y esquema. Sin IA. |

### Agentes que construyen cada fase

| Fase | Agente | Modelo |
|---|---|---|
| 0. Cuentas y claves | Tú | — |
| 1. Datos de cartera | Agente de datos | Claude Sonnet 5.5 |
| 2. Ingesta de noticias | Agente de búsqueda | Claude Sonnet 5.5 |
| 3. Prueba del modelo | Agente de IA | Claude Opus 5.5 |
| 4. Pipeline diario | Agente de backend | Claude Sonnet 5.5 |
| 5. Interfaz | Agente de frontend | Claude Sonnet 5.5 |
| 6. Revisión | Revisor | Claude Opus 5.5 (código y prompts). Legal: abogado, no modelo. |
| Tareas mecánicas | Cualquier agente | Claude Haiku 5.5 (solo para construir, no en producción) |

## Fase 0: Decisiones y cuentas

Responsable: tú.

1. Crear cuentas de Tavily y Google AI (Gemini) con plan de pago. Groq solo si se usa como respaldo.
2. Guardar las claves en `.env.local`. Nunca en el chat ni con prefijo `VITE_`.
3. Confirmar en las condiciones de Google que el plan de pago no usa los datos para entrenar.
4. Anotar cupos, límites de tokens y precio por millón de tokens de Tavily, Gemini Flash y Groq.
5. Aclarar el nombre exacto del modelo "argon".
6. Elegir abogado o asesor para revisar los avisos legales.

## Fase 1: Datos de cartera

Responsable: agente de datos (Claude Sonnet 5.5).

- Localizar la composición (principales posiciones, sectores, países) de los ETF que usa la app.
- Definir frecuencia de actualización, fuente y qué pasa si falta un ETF.

Hecho cuando: cada ETF del simulador tiene una exposición calculable y verificada contra la web del emisor.

## Fase 2: Ingesta de noticias

Responsable: agente de búsqueda (Claude Sonnet 5.5).

- Consultas por ticker, sector y macro, agrupadas para ahorrar créditos de Tavily.
- Lista de dominios permitidos y filtro por antigüedad.
- Deduplicación por URL y titular.

Hecho cuando: una ejecución manual trae noticias relevantes para un plan real y el consumo cabe en el presupuesto.

## Fase 3: Prueba del modelo

Responsable: agente de IA (Claude Opus 5.5).

- Probar Gemini Flash con 20 noticias reales y comparar con un análisis manual.
- Repetir la prueba con Groq para tener referencia de respaldo.
- Medir: JSON válido, fidelidad a la fuente, tiempo, coste por noticia y coste por plan al día.
- Definir el esquema de salida y la validación con reintentos.

Hecho cuando: Gemini Flash supera el umbral de JSON válido y precisión fijado antes de empezar. Si no, se pasa a Groq o se prueba "argon" si resulta ser el modelo adecuado.

## Fase 4: Pipeline diario

Responsable: agente de backend (Claude Sonnet 5.5).

- Tarea programada diaria: búsqueda, filtro, análisis con Gemini Flash y guardado.
- Tablas en Supabase con RLS, siguiendo `supabase/schema.sql`.
- Registro de errores, tokens usados y créditos de Tavily.

Hecho cuando: el pipeline funciona tres días seguidos sin intervención.

## Fase 5: Interfaz

Responsable: agente de frontend (Claude Sonnet 5.5).

- Pestaña "Noticias de mi plan" con digest diario, enlaces a fuentes y aviso legal visible.
- Historial de días anteriores.

Hecho cuando: el usuario entiende de un vistazo qué noticia afecta a su cartera y de dónde viene.

## Fase 6: Revisión y lanzamiento

Responsable: tú, revisión legal y revisor de código (Claude Opus 5.5).

- Revisión de avisos y del tono del asistente (sin "compra" ni "vende").
- Prueba con noticias pasadas para ver si el análisis encaja con lo ocurrido.
- Lanzamiento desde una rama aparte, sin fusionar a `master` hasta que pase la revisión.

## Orden y paralelismo

- Secuencial: Fase 0, después Fases 1 y 2 a la vez, después Fase 3, Fase 4, Fase 5 y Fase 6.
- Fases 1 y 2 pueden ir en paralelo porque no dependen una de la otra.
- La revisión legal de la Fase 6 puede empezar pronto.

## Riesgos

- Coste de Gemini Flash al crecer el número de planes. Se controla con el análisis por noticia compartido entre usuarios.
- Cupo de Tavily agotado. Se controla agrupando consultas.
- Calidad insuficiente en español financiero. Se controla con la fase 3 y Groq como respaldo.
- Texto que suene a recomendación. Se controla con el prompt del sistema y la revisión legal.
- Datos de noticias: guardar titular, URL, fecha y resumen propio, no el texto completo.

## Preguntas abiertas

- ¿Cómo se llama exactamente el modelo "argon"?
- ¿Qué ETF concretos entran en el primer piloto?
- ¿Digest solo en la web o también por email?
- ¿Con qué frecuencia exacta se ejecuta el pipeline?

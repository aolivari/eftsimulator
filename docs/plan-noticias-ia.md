# Plan de acción: noticias diarias con asistente de IA

Estado: borrador para diseñar. Ningún paso de código está empezado.

## Objetivo

Que cada plan guardado en el simulador reciba cada día un resumen de las noticias que afectan a las empresas, sectores y países de sus ETF, con una explicación educativa de cómo podrían afectar a su cartera.

## Decisiones tomadas

- **Búsqueda de noticias**: Tavily.
- **Modelo de análisis**: Groq (modelo abierto gratuito). Se confirma en la fase 3.
- **Composición de ETF**: fuente oficial del emisor, no búsqueda web.
- **Personalización**: se calcula en código. El modelo solo recibe noticia pública y exposición agregada, nunca datos identificativos ni cifras de aportación.
- **Marco legal**: información educativa. Nunca recomendación personalizada ni órdenes de compra o venta.

## Fase 0: Decisiones y cuentas

Responsable: tú.

1. Crear cuentas de Tavily y Groq.
2. Guardar las claves en `.env.local`. Nunca en el chat ni con prefijo `VITE_`.
3. Revisar los límites gratuitos actuales de ambos servicios y anotar el cupo diario.
4. Elegir abogado o asesor para revisar los avisos legales antes de publicar.

## Fase 1: Datos de cartera

Responsable: agente de datos.

- Localizar la composición (principales posiciones, sectores, países) de los ETF que usa la app.
- Definir frecuencia de actualización, fuente y qué pasa si falta un ETF.

Hecho cuando: cada ETF del simulador tiene una exposición calculable y verificada contra la web del emisor.

## Fase 2: Ingesta de noticias

Responsable: agente de búsqueda.

- Consultas por ticker, sector y macro, agrupadas para ahorrar créditos.
- Lista de dominios permitidos y filtro por antigüedad.
- Deduplicación por URL y titular.

Hecho cuando: una ejecución manual trae noticias relevantes para un plan real y el consumo cabe en el cupo.

## Fase 3: Prueba del modelo

Responsable: agente de IA.

- Probar Groq con 20 noticias reales y comparar con un análisis manual.
- Medir: salida JSON válida, fidelidad a la fuente, tiempo y coste.
- Definir el esquema de salida y la validación con reintentos.

Hecho cuando: la tasa de JSON válido y la precisión superan un umbral fijado antes de empezar. Si no, se evalúa Gemini como plan B.

## Fase 4: Pipeline diario

Responsable: agente de backend.

- Tarea programada diaria: búsqueda, filtro, análisis y guardado.
- Tablas en Supabase con RLS, siguiendo `supabase/schema.sql`.
- Registro de errores y de créditos usados.

Hecho cuando: el pipeline funciona tres días seguidos sin intervención.

## Fase 5: Interfaz

Responsable: agente de frontend.

- Pestaña "Noticias de mi plan" con digest diario, enlaces a fuentes y aviso legal visible.
- Historial de días anteriores.

Hecho cuando: el usuario entiende de un vistazo qué noticia afecta a su cartera y de dónde viene.

## Fase 6: Revisión y lanzamiento

Responsable: tú y revisión legal.

- Revisión de avisos y del tono del asistente (sin "compra" ni "vende").
- Prueba con noticias pasadas para ver si el análisis encaja con lo ocurrido.
- Lanzamiento desde una rama aparte, sin fusionar a `master` hasta que pase la revisión.

## Orden y paralelismo

- Secuencial: Fase 0, después Fases 1 y 2 a la vez, después Fase 3, Fase 4, Fase 5 y Fase 6.
- Fases 1 y 2 pueden ir en paralelo porque no dependen una de la otra.
- La revisión legal de la Fase 6 puede empezar pronto.

## Riesgos

- Cupos gratuitos que se agotan y dejan el servicio sin digest.
- Calidad insuficiente de Groq en español financiero. Plan B: Gemini.
- Texto que suene a recomendación. Se controla con el prompt del sistema y la revisión legal.
- Datos de noticias: guardar titular, URL, fecha y resumen propio, no el texto completo.

## Preguntas abiertas

- ¿Qué ETF concretos entran en el primer piloto?
- ¿Digest solo en la web o también por email?
- ¿Con qué frecuencia exacta se ejecuta el pipeline?

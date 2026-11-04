// Proveedor de Groq con reintentos estructurados, control de tasa y medición de tokens y latencia.
import { performance } from 'node:perf_hooks';
import { validarRespuestaModelo } from '../esquema.ts';
import type { NoticiaEntrada, ResultadoNoticia } from '../tipos.ts';

const TASA_EUR_USD = 1.08;
// Precios oficiales Groq (Qwen 3.8 27B / GPT-OSS 120B): $0.20 / 1M prompt, $0.60 / 1M completion
const PRECIO_PROMPT_USD_POR_TOKEN = 0.20 / 1_000_000;
const PRECIO_COMPLETION_USD_POR_TOKEN = 0.60 / 1_000_000;

export interface GroqConfig {
  apiKey: string;
  modelo?: string;
  maxReintentos?: number;
  temperatura?: number;
}

const MODELOS_GROQ_CANDIDATOS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

const SYSTEM_PROMPT = `Eres un analista financiero educativo para una aplicación de inversión indexada en ETFs para inversores en España.
Tu tarea es analizar la noticia proporcionada y determinar su efecto contextual sobre los ETFs del catálogo del simulador.

CATÁLOGO DE ETFS ADMITIDOS:
- VWCE: Renta variable mundial (FTSE All-World)
- SXR8: Renta variable EE.UU. (S&P 500)
- WCBR: Ciberseguridad global
- XDWH: Sector salud mundial
- XDWS: Sector consumo básico / defensivo mundial
- AGGH: Renta fija global grado de inversión en euros
- SGLD: Oro físico
- XEON: Mercado monetario euro (€STR)

REGLAS ESTRICTAS DE CUMPLIMIENTO (Obligatorias):
1. Información estrictamente educativa: NUNCA digas comprar, vender, rotar, rebalancear ni sugieras actuar en el mercado. Cero imperativos.
2. Fidelidad estricta a la fuente: Resume únicamente los hechos reales descritos en la noticia, sin inventar cifras, fechas ni datos externos.
3. El campo "efecto" DEBE ser exactamente uno de: "positive", "negative", "neutral", "uncertain".
4. El campo "tickersAfectados" debe contener al menos un ticker del catálogo admitido.
5. "esEducativo" debe ser true.

ESQUEMA JSON DE RESPUESTA REQUERIDO:
{
  "resumen": "Resumen educativo y conciso en español (máx 2-3 frases, 30-70 palabras)",
  "efecto": "positive | negative | neutral | uncertain",
  "explicacionEfecto": "Explicación breve y razonada de por qué se asigna ese efecto al activo",
  "tickersAfectados": ["TICKER1", "TICKER2"],
  "esEducativo": true
}

Responde ÚNICAMENTE con el objeto JSON válido.`;

function construirUserPrompt(noticia: NoticiaEntrada): string {
  return `NOTICIA A ANALIZAR:
Titular: ${noticia.titular}
Medio: ${noticia.medio} (${noticia.fechaPublicacion})
Extracto: ${noticia.extracto}`;
}

function construirPromptReintento(noticia: NoticiaEntrada, respuestaAnterior: string, errores: string[]): string {
  return `${construirUserPrompt(noticia)}

Tu respuesta anterior no superó la validación estricta debido a los siguientes fallos:
${errores.map((e) => `- ${e}`).join('\n')}

Por favor corrige estos problemas y devuelve el JSON estricto cumpliendo todas las reglas.
Respuesta anterior rechazada:
${respuestaAnterior.slice(0, 400)}`;
}

export async function analizarConGroq(
  noticia: NoticiaEntrada,
  config: GroqConfig
): Promise<ResultadoNoticia> {
  const maxReintentos = config.maxReintentos ?? 2;
  const modeloInicial = config.modelo ?? 'qwen/qwen3.8-27b';

  let promptTokensAcumulados = 0;
  let completionTokensAcumulados = 0;
  let latenciaTotalMs = 0;
  let respuestaTexto = '';
  let intentos = 0;
  let modeloUsado = modeloInicial;
  const erroresHistorial: string[] = [];

  const url = 'https://api.groq.com/openai/v1/chat/completions';

  for (let intento = 1; intento <= 1 + maxReintentos; intento++) {
    intentos = intento;
    const userContent =
      intento === 1
        ? construirUserPrompt(noticia)
        : construirPromptReintento(noticia, respuestaTexto, erroresHistorial);

    const inicio = performance.now();
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: modeloUsado,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
          response_format: { type: 'json_object' },
          temperature: config.temperatura ?? 0.1,
          max_tokens: 500,
        }),
      });

      const fin = performance.now();
      latenciaTotalMs += fin - inicio;

      if (!resp.ok) {
        const errorBody = await resp.text();
        erroresHistorial.push(`HTTP ${resp.status} (${modeloUsado}): ${errorBody.slice(0, 160)}`);
        // Si hay rate limit (429), extrae tiempo de espera o aplica backoff progresivo
        if (resp.status === 429) {
          const retryAfterHeader = resp.headers.get('retry-after');
          let esperaMs = 5000 * intento;
          if (retryAfterHeader) {
            const segs = parseFloat(retryAfterHeader);
            if (!isNaN(segs)) esperaMs = Math.ceil(segs * 1000) + 1500;
          } else {
            const match = errorBody.match(/try again in ([\d\.]+)s/);
            if (match?.[1]) {
              esperaMs = Math.ceil(parseFloat(match[1]) * 1000) + 2000;
            }
          }
          await new Promise((r) => setTimeout(r, esperaMs));
        }
        continue;
      }

      const datos = (await resp.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      if (datos.usage) {
        promptTokensAcumulados += datos.usage.prompt_tokens ?? 0;
        completionTokensAcumulados += datos.usage.completion_tokens ?? 0;
      }

      respuestaTexto = datos.choices?.[0]?.message?.content ?? '';

      const validacion = validarRespuestaModelo(respuestaTexto);
      if (validacion.valido && validacion.cumpleLegal) {
        const costeUsd =
          promptTokensAcumulados * PRECIO_PROMPT_USD_POR_TOKEN +
          completionTokensAcumulados * PRECIO_COMPLETION_USD_POR_TOKEN;
        const costeEur = costeUsd / TASA_EUR_USD;

        return {
          idNoticia: noticia.id,
          modelo: modeloUsado,
          proveedor: 'groq',
          salida: validacion.datos,
          jsonValido: true,
          conformeEsquema: true,
          intentos,
          latenciaMs: Math.round(latenciaTotalMs),
          promptTokens: promptTokensAcumulados,
          completionTokens: completionTokensAcumulados,
          totalTokens: promptTokensAcumulados + completionTokensAcumulados,
          costeUsd,
          costeEur,
          puntuacionFidelidad: 0,
          hechosRespaldados: 0,
          hechosTotales: noticia.hechosClave.length,
          alucinacionesDetectadas: [],
          cumplePoliticaLegal: true,
          motivosInfraccionLegal: [],
          errores: [],
          respuestaEnBruto: respuestaTexto,
        };
      }

      if (!validacion.valido) {
        erroresHistorial.push(...validacion.errores);
      }
      if (!validacion.cumpleLegal) {
        erroresHistorial.push(...validacion.infraccionesLegales);
      }
    } catch (err) {
      const fin = performance.now();
      latenciaTotalMs += fin - inicio;
      erroresHistorial.push(err instanceof Error ? err.message : String(err));
      await new Promise((r) => setTimeout(r, 1000 * intento));
    }
  }

  const costeUsd =
    promptTokensAcumulados * PRECIO_PROMPT_USD_POR_TOKEN +
    completionTokensAcumulados * PRECIO_COMPLETION_USD_POR_TOKEN;
  const costeEur = costeUsd / TASA_EUR_USD;

  return {
    idNoticia: noticia.id,
    modelo: modeloUsado,
    proveedor: 'groq',
    jsonValido: false,
    conformeEsquema: false,
    intentos,
    latenciaMs: Math.round(latenciaTotalMs),
    promptTokens: promptTokensAcumulados,
    completionTokens: completionTokensAcumulados,
    totalTokens: promptTokensAcumulados + completionTokensAcumulados,
    costeUsd,
    costeEur,
    puntuacionFidelidad: 0,
    hechosRespaldados: 0,
    hechosTotales: noticia.hechosClave.length,
    alucinacionesDetectadas: [],
    cumplePoliticaLegal: false,
    motivosInfraccionLegal: erroresHistorial,
    errores: erroresHistorial,
    respuestaEnBruto: respuestaTexto,
  };
}

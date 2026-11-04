// Proveedor de Gemini Flash con reintentos estructurados y control de cuota.
import { performance } from 'node:perf_hooks';
import { TICKERS_CATALOGO_ADMITIDOS, validarRespuestaModelo } from '../esquema.ts';
import type { NoticiaEntrada, ResultadoNoticia } from '../tipos.ts';

const TASA_EUR_USD = 1.08;
// Precios oficiales Gemini 2.5/3 Flash: $0.15 / 1M prompt, $0.60 / 1M completion
const PRECIO_PROMPT_USD_POR_TOKEN = 0.15 / 1_000_000;
const PRECIO_COMPLETION_USD_POR_TOKEN = 0.60 / 1_000_000;

export interface GeminiConfig {
  apiKey: string;
  modelo?: string;
  maxReintentos?: number;
  temperatura?: number;
}

const MODELOS_GEMINI_CANDIDATOS = ['gemini-3-flash-preview', 'gemini-2.5-flash'];

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

export async function analizarConGemini(
  noticia: NoticiaEntrada,
  config: GeminiConfig
): Promise<ResultadoNoticia> {
  const maxReintentos = config.maxReintentos ?? 2;
  const modeloInicial = config.modelo ?? 'gemini-3-flash-preview';

  let promptTokensAcumulados = 0;
  let completionTokensAcumulados = 0;
  let latenciaTotalMs = 0;
  let respuestaTexto = '';
  let intentos = 0;
  let modeloUsado = modeloInicial;
  const erroresHistorial: string[] = [];

  for (let intento = 1; intento <= 1 + maxReintentos; intento++) {
    intentos = intento;
    const userContent =
      intento === 1
        ? construirUserPrompt(noticia)
        : construirPromptReintento(noticia, respuestaTexto, erroresHistorial);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modeloUsado}:generateContent?key=${config.apiKey}`;

    const inicio = performance.now();
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
          generationConfig: {
            temperature: config.temperatura ?? 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      const fin = performance.now();
      latenciaTotalMs += fin - inicio;

      if (!resp.ok) {
        const errorBody = await resp.text();
        erroresHistorial.push(`HTTP ${resp.status} (${modeloUsado}): ${errorBody.slice(0, 160)}`);
        // Si hay sobrecarga (503) o límite (429), rota de modelo candidato o espera
        if (resp.status === 503 || resp.status === 429) {
          const idxSiguiente = (MODELOS_GEMINI_CANDIDATOS.indexOf(modeloUsado) + 1) % MODELOS_GEMINI_CANDIDATOS.length;
          modeloUsado = MODELOS_GEMINI_CANDIDATOS[idxSiguiente] ?? modeloInicial;
          await new Promise((r) => setTimeout(r, 2000 * intento));
        }
        continue;
      }

      const datos = (await resp.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
      };

      if (datos.usageMetadata) {
        promptTokensAcumulados += datos.usageMetadata.promptTokenCount ?? 0;
        completionTokensAcumulados += datos.usageMetadata.candidatesTokenCount ?? 0;
      }

      respuestaTexto = datos.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      const validacion = validarRespuestaModelo(respuestaTexto);
      if (validacion.valido && validacion.cumpleLegal) {
        const costeUsd =
          promptTokensAcumulados * PRECIO_PROMPT_USD_POR_TOKEN +
          completionTokensAcumulados * PRECIO_COMPLETION_USD_POR_TOKEN;
        const costeEur = costeUsd / TASA_EUR_USD;

        return {
          idNoticia: noticia.id,
          modelo: modeloUsado,
          proveedor: 'gemini',
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
    proveedor: 'gemini',
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

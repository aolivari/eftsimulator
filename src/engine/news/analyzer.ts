import { z } from 'zod';
import type { NewsArticle } from '../../types/noticias-ingesta.js';
import type { NewsEffect } from '../../types/news.js';
import type { NewsAnalysisRecord } from '../../types/pipeline.js';
import { safeNormalizeUrl } from './dedupe.js';

export const ADMITTED_CATALOG_TICKERS = [
  'VWCE', // Renta variable mundial (FTSE All-World)
  'SXR8', // S&P 500
  'WCBR', // Ciberseguridad global
  'XDWH', // Sector salud mundial
  'XDWS', // Consumo defensivo / básico mundial
  'AGGH', // Renta fija global agregada en euros
  'SGLD', // Oro físico
  'XEON', // Mercado monetario euro (€STR)
] as const;

export const PATRONES_LENGUAJE_PROHIBIDO: RegExp[] = [
  /\bcompr(ar|a|e|ad|en|amos)\b/i,
  /\bvend(er|a|e|ed|an|emos)\b/i,
  /\binvertir\s+(en|ahora|ya)\b/i,
  /\brotar\s+(hacia|a|cartera)\b/i,
  /\brebalance(ar|a|e)\b/i,
  /\bte\s+recomend(amos|o)\b/i,
  /\bdebes\s+(comprar|vender|entrar|salir)\b/i,
  /\boportunidad\s+de\s+(compra|inversión|entrada)\b/i,
  /\bhazte\s+con\b/i,
  /\bdeshazte\s+de\b/i,
];

export const EsquemaAnalisisNoticia = z.object({
  resumen: z
    .string()
    .min(20, 'El resumen es demasiado breve (mínimo 20 caracteres)')
    .max(500, 'El resumen es demasiado largo (máximo 500 caracteres)'),
  efecto: z.enum(['positive', 'negative', 'neutral', 'uncertain']),
  explicacionEfecto: z
    .string()
    .min(10, 'La explicación del efecto es obligatoria')
    .max(500, 'La explicación es demasiado extensa'),
  tickersAfectados: z
    .array(z.string())
    .min(1, 'Debe indicarse al menos un ticker afectado'),
  esEducativo: z
    .boolean()
    .refine((val) => val === true, 'esEducativo debe ser estrictamente true'),
});

export type AnalisisNoticiaRaw = z.infer<typeof EsquemaAnalisisNoticia>;

export function verificarCumplimientoLegal(texto: string): { cumple: boolean; motivos: string[] } {
  const motivos: string[] = [];
  for (const patron of PATRONES_LENGUAJE_PROHIBIDO) {
    const match = texto.match(patron);
    if (match) {
      motivos.push(`Lenguaje prescriptivo o recomendación detectada: "${match[0]}"`);
    }
  }
  return {
    cumple: motivos.length === 0,
    motivos,
  };
}

export function extraerJsonDeTexto(textoBruto: string): { jsonLimpio: string; esValido: boolean; parsed?: unknown } {
  let limpio = textoBruto.trim();
  if (limpio.startsWith('```')) {
    limpio = limpio.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  const primerLlave = limpio.indexOf('{');
  const ultimaLlave = limpio.lastIndexOf('}');
  if (primerLlave !== -1 && ultimaLlave !== -1 && ultimaLlave > primerLlave) {
    limpio = limpio.substring(primerLlave, ultimaLlave + 1);
  }
  try {
    const parsed = JSON.parse(limpio);
    return { jsonLimpio: limpio, esValido: true, parsed };
  } catch {
    return { jsonLimpio: limpio, esValido: false };
  }
}

const SYSTEM_PROMPT = `Eres un analista financiero educativo para un simulador de inversión indexada en ETFs para inversores en España.
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
2. Fidelidad estricta a la fuente: Resume únicamente los hechos reales descritos en el titular y fuente, sin inventar cifras, fechas ni datos externos.
3. El campo "efecto" DEBE ser exactamente uno de: "positive", "negative", "neutral", "uncertain".
4. El campo "tickersAfectados" debe contener al menos un ticker del catálogo o mercado general.
5. "esEducativo" debe ser true.

ESQUEMA JSON REQUERIDO:
{
  "resumen": "Resumen educativo en español (máx 2-3 frases, 30-70 palabras)",
  "efecto": "positive | negative | neutral | uncertain",
  "explicacionEfecto": "Explicación breve de cómo incide este evento de mercado en la clase de activo",
  "tickersAfectados": ["VWCE", "SXR8"],
  "esEducativo": true
}

Responde ÚNICAMENTE con el objeto JSON válido.`;

export interface AnalyzerEnv {
  geminiKey?: string;
  groqKey?: string;
  geminiModel?: string;
  groqModel?: string;
}

export interface NewsAnalysisExecutionResult {
  record: NewsAnalysisRecord;
  latencyMs: number;
  attempts: number;
}

/**
 * Analizador heurístico determinista de respaldo cuando las APIs de LLM
 * no están disponibles, no tienen saldo o están en entorno de prueba sin red.
 */
export function analyzeHeuristically(article: NewsArticle): NewsAnalysisRecord {
  const text = `${article.title} ${article.source}`.toLowerCase();
  const tickers: string[] = [];

  if (article.tickers && article.tickers.length > 0) {
    for (const t of article.tickers) {
      if (!tickers.includes(t)) tickers.push(t.toUpperCase());
    }
  }

  // Deducción por palabras clave si no vinieron tickers
  if (text.includes('oro') || text.includes('gold') || text.includes('metal')) tickers.push('SGLD');
  if (text.includes('bce') || text.includes('tipos') || text.includes('inflación') || text.includes('fed') || text.includes('bonos')) {
    tickers.push('AGGH', 'XEON');
  }
  if (text.includes('s&p') || text.includes('wall street') || text.includes('tecnol') || text.includes('ee.uu.')) {
    tickers.push('SXR8');
  }
  if (text.includes('ciberseguridad') || text.includes('software') || text.includes('hack')) {
    tickers.push('WCBR');
  }
  if (text.includes('salud') || text.includes('farma') || text.includes('sanidad')) {
    tickers.push('XDWH');
  }
  if (text.includes('consumo') || text.includes('alimentac') || text.includes('defensiv')) {
    tickers.push('XDWS');
  }

  if (tickers.length === 0) {
    tickers.push('VWCE');
  }

  // Deducción de efecto contextual
  let effect: NewsEffect = 'neutral';
  if (text.includes('sube') || text.includes('récord') || text.includes('máximo') || text.includes('impulsa') || text.includes('crece') || text.includes('positivo')) {
    effect = 'positive';
  } else if (text.includes('cae') || text.includes('desplome') || text.includes('tensión') || text.includes('crisis') || text.includes('freno') || text.includes('baja')) {
    effect = 'negative';
  } else if (text.includes('inciert') || text.includes('duda') || text.includes('volatil') || text.includes('conflicto')) {
    effect = 'uncertain';
  }

  const uniqueTickers = Array.from(new Set(tickers));
  const summary = `Noticia del mercado financiero internacional: ${article.title.trim()}. Análisis de contexto sobre las posiciones del catálogo ${uniqueTickers.join(', ')}.`;
  const rationale = `La evolución de las condiciones macroeconómicas y sectoriales incide en la rentabilidad y volatilidad esperada de ${uniqueTickers.join(', ')}.`;

  return {
    urlKey: safeNormalizeUrl(article.url),
    summary,
    effect,
    effectRationale: rationale,
    affectedTickers: uniqueTickers,
    esEducativo: true,
    provider: 'heuristic',
    model: 'rules-v1',
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    createdAt: new Date().toISOString(),
  };
}

async function callGemini(
  article: NewsArticle,
  apiKey: string,
  modelName: string
): Promise<{ rawText: string; promptTokens: number; completionTokens: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const userContent = `NOTICIA:
Titular: ${article.title}
Fuente: ${article.source} (${article.publishedAt})
Tickers sugeridos: ${(article.tickers || []).join(', ') || 'N/A'}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Gemini ${modelName} error (${resp.status}): ${errorText.slice(0, 150)}`);
  }

  const data = (await resp.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return {
    rawText,
    promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

async function callGroq(
  article: NewsArticle,
  apiKey: string,
  modelName: string
): Promise<{ rawText: string; promptTokens: number; completionTokens: number }> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const userContent = `NOTICIA:
Titular: ${article.title}
Fuente: ${article.source} (${article.publishedAt})
Tickers sugeridos: ${(article.tickers || []).join(', ') || 'N/A'}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Groq ${modelName} error (${resp.status}): ${errorText.slice(0, 150)}`);
  }

  const data = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const rawText = data.choices?.[0]?.message?.content ?? '';
  return {
    rawText,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  };
}

/**
 * Analiza una noticia mediante LLM (Gemini Flash con Groq fallback), validando
 * el esquema Zod y la ausencia total de lenguaje prescriptivo o asesoramiento.
 */
export async function analyzeNewsArticle(
  article: NewsArticle,
  env: AnalyzerEnv = {}
): Promise<NewsAnalysisExecutionResult> {
  const startTime = Date.now();
  const urlKey = safeNormalizeUrl(article.url);
  const geminiKey = env.geminiKey || process.env.GEMINI_API_KEY;
  const groqKey = env.groqKey || process.env.GROQ_API_KEY;
  const geminiModel = env.geminiModel || process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
  const groqModel = env.groqModel || process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

  let attempts = 0;

  // 1. Intentar con Gemini si hay clave
  if (geminiKey) {
    attempts++;
    try {
      const { rawText, promptTokens, completionTokens } = await callGemini(article, geminiKey, geminiModel);
      const parsed = parseAndValidateLlmOutput(rawText, urlKey, 'gemini', geminiModel, promptTokens, completionTokens);
      if (parsed) {
        return {
          record: parsed,
          latencyMs: Date.now() - startTime,
          attempts,
        };
      }
    } catch (err) {
      console.warn(`[Analyzer] Fallo en Gemini (${geminiModel}): ${err instanceof Error ? err.message : String(err)}. Probando fallback...`);
    }
  }

  // 2. Fallback a Groq si hay clave
  if (groqKey) {
    attempts++;
    try {
      const { rawText, promptTokens, completionTokens } = await callGroq(article, groqKey, groqModel);
      const parsed = parseAndValidateLlmOutput(rawText, urlKey, 'groq', groqModel, promptTokens, completionTokens);
      if (parsed) {
        return {
          record: parsed,
          latencyMs: Date.now() - startTime,
          attempts,
        };
      }
    } catch (err) {
      console.warn(`[Analyzer] Fallo en Groq (${groqModel}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 3. Fallback determinista de reglas si ningún LLM respondió satisfactoriamente
  attempts++;
  const heuristic = analyzeHeuristically(article);
  return {
    record: heuristic,
    latencyMs: Date.now() - startTime,
    attempts,
  };
}

function parseAndValidateLlmOutput(
  rawText: string,
  urlKey: string,
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): NewsAnalysisRecord | null {
  const extraction = extraerJsonDeTexto(rawText);
  if (!extraction.esValido || !extraction.parsed) return null;

  const zodResult = EsquemaAnalisisNoticia.safeParse(extraction.parsed);
  if (!zodResult.success) return null;

  const data = zodResult.data;
  const legalCheck = verificarCumplimientoLegal(`${data.resumen} ${data.explicacionEfecto}`);
  if (!legalCheck.cumple) {
    console.warn(`[Analyzer] Respuesta rechazada por infracción legal (${provider}):`, legalCheck.motivos);
    return null;
  }

  return {
    urlKey,
    summary: data.resumen.trim(),
    effect: data.efecto,
    effectRationale: data.explicacionEfecto.trim(),
    affectedTickers: data.tickersAfectados.map((t) => t.toUpperCase()),
    esEducativo: true,
    provider,
    model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    createdAt: new Date().toISOString(),
  };
}

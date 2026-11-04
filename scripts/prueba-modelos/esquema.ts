// Esquema de validación y utilidades con Zod para el análisis de noticias.
import { z } from 'zod';
import type { AnalisisNoticiaSalida } from './tipos.ts';

export const TICKERS_CATALOGO_ADMITIDOS = [
  'VWCE', // Renta variable mundial (FTSE All-World)
  'SXR8', // S&P 500
  'WCBR', // Ciberseguridad global
  'XDWH', // Sector salud mundial
  'XDWS', // Consumo defensivo / básico mundial
  'AGGH', // Renta fija global agregada en euros
  'SGLD', // Oro físico
  'XEON', // Mercado monetario euro (€STR)
] as const;

export const EsquemaAnalisisNoticia = z.object({
  resumen: z
    .string({ message: 'El resumen debe ser una cadena de texto' })
    .min(20, { message: 'El resumen es demasiado breve (mínimo 20 caracteres)' })
    .max(500, { message: 'El resumen es demasiado largo (máximo 500 caracteres)' }),
  efecto: z.enum(['positive', 'negative', 'neutral', 'uncertain'], {
    message: 'El efecto debe ser positive, negative, neutral o uncertain',
  }),
  explicacionEfecto: z
    .string({ message: 'La explicación del efecto es obligatoria' })
    .min(15, { message: 'La explicación es demasiado breve' })
    .max(500, { message: 'La explicación es demasiado extensa' }),
  tickersAfectados: z
    .array(z.string(), { message: 'tickersAfectados debe ser una lista de símbolos' })
    .min(1, { message: 'Debe indicarse al menos un ticker afectado' })
    .refine(
      (tickers) => tickers.some((t) => TICKERS_CATALOGO_ADMITIDOS.includes(t as (typeof TICKERS_CATALOGO_ADMITIDOS)[number])),
      { message: 'Al menos un ticker debe pertenecer al catálogo admitido de ETFs del simulador' }
    ),
  esEducativo: z
    .boolean({ message: 'esEducativo debe ser booleano' })
    .refine((val) => val === true, { message: 'esEducativo debe ser estrictamente true' }),
});

export const PATRONES_LENGUAJE_PROHIBIDO: RegExp[] = [
  /\bcompr(ar|a|e|ad|en|amos)\b/i,
  /\bvend(er|a|e|ed|an|emos)\b/i,
  /\binvertir\s+(en|ahora|ya)\b/i,
  /\brotar\s+(hacia|a|cartera)\b/i,
  /\brebalance(ar|a|e)\b/i,
  /\bte\s+recomend(amos|amos|o)\b/i,
  /\bdebes\s+(comprar|vender|entrar|salir)\b/i,
  /\boportunidad\s+de\s+(compra|inversión|entrada)\b/i,
  /\bhazte\s+con\b/i,
  /\bdeshazte\s+de\b/i,
];

export function verificarCumplimientoLegal(texto: string): { cumple: boolean; motivos: string[] } {
  const motivos: string[] = [];
  for (const patron of PATRONES_LENGUAJE_PROHIBIDO) {
    const coincidencia = texto.match(patron);
    if (coincidencia) {
      motivos.push(`Lenguaje prescriptivo o recomendación detectada: "${coincidencia[0]}"`);
    }
  }
  return {
    cumple: motivos.length === 0,
    motivos,
  };
}

export function extraerJsonDeTexto(textoBruto: string): { jsonLimpio: string; esValido: boolean; parsed?: unknown } {
  let limpio = textoBruto.trim();

  // Limpiar bloques Markdown de código ```json ... ```
  if (limpio.startsWith('```')) {
    limpio = limpio.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }

  // Buscar el primer { y el último }
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

export function validarRespuestaModelo(textoRespuesta: string): {
  valido: boolean;
  datos?: AnalisisNoticiaSalida;
  errores: string[];
  cumpleLegal: boolean;
  infraccionesLegales: string[];
} {
  const extraccion = extraerJsonDeTexto(textoRespuesta);
  if (!extraccion.esValido || !extraccion.parsed) {
    return {
      valido: false,
      errores: ['No se pudo extraer o parsear un JSON válido de la respuesta del modelo'],
      cumpleLegal: false,
      infraccionesLegales: [],
    };
  }

  const resultadoZod = EsquemaAnalisisNoticia.safeParse(extraccion.parsed);
  if (!resultadoZod.success) {
    const erroresZod = resultadoZod.error.issues.map(
      (issue) => `[${issue.path.join('.') || 'raíz'}]: ${issue.message}`
    );
    return {
      valido: false,
      errores: erroresZod,
      cumpleLegal: false,
      infraccionesLegales: [],
    };
  }

  const datosValidados = resultadoZod.data as AnalisisNoticiaSalida;
  const textoParaRevisionLegal = `${datosValidados.resumen} ${datosValidados.explicacionEfecto}`;
  const verificacionLegal = verificarCumplimientoLegal(textoParaRevisionLegal);

  return {
    valido: true,
    datos: datosValidados,
    errores: [],
    cumpleLegal: verificacionLegal.cumple,
    infraccionesLegales: verificacionLegal.motivos,
  };
}

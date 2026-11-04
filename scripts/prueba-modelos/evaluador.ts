// Módulo de evaluación de métricas: cálculo de fidelidad a la fuente (grounding),
// detección de alucinaciones, percentiles de latencia y estimación de costes.

import type { MetricasModelo, NoticiaEntrada, ResultadoNoticia } from './tipos.ts';
import { evaluarContraUmbrales } from './umbrales.ts';

export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizarCifra(c: string): string {
  let norm = c.replace(',', '.');
  if (/^\d{1,3}\.\d{3}$/.test(norm)) {
    norm = norm.replace('.', '');
  }
  return norm;
}

export function extraerNumerosYPorcentajes(texto: string): string[] {
  const patron = /\b\d+(?:[.,]\d+)?%?|\b\d{1,3}(?:\.\d{3})+\b/g;
  const coincidencias = texto.match(patron) ?? [];
  return [...new Set(coincidencias.map(normalizarCifra))];
}

export function evaluarFidelidad(
  noticia: NoticiaEntrada,
  resultado: ResultadoNoticia
): { puntuacionFidelidad: number; hechosRespaldados: number; alucinaciones: string[] } {
  if (!resultado.salida || !resultado.jsonValido) {
    return {
      puntuacionFidelidad: 0,
      hechosRespaldados: 0,
      alucinaciones: ['Respuesta ausente o JSON inválido'],
    };
  }

  const textoGenerado = `${resultado.salida.resumen} ${resultado.salida.explicacionEfecto}`;
  const textoGeneradoNorm = normalizarTexto(textoGenerado);
  const textoFuenteNorm = normalizarTexto(`${noticia.titular} ${noticia.extracto}`);

  let hechosRespaldados = 0;
  for (const hecho of noticia.hechosClave) {
    const hechoNorm = normalizarTexto(hecho);
    const palabrasClave = hechoNorm
      .split(' ')
      .filter((p) => p.length >= 4 && !['para', 'como', 'este', 'esta', 'estos', 'entre', 'desde'].includes(p));

    if (palabrasClave.length === 0) continue;

    const coincidencias = palabrasClave.filter((palabra) => textoGeneradoNorm.includes(palabra));
    const proporcionCoincidencia = coincidencias.length / palabrasClave.length;

    // Si al menos el 50% de las palabras clave del hecho están presentes
    if (proporcionCoincidencia >= 0.5) {
      hechosRespaldados++;
    }
  }

  const totalHechos = Math.max(1, noticia.hechosClave.length);
  const proporcionHechos = hechosRespaldados / totalHechos;

  // Detección de alucinaciones numéricas
  const numerosGenerados = extraerNumerosYPorcentajes(textoGenerado);
  const numerosFuente = extraerNumerosYPorcentajes(`${noticia.titular} ${noticia.extracto}`);
  const alucinaciones: string[] = [];

  for (const num of numerosGenerados) {
    if (num.length >= 2 && !numerosFuente.includes(num)) {
      alucinaciones.push(`Cifra o porcentaje no presente en la fuente original: "${num}"`);
    }
  }

  let puntuacionFidelidad = Math.round(proporcionHechos * 100);
  if (alucinaciones.length > 0) {
    puntuacionFidelidad = Math.max(0, puntuacionFidelidad - alucinaciones.length * 20);
  }

  return {
    puntuacionFidelidad,
    hechosRespaldados,
    alucinaciones,
  };
}

export function calcularPercentil(valores: number[], percentil: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = (percentil / 100) * (ordenados.length - 1);
  const inferior = Math.floor(indice);
  const superior = Math.ceil(indice);
  if (inferior === superior) return ordenados[inferior]!;
  const peso = indice - inferior;
  return ordenados[inferior]! * (1 - peso) + ordenados[superior]! * peso;
}

export function compilarMetricasModelo(
  modelo: string,
  proveedor: 'gemini' | 'groq',
  resultados: ResultadoNoticia[]
): MetricasModelo {
  const totalNoticias = resultados.length;
  const noticiasValidas = resultados.filter((r) => r.jsonValido && r.conformeEsquema && r.cumplePoliticaLegal).length;
  const noticiasExitoPrimerIntento = resultados.filter((r) => r.jsonValido && r.intentos === 1).length;
  const totalReintentos = resultados.reduce((acc, r) => acc + Math.max(0, r.intentos - 1), 0);

  const tasaJsonValido = totalNoticias > 0 ? (noticiasValidas / totalNoticias) * 100 : 0;
  const tasaExitoPrimerIntento = totalNoticias > 0 ? (noticiasExitoPrimerIntento / totalNoticias) * 100 : 0;
  const tasaConformidadEsquema = totalNoticias > 0 ? (resultados.filter((r) => r.conformeEsquema).length / totalNoticias) * 100 : 0;
  const tasaCumplimientoLegal = totalNoticias > 0 ? (resultados.filter((r) => r.cumplePoliticaLegal).length / totalNoticias) * 100 : 0;

  const fidelidades = resultados.map((r) => r.puntuacionFidelidad);
  const fidelidadMedia = fidelidades.length > 0 ? Math.round((fidelidades.reduce((a, b) => a + b, 0) / fidelidades.length) * 10) / 10 : 0;
  const alucinacionesTotales = resultados.reduce((acc, r) => acc + r.alucinacionesDetectadas.length, 0);

  const latencias = resultados.map((r) => r.latenciaMs);
  const latenciaMediaMs = latencias.length > 0 ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) : 0;
  const latenciaMedianaMs = Math.round(calcularPercentil(latencias, 50));
  const latenciaP95Ms = Math.round(calcularPercentil(latencias, 95));
  const latenciaMinMs = latencias.length > 0 ? Math.min(...latencias) : 0;
  const latenciaMaxMs = latencias.length > 0 ? Math.max(...latencias) : 0;

  const totalPromptTokens = resultados.reduce((acc, r) => acc + r.promptTokens, 0);
  const totalCompletionTokens = resultados.reduce((acc, r) => acc + r.completionTokens, 0);
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const mediaTokensPorNoticia = totalNoticias > 0 ? Math.round(totalTokens / totalNoticias) : 0;

  const costeTotalUsd = resultados.reduce((acc, r) => acc + r.costeUsd, 0);
  const costeTotalEur = resultados.reduce((acc, r) => acc + r.costeEur, 0);
  const costeMedioPorNoticiaEur = totalNoticias > 0 ? costeTotalEur / totalNoticias : 0;

  // Proyecciones por composición / plan diario (Regla 3 de AGENTS.md:
  // "Los reportes se generan por composición y fecha, no por usuario ni por visita")
  const costePlanDiario10NoticiasEur = costeMedioPorNoticiaEur * 10;
  const costePlanDiario20NoticiasEur = costeMedioPorNoticiaEur * 20;
  // A escala de 100 composiciones únicas al mes con 20 noticias por día
  const costeMensual100PlanesEur = costePlanDiario20NoticiasEur * 100 * 30;

  const metricasBase: Omit<MetricasModelo, 'superaUmbrales' | 'detalleUmbrales'> = {
    modelo,
    proveedor,
    totalNoticias,
    noticiasValidas,
    tasaJsonValido,
    tasaExitoPrimerIntento,
    totalReintentos,
    tasaConformidadEsquema,
    tasaCumplimientoLegal,
    fidelidadMedia,
    alucinacionesTotales,
    latenciaMediaMs,
    latenciaMedianaMs,
    latenciaP95Ms,
    latenciaMinMs,
    latenciaMaxMs,
    totalPromptTokens,
    totalCompletionTokens,
    totalTokens,
    mediaTokensPorNoticia,
    costeTotalUsd,
    costeTotalEur,
    costeMedioPorNoticiaEur,
    costePlanDiario10NoticiasEur,
    costePlanDiario20NoticiasEur,
    costeMensual100PlanesEur,
  };

  const { superaUmbrales, detalleUmbrales } = evaluarContraUmbrales(metricasBase);

  return {
    ...metricasBase,
    superaUmbrales,
    detalleUmbrales,
  };
}

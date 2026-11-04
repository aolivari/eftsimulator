// Definición de tipos de datos para el banco de pruebas comparativo (Fase 3).
// Compara Gemini Flash vs Groq en análisis de noticias financieras en español.

export interface NoticiaEntrada {
  id: string;
  titular: string;
  medio: string;
  fechaPublicacion: string;
  url: string;
  extracto: string;
  tickersEsperados: string[];
  efectoEsperado: 'positive' | 'negative' | 'neutral' | 'uncertain';
  hechosClave: string[];
}

export interface AnalisisNoticiaSalida {
  resumen: string;
  efecto: 'positive' | 'negative' | 'neutral' | 'uncertain';
  explicacionEfecto: string;
  tickersAfectados: string[];
  esEducativo: boolean;
}

export interface ResultadoNoticia {
  idNoticia: string;
  modelo: string;
  proveedor: 'gemini' | 'groq';
  salida?: AnalisisNoticiaSalida;
  jsonValido: boolean;
  conformeEsquema: boolean;
  intentos: number;
  latenciaMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costeUsd: number;
  costeEur: number;
  puntuacionFidelidad: number;
  hechosRespaldados: number;
  hechosTotales: number;
  alucinacionesDetectadas: string[];
  cumplePoliticaLegal: boolean;
  motivosInfraccionLegal: string[];
  errores: string[];
  respuestaEnBruto?: string;
}

export interface MetricasModelo {
  modelo: string;
  proveedor: 'gemini' | 'groq';
  totalNoticias: number;
  noticiasValidas: number;
  tasaJsonValido: number;
  tasaExitoPrimerIntento: number;
  totalReintentos: number;
  tasaConformidadEsquema: number;
  tasaCumplimientoLegal: number;
  fidelidadMedia: number;
  alucinacionesTotales: number;
  latenciaMediaMs: number;
  latenciaMedianaMs: number;
  latenciaP95Ms: number;
  latenciaMinMs: number;
  latenciaMaxMs: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  mediaTokensPorNoticia: number;
  costeTotalUsd: number;
  costeTotalEur: number;
  costeMedioPorNoticiaEur: number;
  costePlanDiario10NoticiasEur: number;
  costePlanDiario20NoticiasEur: number;
  costeMensual100PlanesEur: number;
  superaUmbrales: boolean;
  detalleUmbrales: Record<string, { esperado: number; obtenido: number; aprobado: boolean }>;
}

export interface UmbralesCalidad {
  tasaMinimaJsonValidoPrimerIntento: number;
  tasaMinimaJsonValidoFinal: number;
  tasaMinimaConformidadEsquema: number;
  tasaMinimaCumplimientoLegal: number;
  puntuacionMinimaFidelidad: number;
  tasaMaximaAlucinaciones: number;
  latenciaMaximaMediaMs: number;
  latenciaMaximaP95Ms: number;
  costeMaximoPorNoticiaEur: number;
  costeMaximoPlanDiario20Eur: number;
}

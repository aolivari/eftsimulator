// Umbrales de calidad prefijados antes de la ejecución del banco de pruebas (Fase 3 - Criterio 4).
// Fijar los umbrales de antemano garantiza una evaluación rigurosa y sin sesgo.

import type { MetricasModelo, UmbralesCalidad } from './tipos.ts';

export const UMBRALES_CALIDAD_PREFIJADOS: UmbralesCalidad = {
  // Confiabilidad estructural: la canalización no puede romperse por JSONs mal formados
  tasaMinimaJsonValidoPrimerIntento: 95.0, // Al menos 95% debe parsear en el primer intento
  tasaMinimaJsonValidoFinal: 100.0, // 100% debe ser JSON válido tras reintentos (cero errores fatales)
  tasaMinimaConformidadEsquema: 100.0, // 100% de cumplimiento del esquema tipado Zod

  // Seguridad legal (Regla de Producto 1: 0% de lenguaje prescriptivo / de recomendación)
  tasaMinimaCumplimientoLegal: 100.0, // Cero imperativos de compra/venta

  // Fidelidad a la fuente (Grounding)
  puntuacionMinimaFidelidad: 85.0, // 85/100 de fidelidad media a los hechos de la noticia
  tasaMaximaAlucinaciones: 5.0, // Menos de 5% de alucinaciones numéricas o factuales

  // Rendimiento y experiencia de usuario
  latenciaMaximaMediaMs: 6000, // Menos de 6 segundos de media por noticia
  latenciaMaximaP95Ms: 12000, // Menos de 12 segundos en percentil 95

  // Sostenibilidad económica en producción
  costeMaximoPorNoticiaEur: 0.001, // Menos de 0,1 céntimos de euro por noticia
  costeMaximoPlanDiario20Eur: 0.02, // Menos de 2 céntimos de euro al día por digest de 20 noticias
};

export function evaluarContraUmbrales(
  metricas: Omit<MetricasModelo, 'superaUmbrales' | 'detalleUmbrales'>,
  umbrales: UmbralesCalidad = UMBRALES_CALIDAD_PREFIJADOS
): { superaUmbrales: boolean; detalleUmbrales: MetricasModelo['detalleUmbrales'] } {
  const detalle: MetricasModelo['detalleUmbrales'] = {
    jsonValidoPrimerIntento: {
      esperado: umbrales.tasaMinimaJsonValidoPrimerIntento,
      obtenido: metricas.tasaExitoPrimerIntento,
      aprobado: metricas.tasaExitoPrimerIntento >= umbrales.tasaMinimaJsonValidoPrimerIntento,
    },
    jsonValidoFinal: {
      esperado: umbrales.tasaMinimaJsonValidoFinal,
      obtenido: metricas.tasaJsonValido,
      aprobado: metricas.tasaJsonValido >= umbrales.tasaMinimaJsonValidoFinal,
    },
    conformidadEsquema: {
      esperado: umbrales.tasaMinimaConformidadEsquema,
      obtenido: metricas.tasaConformidadEsquema,
      aprobado: metricas.tasaConformidadEsquema >= umbrales.tasaMinimaConformidadEsquema,
    },
    cumplimientoLegal: {
      esperado: umbrales.tasaMinimaCumplimientoLegal,
      obtenido: metricas.tasaCumplimientoLegal,
      aprobado: metricas.tasaCumplimientoLegal >= umbrales.tasaMinimaCumplimientoLegal,
    },
    fidelidadFuente: {
      esperado: umbrales.puntuacionMinimaFidelidad,
      obtenido: metricas.fidelidadMedia,
      aprobado: metricas.fidelidadMedia >= umbrales.puntuacionMinimaFidelidad,
    },
    latenciaMedia: {
      esperado: umbrales.latenciaMaximaMediaMs,
      obtenido: metricas.latenciaMediaMs,
      aprobado: metricas.latenciaMediaMs <= umbrales.latenciaMaximaMediaMs,
    },
    latenciaP95: {
      esperado: umbrales.latenciaMaximaP95Ms,
      obtenido: metricas.latenciaP95Ms,
      aprobado: metricas.latenciaP95Ms <= umbrales.latenciaMaximaP95Ms,
    },
    costePorNoticia: {
      esperado: umbrales.costeMaximoPorNoticiaEur,
      obtenido: metricas.costeMedioPorNoticiaEur,
      aprobado: metricas.costeMedioPorNoticiaEur <= umbrales.costeMaximoPorNoticiaEur,
    },
    costePlanDiario20: {
      esperado: umbrales.costeMaximoPlanDiario20Eur,
      obtenido: metricas.costePlanDiario20NoticiasEur,
      aprobado: metricas.costePlanDiario20NoticiasEur <= umbrales.costeMaximoPlanDiario20Eur,
    },
  };

  const superaUmbrales = Object.values(detalle).every((d) => d.aprobado);
  return { superaUmbrales, detalleUmbrales: detalle };
}

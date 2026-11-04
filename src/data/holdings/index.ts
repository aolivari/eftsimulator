import type { ComposicionETF, FicheroComposiciones, ResultadoComposicion } from '../../types/holdings';
import fichero from './composiciones.json' with { type: 'json' };

export { TOLERANCIA_PESO_PP, compararConEmisor } from './tolerancia.ts';
export type { DesviacionPosicion } from './tolerancia.ts';
export { validarComposicion, ComposicionInvalidaError } from './validar.ts';
export { parsearYahooTopHoldings, parsearCsvIshares, FormatoDesconocidoError } from './parsers.ts';

const datos = fichero as unknown as FicheroComposiciones;

/** Todas las composiciones guardadas (incluidas las marcadas "sin datos"). */
export function listarComposiciones(): ComposicionETF[] {
  return datos.composiciones;
}

/**
 * Composición de un ETF del catálogo. Si no hay registro o la fuente no publica
 * composición, devuelve `sin_datos` con el motivo: nunca ceros inventados.
 */
export function getComposicion(etfId: string): ResultadoComposicion {
  const c = datos.composiciones.find((x) => x.etfId === etfId);
  if (!c) return { estado: 'sin_datos', etfId, motivo: 'ETF sin composición registrada' };
  if (c.estado === 'sin_datos') return { estado: 'sin_datos', etfId, motivo: c.motivoSinDatos ?? 'Sin datos' };
  return { estado: 'ok', composicion: c };
}

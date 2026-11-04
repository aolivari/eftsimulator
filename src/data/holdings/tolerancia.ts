import type { ComposicionETF } from '../../types/holdings';

/**
 * Tolerancia FIJADA ANTES de empezar (criterio de aceptación 4):
 * el peso de cada una de las principales posiciones puede diferir de la web del
 * emisor, como máximo, 0,10 puntos porcentuales en valor absoluto.
 * No se amplía para que un dato "pase": si no cuadra, se investiga.
 */
export const TOLERANCIA_PESO_PP = 0.1;

export interface DesviacionPosicion {
  nombre: string;
  pesoCalculado: number | null;
  pesoEmisor: number;
  diferenciaPP: number | null;
  dentroDeTolerancia: boolean;
}

/** Compara las posiciones guardadas con las publicadas por el emisor (cotejo manual o CSV). */
export function compararConEmisor(
  composicion: ComposicionETF,
  referenciaEmisor: Array<{ nombre: string; pesoPct: number }>,
  tolerancia: number = TOLERANCIA_PESO_PP,
): DesviacionPosicion[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const guardadas = composicion.posiciones ?? [];
  return referenciaEmisor.map((ref) => {
    const hallada = guardadas.find(
      (p) => norm(p.nombre) === norm(ref.nombre) || (p.simbolo && norm(p.simbolo) === norm(ref.nombre)),
    );
    if (!hallada) {
      return { nombre: ref.nombre, pesoCalculado: null, pesoEmisor: ref.pesoPct, diferenciaPP: null, dentroDeTolerancia: false };
    }
    const diferenciaPP = Math.abs(hallada.pesoPct - ref.pesoPct);
    return {
      nombre: ref.nombre,
      pesoCalculado: hallada.pesoPct,
      pesoEmisor: ref.pesoPct,
      diferenciaPP,
      dentroDeTolerancia: diferenciaPP <= tolerancia,
    };
  });
}

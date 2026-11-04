import type { ComposicionETF, PesoExposicion, PosicionETF } from '../../types/holdings';

export class ComposicionInvalidaError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ComposicionInvalidaError';
  }
}

const MARGEN_SUMA = 100.5; // redondeos del emisor
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function pesoValido(p: number): boolean {
  return Number.isFinite(p) && p > 0 && p <= 100;
}

function validarBloque(nombreBloque: string, bloque: Array<PosicionETF | PesoExposicion>): void {
  if (bloque.length === 0) {
    throw new ComposicionInvalidaError(`${nombreBloque}: bloque vacío (sin datos debe ser null, no [])`);
  }
  let suma = 0;
  let anterior = Infinity;
  for (const item of bloque) {
    if (!item.nombre || !item.nombre.trim()) throw new ComposicionInvalidaError(`${nombreBloque}: elemento sin nombre`);
    if (!pesoValido(item.pesoPct)) {
      throw new ComposicionInvalidaError(`${nombreBloque}: peso inválido para "${item.nombre}" (${item.pesoPct})`);
    }
    if (item.pesoPct > anterior) throw new ComposicionInvalidaError(`${nombreBloque}: no está ordenado por peso descendente`);
    anterior = item.pesoPct;
    suma += item.pesoPct;
  }
  if (suma > MARGEN_SUMA) {
    throw new ComposicionInvalidaError(`${nombreBloque}: los pesos suman ${suma.toFixed(2)} % (> 100 %)`);
  }
}

/** Lanza ComposicionInvalidaError si la composición no es coherente. Nunca corrige datos. */
export function validarComposicion(c: ComposicionETF): void {
  if (!c.etfId || !c.ticker) throw new ComposicionInvalidaError('Falta etfId o ticker');
  if (!c.fuente?.nombre || !c.fuente.referencia) throw new ComposicionInvalidaError('Falta la fuente');
  if (!FECHA_ISO.test(c.fuente.fechaActualizacion)) throw new ComposicionInvalidaError('fechaActualizacion no es AAAA-MM-DD');
  if (c.fuente.fechaDatosFuente !== null && !FECHA_ISO.test(c.fuente.fechaDatosFuente)) {
    throw new ComposicionInvalidaError('fechaDatosFuente no es AAAA-MM-DD ni null');
  }

  if (c.estado === 'sin_datos') {
    if (!c.motivoSinDatos) throw new ComposicionInvalidaError('sin_datos requiere motivoSinDatos');
    if (c.posiciones || c.sectores || c.paises) {
      throw new ComposicionInvalidaError('sin_datos no puede traer bloques de composición');
    }
    return;
  }

  if (!c.posiciones) throw new ComposicionInvalidaError('estado ok requiere posiciones');
  validarBloque('posiciones', c.posiciones);
  if (c.sectores) validarBloque('sectores', c.sectores);
  if (c.paises) validarBloque('paises', c.paises);
}

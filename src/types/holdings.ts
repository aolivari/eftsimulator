// Tipos de la composición verificada de los ETF (posiciones, sectores y países).
// Viven aparte de types/index.ts a propósito: el dominio de composición es independiente.

/** Posición individual de un ETF. `pesoPct` es un porcentaje como número: 5.03 = 5,03 %. */
export interface PosicionETF {
  simbolo?: string;
  nombre: string;
  pesoPct: number;
}

/** Peso de un sector o de un país dentro de un ETF (porcentaje como número). */
export interface PesoExposicion {
  nombre: string;
  pesoPct: number;
}

/** Procedencia del dato: de dónde sale y cuándo se descargó. */
export interface FuenteComposicion {
  /** Identificador legible de la fuente (ej. 'yahoo-finance', 'ishares-csv'). */
  nombre: string;
  /** Símbolo o URL consultada. */
  referencia: string;
  /** Fecha ISO (AAAA-MM-DD) en que se descargó. */
  fechaActualizacion: string;
  /** Fecha de valoración que publica la fuente, si la publica. */
  fechaDatosFuente: string | null;
}

/**
 * Composición de un ETF. Cada bloque es `null` cuando la fuente no lo ofrece:
 * "sin datos" NUNCA se representa con un array vacío ni con 0 %.
 */
export interface ComposicionETF {
  etfId: string;
  ticker: string;
  isin?: string;
  estado: 'ok' | 'sin_datos';
  /** Solo si `estado === 'sin_datos'`: por qué no hay composición. */
  motivoSinDatos?: string;
  /** Principales posiciones, ordenadas por peso descendente. */
  posiciones: PosicionETF[] | null;
  sectores: PesoExposicion[] | null;
  paises: PesoExposicion[] | null;
  fuente: FuenteComposicion;
}

/** Fichero persistido en src/data/holdings/composiciones.json. */
export interface FicheroComposiciones {
  generado: string;
  composiciones: ComposicionETF[];
}

/** Resultado de consultar un ETF: o hay composición, o consta como "sin datos". */
export type ResultadoComposicion =
  | { estado: 'ok'; composicion: ComposicionETF }
  | { estado: 'sin_datos'; etfId: string; motivo: string };

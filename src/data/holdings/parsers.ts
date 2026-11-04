import type { PesoExposicion, PosicionETF } from '../../types/holdings';

/** La fuente respondió, pero con un formato que no reconocemos. Nunca se guarda nada parcial. */
export class FormatoDesconocidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'FormatoDesconocidoError';
  }
}

export const MAX_POSICIONES = 10;

export interface ComposicionParseada {
  posiciones: PosicionETF[] | null;
  sectores: PesoExposicion[] | null;
  paises: PesoExposicion[] | null;
}

const redondear = (n: number) => Math.round(n * 10000) / 10000;

const SECTORES_YAHOO: Record<string, string> = {
  realestate: 'Inmobiliario',
  consumer_cyclical: 'Consumo cíclico',
  basic_materials: 'Materiales básicos',
  consumer_defensive: 'Consumo defensivo',
  technology: 'Tecnología',
  communication_services: 'Comunicaciones',
  financial_services: 'Servicios financieros',
  utilities: 'Servicios públicos',
  industrials: 'Industriales',
  energy: 'Energía',
  healthcare: 'Salud',
};

/**
 * Parsea el módulo `topHoldings` de Yahoo Finance (pesos como fracción 0-1).
 * Devuelve bloques `null` si la fuente no publica composición (p. ej. ETF de bonos u oro).
 * Lanza FormatoDesconocidoError si la estructura no es la esperada.
 */
export function parsearYahooTopHoldings(raw: unknown): ComposicionParseada {
  if (raw === null || raw === undefined) return { posiciones: null, sectores: null, paises: null };
  if (typeof raw !== 'object') throw new FormatoDesconocidoError('topHoldings no es un objeto');
  const t = raw as { holdings?: unknown; sectorWeightings?: unknown };

  let posiciones: PosicionETF[] | null = null;
  if (t.holdings !== undefined) {
    if (!Array.isArray(t.holdings)) throw new FormatoDesconocidoError('holdings no es un array');
    if (t.holdings.length > 0) {
      const lista: PosicionETF[] = t.holdings.map((h, i) => {
        const nombre = h?.holdingName;
        const peso = h?.holdingPercent;
        if (typeof nombre !== 'string' || typeof peso !== 'number') {
          throw new FormatoDesconocidoError(`holdings[${i}] sin holdingName/holdingPercent`);
        }
        return { simbolo: typeof h.symbol === 'string' ? h.symbol : undefined, nombre, pesoPct: redondear(peso * 100) };
      });
      lista.sort((a, b) => b.pesoPct - a.pesoPct);
      posiciones = lista.slice(0, MAX_POSICIONES);
    }
  }

  let sectores: PesoExposicion[] | null = null;
  if (t.sectorWeightings !== undefined) {
    if (!Array.isArray(t.sectorWeightings)) throw new FormatoDesconocidoError('sectorWeightings no es un array');
    const lista: PesoExposicion[] = [];
    for (const entrada of t.sectorWeightings) {
      if (typeof entrada !== 'object' || entrada === null) {
        throw new FormatoDesconocidoError('sectorWeightings con elemento no válido');
      }
      for (const [clave, valor] of Object.entries(entrada)) {
        if (typeof valor !== 'number') throw new FormatoDesconocidoError(`sector ${clave} sin peso numérico`);
        if (valor <= 0) continue; // un sector sin peso no es dato: se omite, no se guarda como 0 %
        const nombre = SECTORES_YAHOO[clave];
        if (!nombre) throw new FormatoDesconocidoError(`sector desconocido: ${clave}`);
        lista.push({ nombre, pesoPct: redondear(valor * 100) });
      }
    }
    if (lista.length > 0) sectores = lista.sort((a, b) => b.pesoPct - a.pesoPct);
  }

  // Yahoo no publica el desglose por países.
  return { posiciones, sectores, paises: null };
}

/** Separa una línea CSV respetando comillas. */
function separarCsv(linea: string): string[] {
  const campos: string[] = [];
  let actual = '';
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (ch === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else entreComillas = !entreComillas;
    } else if (ch === ',' && !entreComillas) {
      campos.push(actual);
      actual = '';
    } else actual += ch;
  }
  campos.push(actual);
  return campos.map((c) => c.trim());
}

const aNumero = (s: string): number => Number(s.replace(/,/g, ''));

function agregar(mapa: Map<string, number>): PesoExposicion[] | null {
  const lista = [...mapa.entries()]
    .map(([nombre, pesoPct]) => ({ nombre, pesoPct: redondear(pesoPct) }))
    .filter((x) => x.pesoPct > 0)
    .sort((a, b) => b.pesoPct - a.pesoPct);
  return lista.length > 0 ? lista : null;
}

/**
 * Parsea el CSV de posiciones que publica iShares (con preámbulo y columnas
 * Ticker, Name, Sector, Weight (%), Location). Agrega sectores y países.
 * Lanza FormatoDesconocidoError si falta la cabecera o alguna columna esencial.
 */
export function parsearCsvIshares(texto: string): ComposicionParseada {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/);
  const iCab = lineas.findIndex((l) => /^"?Ticker"?,/.test(l));
  if (iCab < 0) throw new FormatoDesconocidoError('CSV iShares: no se encuentra la cabecera "Ticker,..."');
  const cab = separarCsv(lineas[iCab]);
  const iTicker = cab.indexOf('Ticker');
  const iNombre = cab.indexOf('Name');
  const iSector = cab.indexOf('Sector');
  const iPeso = cab.indexOf('Weight (%)');
  const iPais = cab.indexOf('Location');
  if ([iTicker, iNombre, iSector, iPeso, iPais].some((i) => i < 0)) {
    throw new FormatoDesconocidoError('CSV iShares: faltan columnas (Ticker, Name, Sector, Weight (%), Location)');
  }

  const posiciones: PosicionETF[] = [];
  const sectores = new Map<string, number>();
  const paises = new Map<string, number>();
  for (const linea of lineas.slice(iCab + 1)) {
    if (!linea.trim()) continue;
    const c = separarCsv(linea);
    if (c.length < cab.length - 2) continue; // pie legal del fichero
    const peso = aNumero(c[iPeso]);
    if (!Number.isFinite(peso)) throw new FormatoDesconocidoError(`CSV iShares: peso no numérico en "${c[iNombre]}"`);
    if (peso <= 0) continue;
    posiciones.push({ simbolo: c[iTicker] && c[iTicker] !== '-' ? c[iTicker] : undefined, nombre: c[iNombre], pesoPct: peso });
    const sector = c[iSector] && c[iSector] !== '-' ? c[iSector] : 'Otros / efectivo';
    sectores.set(sector, (sectores.get(sector) ?? 0) + peso);
    const pais = c[iPais] && c[iPais] !== '-' ? c[iPais] : 'Otros / efectivo';
    paises.set(pais, (paises.get(pais) ?? 0) + peso);
  }
  if (posiciones.length === 0) throw new FormatoDesconocidoError('CSV iShares: ninguna posición con peso');

  posiciones.sort((a, b) => b.pesoPct - a.pesoPct);
  return {
    posiciones: posiciones.slice(0, MAX_POSICIONES).map((p) => ({ ...p, pesoPct: redondear(p.pesoPct) })),
    sectores: agregar(sectores),
    paises: agregar(paises),
  };
}

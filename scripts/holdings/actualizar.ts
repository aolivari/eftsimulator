// Actualiza src/data/holdings/composiciones.json con la composición de cada ETF del catálogo.
// Uso: npm run datos:composicion            (todos)  |  npm run datos:composicion -- vwce sxr8
//
// Garantías:
//  - Cada ETF se parsea Y se valida antes de aceptarse. Si falla, se registra el error en
//    src/data/holdings/errores.log y se conserva el registro anterior (nada parcial).
//  - Si la fuente responde pero no publica composición, el ETF queda como 'sin_datos'.
//  - El fichero se escribe una sola vez, de forma atómica (temporal + renombrado).
import { appendFile, readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import YahooFinance from 'yahoo-finance2';
import { POPULAR_ETFS } from '../../src/data/etfList.ts';
import { parsearYahooTopHoldings } from '../../src/data/holdings/parsers.ts';
import { validarComposicion } from '../../src/data/holdings/validar.ts';
import type { ComposicionETF, FicheroComposiciones } from '../../src/types/holdings.ts';

const DIR = fileURLToPath(new URL('../../src/data/holdings/', import.meta.url));
const RUTA_DATOS = DIR + 'composiciones.json';
const RUTA_LOG = DIR + 'errores.log';

/** Símbolo de Yahoo Finance de cada ETF del catálogo (cotización en euros). */
const SIMBOLOS: Record<string, string> = {
  vwce: 'VWCE.DE',
  sxr8: 'SXR8.DE',
  wcbr: 'WCBR.MI',
  xdwh: 'XDWH.DE',
  xdws: 'XDWS.DE',
  aggh: 'AGGH.MI',
  sgld: 'SGLD.MI',
  xeon: 'XEON.DE',
};

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const hoy = new Date().toISOString().slice(0, 10);

async function registrarError(etfId: string, error: unknown) {
  const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const linea = `${new Date().toISOString()} [${etfId}] ${msg}\n`;
  console.error('✗', linea.trim());
  await appendFile(RUTA_LOG, linea, 'utf8');
}

async function obtener(etf: (typeof POPULAR_ETFS)[number]): Promise<ComposicionETF> {
  const simbolo = SIMBOLOS[etf.id];
  if (!simbolo) throw new Error(`Sin símbolo de fuente configurado para ${etf.id}`);
  const resp = await yf.quoteSummary(simbolo, { modules: ['topHoldings'] });
  const parseada = parsearYahooTopHoldings(resp.topHoldings);

  const base = {
    etfId: etf.id,
    ticker: etf.ticker,
    isin: etf.isin,
    fuente: { nombre: 'yahoo-finance', referencia: simbolo, fechaActualizacion: hoy, fechaDatosFuente: null },
  };
  const composicion: ComposicionETF = parseada.posiciones
    ? { ...base, estado: 'ok', ...parseada }
    : {
        ...base,
        estado: 'sin_datos',
        motivoSinDatos: 'La fuente no publica composición para este ETF (bonos, oro o monetario)',
        posiciones: null,
        sectores: null,
        paises: null,
      };
  validarComposicion(composicion);
  return composicion;
}

async function main() {
  const filtro = process.argv.slice(2);
  const objetivo = POPULAR_ETFS.filter((e) => filtro.length === 0 || filtro.includes(e.id));
  if (objetivo.length === 0) throw new Error(`Ningún ETF coincide con: ${filtro.join(', ')}`);

  let previo: FicheroComposiciones = { generado: '', composiciones: [] };
  try {
    previo = JSON.parse(await readFile(RUTA_DATOS, 'utf8'));
  } catch {
    /* primer uso */
  }
  const porId = new Map(previo.composiciones.map((c) => [c.etfId, c]));

  let fallos = 0;
  for (const etf of objetivo) {
    try {
      porId.set(etf.id, await obtener(etf));
      console.log('✓', etf.id);
    } catch (e) {
      fallos++;
      await registrarError(etf.id, e); // se conserva el registro anterior, si existía
    }
  }

  const resultado: FicheroComposiciones = {
    generado: new Date().toISOString(),
    composiciones: POPULAR_ETFS.map((e) => porId.get(e.id)).filter((c): c is ComposicionETF => !!c),
  };
  await writeFile(RUTA_DATOS + '.tmp', JSON.stringify(resultado, null, 2) + '\n', 'utf8');
  await rename(RUTA_DATOS + '.tmp', RUTA_DATOS);
  console.log(`Hecho: ${objetivo.length - fallos} actualizados, ${fallos} con error.`);
  if (fallos > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

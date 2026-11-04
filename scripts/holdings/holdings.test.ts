// Pruebas de la composición de ETF. Ejecutar: npm run test:holdings
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getComposicion, listarComposiciones } from '../../src/data/holdings/index.ts';
import { FormatoDesconocidoError, parsearCsvIshares, parsearYahooTopHoldings } from '../../src/data/holdings/parsers.ts';
import { TOLERANCIA_PESO_PP, compararConEmisor } from '../../src/data/holdings/tolerancia.ts';
import { ComposicionInvalidaError, validarComposicion } from '../../src/data/holdings/validar.ts';
import { POPULAR_ETFS } from '../../src/data/etfList.ts';
import type { ComposicionETF } from '../../src/types/holdings.ts';

const CSV = `iShares Core S&P 500 UCITS ETF
Fund Holdings as of,"Nov 03, 2026"

Ticker,Name,Sector,Asset Class,Market Value,Weight (%),Notional Value,Shares,Price,Location,Exchange,Currency
"NVDA","NVIDIA CORP","Information Technology","Equity","1,000","8.50","1,000","10","100","United States","NASDAQ","USD"
"AAPL","APPLE INC","Information Technology","Equity","900","7.50","900","10","90","United States","NASDAQ","USD"
"NESN","NESTLE SA","Consumer Staples","Equity","100","1.00","100","10","10","Switzerland","SIX","CHF"
"-","USD CASH","Cash and/or Derivatives","Cash","10","0.10","10","10","1","-","-","USD"

"The content contained herein is owned by BlackRock"
`;

test('CSV iShares: posiciones, sectores y países', () => {
  const r = parsearCsvIshares(CSV);
  assert.equal(r.posiciones?.[0].nombre, 'NVIDIA CORP');
  assert.equal(r.posiciones?.[0].pesoPct, 8.5);
  assert.equal(r.sectores?.[0].nombre, 'Information Technology');
  assert.equal(r.sectores?.[0].pesoPct, 16);
  assert.equal(r.paises?.[0].nombre, 'United States');
  assert.equal(r.paises?.[0].pesoPct, 16);
});

test('CSV iShares: formato cambiado → error, no datos parciales', () => {
  assert.throws(() => parsearCsvIshares('<html>nuevo formato</html>'), FormatoDesconocidoError);
  assert.throws(() => parsearCsvIshares(CSV.replace('Weight (%)', 'Peso')), FormatoDesconocidoError);
  assert.throws(() => parsearCsvIshares(CSV.replace('"8.50"', '"abc"')), FormatoDesconocidoError);
});

test('Yahoo: convierte fracciones a % y ordena', () => {
  const r = parsearYahooTopHoldings({
    holdings: [
      { symbol: 'B', holdingName: 'B Inc', holdingPercent: 0.02 },
      { symbol: 'A', holdingName: 'A Inc', holdingPercent: 0.05 },
    ],
    sectorWeightings: [{ technology: 0.6 }, { energy: 0 }, { healthcare: 0.4 }],
  });
  assert.deepEqual(r.posiciones?.map((p) => p.pesoPct), [5, 2]);
  assert.equal(r.sectores?.length, 2); // el sector al 0 % se omite
  assert.equal(r.paises, null);
});

test('Yahoo: sin composición → null (sin datos), no 0 %', () => {
  assert.deepEqual(parsearYahooTopHoldings({ holdings: [], sectorWeightings: [] }), {
    posiciones: null,
    sectores: null,
    paises: null,
  });
  assert.deepEqual(parsearYahooTopHoldings(undefined).posiciones, null);
});

test('Yahoo: estructura cambiada → error', () => {
  assert.throws(() => parsearYahooTopHoldings({ holdings: 'x' }), FormatoDesconocidoError);
  assert.throws(() => parsearYahooTopHoldings({ holdings: [{ nombre: 'x' }] }), FormatoDesconocidoError);
  assert.throws(() => parsearYahooTopHoldings({ sectorWeightings: [{ inventado: 0.5 }] }), FormatoDesconocidoError);
});

const base: ComposicionETF = {
  etfId: 'x',
  ticker: 'X',
  estado: 'ok',
  posiciones: [{ nombre: 'A', pesoPct: 5 }],
  sectores: [{ nombre: 'S', pesoPct: 100 }],
  paises: null,
  fuente: { nombre: 'f', referencia: 'r', fechaActualizacion: '2026-11-04', fechaDatosFuente: null },
};

test('validación: rechaza datos incoherentes', () => {
  validarComposicion(base);
  assert.throws(() => validarComposicion({ ...base, posiciones: [] }), ComposicionInvalidaError);
  assert.throws(() => validarComposicion({ ...base, posiciones: [{ nombre: 'A', pesoPct: 0 }] }), ComposicionInvalidaError);
  assert.throws(() => validarComposicion({ ...base, sectores: [{ nombre: 'S', pesoPct: 60 }, { nombre: 'T', pesoPct: 60 }] }), ComposicionInvalidaError);
  assert.throws(() => validarComposicion({ ...base, fuente: { ...base.fuente, fechaActualizacion: 'ayer' } }), ComposicionInvalidaError);
  assert.throws(() => validarComposicion({ ...base, estado: 'sin_datos' }), ComposicionInvalidaError);
});

test('tolerancia fijada en 0,10 pp y comparación con el emisor', () => {
  assert.equal(TOLERANCIA_PESO_PP, 0.1);
  const [ok, fuera, falta] = compararConEmisor(base, [
    { nombre: 'A', pesoPct: 5.08 },
    { nombre: 'A', pesoPct: 5.5 },
    { nombre: 'Z', pesoPct: 1 },
  ]);
  assert.equal(ok.dentroDeTolerancia, true);
  assert.equal(fuera.dentroDeTolerancia, false);
  assert.equal(falta.dentroDeTolerancia, false);
});

test('datos guardados: todo ETF del catálogo está registrado, es válido y tiene fecha y fuente', () => {
  for (const etf of POPULAR_ETFS) {
    const r = getComposicion(etf.id);
    if (r.estado === 'ok') {
      validarComposicion(r.composicion);
      assert.ok(r.composicion.fuente.fechaActualizacion && r.composicion.fuente.nombre);
    } else {
      assert.ok(r.motivo, `${etf.id} sin motivo`);
    }
  }
  assert.equal(listarComposiciones().length, POPULAR_ETFS.length);
});

test('ETF sin composición → sin_datos, nunca 0 %', () => {
  for (const id of ['aggh', 'sgld', 'xeon', 'no-existe']) {
    const r = getComposicion(id);
    assert.equal(r.estado, 'sin_datos');
  }
  for (const c of listarComposiciones().filter((x) => x.estado === 'sin_datos')) {
    assert.equal(c.posiciones, null);
    assert.equal(c.sectores, null);
    assert.equal(c.paises, null);
  }
});

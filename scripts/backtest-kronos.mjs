/**
 * Backtest de Kronos sobre ETFs diarios.
 *
 * Para cada ETF y cada fin de mes pasado pide al servicio Kronos una predicción usando SOLO
 * datos hasta esa fecha (?asof=) y la compara con lo que ocurrió en las 63 sesiones siguientes.
 * Se compara contra referencias sencillas:
 *   - Dirección: "siempre sube" y la frecuencia histórica de subidas.
 *   - Volatilidad: "los próximos 3 meses tendrán la volatilidad de los últimos 3".
 *
 * Uso:  node scripts/backtest-kronos.mjs [VWCE,SXR8,...] [meses=24] ["model=small&temperature=1.3&detrend=true"]
 * Lee KRONOS_SERVICE_URL, KRONOS_API_KEY y GCP_SERVICE_ACCOUNT_KEY de .env.local.
 */
import fs from 'node:fs';
import path from 'node:path';
import { GoogleAuth } from 'google-auth-library';
import YahooFinance from 'yahoo-finance2';

const HORIZON = 63;
const SAMPLES = 16;
const PARALLEL = 3; // = max-instances del servicio en Cloud Run
const Z80 = 1.2816; // percentil 90 de la normal (rango P10–P90)

const tickers = (process.argv[2] || 'VWCE,SXR8,XDWH,SGLD').split(',').map((t) => t.trim().toUpperCase());
const months = Number(process.argv[3] || 24);
const extraQuery = process.argv[4] || ''; // parámetros del experimento para el servicio
const label = extraQuery ? extraQuery.replace(/[^a-z0-9.=]+/gi, '_') : 'default';

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
);
const baseUrl = env.KRONOS_SERVICE_URL.replace(/\/$/, '');
const authClient = env.GCP_SERVICE_ACCOUNT_KEY
  ? await new GoogleAuth({
      credentials: JSON.parse(Buffer.from(env.GCP_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8')),
    }).getIdTokenClient(baseUrl)
  : null;

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

async function dailyCloses(symbol) {
  const chart = await yf.chart(symbol, { period1: '2018-01-01', interval: '1d' }, { validateResult: false });
  return chart.quotes
    .filter((q) => (q.adjclose ?? q.close) > 0)
    .map((q) => ({ date: new Date(q.date).toISOString().slice(0, 10), close: q.adjclose ?? q.close }));
}

function logReturns(closes) {
  const out = [];
  for (let i = 1; i < closes.length; i++) out.push(Math.log(closes[i] / closes[i - 1]));
  return out;
}

function std(xs) {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

function corr(a, b) {
  const ma = a.reduce((s, x) => s + x, 0) / a.length;
  const mb = b.reduce((s, x) => s + x, 0) / b.length;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const annual = (d) => d * Math.sqrt(252);
const fmtPct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;

async function callKronos(ticker, asof) {
  const url = `${baseUrl}/forecast?ticker=${ticker}&asof=${asof}&samples=${SAMPLES}&horizon=${HORIZON}&compact=true${extraQuery ? `&${extraQuery}` : ''}`;
  const headers = { 'x-api-key': env.KRONOS_API_KEY, ...(authClient ? await authClient.getRequestHeaders() : {}) };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(290_000) });
    if (res.ok) return res.json();
    if (attempt === 3 || res.status < 500) throw new Error(`${ticker} ${asof}: HTTP ${res.status} ${await res.text()}`);
  }
}

// ─── 1. Fechas de corte y resultados reales ───
const jobs = [];
const realized = {};
for (const ticker of tickers) {
  const first = await callKronos(ticker, new Date().toISOString().slice(0, 10)).catch((e) => {
    console.error(`Saltando ${ticker}: ${e.message}`);
    return null;
  });
  if (!first) continue;
  const series = await dailyCloses(first.symbol);
  realized[ticker] = series;

  const monthEnds = [];
  for (let i = 0; i < series.length - 1; i++) {
    if (series[i].date.slice(0, 7) !== series[i + 1].date.slice(0, 7)) monthEnds.push(i);
  }
  const usable = monthEnds.filter((i) => i + HORIZON < series.length && i >= HORIZON + 1).slice(-months);
  for (const i of usable) jobs.push({ ticker, i, asof: series[i].date });
}

console.log(`Backtest: ${jobs.length} predicciones (${tickers.join(', ')}; ${months} meses; ${SAMPLES} trayectorias; horizonte ${HORIZON} sesiones)\n`);

// ─── 2. Predicciones en paralelo ───
const rows = [];
let done = 0;
async function worker() {
  while (jobs.length) {
    const job = jobs.shift();
    const series = realized[job.ticker];
    try {
      const f = await callKronos(job.ticker, job.asof);
      const closes = series.map((s) => s.close);
      const future = closes.slice(job.i, job.i + HORIZON + 1);
      const past = closes.slice(job.i - HORIZON, job.i + 1);
      rows.push({
        ticker: job.ticker,
        asof: job.asof,
        modelAsOf: f.asOf,
        realizedReturn: future[future.length - 1] / future[0] - 1,
        realizedVol: std(logReturns(future)),
        naiveVol: std(logReturns(past)),
        kronosVol: f.predictedDailyVol,
        kronosUpProb: f.upsideProb,
        kronosP10: f.terminalReturn.p10,
        kronosP50: f.terminalReturn.p50,
        kronosP90: f.terminalReturn.p90,
      });
    } catch (e) {
      console.error(`  error ${job.ticker} ${job.asof}: ${e.message}`);
    }
    done++;
    if (done % 10 === 0) console.log(`  ${done} completadas...`);
  }
}
await Promise.all(Array.from({ length: PARALLEL }, worker));

// ─── 3. Métricas ───
function evaluate(rs) {
  const up = rs.map((r) => (r.realizedReturn > 0 ? 1 : 0));
  const baseRate = mean(up);
  const hitKronos = mean(rs.map((r, i) => ((r.kronosUpProb > 0.5 ? 1 : 0) === up[i] ? 1 : 0)));
  const brierKronos = mean(rs.map((r, i) => (r.kronosUpProb - up[i]) ** 2));
  const brierBase = mean(up.map((u) => (baseRate - u) ** 2));

  const real = rs.map((r) => annual(r.realizedVol));
  const kron = rs.map((r) => annual(r.kronosVol));
  const naive = rs.map((r) => annual(r.naiveVol));
  const maeK = mean(real.map((v, i) => Math.abs(v - kron[i])));
  const maeN = mean(real.map((v, i) => Math.abs(v - naive[i])));

  // Cobertura del rango P10–P90 sin sesgo (centrado en la rentabilidad media realizada)
  const drift = mean(rs.map((r) => Math.log(1 + r.realizedReturn)));
  const covK = mean(
    rs.map((r) => {
      const x = Math.log(1 + r.realizedReturn) - drift;
      const lo = Math.log(1 + r.kronosP10) - Math.log(1 + r.kronosP50);
      const hi = Math.log(1 + r.kronosP90) - Math.log(1 + r.kronosP50);
      return x >= lo && x <= hi ? 1 : 0;
    })
  );
  const covN = mean(
    rs.map((r) => {
      const x = Math.log(1 + r.realizedReturn) - drift;
      const half = Z80 * r.naiveVol * Math.sqrt(HORIZON);
      return Math.abs(x) <= half ? 1 : 0;
    })
  );

  return {
    n: rs.length,
    realizedUpRate: baseRate,
    meanRealizedReturn: mean(rs.map((r) => r.realizedReturn)),
    meanKronosMedian: mean(rs.map((r) => r.kronosP50)),
    direction: { hitKronos, hitAlwaysUp: baseRate, brierKronos, brierBaseRate: brierBase },
    volatility: {
      maeKronos: maeK,
      maeNaive: maeN,
      corrKronos: corr(kron, real),
      corrNaive: corr(naive, real),
    },
    rangeCoverage80: { kronos: covK, naive: covN },
  };
}

const byTicker = Object.fromEntries(tickers.filter((t) => rows.some((r) => r.ticker === t)).map((t) => [t, evaluate(rows.filter((r) => r.ticker === t))]));
const overall = evaluate(rows);

console.log('\nResultados por ETF');
console.table(
  Object.fromEntries(
    Object.entries({ ...byTicker, TODOS: overall }).map(([t, m]) => [
      t,
      {
        n: m.n,
        'subió (real)': fmtPct(m.realizedUpRate, 0),
        'rent. media real': fmtPct(m.meanRealizedReturn),
        'mediana Kronos': fmtPct(m.meanKronosMedian),
        'acierto dir. Kronos': fmtPct(m.direction.hitKronos, 0),
        'acierto "siempre sube"': fmtPct(m.direction.hitAlwaysUp, 0),
        'error vol Kronos': fmtPct(m.volatility.maeKronos),
        'error vol ingenuo': fmtPct(m.volatility.maeNaive),
        'corr vol Kronos': m.volatility.corrKronos.toFixed(2),
        'corr vol ingenuo': m.volatility.corrNaive.toFixed(2),
        'cobertura P10–P90 Kronos': fmtPct(m.rangeCoverage80.kronos, 0),
        'cobertura P10–P90 ingenuo': fmtPct(m.rangeCoverage80.naive, 0),
      },
    ])
  )
);

const outDir = path.join('scripts', 'backtest-output');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `kronos-${new Date().toISOString().slice(0, 10)}-${label}.json`);
fs.writeFileSync(outFile, JSON.stringify({ config: { tickers, months, HORIZON, SAMPLES, extraQuery }, overall, byTicker, rows }, null, 2));
console.log(`\nDetalle guardado en ${outFile}`);

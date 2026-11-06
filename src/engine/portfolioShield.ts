import type { AssetClass, ETFAsset, PortfolioShieldLabel, PortfolioShieldResult } from '../types';
import { detectAssetClass } from './cycleSimulator';

type ShieldRole = 'offensive' | 'buffer' | 'cash';

const ROLE_BY_CLASS: Record<AssetClass, ShieldRole> = {
  global_equity: 'offensive',
  sp500: 'offensive',
  tech: 'offensive',
  defensive_equity: 'offensive',
  bonds: 'buffer',
  gold: 'buffer',
  cash: 'cash',
};

/** Por encima de este % ofensivo (sin llegar a 100) la cartera es equilibrada; por debajo o igual, conservadora. */
const CONSERVATIVE_MAX_OFFENSIVE_PCT = 40;
/** Tolerancia de redondeo para considerar "100 %". */
const FULL_OFFENSIVE_EPSILON = 0.05;

/**
 * Reparte la cartera entre ofensiva (renta variable), amortiguador (renta fija/oro)
 * y cojín (monetario), con los pesos de las aportaciones (`recurringWeight ?? weight`),
 * normalizados a 100. Función pura. Lista vacía o sin peso → todo 0 y etiqueta 'Sin datos'.
 */
export function calculatePortfolioShield(etfs: ETFAsset[]): PortfolioShieldResult {
  const totals: Record<ShieldRole, number> = { offensive: 0, buffer: 0, cash: 0 };

  for (const etf of etfs) {
    const w = etf.recurringWeight ?? etf.weight;
    if (!Number.isFinite(w) || w <= 0) continue;
    totals[ROLE_BY_CLASS[detectAssetClass(etf)]] += w;
  }

  const sum = totals.offensive + totals.buffer + totals.cash;
  if (sum <= 0) return { offensivePct: 0, bufferPct: 0, cashPct: 0, label: 'Sin datos' };

  const offensivePct = (totals.offensive / sum) * 100;
  const bufferPct = (totals.buffer / sum) * 100;
  const cashPct = (totals.cash / sum) * 100;

  let label: PortfolioShieldLabel;
  if (offensivePct >= 100 - FULL_OFFENSIVE_EPSILON) label = 'Cartera 100% ofensiva';
  else if (offensivePct <= CONSERVATIVE_MAX_OFFENSIVE_PCT) label = 'Cartera conservadora';
  else label = 'Cartera equilibrada';

  return { offensivePct, bufferPct, cashPct, label };
}

type WeightKey = 'recurringWeight' | 'initialWeight';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Reparte `targetPct` al ETF `cashEtf` y escala el resto para que la suma conserve el total actual. */
function rebalanceKey(etfs: ETFAsset[], cashId: string, targetPct: number, key: WeightKey): ETFAsset[] {
  const read = (e: ETFAsset) => e[key] ?? e.weight;
  const total = etfs.reduce((s, e) => s + Math.max(0, read(e)), 0) || 100;
  const cashTarget = round1((total * targetPct) / 100);
  const othersSum = etfs.reduce((s, e) => (e.id === cashId ? s : s + Math.max(0, read(e))), 0);
  const othersTarget = total - cashTarget;

  // Sin otros pesos que escalar, el ETF monetario se queda con su objetivo y el resto a 0.
  const scaled = etfs.map((e) => {
    if (e.id === cashId) return cashTarget;
    if (othersSum <= 0) return 0;
    return round1((Math.max(0, read(e)) * othersTarget) / othersSum);
  });

  // Ajuste de redondeo sobre el ETF con más peso (que no sea el monetario).
  const diff = round1(cashTarget + (othersSum > 0 ? othersTarget : 0) - scaled.reduce((s, w) => s + w, 0));
  if (diff !== 0 && othersSum > 0) {
    let maxIdx = -1;
    scaled.forEach((w, i) => {
      if (etfs[i].id !== cashId && (maxIdx < 0 || w > scaled[maxIdx])) maxIdx = i;
    });
    if (maxIdx >= 0) scaled[maxIdx] = round1(scaled[maxIdx] + diff);
  }

  return etfs.map((e, i) => {
    if (key === 'recurringWeight') return { ...e, recurringWeight: scaled[i], weight: scaled[i] };
    return { ...e, initialWeight: scaled[i] };
  });
}

/**
 * Devuelve una cartera nueva en la que `cashEtf` pesa `targetPct` % (0-100) tanto en las
 * aportaciones como en el capital inicial; el resto de ETFs se escala en proporción.
 * Si `cashEtf` no está en la cartera, se añade. Solo cambia pesos. Función pura.
 */
export function applyCashCushion(etfs: ETFAsset[], cashEtf: ETFAsset, targetPct: number): ETFAsset[] {
  const pct = Math.max(0, Math.min(100, targetPct));
  const ticker = cashEtf.ticker.toUpperCase();
  const existing = etfs.find((e) => e.ticker.toUpperCase() === ticker);
  const base = existing
    ? etfs
    : [...etfs, { ...cashEtf, weight: 0, initialWeight: 0, recurringWeight: 0 }];
  const cashId = existing ? existing.id : cashEtf.id;

  return rebalanceKey(rebalanceKey(base, cashId, pct, 'recurringWeight'), cashId, pct, 'initialWeight');
}

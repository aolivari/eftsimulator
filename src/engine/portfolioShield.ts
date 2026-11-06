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

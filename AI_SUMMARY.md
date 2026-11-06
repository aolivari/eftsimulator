# HU 1/4: Motor y tipos del escudo defensivo

## Solución
`calculatePortfolioShield(etfs)` (función pura, sin React) reparte la cartera en tres bloques según `assetClass` (o `detectAssetClass()` si falta):
- Ofensiva: `global_equity`, `sp500`, `tech`, `defensive_equity`.
- Amortiguador: `bonds`, `gold`.
- Cojín: `cash`.

Usa `recurringWeight ?? weight`, normaliza a 100 y devuelve `{ offensivePct, bufferPct, cashPct, label }`.
Etiquetas: "Cartera 100% ofensiva", "Cartera equilibrada" (>40 % ofensiva), "Cartera conservadora" (≤40 %). Lista vacía o sin peso: ceros y etiqueta "Sin datos".

## Archivos
- `src/engine/portfolioShield.ts` (nuevo): el motor.
- `src/types/simulation.ts`: tipos `PortfolioShieldResult` y `PortfolioShieldLabel` (re-exportados por `src/types/index.ts`).
- `docs/epicas/escudo-defensivo.md`: contrato "Motor", tabla de historias y registro de traspasos.

## Cómo probarlo
`npx tsc -b`, `npm run lint` y `npm run build` pasan. Casos comprobados a mano: 100 % renta variable → 100/0/0 "100% ofensiva"; 60 RV/30 RF+oro/10 monetario → "equilibrada"; solo monetario → "conservadora"; lista vacía → ceros y "Sin datos".

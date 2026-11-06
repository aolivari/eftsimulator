# Épica: Escudo defensivo de la cartera (educativo)

Fuente de verdad de la épica para todos los agentes y personas que trabajen en ella. Si una tarjeta de Trello dice algo distinto, manda este documento.

Tarjeta de Trello de la épica: https://trello.com/c/vdCEn0c6

## Objetivo
Mostrar al inversor, de forma educativa y sin recomendaciones, cómo se reparte su plan entre renta variable, renta fija/oro y monetario, y cómo habría reaccionado una versión más defensiva en crisis históricas.

## Reglas de producto (obligatorias)
- Texto educativo. Nunca "compra", "vende", "reequilibra" ni rentabilidad futura como promesa.
- Las cifras salen del motor con los datos del usuario, nunca escritas a mano. Se presentan como históricas.
- Aviso visible: "Herramienta interactiva de análisis histórico cuantitativo. No constituye recomendación individualizada ni asesoramiento en materia de inversión conforme a la directiva MiFID II."
- Los textos describen lo ocurrido en cada escenario y no presentan ninguna opción como mejor (evitar "salvar", "consolidar", "proteger beneficios").
- Oro: el ticker del proyecto es `SGLD` (no `4GLD`).
- Sin datos personales en ningún texto generado.

## Historias

| # | Historia | Agente | Depende de | Estado | Rama | PR |
|---|---|---|---|---|---|---|
| 1 | Motor y tipos del escudo (`calculatePortfolioShield` en `src/engine/`) | sonet | — | en revisión | `ai/sonet/hu-15-hu-1-4-motor-y-tipos-del-escud` | — |
| 2 | Panel educativo en Cartera (`PortfolioShieldCard`) | opus | 1 | en revisión | `ai/opus/hu-16-hu-2-4-panel-educativo-de-prot` | — |
| 3 | Modo comparativo 80/20 en Ciclos | opus | 1, 2 | en revisión | `ai/opus/hu-17-hu-3-4-modo-comparativo-80-20-` | — |
| 4 | Revisión final de cumplimiento | haiku | 2, 3 | pendiente | — | — |

Estados válidos: `pendiente`, `en curso`, `en revisión`, `fusionada`, `bloqueada`.

Tarjetas de Trello de las historias: 1 → https://trello.com/c/m9ZM7Ic7 · 2 → https://trello.com/c/cjX4lMAv · 3 → https://trello.com/c/qODGJPLl · 4 → https://trello.com/c/X0aEuPSg

## Contratos entre historias
Completar esta sección cuando una historia fija una decisión que otra necesita.

- **Motor (historia 1)**: `calculatePortfolioShield(etfs: ETFAsset[]): PortfolioShieldResult` en `src/engine/portfolioShield.ts` (pura; exportada solo desde ese archivo, importar con `../../engine/portfolioShield`). Tipos `PortfolioShieldResult` y `PortfolioShieldLabel` en `src/types/simulation.ts` (re-exportados por `src/types`).
  - Resultado: `{ offensivePct, bufferPct, cashPct, label }`, porcentajes 0-100 que suman 100 (ofensiva / renta fija+oro / monetario).
  - Pesos: `recurringWeight ?? weight`, normalizados a la suma. Clase: `detectAssetClass()`.
  - Etiqueta: `Cartera 100% ofensiva` (ofensiva ≈ 100), `Cartera conservadora` (ofensiva ≤ 40 %), `Cartera equilibrada` (resto). Lista vacía o sin peso: todo 0 y `Sin datos` (la UI debe ocultar el panel).
- **Cojín monetario (historia 2)**: `applyCashCushion(etfs, cashEtf, targetPct)` en `src/engine/portfolioShield.ts` (pura). Pone `cashEtf` (por ticker) a `targetPct` % en `recurringWeight`/`weight` y en `initialWeight`, escala el resto en proporción conservando la suma y lo añade si no está. Solo toca pesos.
- **Panel (historia 2)**: `PortfolioShieldCard` (interno de `features/cartera`) se oculta con `Sin datos`. El aviso MiFID II vive en la constante `MIFID_NOTICE` del componente; la historia 3 puede copiar el mismo texto literal.
- **Clases de activo**: `global_equity`, `sp500`, `tech`, `defensive_equity` → ofensiva; `bonds`, `gold` → amortiguador; `cash` → cojín. Si falta `assetClass`, usar `detectAssetClass()` de `src/engine/cycleSimulator.ts`.

## Registro de traspasos
Cada agente añade una entrada al terminar su parte, o al bloquearse, para que el siguiente sepa qué encontró. Entradas nuevas arriba.

```
### [fecha] Historia N · agente · estado
- Hecho:
- Decisiones que afectan a otras historias:
- Pendiente o bloqueo:
- Archivos tocados:
```

### 2026-11-06 Historia 3 · opus · en revisión
- Hecho: botón "Comparar con versión protegida (80/20)" en `CycleSimulator` (solo con el escenario "Riesgo de Secuencia (Crash Tardío)" activo y sin crisis puntual seleccionada). Al pulsarlo, `GrowthChart` superpone la línea "Versión 80/20" y debajo aparece `ProtectedComparisonPanel` con valor final, resultado neto, máxima caída, rentabilidad anualizada, reparto de cada versión (`calculatePortfolioShield`) y el aviso MiFID II.
- Decisiones que afectan a otras historias: la versión 80/20 sale de `buildProtectedPortfolio()` en `src/engine/cycleSimulator.ts`: el 80 % conserva las proporciones del usuario (inicial y aportaciones) y el 20 % va mitad XEON, mitad AGGH; si ya están en la cartera se suma a su peso. Se ejecuta `simulateMultiYearCyclePlan` dos veces en `ETFSimulator` (segunda ejecución solo si el plan es `late_crash`). El botón va sin emoji (AGENTS.md lo prohíbe) con icono `RefreshCw`. Con la comparación activa, la línea del S&P 500 se oculta para dejar solo dos líneas. La gráfica plurianual pasa de `AreaChart` a `ComposedChart`: con `AreaChart` Recharts no pintaba ninguna `<Line>` (tampoco "Aportado" ni el S&P 500). La gráfica de crisis puntual sigue con ese mismo fallo (su S&P 500 no se ve); queda fuera del alcance.
- Pendiente o bloqueo: Historia 4: revisar "versión protegida" en el texto del botón (lo pide la tarjeta, pero roza la regla de no usar "proteger") y los textos de `ProtectedComparisonPanel`.
- Archivos tocados: `src/engine/cycleSimulator.ts`, `src/app/ETFSimulator.tsx`, `src/shared/ui/organisms/GrowthChart.tsx`, `src/features/ciclos/{CiclosView.tsx,types.ts}`, `src/features/ciclos/components/{CycleSimulator.tsx,ProtectedComparisonPanel.tsx}`, este documento, `AI_SUMMARY.md`.

### 2026-11-06 Historia 2 · opus · en revisión
- Hecho: `PortfolioShieldCard` debajo del reparto de pesos en Cartera: tres barras, etiqueta, aviso de alta volatilidad (100 % renta variable), píldoras XEON/AGGH/SGLD, botón "Añadir XEON con un 10 %" con "Deshacer" y aviso MiFID II siempre visible.
- Decisiones que afectan a otras historias: el título del aviso va sin emoji y en tipo frase ("Perfil de alta volatilidad detectado", con icono `AlertTriangle`), porque AGENTS.md prohíbe emoji y mayúsculas de título. El texto del aviso no da cifras escritas a mano. Si XEON ya pesa algo, el botón dice "Poner XEON al 10 %"; si pesa justo un 10 %, se oculta. "Deshacer" solo aparece mientras la cartera sigue siendo la que generó el botón.
- Pendiente o bloqueo: ninguno. Historia 4: revisar los textos del aviso y de las píldoras.
- Archivos tocados: `src/engine/portfolioShield.ts`, `src/features/cartera/{CarteraView.tsx,types.ts,index.ts}`, `src/features/cartera/components/{PortfolioShieldCard.tsx,PortfolioAllocation.tsx}`, este documento, `AI_SUMMARY.md`.

### 2026-11-06 Historia 1 · sonet · en revisión
- Hecho: motor, tipos y contrato "Motor" completados.
- Decisiones que afectan a otras historias: umbral conservadora ≤ 40 % ofensiva; 80/20 sale como "equilibrada"; etiqueta extra `Sin datos` para cartera vacía.
- Pendiente o bloqueo: ninguno.
- Archivos tocados: `src/engine/portfolioShield.ts`, `src/types/simulation.ts`, este documento, `AI_SUMMARY.md`.

## Reglas de Git (todas las historias)
1. Crear la rama desde `origin/master`: `git fetch origin master` y luego `git checkout -b <rama> origin/master`.
2. Antes de crear la PR: `git fetch origin master`, integrar `origin/master` en la rama, resolver conflictos si los hay, repetir `npx tsc -b` y `npm run lint`, y solo entonces crear la PR.
3. Commits en español con estilo `feat:` / `fix:` / `chore:`.
4. Actualizar la tabla de historias de este documento en la misma PR que cambia el estado.

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
| 2 | Panel educativo en Cartera (`PortfolioShieldCard`) | opus | 1 | pendiente | — | — |
| 3 | Modo comparativo 80/20 en Ciclos | opus | 1, 2 | pendiente | — | — |
| 4 | Revisión final de cumplimiento | haiku | 2, 3 | pendiente | — | — |

Estados válidos: `pendiente`, `en curso`, `en revisión`, `fusionada`, `bloqueada`.

Tarjetas de Trello de las historias: 1 → https://trello.com/c/m9ZM7Ic7 · 2 → https://trello.com/c/cjX4lMAv · 3 → https://trello.com/c/qODGJPLl · 4 → https://trello.com/c/X0aEuPSg

## Contratos entre historias
Completar esta sección cuando una historia fija una decisión que otra necesita.

- **Motor (historia 1)**: `calculatePortfolioShield(etfs: ETFAsset[]): PortfolioShieldResult` en `src/engine/portfolioShield.ts` (pura; exportada solo desde ese archivo, importar con `../../engine/portfolioShield`). Tipos `PortfolioShieldResult` y `PortfolioShieldLabel` en `src/types/simulation.ts` (re-exportados por `src/types`).
  - Resultado: `{ offensivePct, bufferPct, cashPct, label }`, porcentajes 0-100 que suman 100 (ofensiva / renta fija+oro / monetario).
  - Pesos: `recurringWeight ?? weight`, normalizados a la suma. Clase: `detectAssetClass()`.
  - Etiqueta: `Cartera 100% ofensiva` (ofensiva ≈ 100), `Cartera conservadora` (ofensiva ≤ 40 %), `Cartera equilibrada` (resto). Lista vacía o sin peso: todo 0 y `Sin datos` (la UI debe ocultar el panel).
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

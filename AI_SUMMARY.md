# AI_SUMMARY — Fase 1 · Composición verificada de los ETF

## Qué se ha implementado
Un módulo de datos (sin UI, sin IA, sin noticias) que guarda y expone la composición de cada ETF del catálogo: **10 principales posiciones con peso en %, sectores y países**, con fuente y fecha de actualización.

- **Fuente usada:** Yahoo Finance (`quoteSummary` → `topHoldings`, ya dependencia del proyecto). Cubre posiciones y sectores de VWCE, SXR8, WCBR, XDWH y XDWS.
- **Sin datos:** AGGH (bonos), SGLD (oro) y XEON (monetario) no tienen composición en la fuente → `estado: 'sin_datos'` con motivo, bloques `null` (nunca `[]` ni 0 %).
- **Parser de CSV de iShares** incluido (posiciones + agregación de sectores y países), cubierto por pruebas con fixture. Es la vía prevista para obtener **países**.

## Criterios de aceptación
| # | Estado |
|---|---|
| 1. Posiciones, sectores y países | **Parcial.** Posiciones y sectores: sí. **Países: `null` (sin datos)**: Yahoo no los publica. El parser de CSV iShares ya los calcula, pero el endpoint CSV de iShares ahora devuelve HTML (probado), así que no se pudo automatizar. |
| 2. Fallo o cambio de formato → se registra y no se guardan datos parciales | Sí. Cada ETF se parsea y valida; si falla, se añade a `src/data/holdings/errores.log` y se conserva el registro anterior. Escritura atómica (temporal + renombrado). |
| 3. Sin composición → "sin datos", no 0 % | Sí (`getComposicion()` devuelve `sin_datos`; la validación prohíbe arrays vacíos). |
| 4. Pesos = web del emisor dentro de la tolerancia | **No verificado contra el emisor.** Tolerancia fijada: **±0,10 pp** por posición (`TOLERANCIA_PESO_PP`), con `compararConEmisor()` listo para el cotejo. No se pudo cotejar con las webs de los emisores (sin acceso automatizable). Los datos vienen de Yahoo, no del emisor: hace falta un cotejo manual de las top 10 de cada ETF. |
| 5. Fecha y fuente | Sí (`fuente.nombre`, `referencia`, `fechaActualizacion`). `fechaDatosFuente` es `null` porque Yahoo no publica la fecha de valoración. |

Nota: el ticket indica "bloqueada por la lista de ETF del piloto (fase 0)". No existe esa lista en el repo, así que se cubre todo el catálogo (`POPULAR_ETFS`, 8 ETF). La rama pedida era `feat/fase-1-datos-cartera`, pero se trabajó en la rama del worktree asignado.

## Archivos
Creados:
- `src/types/holdings.ts` — tipos (`ComposicionETF`, `PosicionETF`, `ResultadoComposicion`…), separados de `types/index.ts`.
- `src/data/holdings/parsers.ts` — parsers de Yahoo y CSV iShares; lanzan `FormatoDesconocidoError` ante formato inesperado.
- `src/data/holdings/validar.ts` — validación de coherencia (pesos, orden, sumas ≤ 100 %, fecha, fuente, `null` vs vacío).
- `src/data/holdings/tolerancia.ts` — tolerancia fija y comparación con el emisor.
- `src/data/holdings/index.ts` — API: `getComposicion(etfId)`, `listarComposiciones()` (único punto de entrada).
- `src/data/holdings/composiciones.json` — datos generados (8 ETF, 2026-11-04).
- `scripts/holdings/actualizar.ts` — descarga, valida y guarda; registra errores.
- `scripts/holdings/holdings.test.ts` — 9 pruebas (`node:test`).

Modificado: `package.json` (scripts `datos:composicion` y `test:holdings`).

## Cómo probarlo
```bash
npm run test:holdings          # 9 pruebas, sin red
npm run datos:composicion      # refresca todos (o: -- vwce sxr8); necesita red y Node ≥ 22.6
npm run lint && npx tsc -b && npm run build
```
Uso desde código: `getComposicion('vwce')` → `{ estado: 'ok', composicion }`; `getComposicion('aggh')` → `{ estado: 'sin_datos', motivo }`.

Verificada: `npm run lint`, `npx tsc -b`, `npm run build` y las pruebas pasan sin errores.

## Pendiente
1. Cotejo manual de las top 10 con la web de cada emisor (±0,10 pp) usando `compararConEmisor`.
2. Fuente de países (CSV de emisor o API alternativa).
3. Decidir la lista del piloto de la fase 0.

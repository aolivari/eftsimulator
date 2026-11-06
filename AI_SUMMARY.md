# HU 3/4: Modo comparativo 80/20 en Ciclos

## Resumen de la solución
En la pestaña **Riesgo y crisis**, con el escenario rápido **"Riesgo de Secuencia (Crash Tardío)"** activo, aparece el botón **"Comparar con versión protegida (80/20)"**. Al pulsarlo:

1. La gráfica plurianual superpone dos líneas: **Valor de tu cartera** (azul) y **Versión 80/20** (gris). Mientras dura la comparación se oculta la referencia del S&P 500, para que solo haya dos líneas.
2. Debajo de la gráfica aparece una tabla con las cifras de las dos versiones: valor final, resultado neto, máxima caída, rentabilidad anualizada y el reparto de cada una (renta variable / renta fija y oro / monetario). También muestra una nota de que son estimaciones históricas y el aviso MiFID II.
3. Si se vuelve a pulsar ("Ocultar comparación 80/20"), la gráfica vuelve a su estado normal.

**Todas las cifras salen del motor**: `simulateMultiYearCyclePlan` se ejecuta dos veces, una con la cartera del usuario y otra con `buildProtectedPortfolio(cartera)`. No hay ningún cálculo duplicado en los componentes.

### Cómo se construye la versión 80/20 (`buildProtectedPortfolio`, en `src/engine/cycleSimulator.ts`)
- El 80 % mantiene las proporciones que tenía el usuario, tanto en el capital inicial (`initialWeight`) como en las aportaciones (`recurringWeight`).
- El 20 % va mitad a XEON (monetario) y mitad a AGGH (bonos), con sus datos de `POPULAR_ETFS`.
- **Cartera ya defensiva**: si XEON o AGGH ya estaban, el tramo se suma a su peso en vez de duplicar la posición (el motor guarda los saldos por `id`). En ese caso la tabla añade una nota: como la cartera ya tenía renta fija, oro o monetario, las dos líneas pueden quedar más próximas.
- Función pura: no modifica la cartera original.

Comprobado en el navegador con el plan de ejemplo (8.000 € aportados en 10 años):
- 100 % VWCE: 8.168 € y caída de -23,6 % frente a 8.132 € y -19,3 % en la versión 80/20.
- 60/30/10 (VWCE/AGGH/XEON): 7.932 € y -16,6 % frente a 7.943 € y -13 %. La versión 80/20 queda en 48/34/18.

### Corrección incluida
La gráfica plurianual usaba `AreaChart`, y Recharts 2 no pinta los `<Line>` dentro de ese gráfico: las líneas de "Aportado" y del S&P 500 nunca se veían. Ahora usa `ComposedChart`, y se ven "Aportado" y la línea comparada.

**Queda pendiente** (fuera del alcance): la gráfica de crisis puntual tiene el mismo fallo y su línea del S&P 500 sigue sin verse.

## Archivos modificados o creados
| Archivo | Motivo |
|---|---|
| `src/engine/cycleSimulator.ts` | Nuevo `buildProtectedPortfolio()` y constantes `LATE_CRASH_PLAN_ID` y `PROTECTED_DEFENSIVE_PCT`. |
| `src/app/ETFSimulator.tsx` | Segunda ejecución del motor (`protectedMultiYearSimulation`), solo con el plan `late_crash`, que se pasa a `CiclosView`. |
| `src/features/ciclos/types.ts` | Props del botón en `CycleSimulatorProps`, `protectedMultiYearSimulation` en `CiclosViewProps` y `ProtectedComparisonPanelProps`. |
| `src/features/ciclos/CiclosView.tsx` | Estado del modo comparativo y conexión entre el botón, la gráfica y el panel. |
| `src/features/ciclos/components/CycleSimulator.tsx` | Botón de comparación, visible solo con el Crash Tardío y sin una crisis puntual seleccionada. |
| `src/features/ciclos/components/ProtectedComparisonPanel.tsx` | **Nuevo.** Tabla con las cifras de las dos versiones, reparto de cada una (`calculatePortfolioShield`) y aviso MiFID II. |
| `src/shared/ui/organisms/GrowthChart.tsx` | Props genéricas `comparisonSimulation`/`comparisonLabel`: línea superpuesta, fila en el tooltip y `ComposedChart` en el modo plurianual. |
| `docs/epicas/escudo-defensivo.md` | Estado de la historia 3 y entrada en el registro de traspasos. |

## Decisiones
- El botón va sin el emoji 🔄 de la tarjeta, porque AGENTS.md prohíbe los emoji. Usa el icono `RefreshCw`.
- El texto "versión protegida" es el que pide la tarjeta, pero roza la regla de la épica de no usar "proteger". En la tabla y en la leyenda se usa el término neutro "Versión 80/20". Queda anotado para que lo revise la historia 4.

## Cómo probarlo
1. `npm install && npm run dev` y abrir <http://localhost:5173>.
2. Ir a **Riesgo y crisis** y elegir el escenario rápido **"Riesgo de Secuencia (Crash Tardío)"**.
3. Pulsar **"Comparar con versión protegida (80/20)"**: aparecen las dos líneas y la tabla comparativa. Pasar el ratón por la gráfica: el tooltip muestra el valor de la versión 80/20.
4. Elegir otro escenario: el botón y la comparación desaparecen.
5. Probar con una cartera que ya tenga AGGH o XEON (pestaña Cartera): la versión 80/20 suma el tramo a esas posiciones y aparece la nota de cartera ya defensiva.

Verificación ejecutada: `npx tsc -b`, `npm run lint` y `npm run build` sin errores.

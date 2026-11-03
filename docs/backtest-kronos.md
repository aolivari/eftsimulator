# Backtest de Kronos-mini sobre ETFs diarios

**Fecha:** 3 nov 2026 · **Script:** [`scripts/backtest-kronos.mjs`](../scripts/backtest-kronos.mjs)

## Configuración
- ETFs: VWCE (global), SXR8 (S&P 500), XDWH (salud global), SGLD (oro).
- 24 fechas de corte por ETF (cada fin de mes, nov 2023 → jul 2026): **96 predicciones**.
- En cada fecha Kronos solo ve los datos disponibles hasta ese día (60 velas diarias) y genera 16 trayectorias a 63 sesiones (~3 meses). Después se comparan con lo que pasó realmente.
- Referencias ingenuas:
  - **Dirección:** "siempre sube".
  - **Volatilidad:** "los próximos 3 meses tendrán la volatilidad de los últimos 3".

## Resultados

| | VWCE | SXR8 | XDWH | SGLD | **Total** |
|---|---|---|---|---|---|
| Veces que subió de verdad | 79% | 75% | 58% | 75% | **72%** |
| Rentabilidad media real a 3 meses | +4,2% | +4,1% | +1,5% | +6,7% | **+4,1%** |
| Mediana predicha por Kronos | −1,7% | −1,6% | −0,2% | −2,7% | **−1,5%** |
| Acierto de dirección: Kronos | 33% | 50% | 50% | 38% | **43%** |
| Acierto de dirección: "siempre sube" | 79% | 75% | 58% | 75% | **72%** |
| Error de volatilidad anual: Kronos | 4,8 pt | 5,1 pt | 5,3 pt | 5,1 pt | **5,1 pt** |
| Error de volatilidad anual: ingenuo | 5,0 pt | 4,7 pt | 3,8 pt | 6,4 pt | **5,0 pt** |
| Correlación vol. predicha/real: Kronos | −0,14 | 0,06 | −0,14 | 0,58 | **0,36** |
| Correlación vol. predicha/real: ingenuo | −0,13 | 0,09 | −0,03 | 0,30 | **0,28** |
| Resultados reales dentro del rango P10–P90 (ideal ~80%): Kronos | 33% | 21% | 21% | 21% | **15%** |
| Resultados reales dentro del rango P10–P90 (ideal ~80%): ingenuo | 83% | 75% | 67% | 75% | **74%** |

Señal de régimen de volatilidad:
- Cuando Kronos predijo "más agitado" (>15% sobre la volatilidad reciente), acertó 6 de 10 veces.
- Cuando predijo "más tranquilo", acertó 25 de 49, que es como lanzar una moneda.

## Conclusiones
1. **Dirección: inútil, incluso perjudicial.** Kronos predice caídas de forma sistemática: mediana −1,5% frente a +4,1% real. Acierta menos que suponer "siempre sube" (43% frente a 72%) y su probabilidad de subida está peor calibrada que usar la frecuencia histórica (Brier 0,51 frente a 0,20).
2. **Volatilidad: empate con la referencia ingenua.** El error es el mismo (5,1 frente a 5,0 puntos). La correlación algo mayor se debe sobre todo al oro, y en otros ETFs es peor.
3. **Rango de escenarios: muy estrecho.** Las 16 trayectorias se parecen demasiado entre sí. Su rango P10–P90 solo contuvo el 15% de los resultados reales, cuando debería ser cerca del 80%. Usarlo en el Monte Carlo **infravaloraría el riesgo**. El rango ingenuo, basado en la volatilidad reciente, está bien calibrado (74%).

## Decisión aplicada
- El Monte Carlo **no usa Kronos**: los escenarios salen solo de trimestres históricos reales.
- La volatilidad de Kronos se muestra, como mucho, como dato informativo y experimental.

## Experimentos para corregirlo (mismas 96 predicciones)

| Configuración | Mediana predicha (real: +4,1%) | Acierto dirección ("siempre sube": 72%) | Brier (base: 0,20) | Error vol. (ingenuo: 5,0 pt) | Cobertura P10–P90 (ingenuo: 74%) |
|---|---|---|---|---|---|
| mini, original | −1,5% | 43% | 0,51 | 5,1 pt | 15% |
| mini, sin tendencia | +0,1% | 57% | 0,35 | 6,6 pt | 14% |
| mini, sin tendencia, T=1,5 | 0,0% | 51% | 0,38 | 5,5 pt | 9% |
| small, sin tendencia, T=1,5 | −0,3% | 52% | 0,38 | 6,3 pt | 17% |

- Kronos-base no se probó: tarda unos 4 minutos por predicción en CPU, lo que lo hace inviable para la web.
- **Quitar la tendencia** elimina el sesgo bajista, pero la dirección sigue siendo peor que "siempre sube".
- **Subir la temperatura** no ensancha el rango a 3 meses: las trayectorias se mueven más día a día, pero revierten al punto de partida.
- **El modelo más grande (small)** no mejora en nada.

**Conclusión final:** ninguna configuración supera a las referencias sencillas en dirección, volatilidad ni calibración del rango. Kronos queda **archivado**: el servicio sigue en `kronos-service/` y este backtest permite reevaluar futuros modelos o un *fine-tuning*.

## Cautelas
- 96 predicciones con ventanas de 3 meses solapadas: la muestra efectiva es menor. Aun así, las diferencias de dirección y de rango son demasiado grandes para explicarlas por ruido.
- Solo se ha probado **Kronos-mini** sin ajustar. Kronos-small o base, o un *fine-tuning* con datos diarios de ETFs, podrían comportarse distinto. Este script sirve para comprobarlo.

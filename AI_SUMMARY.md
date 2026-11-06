# HU 2/4 · Panel educativo de protección en Cartera

## Resumen
Nueva tarjeta **"Reparto por función"** (`PortfolioShieldCard`) en la pestaña *Cartera*, debajo del reparto de pesos. Usa `calculatePortfolioShield` (HU 1) y muestra:

- **Tres barras**: ofensiva (renta variable, azul de datos), amortiguador (renta fija y oro) y cojín (monetario), con su porcentaje en Geist Mono. La etiqueta (`Cartera 100% ofensiva`, `Cartera equilibrada`, `Cartera conservadora`) va en la cabecera. Barras y etiqueta se recalculan en cada cambio de pesos. Si no hay cartera con peso (`Sin datos`), el panel no se pinta.
- **Aviso de alta volatilidad** (fondo ámbar) cuando la cartera es 100 % renta variable, con texto educativo y sin cifras escritas a mano.
- **Píldoras desplegables** "¿Qué es XEON?", "¿Qué es AGGH?" y "¿Qué es SGLD?" con las frases literales de la historia (`aria-expanded`, una abierta a la vez).
- **Botón "Añadir XEON con un 10 %"**: llama a la función pura `applyCashCushion` (en `src/engine/portfolioShield.ts`), que pone XEON al 10 % de las aportaciones y del capital inicial y escala el resto de ETFs en proporción. Solo toca pesos y no cambia de página. Después aparece **"Deshacer"**, que restaura la cartera anterior mientras no haya otros cambios. Si XEON ya tiene peso, el botón dice "Poner XEON al 10 %"; si ya está al 10 %, se oculta.
- **Aviso MiFID II** siempre visible al pie del panel, con el texto literal de la épica.

### Decisiones
- El título del aviso es "Perfil de alta volatilidad detectado", **sin el emoji ⚠️** y en tipo frase, con el icono `AlertTriangle`. Así lo exige el sistema visual de AGENTS.md, que prohíbe emoji y mayúsculas de título.
- Arreglo menor en `PortfolioAllocation` para quitar el **scroll horizontal a 375 px**, que ya existía antes de esta historia. El selector "Capital inicial / Aportación" ocupa todo el ancho y apila la cifra en móvil, y el input del buscador lleva `min-w-0`.

## Archivos
| Archivo | Cambio |
|---|---|
| `src/features/cartera/components/PortfolioShieldCard.tsx` | **Nuevo.** Panel educativo. |
| `src/engine/portfolioShield.ts` | `applyCashCushion()`: lógica pura para fijar el peso del monetario. |
| `src/features/cartera/CarteraView.tsx` | Integra el panel debajo de `PortfolioAllocation`. |
| `src/features/cartera/types.ts` / `index.ts` | Tipo `PortfolioShieldCardProps`. |
| `src/features/cartera/components/PortfolioAllocation.tsx` | Arreglo del desbordamiento en móvil. |
| `docs/epicas/escudo-defensivo.md` | Estado de la HU 2, contratos y registro de traspasos. |

## Verificación
- `npx tsc -b`, `npm run lint` y `npm run build`: sin errores.
- Navegador (`npm run dev`): pestaña Cartera, cartera por defecto → "Cartera 100% ofensiva" con el aviso. Al pulsar "Añadir XEON con un 10 %" aparecen 90 / 0 / 10 y "Cartera equilibrada", y el aviso desaparece. "Deshacer" vuelve a 100 / 0 / 0. Las píldoras se abren y se cierran. A 375 px, `scrollWidth === clientWidth`, así que no hay scroll horizontal.

## Cómo probarlo
1. `npm run dev` y abrir <http://localhost:5173>.
2. Ir a *Cartera de ETFs* y bajar hasta "Reparto por función".
3. Cambiar pesos (por ejemplo, darle peso a AGGH o SGLD) y comprobar que las barras y la etiqueta cambian.
4. Pulsar "Añadir XEON con un 10 %", revisar los pesos en la tabla de arriba y luego pulsar "Deshacer".
5. Repetir a 375 px de ancho en las herramientas de desarrollo.

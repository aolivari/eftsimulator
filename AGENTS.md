# AGENTS.md — guía del proyecto para asistentes de IA

Léelo entero antes de cambiar código. Es la fuente de verdad sobre la arquitectura; [`README.md`](README.md) es el resumen para personas.

## En una frase
SPA en React + TypeScript (Vite) que simula planes de ahorro en ETFs para inversores en España. Compara brókers, proyecta el plan con rentabilidad fija, lo pone a prueba con un **Monte Carlo sobre trimestres históricos reales** (con prueba de estrés de crisis) y guarda planes por usuario en **Supabase**. Se despliega en **Vercel** (frontend + funciones `api/`).

- Idioma: **todo en español**, tanto la interfaz como los comentarios y los commits. Moneda en EUR, formato `es-ES`.
- Producción: <https://eftsimulator.vercel.app> · Rama principal: `master` · Vercel despliega al fusionar.

## Comandos
| Tarea | Comando |
|---|---|
| Instalar | `npm install` |
| Desarrollo (sirve también `api/`) | `npm run dev` → <http://localhost:5173> |
| Comprobar tipos | `npx tsc -b` (solo cubre `src/`) |
| Lint (arquitectura y calidad) | `npm run lint` (`src/features`, `src/shared` y `src/app`) |
| Comprobar tipos de `api/` | `npx tsc --noEmit --strict --skipLibCheck --module esnext --moduleResolution bundler --target es2022 --esModuleInterop --types node api/*.ts` |
| Build de producción | `npm run build` |
| Avisar por Telegram | `npm run ai:telegram -- "Mensaje"` |

No hay tests automatizados. Verifica los cambios con `npm run lint`, `npx tsc -b` y abriendo la web en el navegador.

## Arquitectura (feature-first + `shared/ui`)

```
src/
  main.tsx, App.tsx          Entrada. App envuelve todo en <AuthProvider>.
  app/
    ETFSimulator.tsx         Composición raíz: estado global (params, etfs, pestañas, ciclos) y ensamblaje de features.
    index.ts                 Punto de entrada de app.
  features/                  Módulos de negocio (1 feature por pestaña + cuentas). Cada uno expone SOLO index.ts.
    simulacion/              Pestaña 1 (Simulación General): SimulacionView, HeroLedger, InputControls, MetricsCards, MonteCarloPanel y useMonthlyHistory.
    cartera/                 Pestaña 2 (Plan de Ahorro ETFs): CarteraView, PortfolioAllocation, FamousPortfoliosSelector y portfolioService.
    ciclos/                  Pestaña 3 (Ciclos Históricos): CiclosView, CycleSimulator y CycleTimelineModal.
    proyeccion-anual/        Pestaña 4 (Proyección Anual): ProyeccionAnualView.
    brokers/                 Pestaña 5 (Comparativa Brókers): BrokersView.
    cuentas/                 Transversal: AuthProvider, useAuth, AuthModal, AccountBar y plansService.
  shared/
    ui/                      Componentes reutilizables (atoms, molecules, compound, organisms)
      atoms/                 Button, Input, BufferedNumberInput, Badge
      molecules/             FormField
      compound/              ViewTemplate (Root/Header/Section/Grid/Footer), Card (Root/Header/Body), Tabs (Root/List/Trigger/Panel), Modal (Root/Title/Actions)
      organisms/             GrowthChart (gráfica principal compartida entre vistas)
      index.ts               ÚNICO punto de entrada de la UI compartida
    lib/                     Clientes configurados (supabase.ts, marketData.ts) e index.ts
    utils/                   Funciones puras genéricas (formatCurrency, formatPercent, formatDateShort)
  engine/                    Lógica pura, sin React. Aquí van los cálculos.
    simulation.ts            runSimulation(): proyección trimestral con rentabilidad fija para CADA bróker.
    monteCarlo.ts            runMonteCarlo(): bootstrap de trimestres históricos + estrés.
    cycleSimulator.ts        Backtest de la cartera dentro de un ciclo y de la línea temporal plurianual.
  data/                      Datos estáticos curados a mano.
    etfList.ts               POPULAR_ETFS: ETFs por defecto (TER, rentabilidad esperada, condiciones por bróker).
    brokers.ts               BROKER_CONFIGS: reglas de comisión y custodia de cada bróker.
    historicalCycles.ts      HISTORICAL_CYCLES: crisis y expansiones con factores acumulados por clase de activo.
    famousPortfolios.ts      Carteras modelo (Bogle, Buffett, core-satellite).
    multiYearTimelinePresets.ts  Plantillas de la línea temporal de ciclos.
  types/index.ts             TODOS los tipos compartidos (ETFAsset, SimulationParams, MonteCarloResult, SavedPlan...).
api/                         Funciones serverless de Vercel (Node). Una por archivo = un endpoint.
  search.ts                  GET ?q=        Búsqueda de ETFs en Yahoo Finance.
  etf.ts                     GET ?ticker=   Ficha del ETF: precio, TER, rentabilidades anuales.
  quotes.ts                  GET ?tickers=  Cotizaciones en vivo y tendencia (SMA200).
  history.ts                 GET ?items=VWCE:global_equity,...  Rentabilidades mensuales para el Monte Carlo.
  plan.ts                    GET ?profile=  Carteras preset con datos en vivo. Ningún componente la usa.
supabase/schema.sql          Tablas, RLS y triggers. Idempotente: se puede volver a ejecutar.
vite.config.ts               Plugin que emula las funciones de api/ en `npm run dev` (ver trampas).
```

### Patrón de Vistas y `ViewTemplate` (1 Pestaña = 1 Feature)
Cada una de las **5 pestañas** de la aplicación corresponde a una carpeta en `src/features/` y exporta su propia vista completa (`*View`), ensamblada usando el compound component [`ViewTemplate`](src/shared/ui/compound/ViewTemplate.tsx):

| Pestaña en la UI | Feature (`src/features/`) | Vista exportada | Contenido principal |
|---|---|---|---|
| 1. *Resumen* | `simulacion/` | `SimulacionView` | `MetricsCards` (tarjeta negra con la curva del plan), `GrowthChart`, `InputControls`, `PortfolioSnapshot` y "Siguientes preguntas". `MonteCarloPanel` se pinta en la pestaña de Riesgo |
| 2. *Plan de Ahorro ETFs* | `cartera/` | `CarteraView` | `FamousPortfoliosSelector` + `PortfolioAllocation` y búsqueda/cotizaciones (`portfolioService`) |
| 3. *Ciclos Históricos* | `ciclos/` | `CiclosView` | `CycleSimulator` + `GrowthChart` y `CycleTimelineModal` |
| 4. *Proyección Anual* | `proyeccion-anual/` | `ProyeccionAnualView` | Tabla anualizada del efecto bola de nieve |
| 5. *Comparativa Brókers* | `brokers/` | `BrokersView` | Ranking de brókers por comisiones de compra, custodia y capital neto |
| *(Barra superior transversal)* | `cuentas/` | `AccountBar`, `AuthProvider` | Login/registro (`AuthModal`), sesión (`useAuth`) y CRUD de planes en Supabase (`plansService`). Si no hay variables `VITE_SUPABASE_*` en local, `AccountBar` devuelve `null`. |

Estructura del compound component `ViewTemplate` (`src/shared/ui/compound/ViewTemplate.tsx`):
- `ViewTemplate.Root`: contenedor raíz de la vista (`id`, espaciado vertical y animación de entrada).
- `ViewTemplate.Header`: cabecera reutilizable (`icon`, `title`, `description`, `badge`, `actions`, `variant="card" | "inline"`).
- `ViewTemplate.Section`: sección de contenido dentro de la vista (`variant="plain" | "card"`).
- `ViewTemplate.Grid`: rejilla responsive (`cols={2 | 3 | 4}`).
- `ViewTemplate.Footer`: pie de sección/tarjeta para conclusiones o notas.

En [`src/app/ETFSimulator.tsx`](src/app/ETFSimulator.tsx), la navegación usa `<Tabs.Root>`, `<Tabs.List>`, `<Tabs.Trigger>` y cada `<Tabs.Panel>` renderiza directamente la vista de su feature (`<SimulacionView />`, `<CarteraView />`, `<CiclosView />`, `<ProyeccionAnualView />`, `<BrokersView />`).

### Reglas de `shared/ui`
1. **Reutilizable entre vistas.** Contiene átomos (`Button`, `Input`, `BufferedNumberInput`, `Badge`), moléculas (`FormField`), compound components (`ViewTemplate`, `Tabs`, `Card`, `Modal`) y organismos compartidos entre múltiples pestañas (`GrowthChart`).
2. **Sin dependencias hacia `features/` ni `app/`.** Los features importan de `shared/ui`; nunca al revés (validado por `eslint-plugin-boundaries`).
3. **Un solo punto de entrada.** Se importa siempre desde `shared/ui`, nunca desde rutas internas de otro componente.
4. **Compound solo cuando hay estructura o estado compartido** entre las partes (`ViewTemplate`, `Tabs`, `Modal`, `Card`). No usar compound para piezas simples: un átomo basta.
5. **Props tipadas y sin estilos de página.** Estilos con la paleta de la sección Sistema visual; el componente no fija márgenes externos que dependan de dónde se coloque.

### Reglas de `features/`
1. Un feature **no importa** los internos de otro feature. Solo se expone e importa a través de su `index.ts`.
2. Cada feature de pestaña construye su `*View` usando `ViewTemplate` y sus componentes internos.
3. La lógica de cálculo va en `engine/` (pura). El feature la consume; no la reimplementa en componentes.
4. Los tipos compartidos entre features van en `src/types/index.ts`; los propios de cada vista/feature, en su `types.ts`.
5. Antes de crear un componente reutilizable, comprobar si ya existe en `shared/ui`.

## Flujo de datos
1. `ETFSimulator` guarda `params: SimulationParams` y `etfs: ETFAsset[]`. Al cambiar la cartera, `annualReturn` se recalcula como la media de `expectedReturn` ponderada por `recurringWeight`.
2. `effectiveParams` convierte la aportación a base **trimestral** y añade `selectedEtfs`.
3. `runSimulation(effectiveParams)` → un `BrokerResult` por bróker. El "mejor bróker" es el de mayor saldo final, y es el que usan el hero, las métricas y el Monte Carlo.
4. `MonteCarloPanel` pide `/api/history` para los ETFs activos y ejecuta `runMonteCarlo` en el navegador: el caso base, el estresado y 3 variantes para la tabla de cuándo llega la crisis. Es determinista (semilla fija).
5. `AccountBar` lee y escribe la tabla `plans` con el cliente de Supabase del navegador. La seguridad la da RLS: cada usuario solo ve sus filas.

## Monte Carlo (`src/engine/monteCarlo.ts`)
- **Bootstrap**: ventanas de 3 meses solapadas construidas con los meses en los que TODOS los ETFs tienen dato. En cada trimestre de cada escenario se elige una ventana al azar y **todos los ETFs usan la misma** (conserva la correlación).
- **Recentrado**: la media log de cada ETF se desplaza a `ln(1 + expectedReturn/100)/4`. Del histórico se toman la volatilidad, las crisis y la correlación; **la media sale de `expectedReturn`**, que es la suposición que más pesa en el resultado.
- **Relleno**: antes del lanzamiento de cada ETF europeo, `api/history.ts` usa un ETF de EE. UU. de la misma clase (ACWI, SPY, QQQ, AGG, GLD, XLP, BIL), en USD y sin conversión a EUR.
- **Comisiones**: reutiliza `calculateBasketBuyFee` y `calculateCustodyFee` del bróker elegido; los ETFs de distribución pagan el 19 % sobre el dividendo. No incluye impuestos al vender ni rebalanceo.
- **Estrés**: `cycleQuarterlyReturns()` interpola en escala log los factores de `HISTORICAL_CYCLES` a trimestres y los aplica **sin recentrar** desde `startQuarter`. Los ciclos de crisis van del máximo al mínimo: la recuperación posterior sale del bootstrap.
- **Sin histórico suficiente** (menos de 12 ventanas) → modo paramétrico lognormal con volatilidad por clase de activo.

## Convenciones
- **Unidades** (fuente de errores habitual):
  - `expectedReturn`, `annualReturn`, `ter` y `dividendYield` son **porcentajes como número**: `7.0` = 7 %.
  - Los pesos (`weight`, `initialWeight`, `recurringWeight`) van de 0 a 100.
  - Dentro de `monteCarlo.ts` y en `MonteCarloResult`, las rentabilidades y probabilidades son **fracciones**: `0.07`, y `probLoss` de 0 a 1.
- **Pesos de cartera**: `initialWeight` reparte el capital inicial y `recurringWeight` las aportaciones. Si faltan, se usa `weight` (`e.recurringWeight ?? e.weight`).
- **Clase de activo** (`AssetClass`): decide qué factor de ciclo y qué índice de relleno usa cada ETF. Ver la trampa 6 sobre qué pasa si falta.
- **Estilos**: Tailwind con los tokens de la sección [Sistema visual](#sistema-visual-colores-tipografía-y-reglas). Léela antes de tocar cualquier color. En inputs se usa `text-base sm:text-sm` para evitar el zoom en iOS. La web es solo en modo claro.
- **Gráficos**: Recharts (`ComposedChart`/`AreaChart`), con los colores de [Sistema visual](#sistema-visual-colores-tipografía-y-reglas). Los ejes formatean en `k`.
- **Tipos nuevos** → en `src/types/index.ts`. **Lógica nueva** → en `src/engine/` (pura y sin React), no dentro de los componentes.
- **Commits**: mensajes en español, con estilo `feat:` / `fix:` / `chore:` / `docs:`.
- **Ramas y worktrees**: cualquier rama nueva o worktree debe crearse **siempre desde `origin/master`** (ejecutando antes `git fetch origin master`), **nunca** desde la rama `master` local.

## Sistema visual (colores, tipografía y reglas)
Estilo "libro contable acromático", inspirado en getquin: el cromo (navegación, botones, tarjetas) no lleva color; el color se reserva para los datos y para decir si algo va bien o mal. Los tokens viven en [`tailwind.config.js`](tailwind.config.js) y en `:root` de [`src/index.css`](src/index.css).

### Paleta
| Rol | Valor | Clase Tailwind | Uso |
|---|---|---|---|
| Fondo de página | `#f2f4f7` | `bg-ground` | Gris azulado de libro de cuentas. Nunca crema ni beis. |
| Superficie | `#ffffff` | `bg-white` | Tarjetas y paneles. |
| Borde de tarjeta | `#e6e6e6` | `border-slate-200` | 1px. Sin sombra en reposo. |
| Línea de fila | `#f0f0f0` | `divide-slate-100` | Separadores dentro de tablas y listas. |
| Borde de control | `#d4d4d4` | `border-slate-300` | Inputs, selects y botones secundarios. |
| Tinta (texto) | `#0a0a0a` | `text-slate-900` | Texto principal y cifras. |
| Texto secundario | `#5c5c5c` | `text-slate-600` | Etiquetas y subtítulos. Mínimo 4,5:1. |
| Principal / activo | `#141414` | `bg-slate-900` | Botón principal (uno por pantalla), selección. |
| Azul de datos | `#1d5fbf` | `data-500` (escala `data-50`…`data-950`) | **Solo** el dato principal de cada gráfica (saldo, mediana, serie de tu plan). No en el cromo. |
| Azul de datos sobre negro | `#5b9bff` | `text-[#5b9bff]` | Curva y plusvalía en las tarjetas negras. |
| Positivo | `#247b50` (texto) · `#dcfae5` / `#04250e` (pastilla) | `emerald-*` | Cuando una cifra va bien. Nunca decorativo. |
| Negativo | `#c4242a` (texto) · `#ffedea` / `#831c1e` (pastilla) | `rose-*`, `red-*` | Cuando una cifra va mal, y la crisis. |
| Aviso | `#fffbeb` / `#92400e` | `amber-*` | Solo avisos (aviso legal, datos aproximados). |
| Tarjeta negra | `#0a0a0a`, divisiones `#262626` | `bg-[#0a0a0a]` | Solo para la respuesta principal de una pantalla (Resumen, Brókers). Una por pantalla. |

**Remapeos de `tailwind.config.js`** (para que el código antiguo herede la paleta sin reescribirlo): `orange` = escala de tinta (el antiguo acento ahora es negro); `slate` y `gray` = grises neutros sin tinte azul; `violet`, `purple`, `indigo`, `sky`, `teal` y `cyan` = grises; `emerald`/`green` = verde positivo; `rose`/`red` = rojo negativo. **No uses estas familias para dar color decorativo**: en código nuevo usa directamente `slate`, `data`, `emerald`/`rose` según el rol.

### Colores en gráficas
- Una serie, un color. La serie principal en azul de datos (`#1d5fbf`), 2px, líneas rectas (`type="linear"`), relleno plano de 8–14 % como mucho. Nada de degradados.
- Lo aportado: tinta `#141414`, discontinua `4 3`. Referencias (S&P 500, otros brókers): gris `#8a8a8a`.
- Varias series (brókers, reparto de cartera): rampa `#1d5fbf`, `#141414`, `#8a8a8a`, `#5b8bd6`, `#c4c4c4`, `#5c5c5c`, `#a3bde6`. Nunca un arcoíris.
- Rejilla horizontal `#eeeeee`; ejes en Geist Mono 12px `#6b6b6b`; ticks del eje Y en pasos redondos con el tope por encima del máximo.
- Zona de crisis: velo `#c4242a` al 6 %, sin borde, etiqueta en `#a51d22`.
- **Fases del ciclo** (una marca por tipo, en `multiYearTimelinePresets.ts` y `CycleSimulator`): expansión `#1d5fbf` (`bg-data-500`), rebote `#8aafe0` (`bg-data-300`), lateral `#737373` (`bg-slate-500`), crisis `#c4242a` (`bg-rose-600`).

### Tipografía y cifras
- Texto en **Geist**. **Todas las cifras** en **Geist Mono** con dígitos tabulares: añade la clase `num` (o `tabular-nums`) a cualquier número, importe o porcentaje. Esa clase también impide que la cifra y su unidad se partan de línea.
- Formatea números con `formatCurrency` / `NUMBER_LOCALE` (de `shared/utils`, o de `engine/simulation` dentro de `engine/`). `es-ES` no agrupa los miles en cifras de 4 dígitos ("8000" frente a "12.439"); `NUMBER_LOCALE` (`de-DE`, mismos separadores) agrupa siempre.
- Tamaños: título de pantalla 22–24px; título de tarjeta 16px; cuerpo 14px; etiquetas 12px. Nada por debajo de 11px. La cifra respuesta va a 36–44px; ninguna otra cifra de la pantalla es mayor.
- Tipo frase en títulos y etiquetas ("Rentabilidad anual", no "RENTABILIDAD ANUAL" ni "Rentabilidad Anual").
- Un cero se pinta en gris (`text-slate-500`), nunca en rojo ni verde.

### Prohibido
Degradados, cristal o `backdrop-blur`, sombras en tarjetas en reposo (solo flotan menús, modales y tooltips), etiquetas pequeñas en mayúsculas espaciadas, iconos dentro de cuadrados o círculos de color, numeración `01 / 02`, emoji, violeta o índigo como acento, y fondos crema.

### Movimiento
Feedback, no espectáculo: la curva de la tarjeta negra se dibuja al cambiar el resultado (`hero-draw`), los bloques entran escalonados al cambiar de pestaña (`stagger`), las cifras ruedan (`useCountUp`) y los controles responden al pulsarlos. Solo `transform` y `opacity`, y todo tiene alternativa en `prefers-reduced-motion`.

## Notificaciones por Telegram (para asistentes de IA)
Los asistentes de IA pueden enviar avisos directos al usuario por Telegram usando [scripts/ai-runner/telegram.mjs](scripts/ai-runner/telegram.mjs) (lee automáticamente TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID de .env.local, tanto desde la raíz del repositorio como desde cualquier worktree en .worktrees/).

1. **Cuándo avisar**:
   - Al completar una historia de usuario (HU), tarea larga o despliegue.
   - Al crear o actualizar un Pull Request listo para revisión.
   - Si encuentras un bloqueo crítico que requiere decisión o credenciales del usuario.
2. **Cómo enviar un aviso rápido (texto libre)**:
   `ash
   npm run ai:telegram -- "Resumen claro del avance, duda o bloqueo"
   `
3. **Cómo enviar un reporte estructurado de tarea / PR**:
   `ash
   node scripts/ai-runner/telegram.mjs --title "FASE X · HU: título" --model "NOMBRE_MODELO" --branch "rama/actual" --pr "https://github.com/aolivari/eftsimulator/pull/XX" --summary "Resumen de cambios y verificación"
   `
4. **Nota con el AI Runner (
pm run ai:runner)**: si estás ejecutando dentro del daemon automático de Trello, al terminar y escribir AI_SUMMARY.md el propio daemon envía la notificación con el enlace al PR automáticamente; usa el comando manual solo si trabajas fuera del daemon o necesitas avisar de un bloqueo intermedio.

## Reglas de producto (noticias y reportes)
Estas reglas son de negocio y legales. El linter no las comprueba; cualquier cambio que las afecte necesita revisión humana.
1. **Información educativa, nunca recomendación.** Ningún texto generado puede decir comprar, vender, reequilibrar ni dar una rentabilidad futura como promesa.
2. **Lo que se envía a un modelo de IA es público o agregado.** Noticias, datos públicos de los ETF y composición de la cartera. Nunca identificadores de usuario, nombres, emails, importes ni pesos personales.
3. **Los reportes se generan por composición y fecha, no por usuario ni por visita.** Un proceso programado genera los reportes del día; si falta el de hoy al entrar, se genera con un bloqueo para evitar duplicados.
4. **Cada reporte muestra sus fuentes** (titular, enlace, fecha) y un aviso legal visible.
5. **Antes de cambiar de proveedor de IA** (hoy Gemini Flash, con Groq de respaldo), hay que revisar su política de uso de datos en el plan de pago.

## Trampas conocidas
1. **`quarterlyContribution` no siempre es trimestral.** En `params` guarda la cantidad **por periodo** (mensual si `contributionFrequency === 'monthly'`). Solo `effectiveParams` la convierte a trimestral. Los motores reciben `effectiveParams`.
2. **El dev server duplica parte de la API.** `vite.config.ts` reimplementa a mano `/api/search`, `/api/etf` y `/api/quotes`. Si cambias esos archivos, replica el cambio ahí o local y producción se comportarán distinto. Cualquier otro endpoint (`history`, nuevos) se carga directamente desde `api/*.ts`.
3. **Las variables `VITE_*` se incrustan al compilar.** Si faltan en Vercel, la web se despliega sin cuentas: `AccountBar` devuelve `null` y no aparece el botón de login. Tras cambiarlas hay que redesplegar.
4. **Nunca uses una clave secreta con prefijo `VITE_`**, porque acabaría en el bundle público. El navegador usa la *publishable key*.
5. **Huella de los planes**: `planFingerprint()` solo compara los parámetros y, de cada ETF, ticker, pesos, `expectedReturn` y `dividendPolicy`. El refresco de cotizaciones (`currentPrice`, `marketStatus`) no marca el plan como "sin guardar". Si añades a `ETFAsset` un campo que defina el plan, inclúyelo en la huella.
6. **Clase de activo ausente**: la pestaña de ciclos usa `detectAssetClass()` (cycleSimulator.ts), que la infiere del ticker y del nombre. El Monte Carlo y `api/history.ts` **no la usan**: si falta `assetClass`, asumen `global_equity`. Un ETF de bonos u oro añadido desde el buscador se trataría como bolsa mundial en el estrés y en el relleno. Pendiente de unificar.

## Variables de entorno
Ver [`.env.example`](.env.example). Las que usa la web hoy:

| Variable | Dónde | Para qué |
|---|---|---|
| `VITE_SUPABASE_URL` | navegador | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | navegador | *Publishable key* (`sb_publishable_…`) |
| `VITE_AUTH_GOOGLE` | navegador | `true` muestra "Continuar con Google" |

## Base de datos (Supabase)
Esquema en [`supabase/schema.sql`](supabase/schema.sql), con RLS activado en todas las tablas:

| Tabla | Contenido |
|---|---|
| `profiles` | Una fila por usuario, creada por un trigger al registrarse |
| `plans` | Planes guardados: `params` (jsonb, `SimulationParams` sin `selectedEtfs`) y `etfs` (jsonb, `ETFAsset[]`). Solo el dueño los ve y edita. |

Los cambios de esquema se añaden a `schema.sql` de forma idempotente (`if not exists`, `drop policy if exists`) y se ejecutan a mano en el SQL Editor de Supabase.

## Infraestructura
- **Vercel**: proyecto `eftsimulator`. `vercel.json` reescribe `/api/*` a las funciones y el resto a `index.html`.
- **Supabase**: proyecto `eulkeftzlmqtlxiqmsvs`. Auth con email y Google, cuyo cliente OAuth está en el proyecto de GCP `eft-simulator-auth`, sin facturación.

## Ideas pendientes
- Rentabilidad esperada configurable (histórica, conservadora o personalizada), porque hoy domina el resultado del Monte Carlo.
- Bootstrap por bloques de varios trimestres e historia desde 1970.
- Conversión de los índices de relleno a EUR, valores reales descontando la inflación, impuestos al vender y rebalanceo.

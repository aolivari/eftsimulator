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
| Lint (arquitectura y calidad) | `npm run lint` (solo `src/features`, `src/shared` y `src/app`; ver "Arquitectura objetivo") |
| Comprobar tipos de `api/` | `npx tsc --noEmit --strict --skipLibCheck --module esnext --moduleResolution bundler --target es2022 --esModuleInterop --types node api/*.ts` |
| Build de producción | `npm run build` |

No hay tests automatizados. El linter cubre solo el código nuevo (ver "Arquitectura objetivo"). Verifica los cambios con `npx tsc -b` y abriendo la web en el navegador.

## Mapa del código

```
src/
  main.tsx, App.tsx          Entrada. App envuelve todo en <AuthProvider>.
  components/
    ETFSimulator.tsx         Componente raíz: TODO el estado (params, etfs, pestañas, ciclos) vive aquí.
    InputControls.tsx        Capital, aportación, plazo, rentabilidad, frecuencia.
    PortfolioAllocation.tsx  Cartera: buscador (/api/search, /api/etf), cotizaciones (/api/quotes), pesos.
    GrowthChart.tsx          Gráfico principal (rentabilidad fija / ciclo histórico / línea temporal).
    MonteCarloPanel.tsx      Monte Carlo + prueba de estrés + tabla "¿importa cuándo llega?".
    CycleSimulator.tsx       Pestaña de ciclos históricos y composición de la línea temporal.
    CycleTimelineModal.tsx   Editor de la línea temporal plurianual (bottom sheet).
    BrokerComparisonTable.tsx, AnnualProjectionTable.tsx, MetricsCards.tsx, HeroLedger.tsx
    AccountBar.tsx           Login/logout y "Mis planes" (guardar, cargar, sobrescribir, renombrar, borrar).
    AuthModal.tsx            Formulario email/contraseña + botón Google (tras VITE_AUTH_GOOGLE).
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
  lib/
    supabase.ts              Cliente del navegador. Es null si faltan las variables: la web funciona sin cuentas.
    plans.ts                 CRUD de la tabla plans + planFingerprint() para detectar cambios sin guardar.
    marketData.ts            fetch a /api/history (y a /api/forecast, sin uso).
  auth/AuthContext.tsx       useAuth(): sesión, signIn/signUp/Google/reset/signOut.
  types/index.ts             TODOS los tipos compartidos (ETFAsset, SimulationParams, MonteCarloResult...).
api/                         Funciones serverless de Vercel (Node). Una por archivo = un endpoint.
  search.ts                  GET ?q=        Búsqueda de ETFs en Yahoo Finance.
  etf.ts                     GET ?ticker=   Ficha del ETF: precio, TER, rentabilidades anuales.
  quotes.ts                  GET ?tickers=  Cotizaciones en vivo y tendencia (SMA200).
  history.ts                 GET ?items=VWCE:global_equity,...  Rentabilidades mensuales para el Monte Carlo.
  plan.ts                    GET ?profile=  Carteras preset con datos en vivo. Ningún componente la usa.
  forecast.ts                GET ?ticker=   Predicción Kronos con caché en Supabase. ARCHIVADO: sin uso en la web.
supabase/schema.sql          Tablas, RLS y triggers. Idempotente: se puede volver a ejecutar.
kronos-service/              Servicio Python (FastAPI + Kronos) para Cloud Run. ARCHIVADO.
scripts/backtest-kronos.mjs  Backtest de Kronos contra referencias ingenuas.
docs/                        Guía de setup e informe del backtest.
vite.config.ts               Plugin que emula las funciones de api/ en `npm run dev` (ver trampas).
stitch_*.html, .taste-skill/ Maquetas de diseño e informes visuales. No forman parte de la app.
```

## Arquitectura objetivo (feature-first + `shared/ui`)

Estado: **destino**. El código actual todavía usa `src/components/` plano; la migración se hace por partes. El código **nuevo** debe seguir ya esta estructura.

```
src/
  features/                 Módulos de negocio. Cada uno se autocontiene.
    <feature>/
      components/           Componentes exclusivos del feature
      hooks/                Hooks del feature
      services/             Llamadas a api/ o Supabase del feature
      types.ts              Tipos del feature
      index.ts              ÚNICO punto de entrada público
  shared/
    ui/                     Componentes reutilizables SIN dominio (ver reglas)
      atoms/                Piezas mínimas: Button, Input, Badge
      molecules/            Combinaciones: FormField (label + input + error)
      compound/             Piezas con partes que comparten estado:
                            Card (Root/Header/Body), Tabs (Root/List/Panel),
                            Modal (Root/Title/Actions)
      index.ts              ÚNICO punto de entrada de la UI compartida
    lib/                    Clientes configurados (supabase.ts, marketData.ts)
    utils/                  Funciones puras genéricas (formato de fechas, moneda)
  engine/                   Lógica pura de cálculo, sin React (ver nota)
  app/                      Composición: ensambla features, sin lógica propia
api/                        Funciones de Vercel. SE QUEDA EN LA RAÍZ.
```

Features previstos: `simulacion`, `cartera`, `monte-carlo`, `ciclos`, `cuentas` y `noticias`. El mapeo de los componentes actuales a cada uno está en la tabla de migración de abajo.

### Reglas de `shared/ui`
1. **Sin dominio.** Ningún componente de `shared/ui` menciona planes, ETF, noticias ni cualquier otro concepto del negocio. Si lo necesita, es un componente de su feature.
2. **Sin dependencias hacia `features/`.** Los features importan de `shared/ui`; nunca al revés.
3. **Un solo punto de entrada.** Se importa siempre desde `shared/ui` (o `shared/ui/atoms`, etc. solo si el barrel lo exporta), nunca desde rutas internas de otro componente.
4. **Compound solo cuando hay estado compartido** entre las partes (pestañas, modales, tarjetas con cabecera). No usar compound para piezas simples: un átomo basta.
5. **Props tipadas y sin estilos de página.** Estilos con la paleta de la sección Convenciones; el componente no fija márgenes externos que dependan de dónde se coloque.

### Reglas de `features/`
1. Un feature **no importa** los internos de otro feature. Solo su `index.ts`.
2. La lógica de cálculo va en `engine/` (pura). El feature la consume; no la reimplementa en componentes.
3. Los tipos compartidos entre features van en `src/types/index.ts`; los propios, en `types.ts` del feature.
4. Antes de crear un componente reutilizable, comprobar si ya existe en `shared/ui`.

### Migración de `src/components/` (pendiente)
Un feature por PR, cuando nadie más toque esos archivos. Orden sugerido: `cuentas` (el más aislado) → `monte-carlo` → `ciclos` → `cartera` → `simulacion`. `ETFSimulator.tsx` pasa a ser `app/` cuando el último feature esté migrado.

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
- `kronosDebiasedReturns` y el campo `forecasts` siguen en el motor, pero nadie los usa.

## Convenciones
- **Unidades** (fuente de errores habitual):
  - `expectedReturn`, `annualReturn`, `ter` y `dividendYield` son **porcentajes como número**: `7.0` = 7 %.
  - Los pesos (`weight`, `initialWeight`, `recurringWeight`) van de 0 a 100.
  - Dentro de `monteCarlo.ts` y en `MonteCarloResult`, las rentabilidades y probabilidades son **fracciones**: `0.07`, y `probLoss` de 0 a 1.
- **Pesos de cartera**: `initialWeight` reparte el capital inicial y `recurringWeight` las aportaciones. Si faltan, se usa `weight` (`e.recurringWeight ?? e.weight`).
- **Clase de activo** (`AssetClass`): decide qué factor de ciclo y qué índice de relleno usa cada ETF. Ver la trampa 9 sobre qué pasa si falta.
- **Estilos**: Tailwind con la paleta existente (naranja `#F97316`/`orange-500` como acento, `slate` para el texto, tarjetas `bg-white rounded-2xl border border-slate-200`). En inputs se usa `text-base sm:text-sm` para evitar el zoom en iOS. La web es solo en modo claro.
- **Gráficos**: Recharts (`ComposedChart`/`AreaChart`). Los ejes formatean en `k`.
- **Tipos nuevos** → en `src/types/index.ts`. **Lógica nueva** → en `src/engine/` (pura y sin React), no dentro de los componentes.
- **Commits**: mensajes en español, con estilo `feat:` / `fix:` / `chore:` / `docs:`.

## Trampas conocidas
1. **`quarterlyContribution` no siempre es trimestral.** En `params` guarda la cantidad **por periodo** (mensual si `contributionFrequency === 'monthly'`). Solo `effectiveParams` la convierte a trimestral. Los motores reciben `effectiveParams`.
2. **El dev server duplica parte de la API.** `vite.config.ts` reimplementa a mano `/api/search`, `/api/etf` y `/api/quotes`. Si cambias esos archivos, replica el cambio ahí o local y producción se comportarán distinto. Cualquier otro endpoint (`history`, `forecast`, nuevos) se carga directamente desde `api/*.ts`.
3. **Las variables `VITE_*` se incrustan al compilar.** Si faltan en Vercel, la web se despliega sin cuentas: `AccountBar` devuelve `null` y no aparece el botón de login. Tras cambiarlas hay que redesplegar.
4. **Nunca uses una clave secreta con prefijo `VITE_`**, porque acabaría en el bundle público. `SUPABASE_SERVICE_ROLE_KEY` (`sb_secret_…`) es solo para `api/`. El navegador usa la *publishable key*.
5. **`VITE_SUPABASE_URL` también la lee el servidor** (`api/forecast.ts`). No existe `SUPABASE_URL`.
6. **Huella de los planes**: `planFingerprint()` solo compara los parámetros y, de cada ETF, ticker, pesos, `expectedReturn` y `dividendPolicy`. El refresco de cotizaciones (`currentPrice`, `marketStatus`) no marca el plan como "sin guardar". Si añades a `ETFAsset` un campo que defina el plan, inclúyelo en la huella.
7. **Kronos está archivado a propósito.** El backtest (`docs/backtest-kronos.md`) demostró que no supera a "siempre sube" ni a la volatilidad reciente, y que su rango infravalora el riesgo. **No lo reconectes al Monte Carlo** sin repetir antes el backtest (`node scripts/backtest-kronos.mjs`) y mejorar esos números.
8. **Credenciales**: `.env.local` (y cualquier `.env*` salvo `.env.example`) y las claves JSON de Google están en `.gitignore`. No imprimas sus valores en logs ni en la salida de comandos.
9. **Clase de activo ausente**: la pestaña de ciclos usa `detectAssetClass()` (cycleSimulator.ts), que la infiere del ticker y del nombre. El Monte Carlo y `api/history.ts` **no la usan**: si falta `assetClass`, asumen `global_equity`. Un ETF de bonos u oro añadido desde el buscador se trataría como bolsa mundial en el estrés y en el relleno. Pendiente de unificar.

## Variables de entorno
Ver [`.env.example`](.env.example). Las que usa la web hoy:

| Variable | Dónde | Para qué |
|---|---|---|
| `VITE_SUPABASE_URL` | navegador y `api/` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | navegador | *Publishable key* (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | solo `api/` | *Secret key* (`sb_secret_…`), solo para `api/forecast.ts` |
| `VITE_AUTH_GOOGLE` | navegador | `true` muestra "Continuar con Google" |

Solo para el servicio Kronos archivado: `KRONOS_SERVICE_URL`, `KRONOS_API_KEY`, `GCP_SERVICE_ACCOUNT_KEY` y `KRONOS_DAILY_LIMIT_PER_USER`.

## Base de datos (Supabase)
Esquema en [`supabase/schema.sql`](supabase/schema.sql), con RLS activado en todas las tablas:

| Tabla | Contenido |
|---|---|
| `profiles` | Una fila por usuario, creada por un trigger al registrarse |
| `plans` | Planes guardados: `params` (jsonb, `SimulationParams` sin `selectedEtfs`) y `etfs` (jsonb, `ETFAsset[]`). Solo el dueño los ve y edita. |
| `forecast_cache`, `forecast_requests` | Caché y registro de Kronos (archivado) |

Los cambios de esquema se añaden a `schema.sql` de forma idempotente (`if not exists`, `drop policy if exists`) y se ejecutan a mano en el SQL Editor de Supabase.

## Infraestructura
- **Vercel**: proyecto `eftsimulator`. `vercel.json` reescribe `/api/*` a las funciones y el resto a `index.html`.
- **Supabase**: proyecto `eulkeftzlmqtlxiqmsvs`. Auth con email y Google, cuyo cliente OAuth está en el proyecto de GCP `eft-simulator-auth`, sin facturación.
- **Google Cloud** (solo Kronos, archivado): proyecto `eft-simulator-kronos`, servicio privado de Cloud Run `kronos` en `europe-west1`, con escala a cero.

## Ideas pendientes
- Rentabilidad esperada configurable (histórica, conservadora o personalizada), porque hoy domina el resultado del Monte Carlo.
- Bootstrap por bloques de varios trimestres e historia desde 1970.
- Conversión de los índices de relleno a EUR, valores reales descontando la inflación, impuestos al vender y rebalanceo.

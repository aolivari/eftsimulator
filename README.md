# ETF Simulator

Simulador web de planes de ahorro en ETFs para inversores en España: cuánto puede valer tu cartera dentro de N años, cuánto te cuesta cada bróker y qué pasa si llega una crisis.

**Producción:** <https://eftsimulator.vercel.app>

## Qué hace

| Funcionalidad | Pestaña / Ubicación | Feature (`src/features/`) |
|---|---|---|
| **Proyección del plan, Monte Carlo y estrés**: parámetros, KPIs, gráfica de crecimiento y simulación Monte Carlo sobre trimestres reales desde 2005 | Pestaña *Simulación General* | `simulacion/` (`SimulacionView`) |
| **Cartera de ETFs**: búsqueda en vivo (Yahoo Finance), pesos de compra inicial y recurrente, y carteras modelo (Bogle, Buffett…) | Pestaña *Plan de Ahorro ETFs* | `cartera/` (`CarteraView`) |
| **Ciclos históricos**: backtest de tu plan dentro de un ciclo real y línea temporal plurianual concatenada | Pestaña *Ciclos Históricos* | `ciclos/` (`CiclosView`) |
| **Proyección anualizada**: desglose año a año del efecto bola de nieve (aportado, beneficio anual, plusvalía, comisiones y valor neto) | Pestaña *Proyección Anual* | `proyeccion-anual/` (`ProyeccionAnualView`) |
| **Comparativa de brókers**: ranking de Trade Republic, MyInvestor, ING y banca tradicional con comisiones reales de compra y custodia | Pestaña *Comparativa Brókers* | `brokers/` (`BrokersView`) |
| **Cuentas y planes guardados**: login con email o Google y planes por usuario en Supabase (se oculta en local si no configuras `VITE_SUPABASE_*`) | Barra superior | `cuentas/` (`AccountBar`) |

> Las cifras son simulaciones educativas, no asesoramiento financiero.

## Arquitectura

El frontend sigue una arquitectura **feature-first + `shared/ui`** validada con `eslint-plugin-boundaries`:

- **1 Pestaña = 1 Feature (`src/features/`)**: cada pestaña tiene su propia carpeta y exporta su vista (`SimulacionView`, `CarteraView`, `CiclosView`, `ProyeccionAnualView`, `BrokersView`) construida con el compound component `ViewTemplate`. Además, `cuentas/` gestiona de forma transversal la autenticación y el guardado de planes en Supabase.
- **UI compartida (`src/shared/ui/`)**: átomos (`Button`, `Input`, `BufferedNumberInput`, `Badge`), moléculas (`FormField`), compound components (`ViewTemplate`, `Tabs`, `Card`, `Modal`) y organismos compartidos entre vistas (`GrowthChart`), expuestos desde un único punto de entrada (`src/shared/ui/index.ts`).
- **Motores puros (`src/engine/`)**: cálculos financieros (`simulation.ts`, `monteCarlo.ts`, `cycleSimulator.ts`) desacoplados de React.

## Stack

- **Frontend:** React 18 + TypeScript + Vite 6 + Tailwind CSS 3 + Recharts + lucide-react
- **API:** funciones serverless de Vercel en `api/` (Node, `yahoo-finance2`)
- **Cuentas y datos:** Supabase (Auth + Postgres con RLS)

## Arrancar en local

```bash
npm install
```

```bash
cp .env.example .env.local
```

Rellena las variables de Supabase en `.env.local` (opcional: sin ellas la web funciona, pero sin cuentas) y arranca:

```bash
npm run dev
```

Abre <http://localhost:5173>. El servidor de Vite también sirve las funciones de `api/`, igual que Vercel.

Comprobar tipos, arquitectura y compilar:

```bash
npm run lint
npm run build
```

## Desplegar

Vercel despliega solo al fusionar en `master`. Las variables de entorno van en *Vercel → Settings → Environment Variables* (para *Production* y *Preview*). Las `VITE_*` se incrustan al compilar, así que después de cambiarlas hay que redesplegar.

## Documentación

| Documento | Para qué |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Arquitectura, convenciones y trampas del código. **Léelo antes de cambiar nada** (también para asistentes de IA). |
| [`supabase/schema.sql`](supabase/schema.sql) | Esquema de base de datos y políticas RLS |

# ETF Simulator

Simulador web de planes de ahorro en ETFs para inversores en España: cuánto puede valer tu cartera dentro de N años, cuánto te cuesta cada bróker y qué pasa si llega una crisis.

**Producción:** <https://eftsimulator.vercel.app>

## Qué hace

| Funcionalidad | Dónde |
|---|---|
| **Proyección del plan**: capital inicial y aportación periódica, con rentabilidad fija y comparativa de brókers (Trade Republic, MyInvestor, ING, banca tradicional) con sus comisiones reales | Pestaña *Simulación General* |
| **Escenarios realistas (Monte Carlo)**: 3.000 futuros remuestreando trimestres reales del mercado desde 2005, con pesimista, mediano, optimista, probabilidad de perder dinero y caída máxima | Panel bajo el gráfico principal |
| **Prueba de estrés**: fuerza una crisis histórica (2008, puntocom, inflación 2022…) en el año que elijas y compara contra el escenario sin crisis | Dentro del panel de Monte Carlo |
| **Cartera**: búsqueda de ETFs en vivo (Yahoo Finance), pesos de compra inicial y recurrente, carteras modelo (Bogle, Buffett…) | Pestaña *Plan de Ahorro ETFs* |
| **Ciclos históricos**: backtest de tu plan dentro de un ciclo real y línea temporal plurianual de ciclos | Pestaña *Ciclos Históricos* |
| **Cuentas y planes guardados**: login con email o Google, y planes por usuario (guardar, cargar, sobrescribir, renombrar, borrar) | Arriba a la derecha |

> Las cifras son simulaciones educativas, no asesoramiento financiero.

## Stack

- **Frontend:** React 18 + TypeScript + Vite 6 + Tailwind CSS 3 + Recharts + lucide-react
- **API:** funciones serverless de Vercel en `api/` (Node, `yahoo-finance2`)
- **Cuentas y datos:** Supabase (Auth + Postgres con RLS)
- **Experimental (archivado):** servicio Python con el modelo Kronos en Google Cloud Run (`kronos-service/`). No se usa en la web; ver [`docs/backtest-kronos.md`](docs/backtest-kronos.md).

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

Comprobar tipos y compilar:

```bash
npm run build
```

## Desplegar

Vercel despliega solo al fusionar en `master`. Las variables de entorno van en *Vercel → Settings → Environment Variables* (para *Production* y *Preview*). Las `VITE_*` se incrustan al compilar, así que después de cambiarlas hay que redesplegar.

Guía paso a paso (Supabase, login con Google, Vercel y el servicio Kronos opcional): [`docs/SETUP-IA-Y-CUENTAS.md`](docs/SETUP-IA-Y-CUENTAS.md).

## Documentación

| Documento | Para qué |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Arquitectura, convenciones y trampas del código. **Léelo antes de cambiar nada** (también para asistentes de IA). |
| [`docs/SETUP-IA-Y-CUENTAS.md`](docs/SETUP-IA-Y-CUENTAS.md) | Configurar Supabase, Google, Vercel y Cloud Run |
| [`docs/backtest-kronos.md`](docs/backtest-kronos.md) | Por qué Kronos no se usa: resultados del backtest |
| [`supabase/schema.sql`](supabase/schema.sql) | Esquema de base de datos y políticas RLS |

# Puesta en marcha: cuentas de usuario, Monte Carlo y predicción IA (Kronos)

El simulador funciona sin nada de esto: el **Monte Carlo** se calcula en el navegador con el histórico de `/api/history`.
Las **cuentas** (guardar planes) y la **predicción Kronos** se activan cuando configuras lo siguiente.

```
Navegador ──► Vercel /api/forecast ──► Supabase (caché + límites por usuario)
   │                    └──────────► Google Cloud Run (Kronos-mini, CPU)
   └──► Supabase Auth (login) + tabla plans (planes por usuario)
```

---

## 1. Supabase

1. Crea un proyecto en <https://supabase.com> (región Europa, p. ej. Frankfurt).
2. **SQL Editor → New query**: pega el contenido de [`supabase/schema.sql`](../supabase/schema.sql) y pulsa **Run**.
   Crea las tablas `profiles`, `plans`, `forecast_cache` y `forecast_requests` con sus políticas RLS.
3. **Authentication → URL Configuration**:
   - *Site URL*: la URL de producción (p. ej. `https://tu-dominio.vercel.app`).
   - *Redirect URLs*: añade también `http://localhost:5173` para desarrollo.
4. **Authentication → Sign In / Providers → Email**: activado (por defecto). Deja "Confirm email" activado.
5. (Opcional) **Login con Google** (luego pon `VITE_AUTH_GOOGLE=true`):
   1. En Google Cloud Console → *APIs & Services → Credentials → Create credentials → OAuth client ID* (tipo *Web application*).
   2. *Authorized redirect URI*: `https://<tu-proyecto>.supabase.co/auth/v1/callback`
   3. Copia *Client ID* y *Client secret* en Supabase → *Providers → Google* y actívalo.
6. **Project Settings → API**: copia
   - `Project URL` (Project Settings → Data API) → `VITE_SUPABASE_URL`
   - *Publishable key* (`sb_publishable_…`) → `VITE_SUPABASE_ANON_KEY`
   - *Secret key* (`sb_secret_…`) → `SUPABASE_SERVICE_ROLE_KEY` (**secreta**: solo en el servidor, nunca con prefijo `VITE_`)

---

## 2. Servicio Kronos en Google Cloud Run

Carpeta [`kronos-service/`](../kronos-service): FastAPI + Kronos-mini (licencia MIT, código fijado a un commit concreto),
adaptado de `update_predictions.py` de Kronos-demo para usar datos diarios de Yahoo Finance (ventana de 60 sesiones) y devolver 32 trayectorias a 63 sesiones (~3 meses).
Hugging Face no requiere cuenta: los pesos son públicos y se descargan al construir la imagen.

Con el [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) instalado:

```bash
gcloud auth login
```

```bash
gcloud config set project TU_PROYECTO_GCP
```

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

Genera una clave aleatoria y guárdala (es `KRONOS_API_KEY`):

```bash
openssl rand -hex 32
```

Despliega como servicio **privado** (construye la imagen en Cloud Build; tarda unos minutos):

```bash
gcloud run deploy kronos --source kronos-service --region europe-west1 --cpu 2 --memory 4Gi --timeout 300 --concurrency 1 --min-instances 0 --max-instances 3 --no-allow-unauthenticated --set-env-vars KRONOS_API_KEY=PEGA_AQUI_LA_CLAVE
```

- `--no-allow-unauthenticated`: nadie puede llamarlo desde internet sin un token de Google con permiso `run.invoker`.
- `--min-instances 0` hace que no cueste nada sin uso (la primera petición tras un rato parado tarda más).
- `--max-instances 3` limita el gasto máximo de tus créditos.

Cuenta de servicio para que Vercel pueda invocarlo (solo ese permiso):

```bash
gcloud iam service-accounts create vercel-kronos-invoker --display-name="Vercel -> Kronos (solo invocar)"
```

```bash
gcloud run services add-iam-policy-binding kronos --region europe-west1 --member="serviceAccount:vercel-kronos-invoker@TU_PROYECTO_GCP.iam.gserviceaccount.com" --role="roles/run.invoker"
```

```bash
gcloud iam service-accounts keys create vercel-kronos-invoker.json --iam-account=vercel-kronos-invoker@TU_PROYECTO_GCP.iam.gserviceaccount.com
```

Convierte el JSON a base64 y ponlo en `GCP_SERVICE_ACCOUNT_KEY`; luego **borra el archivo** `vercel-kronos-invoker.json`.

Prueba con tu propia cuenta (la URL la imprime el despliegue):

```bash
curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" -H "x-api-key: TU_CLAVE" "https://kronos-xxxx.run.app/forecast?ticker=VWCE&samples=8"
```

> Recomendado: en *Billing → Budgets & alerts* crea un presupuesto con aviso (p. ej. 20 $/mes).

---

## 3. Vercel

En *Project → Settings → Environment Variables* añade todas las de [`.env.example`](../.env.example) y vuelve a desplegar.

## 4. Desarrollo local

```bash
cp .env.example .env.local
```

Rellena los valores y ejecuta `npm run dev`. El plugin de Vite carga `api/forecast.ts` y `api/history.ts` igual que en Vercel.

---

## Cómo funciona

| Pieza | Qué hace |
|---|---|
| `src/engine/monteCarlo.ts` | 3.000 escenarios por trimestre. Remuestrea trimestres reales (todos los ETFs a la vez → conserva correlación), recentrados en la rentabilidad esperada de cada ETF. Aplica comisiones y custodia del bróker, y el IRPF de los ETFs de distribución. |
| `api/history.ts` | Rentabilidades mensuales desde 2005. Antes del lanzamiento de cada ETF rellena con un índice equivalente (ACWI, SPY, QQQ, AGG, GLD, XLP). |
| `api/forecast.ts` | Requiere sesión. Usa la caché compartida de Supabase (20 h por ticker); si falta, llama a Cloud Run. Límite de cálculos nuevos por usuario y día. |
| `kronos-service/app.py` | Kronos-mini sobre 60 velas diarias. Trayectorias independientes, volatilidad predicha vs. la de los últimos 3 meses. `?asof=AAAA-MM-DD` predice con datos hasta esa fecha (backtest). |
| Integración | El **primer trimestre** de cada escenario usa la dispersión de las trayectorias de Kronos, con la mediana fijada en la rentabilidad esperada del ETF (se descarta su dirección). Los siguientes trimestres salen del histórico. |
| `scripts/backtest-kronos.mjs` | Compara las predicciones de Kronos en fechas pasadas con lo que ocurrió y con referencias ingenuas. `node scripts/backtest-kronos.mjs VWCE,SXR8 24` |

**Limitaciones**
- Kronos tiene un sesgo de reversión a la media de la ventana: en ETFs con tendencia alcista predice caídas de forma sistemática. Por eso solo se usa su volatilidad. Ver resultados en [`docs/backtest-kronos.md`](backtest-kronos.md).
- Los índices de relleno están en USD, así que no incluyen el efecto divisa EUR/USD.

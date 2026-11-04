# Puesta en marcha: cuentas de usuario, Vercel y (opcional) Kronos

El simulador funciona sin nada de esto: el **Monte Carlo** se calcula en el navegador con el histórico de `/api/history`.
Las **cuentas** (login y planes guardados) se activan configurando Supabase (sección 1) y Vercel (sección 3).
La sección 2 (Kronos) es **opcional y está archivada**: la web no la usa (ver [`backtest-kronos.md`](backtest-kronos.md)).

```
Navegador ──► Supabase Auth (email / Google) + tabla plans (RLS: cada usuario ve lo suyo)
   └──────► Vercel /api/history ──► Yahoo Finance   (histórico para el Monte Carlo)

Archivado: Vercel /api/forecast ──► Supabase (caché) ──► Cloud Run (Kronos)
```

---

## 1. Supabase

1. Crea un proyecto en <https://supabase.com> (región Europa, p. ej. Frankfurt).
2. **SQL Editor → New query**: pega el contenido de [`supabase/schema.sql`](../supabase/schema.sql) y pulsa **Run**.
   Crea las tablas `profiles`, `plans`, `forecast_cache` y `forecast_requests` con sus políticas RLS.
3. **Authentication → URL Configuration**:
   - *Site URL*: la URL de producción (`https://eftsimulator.vercel.app`).
   - *Redirect URLs*: la de producción, `http://localhost:5173` para desarrollo y las URLs de los despliegues de prueba que quieras usar.
4. **Authentication → Sign In / Providers → Email**: activado (por defecto). Deja "Confirm email" activado.
5. (Opcional) **Login con Google** (luego pon `VITE_AUTH_GOOGLE=true`):
   1. Usa un proyecto de Google Cloud **sin facturación** (el nuestro es `eft-simulator-auth`). Para crearlo sin que la consola pida una cuenta de facturación: `gcloud projects create eft-simulator-auth`.
   2. *Google Auth Platform* → **Comenzar**: nombre de la app, email de asistencia, público **Externo**. Luego **Público → Publicar aplicación** (si no, solo entran los usuarios de prueba).
   3. **Clientes → Crear cliente** → *Aplicación web*, con *URI de redireccionamiento autorizado* `https://<tu-proyecto>.supabase.co/auth/v1/callback`. Deja desmarcado "Use this client for an AI-powered agent".
   4. Copia el *Client ID* y el *Client secret* en Supabase → *Sign In / Providers → Google*, actívalo y guarda.
6. **Project Settings → API**: copia
   - `Project URL` (Project Settings → Data API) → `VITE_SUPABASE_URL`
   - *Publishable key* (`sb_publishable_…`) → `VITE_SUPABASE_ANON_KEY`
   - *Secret key* (`sb_secret_…`) → `SUPABASE_SERVICE_ROLE_KEY` (**secreta**: solo en el servidor, nunca con prefijo `VITE_`)

---

## 2. (Opcional, archivado) Servicio Kronos en Google Cloud Run

> La web no usa Kronos: en el backtest no superó a las referencias sencillas. Esta sección solo hace falta para volver a experimentar con él.

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

Variables necesarias, para **Production** y **Preview**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `VITE_AUTH_GOOGLE`. Las de Kronos solo hacen falta si se reactiva.

**Desde el panel:** *Project → Settings → Environment Variables*.

**Desde la CLI**, leyendo los valores de `.env.local` sin mostrarlos (PowerShell, en la raíz del proyecto):

```bash
npx vercel login
```

```bash
npx vercel link --yes --project eftsimulator
```

```powershell
$envs = @{}; Get-Content .env.local | ForEach-Object { if ($_ -match '^([A-Z_]+)="?(.*?)"?$') { $envs[$matches[1]] = $matches[2] } }; foreach ($name in 'VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','VITE_AUTH_GOOGLE') { $tmp = New-TemporaryFile; [IO.File]::WriteAllText($tmp, $envs[$name]); cmd /c "npx vercel env rm $name production -y >nul 2>&1"; cmd /c "npx vercel env add $name production < `"$tmp`""; Remove-Item $tmp }
```

El valor pasa por un archivo temporal sin salto de línea final, porque un `\n` colado rompería la URL o las claves. Vercel guarda la *secret key* como tipo **Secret** y no deja leerla de vuelta: es normal.

**Las variables `VITE_*` se incrustan al compilar**, así que después de cambiarlas hay que redesplegar:

```bash
npx vercel redeploy https://eftsimulator.vercel.app --environment=production
```

Si no aparece el botón "Iniciar sesión" en producción, la web se compiló sin `VITE_SUPABASE_URL` o sin `VITE_SUPABASE_ANON_KEY`.

## 4. Desarrollo local

```bash
cp .env.example .env.local
```

Rellena los valores y ejecuta `npm run dev`. El plugin de Vite sirve las funciones de `api/` igual que Vercel (ver la trampa 2 de [`AGENTS.md`](../AGENTS.md)).

---

## Cómo funciona

| Pieza | Qué hace |
|---|---|
| `src/engine/monteCarlo.ts` | 3.000 escenarios por trimestre. Remuestrea trimestres reales (todos los ETFs a la vez → conserva correlación), recentrados en la rentabilidad esperada de cada ETF. Aplica comisiones y custodia del bróker, y el IRPF de los ETFs de distribución. **Prueba de estrés**: inserta un ciclo de `historicalCycles.ts` tal cual ocurrió, desde el año elegido. |
| `api/history.ts` | Rentabilidades mensuales desde 2005. Antes del lanzamiento de cada ETF rellena con un índice equivalente (ACWI, SPY, QQQ, AGG, GLD, XLP, BIL). |
| `src/lib/plans.ts` + `AccountBar.tsx` | Planes por usuario en la tabla `plans` de Supabase, protegidos por RLS. |
| `api/forecast.ts` *(archivado)* | Requiere sesión. Caché compartida en Supabase (20 h por ticker); si falta, llama a Cloud Run. Límite de cálculos nuevos por usuario y día. |
| `kronos-service/app.py` *(archivado)* | Kronos (`mini`, `small` o `base`) sobre 60 velas diarias. Opciones `detrend`, `temperature` y `asof=AAAA-MM-DD` (backtest). |
| `scripts/backtest-kronos.mjs` | Compara las predicciones de Kronos en fechas pasadas con lo que ocurrió y con referencias ingenuas. `node scripts/backtest-kronos.mjs VWCE,SXR8 24 "detrend=true"` |

**Limitaciones**
- La media de los escenarios sale de la rentabilidad esperada de cada ETF: es la suposición que más pesa.
- Los índices de relleno están en USD, así que no incluyen el efecto divisa EUR/USD.
- Los ciclos de crisis van del máximo al mínimo; la recuperación posterior sale del remuestreo, normalmente más lenta que el rebote real.

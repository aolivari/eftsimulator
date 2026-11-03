-- ════════════════════════════════════════════════════════════════════════
-- ETF Simulator · Esquema Supabase
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → New query → Run
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ════════════════════════════════════════════════════════════════════════

-- ─── 1. Perfiles de usuario ─────────────────────────────────────────────
-- Una fila por usuario de auth.users, creada automáticamente al registrarse.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── 2. Planes guardados por usuario ────────────────────────────────────
-- params: SimulationParams (capital, aportación, años...)
-- etfs:   ETFAsset[] con pesos inicial/recurrente
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 120),
  params jsonb not null,
  etfs jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_user_idx on public.plans (user_id, updated_at desc);

alter table public.plans enable row level security;

drop policy if exists "plans_select_own" on public.plans;
create policy "plans_select_own" on public.plans
  for select using (auth.uid() = user_id);

drop policy if exists "plans_insert_own" on public.plans;
create policy "plans_insert_own" on public.plans
  for insert with check (auth.uid() = user_id);

drop policy if exists "plans_update_own" on public.plans;
create policy "plans_update_own" on public.plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "plans_delete_own" on public.plans;
create policy "plans_delete_own" on public.plans
  for delete using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists plans_touch_updated_at on public.plans;
create trigger plans_touch_updated_at
  before update on public.plans
  for each row execute function public.touch_updated_at();

-- ─── 3. Caché de predicciones Kronos ────────────────────────────────────
-- Compartida entre usuarios: una predicción por ticker y día de mercado.
-- Solo la escribe el backend (service_role, que ignora RLS).
create table if not exists public.forecast_cache (
  ticker text not null,
  horizon int not null,
  as_of date not null,              -- fecha de la última vela usada por el modelo
  symbol text not null,             -- símbolo resuelto en Yahoo (ej. VWCE.DE)
  payload jsonb not null,           -- trayectorias + métricas
  created_at timestamptz not null default now(),
  primary key (ticker, horizon, as_of)
);

create index if not exists forecast_cache_recent_idx
  on public.forecast_cache (ticker, horizon, created_at desc);

alter table public.forecast_cache enable row level security;

drop policy if exists "forecast_cache_read_authenticated" on public.forecast_cache;
create policy "forecast_cache_read_authenticated" on public.forecast_cache
  for select to authenticated using (true);

-- ─── 4. Registro de peticiones de predicción por usuario ────────────────
-- Sirve para limitar cuántos cálculos nuevos (que cuestan CPU en Cloud Run)
-- puede lanzar cada usuario al día, y para saber qué ETFs consulta cada uno.
create table if not exists public.forecast_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  ticker text not null,
  cache_hit boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists forecast_requests_user_idx
  on public.forecast_requests (user_id, created_at desc);

alter table public.forecast_requests enable row level security;

drop policy if exists "forecast_requests_select_own" on public.forecast_requests;
create policy "forecast_requests_select_own" on public.forecast_requests
  for select using (auth.uid() = user_id);

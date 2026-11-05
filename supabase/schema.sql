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

-- ─── 3. Noticias (ingesta diaria con Tavily) ────────────────────────────
-- Solo metadatos: titular, URL, fecha y fuente. Nunca el texto del artículo.
-- Escribe únicamente /api/news/ingest con la clave de servicio (que se salta RLS).
create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  published_at timestamptz not null,
  source text not null,
  scope text not null check (scope in ('ticker', 'sector', 'macro')),
  tickers text[] not null default '{}',
  url_key text not null unique,   -- URL normalizada: deduplica entre ejecuciones
  title_key text not null,        -- titular normalizado
  fetched_at timestamptz not null default now()
);

create index if not exists news_items_published_idx on public.news_items (published_at desc);
create index if not exists news_items_title_key_idx on public.news_items (title_key);

alter table public.news_items enable row level security;

-- Las noticias son públicas: lectura abierta, sin políticas de escritura.
drop policy if exists "news_select_all" on public.news_items;
create policy "news_select_all" on public.news_items
  for select using (true);


-- ─── 4. Pipeline diario y digests por plan ──────────────────────────────
-- Reportes diarios de noticias agregadas y analizadas para cada composición de cartera.
-- Registro de ejecuciones, métricas de tokens, costes, créditos de Tavily y errores.
-- El digest nunca almacena datos personales de usuarios: solo tickers, pesos agregados y noticias públicas.

-- 4.1. Análisis estructurado de noticias por LLM (deduplicado entre planes)
create table if not exists public.news_analyses (
  id uuid primary key default gen_random_uuid(),
  news_item_id uuid references public.news_items (id) on delete set null,
  url_key text not null unique,
  summary text not null,
  effect text not null check (effect in ('positive', 'negative', 'neutral', 'uncertain')),
  effect_rationale text,
  affected_tickers text[] not null default '{}',
  es_educativo boolean not null default true,
  provider text not null,
  model text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists news_analyses_created_idx on public.news_analyses (created_at desc);

alter table public.news_analyses enable row level security;

drop policy if exists "news_analyses_select_all" on public.news_analyses;
create policy "news_analyses_select_all" on public.news_analyses
  for select using (true);

-- 4.2. Reportes diarios (digests) por composición de cartera y fecha
-- Idempotencia: una única fila por combinación (composition_hash, date).
create table if not exists public.digests (
  id uuid primary key default gen_random_uuid(),
  composition_hash text not null,
  date date not null default current_date,
  composition jsonb not null,
  summary text not null,
  news jsonb not null default '[]'::jsonb,
  disclaimer text not null,
  generated_at timestamptz not null default now(),
  constraint digests_hash_date_unique unique (composition_hash, date)
);

create index if not exists digests_hash_date_idx on public.digests (composition_hash, date desc);

alter table public.digests enable row level security;

-- Los digests son públicos y agregados: lectura abierta para cualquier visitante,
-- sin políticas de escritura del lado cliente (solo escribe el servidor con clave de servicio).
drop policy if exists "digests_select_all" on public.digests;
create policy "digests_select_all" on public.digests
  for select using (true);

-- 4.3. Registro de auditoría y métricas de ejecución del pipeline
create table if not exists public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null default 'daily_news_pipeline',
  status text not null check (status in ('success', 'partial', 'error')),
  date date not null default current_date,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer,
  tavily_credits integer not null default 0,
  tavily_queries integer not null default 0,
  articles_fetched integer not null default 0,
  articles_inserted integer not null default 0,
  articles_analyzed integer not null default 0,
  digests_generated integer not null default 0,
  llm_provider text,
  llm_model text,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists pipeline_runs_started_idx on public.pipeline_runs (started_at desc);

alter table public.pipeline_runs enable row level security;

drop policy if exists "pipeline_runs_select_all" on public.pipeline_runs;
create policy "pipeline_runs_select_all" on public.pipeline_runs
  for select using (true);

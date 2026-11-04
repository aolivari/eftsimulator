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

-- ============================================================
-- WaxShelf — Schéma Supabase
-- À exécuter dans l'éditeur SQL de ton projet Supabase
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. TABLE : profiles
--    Liée à auth.users (1-to-1)
-- ──────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique not null,
  display_name    text,
  avatar_url      text,
  bio             text,
  discogs_token   text,          -- token personnel Discogs (stocker via RLS privé)
  discogs_username text,
  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Index
create index if not exists profiles_username_idx on public.profiles(username);

-- Trigger : mise à jour automatique de updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Trigger : création automatique du profil lors de l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ──────────────────────────────────────────────
-- 2. TABLE : vinyl_records
--    Collection de vinyles de chaque utilisateur
-- ──────────────────────────────────────────────
create table if not exists public.vinyl_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  discogs_id      bigint,                -- ID release Discogs (null si ajouté manuellement)
  title           text not null,
  artist          text not null,
  year            integer,
  genres          text[] default '{}',
  styles          text[] default '{}',
  country         text,
  cover_image     text,                  -- URL pochette haute résolution
  thumb_image     text,                  -- URL miniature
  average_value   numeric(10,2),         -- Valeur moyenne Discogs (€)
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Index
create index if not exists vinyl_records_user_id_idx on public.vinyl_records(user_id);
create index if not exists vinyl_records_discogs_id_idx on public.vinyl_records(discogs_id);
create index if not exists vinyl_records_year_idx on public.vinyl_records(year);
create index if not exists vinyl_records_country_idx on public.vinyl_records(country);

-- Contrainte d'unicité : un même release Discogs une seule fois par utilisateur
-- (contrainte classique requise pour ON CONFLICT — les NULL multiples sont autorisés en PostgreSQL)
alter table public.vinyl_records
  drop constraint if exists vinyl_records_user_discogs_unique;
alter table public.vinyl_records
  add constraint vinyl_records_user_discogs_unique
  unique (user_id, discogs_id);

-- Trigger updated_at
create or replace trigger vinyl_records_updated_at
  before update on public.vinyl_records
  for each row execute procedure public.handle_updated_at();


-- ──────────────────────────────────────────────
-- 3. TABLE : wantlist_items
--    Liste d'envies Discogs
-- ──────────────────────────────────────────────
create table if not exists public.wantlist_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  discogs_id      bigint not null,
  title           text not null,
  artist          text not null,
  year            integer,
  cover_image     text,
  thumb_image     text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists wantlist_items_user_id_idx on public.wantlist_items(user_id);
create unique index if not exists wantlist_user_discogs_unique
  on public.wantlist_items(user_id, discogs_id);


-- ──────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────

-- Activer RLS sur toutes les tables
alter table public.profiles enable row level security;
alter table public.vinyl_records enable row level security;
alter table public.wantlist_items enable row level security;

-- ── profiles ──
-- Lecture : profil public visible par tous | profil privé visible par le propriétaire
create policy "profiles: lecture publique"
  on public.profiles for select
  using (is_public = true or auth.uid() = id);

-- Modification : uniquement son propre profil
create policy "profiles: modification propriétaire"
  on public.profiles for update
  using (auth.uid() = id);

-- Insertion : uniquement via le trigger handle_new_user (sécurité definer)
-- Pas de policy INSERT nécessaire pour les utilisateurs

-- ── vinyl_records ──
-- Lecture : si le profil du propriétaire est public, ou si c'est le propriétaire
create policy "vinyl_records: lecture publique"
  on public.vinyl_records for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = vinyl_records.user_id
        and (p.is_public = true or p.id = auth.uid())
    )
  );

create policy "vinyl_records: insertion propriétaire"
  on public.vinyl_records for insert
  with check (auth.uid() = user_id);

create policy "vinyl_records: modification propriétaire"
  on public.vinyl_records for update
  using (auth.uid() = user_id);

create policy "vinyl_records: suppression propriétaire"
  on public.vinyl_records for delete
  using (auth.uid() = user_id);

-- ── wantlist_items ──
-- La wantlist est privée par défaut (visible uniquement par le propriétaire)
create policy "wantlist: lecture propriétaire"
  on public.wantlist_items for select
  using (auth.uid() = user_id);

create policy "wantlist: insertion propriétaire"
  on public.wantlist_items for insert
  with check (auth.uid() = user_id);

create policy "wantlist: modification propriétaire"
  on public.wantlist_items for update
  using (auth.uid() = user_id);

create policy "wantlist: suppression propriétaire"
  on public.wantlist_items for delete
  using (auth.uid() = user_id);

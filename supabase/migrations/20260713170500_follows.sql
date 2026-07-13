-- ============================================================
-- WaxShelf — Migration v9
-- Suivi entre utilisateurs (follow simple : compteurs + liste,
-- pas de fil d'actualité pour cette première version).
-- ============================================================

create table if not exists public.follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint follows_unique unique (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index if not exists follows_follower_id_idx on public.follows(follower_id);
create index if not exists follows_following_id_idx on public.follows(following_id);

alter table public.follows enable row level security;

-- Lecture publique : nécessaire pour afficher les compteurs abonnés/abonnements
-- sur n'importe quel profil, y compris pour un visiteur non connecté.
drop policy if exists "follows: lecture publique" on public.follows;
create policy "follows: lecture publique"
  on public.follows for select using (true);

-- Seul l'utilisateur peut suivre en son propre nom
drop policy if exists "follows: insertion propriétaire" on public.follows;
create policy "follows: insertion propriétaire"
  on public.follows for insert
  with check (auth.uid() = follower_id);

-- Seul l'utilisateur peut se désabonner en son propre nom
drop policy if exists "follows: suppression propriétaire" on public.follows;
create policy "follows: suppression propriétaire"
  on public.follows for delete
  using (auth.uid() = follower_id);

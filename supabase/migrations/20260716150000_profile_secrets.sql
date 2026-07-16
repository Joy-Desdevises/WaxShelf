-- ============================================================
-- WaxShelf — Migration v11
-- Sépare le token Discogs dans une table privée (profile_secrets).
-- La policy de lecture publique de `profiles` (is_public = true)
-- exposait discogs_token à n'importe qui via la clé anon — RLS ne
-- filtre que des lignes, pas des colonnes. profile_secrets n'a
-- aucune policy de lecture publique : accès réservé au propriétaire.
-- ============================================================

create table if not exists public.profile_secrets (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  discogs_token text
);

alter table public.profile_secrets enable row level security;

drop policy if exists "profile_secrets: lecture propriétaire" on public.profile_secrets;
create policy "profile_secrets: lecture propriétaire"
  on public.profile_secrets for select
  using (auth.uid() = user_id);

drop policy if exists "profile_secrets: insertion propriétaire" on public.profile_secrets;
create policy "profile_secrets: insertion propriétaire"
  on public.profile_secrets for insert
  with check (auth.uid() = user_id);

drop policy if exists "profile_secrets: modification propriétaire" on public.profile_secrets;
create policy "profile_secrets: modification propriétaire"
  on public.profile_secrets for update
  using (auth.uid() = user_id);

drop policy if exists "profile_secrets: suppression propriétaire" on public.profile_secrets;
create policy "profile_secrets: suppression propriétaire"
  on public.profile_secrets for delete
  using (auth.uid() = user_id);

alter table public.profiles drop column if exists discogs_token;

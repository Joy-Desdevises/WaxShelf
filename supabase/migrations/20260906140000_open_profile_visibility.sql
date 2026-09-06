-- ============================================================
-- WaxShelf — Migration v17
-- Sépare "identité découvrable" et "contenu privé" dans le modèle
-- is_public, pour permettre de suivre un compte privé (comme sur
-- Instagram : le profil se trouve et se suit, seul son contenu reste
-- caché).
--
-- Avant cette migration, "profiles: lecture publique" bloquait TOUTE
-- lecture d'un profil privé (RLS filtre des lignes, pas des usages) :
-- impossible de résoudre son id depuis son username, donc impossible
-- d'afficher un bouton Suivre ou de l'ajouter en abonnement.
-- ============================================================

-- ── 1. profiles : l'identité devient publique pour tous ──────────
-- is_public ne protège plus que le contenu (vinyl_records,
-- wantlist_items, déjà correctement gatés) — plus l'existence du
-- compte. Aucune donnée sensible ici : le token Discogs vit dans
-- profile_secrets (policy propriétaire uniquement, inchangée).
drop policy if exists "profiles: lecture publique" on public.profiles;
create policy "profiles: lecture publique"
  on public.profiles for select
  using (true);

-- ── 2. vinyl_likes : lecture gatée par la confidentialité du     ──
--    PROPRIÉTAIRE DU DISQUE (même pattern que vinyl_records)      --
-- Avant : `using (true)` — les likes sur le disque d'un profil privé
-- fuitaient (quel vinyl_id, par qui) même si le disque lui-même était
-- déjà inaccessible via vinyl_records.
drop policy if exists "likes: lecture publique" on public.vinyl_likes;
create policy "likes: lecture publique"
  on public.vinyl_likes for select
  using (
    exists (
      select 1 from public.vinyl_records v
      join public.profiles p on p.id = v.user_id
      where v.id = vinyl_likes.vinyl_id
        and (p.is_public = true or p.id = auth.uid())
    )
  );

-- ── 3. vinyl_comments : même correction ───────────────────────────
drop policy if exists "comments: lecture publique" on public.vinyl_comments;
create policy "comments: lecture publique"
  on public.vinyl_comments for select
  using (
    exists (
      select 1 from public.vinyl_records v
      join public.profiles p on p.id = v.user_id
      where v.id = vinyl_comments.vinyl_id
        and (p.is_public = true or p.id = auth.uid())
    )
  );

-- ── 4. follows : compteurs toujours publics, liste détaillée      ──
--    réservée au propriétaire d'un profil privé (comme Instagram)  --
--
-- Une ligne follows a deux propriétaires potentiels (follower_id ET
-- following_id) : une policy RLS classique ne peut pas exprimer "visible
-- dans la liste d'abonnés de X, mais pas dans la liste d'abonnements de
-- A" pour la même ligne — c'est la même ligne des deux côtés. On
-- verrouille donc la lecture directe de la table à ses deux parties
-- (chacun voit ses propres relations), et on expose les listes/compteurs
-- au public via des fonctions security definer qui appliquent la vraie
-- règle métier (gatée sur le profil consulté, pas sur chaque ligne).
drop policy if exists "follows: lecture publique" on public.follows;
create policy "follows: lecture propriétaire de la relation"
  on public.follows for select
  using (auth.uid() = follower_id or auth.uid() = following_id);

-- Compteurs : jamais sensibles (juste des nombres), toujours publics,
-- donc aucune vérification is_public nécessaire ici.
create or replace function public.get_follow_counts(target_user_id uuid)
returns table (followers bigint, following bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*) from public.follows where following_id = target_user_id),
    (select count(*) from public.follows where follower_id = target_user_id);
$$;

grant execute on function public.get_follow_counts(uuid) to anon, authenticated;

-- Liste détaillée : visible si le profil consulté (target_user_id) est
-- public, ou si l'appelant EST ce profil. direction = 'followers' pour
-- "qui suit target_user_id", 'following' pour "qui target_user_id suit".
create or replace function public.get_follow_list(target_user_id uuid, direction text)
returns table (id uuid, username text, display_name text, avatar_url text)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = target_user_id
      and (p.is_public = true or p.id = auth.uid())
  ) then
    return;
  end if;

  if direction = 'followers' then
    return query
      select p.id, p.username, p.display_name, p.avatar_url
      from public.follows f
      join public.profiles p on p.id = f.follower_id
      where f.following_id = target_user_id;
  else
    return query
      select p.id, p.username, p.display_name, p.avatar_url
      from public.follows f
      join public.profiles p on p.id = f.following_id
      where f.follower_id = target_user_id;
  end if;
end;
$$;

grant execute on function public.get_follow_list(uuid, text) to anon, authenticated;

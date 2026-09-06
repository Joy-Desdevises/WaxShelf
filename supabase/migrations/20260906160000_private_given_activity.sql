-- ============================================================
-- WaxShelf — Migration v19
-- Ferme la fuite résiduelle de l'audit : useMyLikesCount/useMyComments
-- comptent/listent l'activité DONNÉE par un utilisateur (peu importe le
-- disque concerné), gatée aujourd'hui uniquement par la confidentialité
-- du PROPRIÉTAIRE DU DISQUE liké/commenté — pas celle de l'utilisateur
-- qui a donné le like/commentaire. Résultat : un profil privé qui like
-- un disque public restait comptabilisé/listé publiquement via sa
-- propre page Stat & Social.
--
-- Même limite structurelle que follows (une ligne vinyl_likes/
-- vinyl_comments a deux parties : qui a liké, et le propriétaire du
-- disque — la policy RLS de la table doit rester permissive pour que
-- les likes REÇUS sur un disque public restent visibles de tous,
-- peu importe la confidentialité de chaque personne qui a liké).
-- On ajoute donc des fonctions security definer dédiées à l'activité
-- DONNÉE, qui vérifient en plus la confidentialité de l'auteur.
-- ============================================================

create or replace function public.get_my_likes_count(target_user_id uuid)
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*)
  from public.vinyl_likes
  where user_id = target_user_id
    and exists (
      select 1 from public.profiles p
      where p.id = target_user_id and (p.is_public = true or p.id = auth.uid())
    );
$$;

grant execute on function public.get_my_likes_count(uuid) to anon, authenticated;

create or replace function public.get_my_comments_count(target_user_id uuid)
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*)
  from public.vinyl_comments
  where user_id = target_user_id
    and exists (
      select 1 from public.profiles p
      where p.id = target_user_id and (p.is_public = true or p.id = auth.uid())
    );
$$;

grant execute on function public.get_my_comments_count(uuid) to anon, authenticated;

create or replace function public.get_my_likes(target_user_id uuid)
returns table (
  like_id uuid,
  vinyl_id uuid,
  title text,
  artist text,
  thumb_image text,
  cover_image text,
  owner_username text,
  owner_display_name text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = target_user_id and (p.is_public = true or p.id = auth.uid())
  ) then
    return;
  end if;

  return query
    select l.id, v.id, v.title, v.artist, v.thumb_image, v.cover_image, p.username, p.display_name
    from public.vinyl_likes l
    join public.vinyl_records v on v.id = l.vinyl_id
    join public.profiles p on p.id = v.user_id
    where l.user_id = target_user_id
    order by l.created_at desc;
end;
$$;

grant execute on function public.get_my_likes(uuid) to anon, authenticated;

create or replace function public.get_my_comments(target_user_id uuid)
returns table (
  comment_id uuid,
  content text,
  created_at timestamptz,
  vinyl_id uuid,
  title text,
  artist text,
  thumb_image text,
  cover_image text,
  owner_username text,
  owner_display_name text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = target_user_id and (p.is_public = true or p.id = auth.uid())
  ) then
    return;
  end if;

  return query
    select c.id, c.content, c.created_at, v.id, v.title, v.artist, v.thumb_image, v.cover_image, p.username, p.display_name
    from public.vinyl_comments c
    join public.vinyl_records v on v.id = c.vinyl_id
    join public.profiles p on p.id = v.user_id
    where c.user_id = target_user_id
    order by c.created_at desc;
end;
$$;

grant execute on function public.get_my_comments(uuid) to anon, authenticated;

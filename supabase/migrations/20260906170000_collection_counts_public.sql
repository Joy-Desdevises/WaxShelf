-- ============================================================
-- WaxShelf — Migration v20
-- Le nombre de vinyles/envies d'un profil privé doit rester visible
-- (comme le nombre de posts sur un compte Instagram privé), même si
-- le contenu détaillé reste cadenassé par is_public. Ce sont de
-- simples nombres, jamais sensibles en eux-mêmes — même logique que
-- get_follow_counts.
-- ============================================================

create or replace function public.get_collection_counts(target_user_id uuid)
returns table (vinyl_count bigint, wantlist_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*) from public.vinyl_records where user_id = target_user_id),
    (select count(*) from public.wantlist_items where user_id = target_user_id);
$$;

grant execute on function public.get_collection_counts(uuid) to anon, authenticated;

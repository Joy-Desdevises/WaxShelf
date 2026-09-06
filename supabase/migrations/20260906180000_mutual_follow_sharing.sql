-- ============================================================
-- WaxShelf — Migration v21
-- Un profil privé partage sa collection ET sa wantlist avec les
-- utilisateurs en suivi MUTUEL (A suit B et B suit A) — pas de système
-- de demandes/acceptation séparé : suivre quelqu'un qui vous suit déjà
-- déclenche le partage automatiquement, exactement comme "accepter"
-- reviendrait à le faire.
--
-- Bonus cohérence : wantlist_items n'a jamais suivi is_public du tout
-- (policy strictement propriétaire depuis le schéma initial, même sur
-- un profil public) — alignée ici sur la même règle que vinyl_records,
-- pour que "tout ou rien" soit vrai dans les deux sens.
-- ============================================================

drop policy if exists "vinyl_records: lecture publique" on public.vinyl_records;
create policy "vinyl_records: lecture publique"
  on public.vinyl_records for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = vinyl_records.user_id
        and (
          p.is_public = true
          or p.id = auth.uid()
          or (
            exists (select 1 from public.follows where follower_id = auth.uid() and following_id = p.id)
            and exists (select 1 from public.follows where follower_id = p.id and following_id = auth.uid())
          )
        )
    )
  );

drop policy if exists "wantlist: lecture propriétaire" on public.wantlist_items;
create policy "wantlist: lecture publique"
  on public.wantlist_items for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = wantlist_items.user_id
        and (
          p.is_public = true
          or p.id = auth.uid()
          or (
            exists (select 1 from public.follows where follower_id = auth.uid() and following_id = p.id)
            and exists (select 1 from public.follows where follower_id = p.id and following_id = auth.uid())
          )
        )
    )
  );

-- Un abonné mutuel qui voit désormais un disque privé doit aussi pouvoir
-- voir (et pas seulement liker/commenter à l'aveugle) ses likes et
-- commentaires existants — même règle que vinyl_records ci-dessus.
drop policy if exists "likes: lecture publique" on public.vinyl_likes;
create policy "likes: lecture publique"
  on public.vinyl_likes for select
  using (
    exists (
      select 1 from public.vinyl_records v
      join public.profiles p on p.id = v.user_id
      where v.id = vinyl_likes.vinyl_id
        and (
          p.is_public = true
          or p.id = auth.uid()
          or (
            exists (select 1 from public.follows where follower_id = auth.uid() and following_id = p.id)
            and exists (select 1 from public.follows where follower_id = p.id and following_id = auth.uid())
          )
        )
    )
  );

drop policy if exists "comments: lecture publique" on public.vinyl_comments;
create policy "comments: lecture publique"
  on public.vinyl_comments for select
  using (
    exists (
      select 1 from public.vinyl_records v
      join public.profiles p on p.id = v.user_id
      where v.id = vinyl_comments.vinyl_id
        and (
          p.is_public = true
          or p.id = auth.uid()
          or (
            exists (select 1 from public.follows where follower_id = auth.uid() and following_id = p.id)
            and exists (select 1 from public.follows where follower_id = p.id and following_id = auth.uid())
          )
        )
    )
  );

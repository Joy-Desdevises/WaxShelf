-- ============================================================
-- WaxShelf — Migration v7
-- Bucket Supabase Storage pour les photos de profil personnelles
-- (upload libre en plus des avatars prédéfinis). Fichiers rangés
-- sous {user_id}/... pour que les policies RLS restreignent
-- l'écriture au seul propriétaire, lecture publique pour l'affichage.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

drop policy if exists "avatars: lecture publique" on storage.objects;
create policy "avatars: lecture publique"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars: upload propriétaire" on storage.objects;
create policy "avatars: upload propriétaire"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "avatars: mise à jour propriétaire" on storage.objects;
create policy "avatars: mise à jour propriétaire"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "avatars: suppression propriétaire" on storage.objects;
create policy "avatars: suppression propriétaire"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

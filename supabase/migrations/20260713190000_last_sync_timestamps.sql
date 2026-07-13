-- ============================================================
-- WaxShelf — Migration v8
-- Horodatage de la dernière synchronisation réussie (collection et
-- wantlist séparément), affiché sous les boutons "Sync Discogs".
-- Champs dédiés plutôt que updated_at des enregistrements, qui se
-- déclenche aussi sur n'importe quelle modification manuelle (note,
-- avis...) et donnerait une date de sync trompeuse.
-- ============================================================

alter table public.profiles
  add column if not exists last_collection_sync_at timestamptz;

alter table public.profiles
  add column if not exists last_wantlist_sync_at timestamptz;

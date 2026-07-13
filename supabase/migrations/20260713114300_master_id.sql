-- ============================================================
-- WaxShelf — Migration v4
-- master_id Discogs : permet de retrouver l'année de sortie
-- originale de l'album (distincte de l'année du pressage possédé),
-- utilisée pour générer des anecdotes cohérentes avec l'histoire réelle.
-- ============================================================

alter table public.vinyl_records
  add column if not exists master_id bigint;

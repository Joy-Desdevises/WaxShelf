-- ============================================================
-- WaxShelf — Migration v5
-- original_year : année de sortie originale de l'album (via le
-- master Discogs), distincte de year (année du pressage possédé).
-- Utilisée pour la répartition "Par décennie" et l'affichage,
-- afin de refléter l'époque réelle de la musique plutôt que celle
-- du pressage/de la réédition.
-- À exécuter dans l'éditeur SQL Supabase
-- ============================================================

alter table public.vinyl_records
  add column if not exists original_year integer;

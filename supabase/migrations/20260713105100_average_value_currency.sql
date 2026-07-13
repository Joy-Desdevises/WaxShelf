-- ============================================================
-- WaxShelf — Migration v3
-- Devise de la valeur estimée (le compte Discogs de chaque
-- utilisateur peut être configuré dans une devise différente de l'euro)
-- ============================================================

alter table public.vinyl_records
  add column if not exists average_value_currency text;

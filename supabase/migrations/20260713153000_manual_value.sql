-- ============================================================
-- WaxShelf — Migration v6
-- value_manual : marque une valeur saisie/corrigée à la main par
-- l'utilisateur (ex. médiane copiée depuis Discogs), pour que le
-- sync automatique ne l'écrase plus avec le prix le plus bas trouvé
-- via l'API.
-- ============================================================

alter table public.vinyl_records
  add column if not exists value_manual boolean not null default false;

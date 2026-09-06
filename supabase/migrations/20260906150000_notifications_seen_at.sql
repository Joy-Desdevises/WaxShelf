-- ============================================================
-- WaxShelf — Migration v18
-- Horodatage "notifications vues" pour la pastille du badge Stat &
-- Social. Pas de table de notifications dédiée : le badge et le flux
-- affiché sont calculés à la volée à partir des likes/commentaires
-- reçus et des nouveaux abonnés créés après cette date (mêmes
-- policies RLS existantes, rien de plus à ouvrir).
-- ============================================================

alter table public.profiles
  add column if not exists last_notifications_seen_at timestamptz;

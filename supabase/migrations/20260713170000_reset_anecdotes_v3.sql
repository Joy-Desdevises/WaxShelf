-- ============================================================
-- WaxShelf — Reset des anecdotes (v3)
-- Le prompt privilégiait trop souvent le repli "anecdote sur
-- l'artiste" au lieu de tenter une anecdote spécifique à l'album.
-- Nouveau prompt : priorité explicite à l'album, repli artiste
-- uniquement en tout dernier recours.
-- Migration à usage unique.
-- ============================================================

update public.vinyl_records
set anecdote = null
where anecdote is not null;

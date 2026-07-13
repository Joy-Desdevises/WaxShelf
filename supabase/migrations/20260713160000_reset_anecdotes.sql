-- ============================================================
-- WaxShelf — Reset des anecdotes
-- Les anecdotes existantes ont été générées avant l'introduction de
-- original_year/master_id, avec l'année du pressage possédé au lieu
-- de l'année de sortie originale de l'album (ex. réédition 2025 d'un
-- album de 2003 → l'IA pensait l'album inexistant à cette date).
-- Migration à usage unique : les anecdotes se régénèrent
-- automatiquement au premier survol d'une carte, une fois vidées ici.
-- ============================================================

update public.vinyl_records
set anecdote = null
where anecdote is not null;

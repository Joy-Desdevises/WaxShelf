-- ============================================================
-- WaxShelf — Reset des anecdotes (v2)
-- Le prompt de génération autorisait l'IA à remettre en question
-- l'existence d'un album qu'elle ne reconnaissait pas ("cet album
-- n'existe pas"), alors que l'utilisateur le possède réellement.
-- Nouveau prompt : interdiction explicite + repli sur une anecdote
-- sur l'artiste si l'album précis n'est pas reconnu.
-- Migration à usage unique.
-- ============================================================

update public.vinyl_records
set anecdote = null
where anecdote is not null;

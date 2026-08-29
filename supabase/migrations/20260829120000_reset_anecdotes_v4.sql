-- ============================================================
-- WaxShelf — Reset des anecdotes (v4)
-- Le modèle gratuit configuré (meta-llama/llama-3.3-70b-instruct:free)
-- a disparu du catalogue OpenRouter. Le modèle de remplacement était
-- un modèle "raisonneur" qui a exposé son chain-of-thought brut dans
-- le champ content ("Here's a thinking process: ..."), sauvegardé tel
-- quel comme anecdote pour les vinyles retournés entre-temps.
-- Migration à usage unique.
-- ============================================================

update public.vinyl_records
set anecdote = null
where anecdote is not null;

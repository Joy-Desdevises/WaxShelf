-- ============================================================
-- WaxShelf — Migration v2
-- Nouvelles fonctionnalités : rating, likes, commentaires
-- ============================================================

-- ── 1. Colonne rating sur vinyl_records ──────────────────────
alter table public.vinyl_records
  add column if not exists rating smallint check (rating >= 1 and rating <= 5);

-- ── 2. TABLE : vinyl_likes ───────────────────────────────────
create table if not exists public.vinyl_likes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  vinyl_id   uuid not null references public.vinyl_records(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint vinyl_likes_unique unique (user_id, vinyl_id)
);

create index if not exists vinyl_likes_vinyl_id_idx on public.vinyl_likes(vinyl_id);

alter table public.vinyl_likes enable row level security;

-- Tout le monde peut lire (pour afficher le compteur)
drop policy if exists "likes: lecture publique" on public.vinyl_likes;
create policy "likes: lecture publique"
  on public.vinyl_likes for select using (true);

-- Seul l'utilisateur peut liker / déliker
drop policy if exists "likes: insertion" on public.vinyl_likes;
create policy "likes: insertion"
  on public.vinyl_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "likes: suppression" on public.vinyl_likes;
create policy "likes: suppression"
  on public.vinyl_likes for delete
  using (auth.uid() = user_id);

-- ── 3. TABLE : vinyl_comments ────────────────────────────────
create table if not exists public.vinyl_comments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  vinyl_id   uuid not null references public.vinyl_records(id) on delete cascade,
  content    text not null check (length(content) >= 1 and length(content) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists vinyl_comments_vinyl_id_idx on public.vinyl_comments(vinyl_id);

alter table public.vinyl_comments enable row level security;

-- Tout le monde peut lire les commentaires
drop policy if exists "comments: lecture publique" on public.vinyl_comments;
create policy "comments: lecture publique"
  on public.vinyl_comments for select using (true);

-- Utilisateur connecté peut commenter
drop policy if exists "comments: insertion" on public.vinyl_comments;
create policy "comments: insertion"
  on public.vinyl_comments for insert
  with check (auth.uid() = user_id);

-- Seul l'auteur peut supprimer son commentaire
drop policy if exists "comments: suppression auteur" on public.vinyl_comments;
create policy "comments: suppression auteur"
  on public.vinyl_comments for delete
  using (auth.uid() = user_id);

-- ============================================================
-- WaxShelf — Journal d'écoute
-- ============================================================

-- TABLE : play_logs
create table if not exists public.play_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  vinyl_id    uuid not null references public.vinyl_records(id) on delete cascade,
  played_at   timestamptz not null default now()
);

create index if not exists play_logs_user_id_idx  on public.play_logs(user_id);
create index if not exists play_logs_vinyl_id_idx  on public.play_logs(vinyl_id);
create index if not exists play_logs_played_at_idx on public.play_logs(played_at desc);

-- RLS
alter table public.play_logs enable row level security;

-- Lecture : lecture publique si le profil du propriétaire est public
drop policy if exists "play_logs: lecture publique" on public.play_logs;
create policy "play_logs: lecture publique"
  on public.play_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = play_logs.user_id
        and (p.is_public = true or p.id = auth.uid())
    )
  );

-- Insert : uniquement soi-même
drop policy if exists "play_logs: insertion propriétaire" on public.play_logs;
create policy "play_logs: insertion propriétaire"
  on public.play_logs for insert
  with check (auth.uid() = user_id);

-- Delete : uniquement soi-même
drop policy if exists "play_logs: suppression propriétaire" on public.play_logs;
create policy "play_logs: suppression propriétaire"
  on public.play_logs for delete
  using (auth.uid() = user_id);

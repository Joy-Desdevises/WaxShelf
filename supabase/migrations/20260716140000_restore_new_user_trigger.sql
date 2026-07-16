-- ============================================================
-- WaxShelf — Migration v10
-- Le trigger on_auth_user_created (création automatique du profil
-- à l'inscription) avait disparu de la base — cause indéterminée,
-- probablement liée à une pause/reprise du projet. Conséquence :
-- plusieurs comptes auth.users se sont retrouvés sans ligne
-- profiles associée, bloquant ces utilisateurs (session valide
-- mais aucune donnée de profil à charger). On recrée la fonction
-- et le trigger, puis on rattrape les comptes déjà orphelins.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Rattrapage des comptes créés pendant que le trigger était absent.
-- Suffixe l'id en cas de collision de username avec un profil existant.
insert into public.profiles (id, username, display_name, avatar_url)
select
  u.id,
  case
    when exists (
      select 1 from public.profiles p2
      where p2.username = coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))
    )
    then coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) || '-' || substr(u.id::text, 1, 4)
    else coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1))
  end,
  coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

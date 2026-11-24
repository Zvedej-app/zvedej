-- =====================================================================
--  Režim bez registrace (anonymní přihlášení Supabase)
--   • host si může hned zapisovat tréninky, plány a maxima
--   • sociální funkce (zprávy, videa, lajky, přátelé, trenér, nahlášení)
--     jsou jen pro plnohodnotné účty – ochrana proti zneužití a falešným hlasům
--   • převod hosta na účet zachová data (stejné id uživatele)
--  Vyžaduje: Authentication → Sign In / Providers → Allow anonymous sign-ins
--  a „Allow manual linking“.
-- =====================================================================

create or replace function public.is_anon()
returns boolean language sql stable
as $$ select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) $$;

-- restriktivní pravidla: platí navíc ke stávajícím (host nemůže vkládat)
create policy "guests cannot send messages" on public.messages
  as restrictive for insert to authenticated with check (not public.is_anon());
create policy "guests cannot upload videos" on public.challenge_videos
  as restrictive for insert to authenticated with check (not public.is_anon());
create policy "guests cannot like" on public.video_likes
  as restrictive for insert to authenticated with check (not public.is_anon());
create policy "guests cannot report videos" on public.video_reports
  as restrictive for insert to authenticated with check (not public.is_anon());
create policy "guests cannot add friends" on public.friendships
  as restrictive for insert to authenticated with check (not public.is_anon());
create policy "guests cannot coach" on public.coach_links
  as restrictive for insert to authenticated with check (not public.is_anon());
create policy "guests cannot comment" on public.workout_comments
  as restrictive for insert to authenticated with check (not public.is_anon());
create policy "guests cannot report" on public.content_reports
  as restrictive for insert to authenticated with check (not public.is_anon());
create policy "guests cannot upload training videos" on public.training_videos
  as restrictive for insert to authenticated with check (not public.is_anon());

create policy "guests cannot upload files" on storage.objects
  as restrictive for insert to authenticated with check (not public.is_anon());

-- host se nemůže připojit k trenérovi ani se stát trenérem / být vidět ve vyhledávání
create or replace function public.accept_coach_guard()
returns trigger language plpgsql
as $$
begin
  if public.is_anon() then
    raise exception 'GUEST';
  end if;
  return new;
end $$;
drop trigger if exists coach_links_guest_guard on public.coach_links;
create trigger coach_links_guest_guard
before insert or update on public.coach_links
for each row execute function public.accept_coach_guard();

create or replace function public.profiles_guest_guard()
returns trigger language plpgsql security definer
set search_path = public, auth
as $$
begin
  -- při registraci hosta (trigger handle_new_user) ještě není JWT, proto i kontrola v auth.users
  if public.is_anon() or coalesce((select u.is_anonymous from auth.users u where u.id = new.id), false) then
    new.is_coach := false;
    new.is_public := false;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guest_guard on public.profiles;
create trigger profiles_guest_guard
before insert or update on public.profiles
for each row execute function public.profiles_guest_guard();

-- Dokončení registrace hosta: jméno, datum narození (min. 15 let) a souhlas s podmínkami.
-- E-mail se pak připojí přes auth.updateUser (potvrzení e-mailem), id uživatele i data zůstanou.
create or replace function public.complete_registration(p_first text, p_last text, p_birth date)
returns void language plpgsql security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if p_birth is null or p_birth > (current_date - interval '15 years')::date then
    raise exception 'UNDER_AGE';
  end if;
  update public.profiles
     set first_name = left(btrim(coalesce(p_first, '')), 60),
         last_name = left(btrim(coalesce(p_last, '')), 60),
         birth_year = extract(year from p_birth)::integer
   where id = me;
  insert into public.profile_private (user_id, birth_date, terms_accepted_at)
  values (me, p_birth, now())
  on conflict (user_id) do update set birth_date = excluded.birth_date, terms_accepted_at = excluded.terms_accepted_at;
end $$;
revoke execute on function public.complete_registration(text, text, date) from public, anon;
grant execute on function public.complete_registration(text, text, date) to authenticated;

-- po převodu na účet je profil znovu viditelný ve vyhledávání
create or replace function public.on_user_upgraded()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if old.is_anonymous and not new.is_anonymous then
    update public.profiles set is_public = true where id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_upgraded on auth.users;
create trigger on_auth_user_upgraded
after update of is_anonymous on auth.users
for each row execute function public.on_user_upgraded();

-- Úklid: hosté, kteří 90 dní nic nezapsali, se smažou (doporučení Supabase)
create or replace function public.purge_stale_guests()
returns void language sql security definer
set search_path = public, auth
as $$
  delete from auth.users u
   where u.is_anonymous is true
     and u.created_at < now() - interval '90 days'
     and not exists (
       select 1 from public.user_training t where t.user_id = u.id and t.updated_at > now() - interval '90 days'
     )
$$;
revoke execute on function public.purge_stale_guests() from public, anon, authenticated;
select cron.schedule('zvedej-purge-guests', '23 4 * * *', $$ select public.purge_stale_guests() $$);

revoke execute on function public.accept_coach_guard() from public, anon, authenticated;
revoke execute on function public.profiles_guest_guard() from public, anon, authenticated;
revoke execute on function public.on_user_upgraded() from public, anon, authenticated;

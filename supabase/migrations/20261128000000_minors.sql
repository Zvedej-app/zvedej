-- =====================================================================
--  Ochrana dětí a souhlas rodičů (GDPR čl. 8, DSA čl. 28), odvolání (DSA čl. 20),
--  verze podmínek
--   • věk pro souhlas: Česko 15 let (zákon 110/2019 Sb., § 7), Slovensko a jiné země 16 let
--   • mladší (od 13 let) se mohou registrovat jen se souhlasem zákonného zástupce;
--     do jeho potvrzení mají jen tréninkový deník (bez zpráv, videí, přátel, trenéra)
--   • nezletilí (do 18 let): profil ve výchozím stavu skrytý ve vyhledávání,
--     zprávy jen od přátel a vlastního trenéra
-- =====================================================================

alter table public.profile_private
  add column if not exists country text check (country in ('CZ', 'SK', 'OTHER')),
  add column if not exists parent_consent_required boolean not null default false,
  add column if not exists parent_consent_at timestamptz,
  add column if not exists parent_name text check (char_length(parent_name) <= 120),
  add column if not exists parent_email text check (char_length(parent_email) <= 200),
  add column if not exists parent_token uuid,
  add column if not exists parent_requested_at timestamptz,
  add column if not exists terms_version text;

create unique index if not exists profile_private_parent_token on public.profile_private (parent_token) where parent_token is not null;

-- věková hranice pro samostatný souhlas podle země
create or replace function public.consent_age(p_country text)
returns int language sql immutable
as $$ select case when p_country = 'CZ' then 15 else 16 end $$;

-- absolutní minimum pro registraci (i se souhlasem rodiče)
create or replace function public.min_age()
returns int language sql immutable
as $$ select 13 $$;

create or replace function public.age_of(p_birth date)
returns int language sql stable
as $$ select case when p_birth is null then null else extract(year from age(current_date, p_birth))::int end $$;

create or replace function public.user_age(p_user uuid)
returns int language sql stable security definer
set search_path = public
as $$
  select coalesce(
    public.age_of((select birth_date from public.profile_private where user_id = p_user)),
    (select extract(year from current_date)::int - birth_year from public.profiles where id = p_user)
  )
$$;

create or replace function public.is_minor(p_user uuid)
returns boolean language sql stable security definer
set search_path = public
as $$ select coalesce(public.user_age(p_user) < 18, false) $$;

-- čeká se na souhlas rodiče?
create or replace function public.needs_parent(p_user uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select coalesce((select parent_consent_required and parent_consent_at is null from public.profile_private where user_id = p_user), false)
$$;

-- omezený účet: host nebo dítě bez souhlasu rodiče
create or replace function public.is_restricted()
returns boolean language sql stable security definer
set search_path = public
as $$ select public.is_anon() or public.needs_parent(auth.uid()) $$;

-- omezení sociálních funkcí platí i pro děti bez souhlasu rodiče
drop policy if exists "guests cannot send messages" on public.messages;
drop policy if exists "guests cannot upload videos" on public.challenge_videos;
drop policy if exists "guests cannot like" on public.video_likes;
drop policy if exists "guests cannot report videos" on public.video_reports;
drop policy if exists "guests cannot add friends" on public.friendships;
drop policy if exists "guests cannot coach" on public.coach_links;
drop policy if exists "guests cannot comment" on public.workout_comments;
drop policy if exists "guests cannot report" on public.content_reports;
drop policy if exists "guests cannot upload training videos" on public.training_videos;
drop policy if exists "guests cannot upload files" on storage.objects;

create policy "restricted cannot send messages" on public.messages
  as restrictive for insert to authenticated with check (not public.is_restricted());
create policy "restricted cannot upload videos" on public.challenge_videos
  as restrictive for insert to authenticated with check (not public.is_restricted());
create policy "restricted cannot like" on public.video_likes
  as restrictive for insert to authenticated with check (not public.is_restricted());
create policy "restricted cannot report videos" on public.video_reports
  as restrictive for insert to authenticated with check (not public.is_restricted());
create policy "restricted cannot add friends" on public.friendships
  as restrictive for insert to authenticated with check (not public.is_restricted());
create policy "restricted cannot coach" on public.coach_links
  as restrictive for insert to authenticated with check (not public.is_restricted());
create policy "restricted cannot comment" on public.workout_comments
  as restrictive for insert to authenticated with check (not public.is_restricted());
create policy "restricted cannot report" on public.content_reports
  as restrictive for insert to authenticated with check (not public.is_restricted());
create policy "restricted cannot upload training videos" on public.training_videos
  as restrictive for insert to authenticated with check (not public.is_restricted());
-- avatar může nahrát každý přihlášený, ostatní soubory jen neomezený účet
create policy "restricted cannot upload files" on storage.objects
  as restrictive for insert to authenticated with check (bucket_id = 'avatars' and not public.is_anon() or not public.is_restricted());

create or replace function public.accept_coach_guard()
returns trigger language plpgsql
as $$
begin
  if public.is_restricted() then
    raise exception 'RESTRICTED';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
--  Registrace s věkem a zemí
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_birth date;
  v_terms timestamptz;
  v_country text;
  v_age int;
begin
  begin
    v_birth := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
  exception when others then
    v_birth := null;
  end;
  begin
    v_terms := nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz;
  exception when others then
    v_terms := null;
  end;
  v_country := coalesce(nullif(new.raw_user_meta_data ->> 'country', ''), 'CZ');
  if v_country not in ('CZ', 'SK', 'OTHER') then
    v_country := 'OTHER';
  end if;
  v_age := public.age_of(v_birth);
  if v_age is not null and v_age < public.min_age() then
    raise exception 'UNDER_AGE';
  end if;

  insert into public.profiles (id, first_name, last_name, birth_year, is_public)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 60),
    left(coalesce(new.raw_user_meta_data ->> 'last_name', ''), 60),
    extract(year from v_birth)::integer,
    -- nezletilí jsou ve vyhledávání ve výchozím stavu skrytí
    coalesce(v_age, 18) >= 18
  )
  on conflict (id) do nothing;

  insert into public.profile_private (user_id, birth_date, terms_accepted_at, country, parent_consent_required, terms_version)
  values (
    new.id, v_birth, v_terms, v_country,
    v_age is not null and v_age < public.consent_age(v_country),
    nullif(new.raw_user_meta_data ->> 'terms_version', '')
  )
  on conflict (user_id) do nothing;
  return new;
end $$;

-- Dokončení registrace hosta (s věkem, zemí a verzí podmínek)
drop function if exists public.complete_registration(text, text, date);
create or replace function public.complete_registration(p_first text, p_last text, p_birth date, p_country text default 'CZ', p_terms_version text default null)
returns void language plpgsql security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  v_age int := public.age_of(p_birth);
  v_country text := case when p_country in ('CZ', 'SK') then p_country else 'OTHER' end;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if p_birth is null or v_age < public.min_age() then
    raise exception 'UNDER_AGE';
  end if;
  update public.profiles
     set first_name = left(btrim(coalesce(p_first, '')), 60),
         last_name = left(btrim(coalesce(p_last, '')), 60),
         birth_year = extract(year from p_birth)::integer
   where id = me;
  insert into public.profile_private (user_id, birth_date, terms_accepted_at, country, parent_consent_required, terms_version)
  values (me, p_birth, now(), v_country, v_age < public.consent_age(v_country), p_terms_version)
  on conflict (user_id) do update
     set birth_date = excluded.birth_date,
         terms_accepted_at = excluded.terms_accepted_at,
         country = excluded.country,
         parent_consent_required = excluded.parent_consent_required,
         terms_version = excluded.terms_version;
end $$;
revoke execute on function public.complete_registration(text, text, date, text, text) from public, anon;
grant execute on function public.complete_registration(text, text, date, text, text) to authenticated;

-- po převodu hosta: nezletilý zůstane skrytý ve vyhledávání
create or replace function public.on_user_upgraded()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if old.is_anonymous and not new.is_anonymous then
    update public.profiles set is_public = not public.is_minor(new.id) where id = new.id;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
--  Souhlas zákonného zástupce
-- ---------------------------------------------------------------------
-- dítě zadá e-mail rodiče → vznikne odkaz (token), který rodič otevře
create or replace function public.request_parent_consent(p_parent_email text)
returns uuid language plpgsql security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  v_token uuid := gen_random_uuid();
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if p_parent_email is null or position('@' in p_parent_email) < 2 then
    raise exception 'INVALID_EMAIL';
  end if;
  -- ochrana proti zahlcení: nová žádost nejdřív po 2 minutách
  if exists (select 1 from public.profile_private where user_id = me and parent_requested_at > now() - interval '2 minutes') then
    return (select parent_token from public.profile_private where user_id = me);
  end if;
  update public.profile_private
     set parent_email = left(btrim(p_parent_email), 200), parent_token = v_token, parent_requested_at = now()
   where user_id = me and parent_consent_required and parent_consent_at is null;
  if not found then
    raise exception 'NOT_NEEDED';
  end if;
  return v_token;
end $$;
revoke execute on function public.request_parent_consent(text) from public, anon;
grant execute on function public.request_parent_consent(text) to authenticated;

-- rodič si zobrazí, k čemu souhlas dává (bez přihlášení, jen s tokenem z odkazu)
create or replace function public.parent_consent_info(p_token uuid)
returns table (child_first_name text, child_birth_year int, already_confirmed boolean)
language sql stable security definer
set search_path = public
as $$
  select p.first_name, p.birth_year, pp.parent_consent_at is not null
    from public.profile_private pp join public.profiles p on p.id = pp.user_id
   where pp.parent_token = p_token
$$;
revoke execute on function public.parent_consent_info(uuid) from public;
grant execute on function public.parent_consent_info(uuid) to anon, authenticated;

-- rodič potvrdí souhlas (jméno, e-mail a prohlášení, že je zákonným zástupcem)
create or replace function public.confirm_parent_consent(p_token uuid, p_parent_name text, p_parent_email text)
returns boolean language plpgsql security definer
set search_path = public
as $$
begin
  if coalesce(char_length(btrim(p_parent_name)), 0) < 3 or position('@' in coalesce(p_parent_email, '')) < 2 then
    raise exception 'INVALID';
  end if;
  update public.profile_private
     set parent_consent_at = now(),
         parent_name = left(btrim(p_parent_name), 120),
         parent_email = left(btrim(p_parent_email), 200),
         parent_token = null
   where parent_token = p_token and parent_consent_at is null;
  return found;
end $$;
revoke execute on function public.confirm_parent_consent(uuid, text, text) from public;
grant execute on function public.confirm_parent_consent(uuid, text, text) to anon, authenticated;

-- rodič může souhlas kdykoli odvolat e-mailem; správce ho pak zruší (účet se omezí)
create or replace function public.admin_revoke_parent_consent(p_user uuid)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  update public.profile_private set parent_consent_at = null where user_id = p_user and parent_consent_required;
end $$;
revoke execute on function public.admin_revoke_parent_consent(uuid) from public, anon;
grant execute on function public.admin_revoke_parent_consent(uuid) to authenticated;

-- pro odeslání e-mailu rodiči (Edge Function se service role)
create or replace function public.parent_consent_mail(p_token uuid)
returns table (parent_email text, child_first_name text)
language sql stable security definer
set search_path = public
as $$
  select pp.parent_email, p.first_name
    from public.profile_private pp join public.profiles p on p.id = pp.user_id
   where pp.parent_token = p_token and pp.parent_consent_at is null
$$;
revoke execute on function public.parent_consent_mail(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
--  Nezletilí: zprávy jen od přátel a vlastního trenéra
-- ---------------------------------------------------------------------
create or replace function public.messages_before_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_trusted boolean;
begin
  new.created_at := now();
  new.read_at := null;
  if public.is_banned(new.sender_id) then
    raise exception 'BANNED';
  end if;
  if public.is_blocked(new.sender_id, new.recipient_id) then
    raise exception 'BLOCKED';
  end if;
  v_trusted := public.are_friends(new.sender_id, new.recipient_id)
    or public.is_coach_of(new.sender_id, new.recipient_id)
    or public.is_coach_of(new.recipient_id, new.sender_id);
  -- dítěti může psát jen přítel nebo jeho trenér (a dítě jen jim)
  if not v_trusted and (public.is_minor(new.recipient_id) or public.is_minor(new.sender_id)) then
    raise exception 'MINOR_PROTECTED';
  end if;
  if not v_trusted then
    if exists (select 1 from public.messages m where m.sender_id = new.recipient_id and m.recipient_id = new.sender_id) then
      return new; -- příjemce už odpověděl, konverzace je otevřená
    end if;
    if (select count(*) from public.messages m where m.sender_id = new.sender_id and m.recipient_id = new.recipient_id) >= 3 then
      raise exception 'MESSAGE_REQUEST_LIMIT';
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
--  Verze podmínek: při změně podmínek je uživatel znovu odsouhlasí
-- ---------------------------------------------------------------------
create or replace function public.accept_terms(p_version text)
returns void language sql security definer
set search_path = public
as $$
  insert into public.profile_private (user_id, terms_version, terms_accepted_at)
  values (auth.uid(), p_version, now())
  on conflict (user_id) do update set terms_version = excluded.terms_version, terms_accepted_at = excluded.terms_accepted_at
$$;
revoke execute on function public.accept_terms(text) from public, anon;
grant execute on function public.accept_terms(text) to authenticated;

-- ---------------------------------------------------------------------
--  Odvolání proti rozhodnutí moderátora (DSA čl. 20)
-- ---------------------------------------------------------------------
alter table public.moderation_notices drop constraint if exists moderation_notices_kind_check;
alter table public.moderation_notices
  add constraint moderation_notices_kind_check check (kind in ('content_removed', 'banned', 'unbanned', 'appeal_upheld', 'appeal_granted'));

create table if not exists public.moderation_appeals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  notice_id   uuid references public.moderation_notices (id) on delete set null,
  notice_kind text,
  notice_reason text,
  body        text not null check (char_length(btrim(body)) between 5 and 2000),
  status      text not null default 'open' check (status in ('open', 'upheld', 'granted')),
  decision    text check (char_length(decision) <= 1000),
  handled_by  uuid references public.profiles (id) on delete set null,
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.moderation_appeals enable row level security;
create policy "users see own appeals" on public.moderation_appeals
  for select to authenticated using (user_id = auth.uid());
grant select on public.moderation_appeals to authenticated;
grant all on public.moderation_appeals to service_role;

-- odvolání do 6 měsíců od rozhodnutí
create or replace function public.file_appeal(p_notice uuid, p_body text)
returns void language plpgsql security definer
set search_path = public
as $$
declare
  n public.moderation_notices%rowtype;
begin
  select * into n from public.moderation_notices where id = p_notice and user_id = auth.uid();
  if n.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if n.created_at < now() - interval '6 months' then
    raise exception 'TOO_LATE';
  end if;
  if exists (select 1 from public.moderation_appeals where notice_id = p_notice and status = 'open') then
    raise exception 'ALREADY';
  end if;
  insert into public.moderation_appeals (user_id, notice_id, notice_kind, notice_reason, body)
  values (auth.uid(), n.id, n.kind, n.reason, left(btrim(p_body), 2000));
end $$;
revoke execute on function public.file_appeal(uuid, text) from public, anon;
grant execute on function public.file_appeal(uuid, text) to authenticated;

create or replace function public.admin_list_appeals(p_status text default 'open')
returns table (id uuid, user_id uuid, user_name text, notice_kind text, notice_reason text, body text, status text,
               decision text, created_at timestamptz, user_banned boolean)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  return query
  select a.id, a.user_id, btrim(p.first_name || ' ' || p.last_name), a.notice_kind, a.notice_reason, a.body, a.status,
         a.decision, a.created_at, p.banned_at is not null
    from public.moderation_appeals a join public.profiles p on p.id = a.user_id
   where p_status is null or a.status = p_status
   order by a.created_at desc
   limit 200;
end $$;
revoke execute on function public.admin_list_appeals(text) from public, anon;
grant execute on function public.admin_list_appeals(text) to authenticated;

-- rozhodnutí o odvolání: granted = vyhovět (zrušit blokaci), upheld = ponechat; uživatel dostane oznámení
create or replace function public.admin_resolve_appeal(p_appeal uuid, p_grant boolean, p_decision text)
returns void language plpgsql security definer
set search_path = public
as $$
declare
  a public.moderation_appeals%rowtype;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  select * into a from public.moderation_appeals where id = p_appeal for update;
  if a.id is null or a.status <> 'open' then
    raise exception 'NOT_FOUND';
  end if;
  update public.moderation_appeals
     set status = case when p_grant then 'granted' else 'upheld' end,
         decision = nullif(btrim(coalesce(p_decision, '')), ''),
         handled_by = auth.uid(), handled_at = now()
   where id = a.id;
  if p_grant and a.notice_kind = 'banned' then
    update public.profiles set banned_at = null, ban_reason = null where id = a.user_id;
  end if;
  insert into public.moderation_notices (user_id, kind, reason)
  values (a.user_id, case when p_grant then 'appeal_granted' else 'appeal_upheld' end, nullif(btrim(coalesce(p_decision, '')), ''));
end $$;
revoke execute on function public.admin_resolve_appeal(uuid, boolean, text) from public, anon;
grant execute on function public.admin_resolve_appeal(uuid, boolean, text) to authenticated;

revoke execute on function public.needs_parent(uuid) from public, anon;
grant execute on function public.needs_parent(uuid) to authenticated;

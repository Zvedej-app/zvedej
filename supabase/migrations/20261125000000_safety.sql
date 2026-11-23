-- =====================================================================
--  Bezpečnost a soulad s předpisy (GDPR, DSA):
--   • soukromé údaje profilu (datum narození, souhlas, tělesná hmotnost)
--   • věková hranice 15 let při registraci
--   • blokování uživatelů
--   • nahlášení uživatelů, zpráv a videí + moderace a oznámení s odůvodněním
--   • zablokování účtu správcem
--   • export všech vlastních dat
-- =====================================================================

-- ---------------------------------------------------------------------
--  Profily: správce, blokace účtu, viditelnost hmotnosti
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists show_bodyweight boolean not null default false,
  add column if not exists is_admin boolean not null default false,
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text check (char_length(ban_reason) <= 500);

create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public
as $$ select coalesce((select is_admin from public.profiles where id = auth.uid()), false) $$;

create or replace function public.is_banned(p_user uuid)
returns boolean language sql stable security definer
set search_path = public
as $$ select coalesce((select banned_at is not null from public.profiles where id = p_user), false) $$;

-- Soukromé údaje vidí jen vlastník (ostatní profily čte každý přihlášený).
create table if not exists public.profile_private (
  user_id            uuid primary key references public.profiles (id) on delete cascade,
  birth_date         date,
  terms_accepted_at  timestamptz,
  bodyweight         numeric(5, 1) check (bodyweight between 20 and 300),
  updated_at         timestamptz not null default now()
);
alter table public.profile_private enable row level security;
create policy "own private data" on public.profile_private
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.profile_private to authenticated;
grant all on public.profile_private to service_role;

-- Dosavadní hmotnost přesuň do soukromé tabulky; veřejně jen se souhlasem (výchozí: skrytá)
insert into public.profile_private (user_id, bodyweight)
select id, bodyweight from public.profiles
on conflict (user_id) do update set bodyweight = excluded.bodyweight;

-- profiles.bodyweight je jen veřejná kopie: vyplněná, když ji uživatel povolí
create or replace function public.profiles_protect()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  -- příznaky správce a blokace mění jen správce (nebo SQL editor / service role bez auth.uid())
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.is_admin := false;
      new.banned_at := null;
      new.ban_reason := null;
    else
      new.is_admin := old.is_admin;
      new.banned_at := old.banned_at;
      new.ban_reason := old.ban_reason;
    end if;
  end if;
  new.bodyweight := case
    when new.show_bodyweight then (select pp.bodyweight from public.profile_private pp where pp.user_id = new.id)
    else null
  end;
  return new;
end $$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect
before insert or update on public.profiles
for each row execute function public.profiles_protect();

-- přepočítá veřejnou kopii (trigger profiles_protect ji vezme z profile_private)
update public.profiles set show_bodyweight = show_bodyweight;

create or replace function public.profile_private_sync()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists profile_private_before on public.profile_private;
create trigger profile_private_before
before insert or update on public.profile_private
for each row execute function public.profile_private_sync();

create or replace function public.profile_private_after()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  update public.profiles set show_bodyweight = show_bodyweight where id = new.user_id;
  return null;
end $$;
drop trigger if exists profile_private_after on public.profile_private;
create trigger profile_private_after
after insert or update of bodyweight on public.profile_private
for each row execute function public.profile_private_after();

-- ---------------------------------------------------------------------
--  Registrace: datum narození, souhlas s podmínkami, minimálně 15 let
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  v_birth date;
  v_terms timestamptz;
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
  if v_birth is not null and v_birth > (current_date - interval '15 years')::date then
    raise exception 'UNDER_AGE' using hint = 'Registrace je možná od 15 let.';
  end if;

  insert into public.profiles (id, first_name, last_name, birth_year)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 60),
    left(coalesce(new.raw_user_meta_data ->> 'last_name', ''), 60),
    extract(year from v_birth)::integer
  )
  on conflict (id) do nothing;

  insert into public.profile_private (user_id, birth_date, terms_accepted_at)
  values (new.id, v_birth, v_terms)
  on conflict (user_id) do nothing;
  return new;
end $$;

-- ---------------------------------------------------------------------
--  Blokování uživatelů
-- ---------------------------------------------------------------------
create table if not exists public.user_blocks (
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;
create policy "see own blocks" on public.user_blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy "block users" on public.user_blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy "unblock users" on public.user_blocks
  for delete to authenticated using (blocker_id = auth.uid());
grant select, insert, delete on public.user_blocks to authenticated;
grant all on public.user_blocks to service_role;

create or replace function public.is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
     where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

-- zablokováním se zruší i přátelství a čekající žádosti
create or replace function public.user_blocks_after_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  delete from public.friendships
   where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
      or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  return null;
end $$;
drop trigger if exists user_blocks_after_insert on public.user_blocks;
create trigger user_blocks_after_insert
after insert on public.user_blocks
for each row execute function public.user_blocks_after_insert();

-- žádost o přátelství nelze poslat při blokaci ani se zablokovaným účtem
drop policy if exists "send friend request" on public.friendships;
create policy "send friend request" on public.friendships
  for insert to authenticated with check (
    requester_id = auth.uid()
    and status = 'pending'
    and not public.is_blocked(requester_id, addressee_id)
    and not public.is_banned(requester_id)
  );

-- zprávy: blokace, zablokovaný účet a limit 3 zpráv pro nepřátele
create or replace function public.messages_before_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  new.created_at := now();
  new.read_at := null;
  if public.is_banned(new.sender_id) then
    raise exception 'BANNED';
  end if;
  if public.is_blocked(new.sender_id, new.recipient_id) then
    raise exception 'BLOCKED';
  end if;
  if not public.are_friends(new.sender_id, new.recipient_id) then
    if exists (select 1 from public.messages m where m.sender_id = new.recipient_id and m.recipient_id = new.sender_id) then
      return new; -- příjemce už odpověděl, konverzace je otevřená
    end if;
    if (select count(*) from public.messages m where m.sender_id = new.sender_id and m.recipient_id = new.recipient_id) >= 3 then
      raise exception 'MESSAGE_REQUEST_LIMIT';
    end if;
  end if;
  return new;
end $$;

-- videa: zablokovaný účet nemůže nahrávat
create or replace function public.challenge_videos_before_insert()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if public.is_banned(new.user_id) then
    raise exception 'BANNED';
  end if;
  new.month := public.current_challenge_month();
  new.likes_count := 0;
  new.reports_count := 0;
  new.hidden := false;
  new.created_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
--  Nahlášení (uživatel / zpráva / video) a moderace
-- ---------------------------------------------------------------------
create table if not exists public.content_reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid references public.profiles (id) on delete set null,
  kind             text not null check (kind in ('user', 'message', 'video')),
  target_user_id   uuid references public.profiles (id) on delete set null,
  message_id       uuid references public.messages (id) on delete set null,
  video_id         uuid references public.challenge_videos (id) on delete set null,
  snapshot         text,
  reason           text check (char_length(reason) <= 500),
  status           text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  resolution       text check (char_length(resolution) <= 500),
  handled_by       uuid references public.profiles (id) on delete set null,
  handled_at       timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists content_reports_open on public.content_reports (created_at) where status = 'open';
alter table public.content_reports enable row level security;
create policy "users file reports" on public.content_reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy "users see own reports" on public.content_reports
  for select to authenticated using (reporter_id = auth.uid());
grant select, insert on public.content_reports to authenticated;
grant all on public.content_reports to service_role;

-- Server doplní cíl a uloží kopii obsahu (důkaz zůstane i po smazání zprávy)
create or replace function public.content_reports_before_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  m public.messages%rowtype;
  v public.challenge_videos%rowtype;
begin
  new.status := 'open';
  new.resolution := null;
  new.handled_by := null;
  new.handled_at := null;
  new.created_at := now();
  if new.kind = 'message' then
    select * into m from public.messages where id = new.message_id;
    -- nahlásit lze jen zprávu, kterou jsem dostal
    if m.id is null or m.recipient_id is distinct from new.reporter_id then
      raise exception 'REPORT_INVALID_TARGET';
    end if;
    new.target_user_id := m.sender_id;
    new.snapshot := m.body;
    new.video_id := null;
  elsif new.kind = 'video' then
    select * into v from public.challenge_videos where id = new.video_id;
    if v.id is null then
      raise exception 'REPORT_INVALID_TARGET';
    end if;
    new.target_user_id := v.user_id;
    new.snapshot := coalesce(v.caption, '') || E'\n' || v.video_url;
    new.message_id := null;
  else
    if new.target_user_id is null or not exists (select 1 from public.profiles where id = new.target_user_id) then
      raise exception 'REPORT_INVALID_TARGET';
    end if;
    select concat_ws(' | ', p.first_name || ' ' || p.last_name, p.motto, p.avatar_url)
      into new.snapshot from public.profiles p where p.id = new.target_user_id;
    new.message_id := null;
    new.video_id := null;
  end if;
  if new.target_user_id = new.reporter_id then
    raise exception 'REPORT_INVALID_TARGET';
  end if;
  return new;
end $$;
drop trigger if exists content_reports_before_insert on public.content_reports;
create trigger content_reports_before_insert
before insert on public.content_reports
for each row execute function public.content_reports_before_insert();

-- Nahlášení videa (stávající tabulka s automatickým skrytím) se zrcadlí do přehledu
create or replace function public.video_reports_after_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  update public.challenge_videos
     set reports_count = reports_count + 1,
         hidden = hidden or reports_count + 1 >= 5
   where id = new.video_id;
  insert into public.content_reports (reporter_id, kind, video_id, reason)
  values (new.reporter_id, 'video', new.video_id, new.reason);
  return null;
end $$;

-- Oznámení o zásahu moderátora (odůvodnění podle DSA čl. 17)
create table if not exists public.moderation_notices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('content_removed', 'banned', 'unbanned')),
  reason      text,
  created_at  timestamptz not null default now(),
  seen_at     timestamptz
);
create index if not exists moderation_notices_user on public.moderation_notices (user_id, created_at desc);
alter table public.moderation_notices enable row level security;
create policy "users see own notices" on public.moderation_notices
  for select to authenticated using (user_id = auth.uid());
grant select on public.moderation_notices to authenticated;
grant all on public.moderation_notices to service_role;

create or replace function public.mark_notices_seen()
returns void language sql security definer
set search_path = public
as $$ update public.moderation_notices set seen_at = now() where user_id = auth.uid() and seen_at is null $$;
revoke execute on function public.mark_notices_seen() from public, anon;
grant execute on function public.mark_notices_seen() to authenticated;

-- Přehled nahlášení pro správce
create or replace function public.admin_list_reports(p_status text default 'open')
returns table (
  id uuid,
  kind text,
  status text,
  reason text,
  snapshot text,
  resolution text,
  created_at timestamptz,
  handled_at timestamptz,
  reporter_id uuid,
  reporter_name text,
  target_user_id uuid,
  target_name text,
  target_banned boolean,
  message_id uuid,
  video_id uuid,
  video_url text,
  video_hidden boolean,
  same_target_reports bigint
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  return query
  select r.id, r.kind, r.status, r.reason, r.snapshot, r.resolution, r.created_at, r.handled_at,
         r.reporter_id, btrim(rp.first_name || ' ' || rp.last_name),
         r.target_user_id, btrim(tp.first_name || ' ' || tp.last_name), tp.banned_at is not null,
         r.message_id, r.video_id, v.video_url, v.hidden,
         (select count(*) from public.content_reports r2
           where r2.status = 'open' and r2.target_user_id = r.target_user_id)
    from public.content_reports r
    left join public.profiles rp on rp.id = r.reporter_id
    left join public.profiles tp on tp.id = r.target_user_id
    left join public.challenge_videos v on v.id = r.video_id
   where p_status is null or r.status = p_status
   order by r.created_at desc
   limit 200;
end $$;
revoke execute on function public.admin_list_reports(text) from public, anon;
grant execute on function public.admin_list_reports(text) to authenticated;

-- Vyřízení nahlášení: dismiss = bez zásahu, remove = odstranit obsah, ban = zablokovat účet
create or replace function public.admin_resolve_report(p_report uuid, p_action text, p_reason text default null)
returns void language plpgsql security definer
set search_path = public
as $$
declare
  r public.content_reports%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  select * into r from public.content_reports where id = p_report for update;
  if r.id is null then
    raise exception 'NOT_FOUND';
  end if;
  if p_action not in ('dismiss', 'remove', 'ban') then
    raise exception 'INVALID_ACTION';
  end if;

  if p_action in ('remove', 'ban') then
    if r.kind = 'message' and r.message_id is not null then
      delete from public.messages where id = r.message_id;
    elsif r.kind = 'video' and r.video_id is not null then
      update public.challenge_videos set hidden = true where id = r.video_id;
    elsif r.kind = 'user' and r.target_user_id is not null then
      -- nevhodný profil: smaže se foto a motto
      update public.profiles set avatar_url = null, motto = null where id = r.target_user_id;
    end if;
    if r.target_user_id is not null then
      insert into public.moderation_notices (user_id, kind, reason)
      values (r.target_user_id, 'content_removed', v_reason);
    end if;
  end if;

  if p_action = 'ban' and r.target_user_id is not null then
    update public.profiles set banned_at = now(), ban_reason = v_reason where id = r.target_user_id;
    update public.challenge_videos set hidden = true where user_id = r.target_user_id;
    insert into public.moderation_notices (user_id, kind, reason)
    values (r.target_user_id, 'banned', v_reason);
  end if;

  -- vyřiď i ostatní otevřená nahlášení téhož obsahu
  update public.content_reports
     set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end,
         resolution = coalesce(v_reason, p_action),
         handled_by = auth.uid(),
         handled_at = now()
   where status = 'open'
     and (id = r.id
       or (r.kind = 'message' and message_id = r.message_id)
       or (r.kind = 'video' and video_id = r.video_id)
       or (r.kind = 'user' and kind = 'user' and target_user_id = r.target_user_id)
       or (p_action = 'ban' and target_user_id = r.target_user_id));
end $$;
revoke execute on function public.admin_resolve_report(uuid, text, text) from public, anon;
grant execute on function public.admin_resolve_report(uuid, text, text) to authenticated;

create or replace function public.admin_unban(p_user uuid)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  update public.profiles set banned_at = null, ban_reason = null where id = p_user;
  insert into public.moderation_notices (user_id, kind) values (p_user, 'unbanned');
end $$;
revoke execute on function public.admin_unban(uuid) from public, anon;
grant execute on function public.admin_unban(uuid) to authenticated;

-- nahlášení a záznamy o moderaci se mažou 1 rok po vyřízení (viz zásady)
create or replace function public.purge_old_reports()
returns void language sql security definer
set search_path = public
as $$
  delete from public.content_reports where status <> 'open' and handled_at < now() - interval '1 year';
  delete from public.moderation_notices where created_at < now() - interval '1 year';
$$;
revoke execute on function public.purge_old_reports() from public, anon, authenticated;
select cron.schedule('zvedej-purge-reports', '17 3 * * *', $$ select public.purge_old_reports() $$);

-- ---------------------------------------------------------------------
--  Export všech vlastních dat (GDPR čl. 15 a 20)
-- ---------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb language plpgsql stable security definer
set search_path = public, auth
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  return jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at)
                  from auth.users u where u.id = me),
    'profile', (select to_jsonb(p) - 'search_text' from public.profiles p where p.id = me),
    'private', (select to_jsonb(pp) from public.profile_private pp where pp.user_id = me),
    'training', (select t.data from public.user_training t where t.user_id = me),
    'videos', coalesce((select jsonb_agg(to_jsonb(v) order by v.created_at) from public.challenge_videos v where v.user_id = me), '[]'::jsonb),
    'likes', coalesce((select jsonb_agg(jsonb_build_object('video_id', l.video_id, 'created_at', l.created_at)) from public.video_likes l where l.user_id = me), '[]'::jsonb),
    'friendships', coalesce((select jsonb_agg(to_jsonb(f)) from public.friendships f where me in (f.requester_id, f.addressee_id)), '[]'::jsonb),
    'messages', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at) from public.messages m where me in (m.sender_id, m.recipient_id)), '[]'::jsonb),
    'blocked_users', coalesce((select jsonb_agg(jsonb_build_object('user_id', b.blocked_id, 'created_at', b.created_at)) from public.user_blocks b where b.blocker_id = me), '[]'::jsonb),
    'reports_filed', coalesce((select jsonb_agg(jsonb_build_object('kind', r.kind, 'reason', r.reason, 'status', r.status, 'created_at', r.created_at)) from public.content_reports r where r.reporter_id = me), '[]'::jsonb),
    'moderation_notices', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at) from public.moderation_notices n where n.user_id = me), '[]'::jsonb)
  );
end $$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- chráněné pomocné funkce nevolá klient přímo
revoke execute on function public.profiles_protect() from public, anon, authenticated;
revoke execute on function public.profile_private_after() from public, anon, authenticated;
revoke execute on function public.content_reports_before_insert() from public, anon, authenticated;

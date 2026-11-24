-- =====================================================================
--  Trenérský režim
--   • trenér (profiles.is_coach) si zve svěřence; svěřenec musí souhlasit
--   • trenér vidí deník, maxima a plán potvrzených svěřenců
--     (tělesnou hmotnost jen se souhlasem)
--   • plány od trenéra (procenta, kila, RPE i bez zátěže), skupiny
--   • komentáře k tréninkům a videa nástupů
--   • svěřenec do 18 let se může připojit jen k trenérovi ze svého klubu
-- =====================================================================

alter table public.profiles add column if not exists is_coach boolean not null default false;

-- ---------------------------------------------------------------------
--  Propojení trenér ↔ svěřenec
-- ---------------------------------------------------------------------
create table if not exists public.coach_links (
  coach_id          uuid not null references public.profiles (id) on delete cascade,
  athlete_id        uuid not null references public.profiles (id) on delete cascade,
  status            text not null default 'pending' check (status in ('pending', 'accepted')),
  share_bodyweight  boolean not null default false,
  created_at        timestamptz not null default now(),
  accepted_at       timestamptz,
  primary key (coach_id, athlete_id),
  check (coach_id <> athlete_id)
);
create index if not exists coach_links_athlete on public.coach_links (athlete_id);
alter table public.coach_links enable row level security;

create policy "see own coach links" on public.coach_links
  for select to authenticated using (coach_id = auth.uid() or athlete_id = auth.uid());
-- trenér posílá pozvánku (čeká na souhlas svěřence)
create policy "coach invites athlete" on public.coach_links
  for insert to authenticated with check (
    coach_id = auth.uid()
    and status = 'pending'
    and share_bodyweight = false
    and accepted_at is null
    and coalesce((select is_coach from public.profiles where id = auth.uid()), false)
    and not public.is_blocked(coach_id, athlete_id)
    and not public.is_banned(coach_id)
  );
-- spojení může kdykoli zrušit kterákoli strana
create policy "either side removes link" on public.coach_links
  for delete to authenticated using (coach_id = auth.uid() or athlete_id = auth.uid());
grant select, insert, delete on public.coach_links to authenticated;
grant all on public.coach_links to service_role;

create or replace function public.is_coach_of(p_coach uuid, p_athlete uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.coach_links
     where coach_id = p_coach and athlete_id = p_athlete and status = 'accepted'
  )
$$;

-- Svěřenec potvrdí pozvánku, nebo se sám připojí odkazem / QR kódem trenéra
create or replace function public.accept_coach(p_coach uuid, p_share_bodyweight boolean default false)
returns void language plpgsql security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  c public.profiles%rowtype;
  a public.profiles%rowtype;
  v_birth date;
  v_age int;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  select * into c from public.profiles where id = p_coach;
  select * into a from public.profiles where id = me;
  if c.id is null or not c.is_coach then
    raise exception 'NOT_A_COACH';
  end if;
  if p_coach = me then
    raise exception 'SELF';
  end if;
  if public.is_blocked(p_coach, me) or c.banned_at is not null then
    raise exception 'BLOCKED';
  end if;
  -- nezletilí: jen trenér ze stejného klubu
  select birth_date into v_birth from public.profile_private where user_id = me;
  if v_birth is not null then
    v_age := extract(year from age(current_date, v_birth));
  elsif a.birth_year is not null then
    v_age := extract(year from current_date)::int - a.birth_year;
  end if;
  if v_age is not null and v_age < 18 and (a.club_id is null or c.club_id is distinct from a.club_id) then
    raise exception 'MINOR_CLUB';
  end if;
  insert into public.coach_links (coach_id, athlete_id, status, share_bodyweight, accepted_at)
  values (p_coach, me, 'accepted', coalesce(p_share_bodyweight, false), now())
  on conflict (coach_id, athlete_id) do update
     set status = 'accepted', share_bodyweight = excluded.share_bodyweight, accepted_at = now();
end $$;
revoke execute on function public.accept_coach(uuid, boolean) from public, anon;
grant execute on function public.accept_coach(uuid, boolean) to authenticated;

-- Svěřenec změní, zda trenér vidí jeho tělesnou hmotnost
create or replace function public.set_coach_share(p_coach uuid, p_share_bodyweight boolean)
returns void language sql security definer
set search_path = public
as $$
  update public.coach_links set share_bodyweight = p_share_bodyweight
   where coach_id = p_coach and athlete_id = auth.uid()
$$;
revoke execute on function public.set_coach_share(uuid, boolean) from public, anon;
grant execute on function public.set_coach_share(uuid, boolean) to authenticated;

-- tréninková data bez tělesné hmotnosti (pokud ji svěřenec nesdílí)
create or replace function public.strip_bodyweight(p_data jsonb)
returns jsonb language sql immutable
as $$
  select case
    when p_data is null or jsonb_typeof(p_data -> 'logs') <> 'array' then p_data
    else jsonb_set(
      p_data, '{logs}',
      coalesce((select jsonb_agg(l - 'bodyweight') from jsonb_array_elements(p_data -> 'logs') l), '[]'::jsonb)
    )
  end
$$;

-- Přehled týmu pro trenéra: svěřenci (i čekající pozvánky), maxima a tréninky za posledních 60 dní
create or replace function public.coach_team()
returns table (
  athlete_id uuid,
  status text,
  share_bodyweight boolean,
  created_at timestamptz,
  profile jsonb,
  maxes jsonb,
  recent_logs jsonb
)
language sql stable security definer
set search_path = public
as $$
  select l.athlete_id, l.status, l.share_bodyweight, l.created_at,
         (to_jsonb(p) - 'search_text' - 'bodyweight')
           || case when l.share_bodyweight and l.status = 'accepted'
                   then jsonb_build_object('bodyweight', pp.bodyweight) else '{}'::jsonb end,
         case when l.status = 'accepted' then coalesce(t.data -> 'maxes', '{}'::jsonb) else '{}'::jsonb end,
         case when l.status = 'accepted' then coalesce((
           select jsonb_agg(case when l.share_bodyweight then x else x - 'bodyweight' end)
             from jsonb_array_elements(t.data -> 'logs') x
            where (x ->> 'date') >= to_char(current_date - 60, 'YYYY-MM-DD')
         ), '[]'::jsonb) else '[]'::jsonb end
    from public.coach_links l
    join public.profiles p on p.id = l.athlete_id
    left join public.profile_private pp on pp.user_id = l.athlete_id
    left join public.user_training t on t.user_id = l.athlete_id
   where l.coach_id = auth.uid()
   order by l.status, p.last_name, p.first_name
$$;
revoke execute on function public.coach_team() from public, anon;
grant execute on function public.coach_team() to authenticated;

-- Celá tréninková data jednoho svěřence (deník, maxima, plány)
create or replace function public.coach_athlete_training(p_athlete uuid)
returns jsonb language plpgsql stable security definer
set search_path = public
as $$
declare
  v_share boolean;
  v_data jsonb;
begin
  select share_bodyweight into v_share from public.coach_links
   where coach_id = auth.uid() and athlete_id = p_athlete and status = 'accepted';
  if not found then
    raise exception 'FORBIDDEN';
  end if;
  select data into v_data from public.user_training where user_id = p_athlete;
  return case when v_share then v_data else public.strip_bodyweight(v_data) end;
end $$;
revoke execute on function public.coach_athlete_training(uuid) from public, anon;
grant execute on function public.coach_athlete_training(uuid) to authenticated;

-- Svěřenec vidí profily svých trenérů a pozvánky
create or replace function public.my_coaches()
returns table (coach_id uuid, status text, share_bodyweight boolean, created_at timestamptz, profile jsonb)
language sql stable security definer
set search_path = public
as $$
  select l.coach_id, l.status, l.share_bodyweight, l.created_at, to_jsonb(p) - 'search_text' - 'bodyweight'
    from public.coach_links l join public.profiles p on p.id = l.coach_id
   where l.athlete_id = auth.uid()
   order by l.status desc, l.created_at
$$;
revoke execute on function public.my_coaches() from public, anon;
grant execute on function public.my_coaches() to authenticated;

-- ---------------------------------------------------------------------
--  Skupiny svěřenců
-- ---------------------------------------------------------------------
create table if not exists public.coach_groups (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  created_at  timestamptz not null default now()
);
create index if not exists coach_groups_coach on public.coach_groups (coach_id);
alter table public.coach_groups enable row level security;
create policy "coach manages own groups" on public.coach_groups
  for all to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid());
grant select, insert, update, delete on public.coach_groups to authenticated;
grant all on public.coach_groups to service_role;

create table if not exists public.coach_group_members (
  group_id    uuid not null references public.coach_groups (id) on delete cascade,
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  primary key (group_id, athlete_id)
);
alter table public.coach_group_members enable row level security;
create policy "coach manages group members" on public.coach_group_members
  for all to authenticated
  using (exists (select 1 from public.coach_groups g where g.id = group_id and g.coach_id = auth.uid()))
  with check (
    exists (select 1 from public.coach_groups g where g.id = group_id and g.coach_id = auth.uid())
    and public.is_coach_of(auth.uid(), athlete_id)
  );
grant select, insert, delete on public.coach_group_members to authenticated;
grant all on public.coach_group_members to service_role;

-- ---------------------------------------------------------------------
--  Plány od trenéra
-- ---------------------------------------------------------------------
create table if not exists public.assigned_plans (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references public.profiles (id) on delete cascade,
  athlete_id      uuid not null references public.profiles (id) on delete cascade,
  source_plan_id  text not null,
  plan            jsonb not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  seen_at         timestamptz,
  unique (coach_id, athlete_id, source_plan_id)
);
create index if not exists assigned_plans_athlete on public.assigned_plans (athlete_id);
alter table public.assigned_plans enable row level security;
create policy "athlete and coach see assigned plans" on public.assigned_plans
  for select to authenticated using (athlete_id = auth.uid() or coach_id = auth.uid());
create policy "coach assigns plans" on public.assigned_plans
  for insert to authenticated with check (coach_id = auth.uid() and public.is_coach_of(auth.uid(), athlete_id));
create policy "coach updates plans" on public.assigned_plans
  for update to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid() and public.is_coach_of(auth.uid(), athlete_id));
create policy "coach or athlete removes plan" on public.assigned_plans
  for delete to authenticated using (coach_id = auth.uid() or athlete_id = auth.uid());
grant select, insert, update, delete on public.assigned_plans to authenticated;
grant all on public.assigned_plans to service_role;

create or replace function public.assigned_plans_before_write()
returns trigger language plpgsql
as $$
begin
  new.updated_at := now();
  -- změněný plán svěřenec uvidí jako novinku
  if tg_op = 'INSERT' or new.plan is distinct from old.plan then
    new.seen_at := null;
  end if;
  return new;
end $$;
drop trigger if exists assigned_plans_before_write on public.assigned_plans;
create trigger assigned_plans_before_write
before insert or update on public.assigned_plans
for each row execute function public.assigned_plans_before_write();

create or replace function public.mark_assigned_plans_seen()
returns void language sql security definer
set search_path = public
as $$ update public.assigned_plans set seen_at = now() where athlete_id = auth.uid() and seen_at is null $$;
revoke execute on function public.mark_assigned_plans_seen() from public, anon;
grant execute on function public.mark_assigned_plans_seen() to authenticated;

-- po zrušení spojení zmizí trenérovi i plány a skupiny tohoto svěřence
create or replace function public.coach_links_after_delete()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  delete from public.assigned_plans where coach_id = old.coach_id and athlete_id = old.athlete_id;
  delete from public.coach_group_members m using public.coach_groups g
   where m.group_id = g.id and g.coach_id = old.coach_id and m.athlete_id = old.athlete_id;
  return null;
end $$;
drop trigger if exists coach_links_after_delete on public.coach_links;
create trigger coach_links_after_delete
after delete on public.coach_links
for each row execute function public.coach_links_after_delete();

-- zablokování uživatele zruší i trenérské spojení
create or replace function public.user_blocks_after_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  delete from public.friendships
   where (requester_id = new.blocker_id and addressee_id = new.blocked_id)
      or (requester_id = new.blocked_id and addressee_id = new.blocker_id);
  delete from public.coach_links
   where (coach_id = new.blocker_id and athlete_id = new.blocked_id)
      or (coach_id = new.blocked_id and athlete_id = new.blocker_id);
  return null;
end $$;

-- ---------------------------------------------------------------------
--  Komentáře k tréninkům
-- ---------------------------------------------------------------------
create table if not exists public.workout_comments (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  log_id      text not null,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index if not exists workout_comments_log on public.workout_comments (athlete_id, log_id, created_at);
alter table public.workout_comments enable row level security;
create policy "athlete and coaches read comments" on public.workout_comments
  for select to authenticated using (athlete_id = auth.uid() or public.is_coach_of(auth.uid(), athlete_id));
create policy "athlete and coaches write comments" on public.workout_comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and (athlete_id = auth.uid() or public.is_coach_of(auth.uid(), athlete_id))
    and not public.is_banned(auth.uid())
  );
create policy "authors delete comments" on public.workout_comments
  for delete to authenticated using (author_id = auth.uid());
grant select, insert, delete on public.workout_comments to authenticated;
grant all on public.workout_comments to service_role;

create or replace function public.workout_comments_before_insert()
returns trigger language plpgsql
as $$
begin
  new.created_at := now();
  new.read_at := null;
  return new;
end $$;
drop trigger if exists workout_comments_before_insert on public.workout_comments;
create trigger workout_comments_before_insert
before insert on public.workout_comments
for each row execute function public.workout_comments_before_insert();

-- označí cizí komentáře u tréninku jako přečtené
create or replace function public.mark_comments_read(p_athlete uuid, p_log text)
returns void language sql security definer
set search_path = public
as $$
  update public.workout_comments set read_at = now()
   where athlete_id = p_athlete and log_id = p_log and author_id <> auth.uid() and read_at is null
     and (p_athlete = auth.uid() or public.is_coach_of(auth.uid(), p_athlete))
$$;
revoke execute on function public.mark_comments_read(uuid, text) from public, anon;
grant execute on function public.mark_comments_read(uuid, text) to authenticated;

-- nepřečtené komentáře (pro svěřence i trenéra) po trénincích
create or replace function public.unread_comments()
returns table (athlete_id uuid, log_id text, unread bigint)
language sql stable security definer
set search_path = public
as $$
  select c.athlete_id, c.log_id, count(*)
    from public.workout_comments c
   where c.author_id <> auth.uid() and c.read_at is null
     and (c.athlete_id = auth.uid() or public.is_coach_of(auth.uid(), c.athlete_id))
   group by c.athlete_id, c.log_id
$$;
revoke execute on function public.unread_comments() from public, anon;
grant execute on function public.unread_comments() to authenticated;

-- ---------------------------------------------------------------------
--  Videa nástupů k tréninku (soukromá: vidí je jen svěřenec a jeho trenéři)
-- ---------------------------------------------------------------------
create table if not exists public.training_videos (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references public.profiles (id) on delete cascade,
  log_id        text not null,
  storage_path  text not null,
  caption       text check (char_length(caption) <= 200),
  created_at    timestamptz not null default now()
);
create index if not exists training_videos_log on public.training_videos (athlete_id, log_id);
alter table public.training_videos enable row level security;
create policy "athlete and coaches see training videos" on public.training_videos
  for select to authenticated using (athlete_id = auth.uid() or public.is_coach_of(auth.uid(), athlete_id));
create policy "athlete adds training videos" on public.training_videos
  for insert to authenticated with check (
    athlete_id = auth.uid() and (storage.foldername(storage_path))[1] = auth.uid()::text and not public.is_banned(auth.uid())
  );
create policy "athlete deletes training videos" on public.training_videos
  for delete to authenticated using (athlete_id = auth.uid());
grant select, insert, delete on public.training_videos to authenticated;
grant all on public.training_videos to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('training-videos', 'training-videos', false, 83886080, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

create policy "athletes upload training videos" on storage.objects for insert to authenticated
  with check (bucket_id = 'training-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "athletes and coaches read training videos" on storage.objects for select to authenticated
  using (
    bucket_id = 'training-videos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_coach_of(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );
create policy "athletes delete training videos" on storage.objects for delete to authenticated
  using (bucket_id = 'training-videos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
--  Export dat doplněný o trenérská data
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
    'moderation_notices', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at) from public.moderation_notices n where n.user_id = me), '[]'::jsonb),
    'coach_links', coalesce((select jsonb_agg(to_jsonb(c)) from public.coach_links c where me in (c.coach_id, c.athlete_id)), '[]'::jsonb),
    'coach_groups', coalesce((select jsonb_agg(to_jsonb(g)) from public.coach_groups g where g.coach_id = me), '[]'::jsonb),
    'assigned_plans', coalesce((select jsonb_agg(to_jsonb(a)) from public.assigned_plans a where me in (a.coach_id, a.athlete_id)), '[]'::jsonb),
    'workout_comments', coalesce((select jsonb_agg(to_jsonb(w) order by w.created_at) from public.workout_comments w where me in (w.athlete_id, w.author_id)), '[]'::jsonb),
    'training_videos', coalesce((select jsonb_agg(to_jsonb(v)) from public.training_videos v where v.athlete_id = me), '[]'::jsonb)
  );
end $$;

revoke execute on function public.coach_links_after_delete() from public, anon, authenticated;
revoke execute on function public.assigned_plans_before_write() from public, anon, authenticated;
revoke execute on function public.workout_comments_before_insert() from public, anon, authenticated;

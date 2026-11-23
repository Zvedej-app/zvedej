-- =====================================================================
--  Zvedej – databázové schéma (Supabase / PostgreSQL)
--  Navrženo pro desítky tisíc uživatelů: indexy na vyhledávání,
--  denormalizovaný počet lajků, RLS na všech tabulkách.
-- =====================================================================

create extension if not exists pg_trgm;
-- unaccent musí být ve schématu extensions (f_unaccent níže ho volá s plnou cestou)
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() není IMMUTABLE, pro indexy potřebujeme obal
create or replace function public.f_unaccent(text)
returns text language sql immutable parallel safe strict
set search_path = public, extensions
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

-- Aktuální měsíc výzvy podle pražského času (první den měsíce)
create or replace function public.current_challenge_month()
returns date language sql stable
as $$ select date_trunc('month', now() at time zone 'Europe/Prague')::date $$;

-- ---------------------------------------------------------------------
--  Kluby (zdroj: evidence.vzpirani.cz) – plní seed.sql
-- ---------------------------------------------------------------------
create table public.clubs (
  id         integer primary key,
  name       text not null,
  region     text not null check (region in ('cechy', 'morava')),
  city       text,
  address    text,
  lat        double precision,
  lng        double precision,
  web        text,
  facebook   text,
  instagram  text
);
alter table public.clubs enable row level security;
create policy "clubs are readable" on public.clubs for select using (true);

-- ---------------------------------------------------------------------
--  Profily
-- ---------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  first_name       text not null default '' check (char_length(first_name) <= 60),
  last_name        text not null default '' check (char_length(last_name) <= 60),
  avatar_url       text,
  motto            text check (char_length(motto) <= 160),
  club_id          integer references public.clubs (id) on delete set null,
  gender           text check (gender in ('M', 'F')),
  birth_year       integer check (birth_year between 1920 and 2100),
  age_group        text,
  weight_category  text check (char_length(weight_category) <= 6),
  pr_snatch        numeric(5, 1) check (pr_snatch between 0 and 300),
  pr_clean_jerk    numeric(5, 1) check (pr_clean_jerk between 0 and 350),
  bodyweight       numeric(5, 1) check (bodyweight between 20 and 300),
  is_public        boolean not null default true,
  search_text      text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index profiles_search_trgm on public.profiles using gin (search_text gin_trgm_ops);
create index profiles_club on public.profiles (club_id) where is_public;

create or replace function public.profiles_before_write()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.search_text := lower(public.f_unaccent(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '')));
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_before_write
before insert or update on public.profiles
for each row execute function public.profiles_before_write();

-- Po registraci automaticky vytvoř profil (jméno z metadat registrace)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 60),
    left(coalesce(new.raw_user_meta_data ->> 'last_name', ''), 60)
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
-- Profily vidí přihlášení uživatelé (jméno u videí, vítězové);
-- is_public určuje, zda je profil nalezitelný ve vyhledávání.
create policy "profiles are visible to signed-in users" on public.profiles
  for select to authenticated using (true);
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "users insert own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- ---------------------------------------------------------------------
--  Vzpěrač měsíce
-- ---------------------------------------------------------------------
create table public.monthly_challenges (
  month           date primary key check (extract(day from month) = 1),
  title_cs        text not null,
  title_en        text,
  title_sk        text,
  description_cs  text,
  description_en  text,
  description_sk  text
);
alter table public.monthly_challenges enable row level security;
-- Téma se zveřejní až 1. den daného měsíce
create policy "themes are published on the first day" on public.monthly_challenges
  for select using (month <= public.current_challenge_month());

create table public.challenge_videos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  month          date not null default public.current_challenge_month(),
  storage_path   text not null,
  video_url      text not null,
  thumbnail_url  text,
  caption        text check (char_length(caption) <= 300),
  likes_count    integer not null default 0,
  reports_count  integer not null default 0,
  hidden         boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (user_id, month)  -- jedno video měsíčně
);
create index challenge_videos_month_rank on public.challenge_videos (month, likes_count desc, created_at)
  where not hidden;
create index challenge_videos_user on public.challenge_videos (user_id, month desc);

-- Měsíc se vždy nastaví serverem – nelze podvrhnout starší/novější měsíc
create or replace function public.challenge_videos_before_insert()
returns trigger language plpgsql
as $$
begin
  new.month := public.current_challenge_month();
  new.likes_count := 0;
  new.reports_count := 0;
  new.hidden := false;
  new.created_at := now();
  return new;
end $$;

create trigger challenge_videos_before_insert
before insert on public.challenge_videos
for each row execute function public.challenge_videos_before_insert();

alter table public.challenge_videos enable row level security;
create policy "visible videos are public" on public.challenge_videos
  for select to authenticated using (not hidden or user_id = auth.uid());
create policy "users upload own video" on public.challenge_videos
  for insert to authenticated with check (user_id = auth.uid());
create policy "users delete own video in current month" on public.challenge_videos
  for delete to authenticated using (user_id = auth.uid() and month = public.current_challenge_month());

create table public.video_likes (
  video_id    uuid not null references public.challenge_videos (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (video_id, user_id)
);
create index video_likes_user on public.video_likes (user_id);

alter table public.video_likes enable row level security;
create policy "users see own likes" on public.video_likes
  for select to authenticated using (user_id = auth.uid());
-- Lajkovat lze jen videa aktuálního měsíce a ne vlastní
create policy "users like videos of the running month" on public.video_likes
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.challenge_videos v
      where v.id = video_id
        and v.month = public.current_challenge_month()
        and v.user_id <> auth.uid()
        and not v.hidden
    )
  );
create policy "users unlike during the running month" on public.video_likes
  for delete to authenticated using (
    user_id = auth.uid()
    and exists (
      select 1 from public.challenge_videos v
      where v.id = video_id and v.month = public.current_challenge_month()
    )
  );

create or replace function public.video_likes_count()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.challenge_videos set likes_count = likes_count + 1 where id = new.video_id;
  elsif tg_op = 'DELETE' then
    update public.challenge_videos set likes_count = greatest(likes_count - 1, 0) where id = old.video_id;
  end if;
  return null;
end $$;

create trigger video_likes_count
after insert or delete on public.video_likes
for each row execute function public.video_likes_count();

-- Nahlášení nevhodného videa; po 5 nahlášeních se video automaticky skryje
create table public.video_reports (
  video_id    uuid not null references public.challenge_videos (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      text check (char_length(reason) <= 300),
  created_at  timestamptz not null default now(),
  primary key (video_id, reporter_id)
);
alter table public.video_reports enable row level security;
create policy "users report videos" on public.video_reports
  for insert to authenticated with check (reporter_id = auth.uid());

create or replace function public.video_reports_after_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  update public.challenge_videos
     set reports_count = reports_count + 1,
         hidden = hidden or reports_count + 1 >= 5
   where id = new.video_id;
  return null;
end $$;

create trigger video_reports_after_insert
after insert on public.video_reports
for each row execute function public.video_reports_after_insert();

-- Vítězové
create table public.monthly_winners (
  month       date primary key,
  video_id    uuid references public.challenge_videos (id) on delete set null,
  user_id     uuid references public.profiles (id) on delete set null,
  likes       integer not null,
  decided_at  timestamptz not null default now()
);
alter table public.monthly_winners enable row level security;
create policy "winners are public" on public.monthly_winners for select using (true);

-- Vyhlásí vítěze daného měsíce (nejvíc lajků, při shodě dřívější video)
create or replace function public.finalize_challenge_month(p_month date)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  if p_month >= public.current_challenge_month() then
    raise exception 'Month % is still running', p_month;
  end if;
  insert into public.monthly_winners (month, video_id, user_id, likes)
  select v.month, v.id, v.user_id, v.likes_count
    from public.challenge_videos v
   where v.month = p_month and not v.hidden
   order by v.likes_count desc, v.created_at asc
   limit 1
  on conflict (month) do nothing;
end $$;
revoke execute on function public.finalize_challenge_month(date) from public, anon, authenticated;

-- ---------------------------------------------------------------------
--  Tréninková data (synchronizace mezi zařízeními)
-- ---------------------------------------------------------------------
create table public.user_training (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.user_training enable row level security;
create policy "own training data" on public.user_training
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
--  RPC funkce pro aplikaci
-- ---------------------------------------------------------------------

-- Vyhledávání vzpěračů (bez diakritiky, podle jména/příjmení, volitelně podle klubu)
create or replace function public.search_profiles(q text default null, p_club integer default null, p_limit integer default 40)
returns setof public.profiles
language sql stable
set search_path = public
as $$
  select p.*
    from public.profiles p
   where p.is_public
     and (p.first_name <> '' or p.last_name <> '')
     and (p_club is null or p.club_id = p_club)
     and (
       q is null or btrim(q) = ''
       or p.search_text like '%' || lower(public.f_unaccent(btrim(q))) || '%'
     )
   order by p.last_name, p.first_name
   limit least(greatest(p_limit, 1), 100)
$$;

create or replace function public.club_member_counts()
returns table (club_id integer, members bigint)
language sql stable
set search_path = public
as $$
  select club_id, count(*) from public.profiles
   where is_public and club_id is not null
   group by club_id
$$;

create or replace function public.user_stats(p_user uuid)
returns table (videos bigint, likes bigint, wins bigint)
language sql stable security definer
set search_path = public
as $$
  select
    (select count(*) from public.challenge_videos where user_id = p_user and not hidden),
    (select coalesce(sum(likes_count), 0) from public.challenge_videos where user_id = p_user and not hidden),
    (select count(*) from public.monthly_winners where user_id = p_user)
$$;

-- Smazání vlastního účtu (požadavek App Store / Google Play)
create or replace function public.delete_my_account()
returns void language plpgsql security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------
--  Úložiště souborů
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('challenge-videos', 'challenge-videos', true, 83886080,
     array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg'])
on conflict (id) do nothing;

-- soubory se ukládají do složky <user_id>/...
create policy "users upload own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users upload own videos" on storage.objects for insert to authenticated
  with check (bucket_id = 'challenge-videos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own videos" on storage.objects for delete to authenticated
  using (bucket_id = 'challenge-videos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
--  Plánovač: každou hodinu zkusí vyhlásit vítěze minulého měsíce
--  (idempotentní – vítěz se zapíše jen jednou, hned po půlnoci 1. dne).
--  Vyžaduje rozšíření pg_cron (Supabase: Database → Extensions).
-- ---------------------------------------------------------------------
create extension if not exists pg_cron;
select cron.schedule(
  'zvedej-finalize-month',
  '1 * * * *',
  $$ select public.finalize_challenge_month((public.current_challenge_month() - interval '1 month')::date) $$
);

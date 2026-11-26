-- Push notifikace (nový plán od trenéra, komentář k tréninku, nová zpráva) a přehled týmu pro trenéra.
--
-- Oznámení posílá přímo databáze přes rozšíření pg_net do Expo Push API (https://exp.host),
-- takže není potřeba žádná další služba ani tajný klíč. Selhání odeslání nikdy nezablokuje uložení dat.

create extension if not exists pg_net with schema extensions;

/* ------------------------------ Tokeny zařízení ------------------------------ */

create table if not exists public.push_tokens (
  token            text primary key,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  platform         text not null check (platform in ('ios', 'android')),
  lang             text not null default 'cs' check (lang in ('cs', 'sk', 'en')),
  notify_coach     boolean not null default true,
  notify_messages  boolean not null default true,
  updated_at       timestamptz not null default now()
);
create index if not exists push_tokens_user on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
create policy "own push tokens" on public.push_tokens
  for select to authenticated using (user_id = auth.uid());

-- Zařízení může přejít k jinému účtu (odhlášení a přihlášení jiného uživatele) → zápis přes funkci.
create or replace function public.register_push_token(
  p_token text, p_platform text, p_lang text, p_coach boolean, p_messages boolean
) returns void
language sql security definer
set search_path = public
as $$
  insert into public.push_tokens (token, user_id, platform, lang, notify_coach, notify_messages, updated_at)
  values (p_token, auth.uid(), p_platform, coalesce(nullif(p_lang, ''), 'cs'), p_coach, p_messages, now())
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, lang = excluded.lang,
        notify_coach = excluded.notify_coach, notify_messages = excluded.notify_messages, updated_at = now();
$$;
revoke execute on function public.register_push_token(text, text, text, boolean, boolean) from public, anon;
grant execute on function public.register_push_token(text, text, text, boolean, boolean) to authenticated;

create or replace function public.unregister_push_token(p_token text) returns void
language sql security definer
set search_path = public
as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.unregister_push_token(text) to authenticated;

-- nepoužívané tokeny (aplikace smazaná, zařízení vyměněné) po 180 dnech smažeme
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('purge-push-tokens') where exists (select 1 from cron.job where jobname = 'purge-push-tokens');
    perform cron.schedule('purge-push-tokens', '40 3 * * *',
      $q$delete from public.push_tokens where updated_at < now() - interval '180 days'$q$);
  end if;
end $$;

/* ------------------------------ Odeslání ------------------------------ */

-- Pošle oznámení na všechna zařízení uživatele. Nadpis a text jsou {cs, sk, en}.
create or replace function public.send_push(p_user uuid, p_kind text, p_title jsonb, p_body jsonb, p_data jsonb)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  msgs jsonb;
begin
  select jsonb_agg(jsonb_build_object(
           'to', t.token,
           'title', coalesce(p_title ->> t.lang, p_title ->> 'cs'),
           'body', coalesce(p_body ->> t.lang, p_body ->> 'cs'),
           'data', coalesce(p_data, '{}'::jsonb),
           'sound', 'default',
           'channelId', 'social'))
    into msgs
    from public.push_tokens t
   where t.user_id = p_user
     and case p_kind when 'coach' then t.notify_coach when 'message' then t.notify_messages else true end;
  if msgs is null then
    return;
  end if;
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := msgs,
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
  );
exception when others then
  raise warning 'push: %', sqlerrm;
end;
$$;
revoke execute on function public.send_push(uuid, text, jsonb, jsonb, jsonb) from public, anon, authenticated;

create or replace function public.display_name(p_user uuid) returns text
language sql stable security definer
set search_path = public
as $$
  select nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '') from public.profiles where id = p_user;
$$;
revoke execute on function public.display_name(uuid) from public, anon, authenticated;

/* ------------------------------ Spouštěče ------------------------------ */

-- Nový nebo upravený plán od trenéra
create or replace function public.notify_assigned_plan() returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  coach text := coalesce(public.display_name(new.coach_id), 'Trenér');
  plan text := coalesce(new.plan ->> 'name', '');
begin
  if tg_op = 'UPDATE' and old.plan is not distinct from new.plan then
    return new;
  end if;
  perform public.send_push(
    new.athlete_id, 'coach',
    case when tg_op = 'INSERT'
      then jsonb_build_object('cs', 'Nový plán od trenéra', 'sk', 'Nový plán od trénera', 'en', 'New plan from your coach')
      else jsonb_build_object('cs', 'Trenér upravil plán', 'sk', 'Tréner upravil plán', 'en', 'Your coach updated a plan') end,
    jsonb_build_object('cs', coach || ': ' || plan, 'sk', coach || ': ' || plan, 'en', coach || ': ' || plan),
    jsonb_build_object('url', '/plans')
  );
  return new;
end;
$$;
drop trigger if exists assigned_plans_notify on public.assigned_plans;
create trigger assigned_plans_notify after insert or update of plan on public.assigned_plans
  for each row execute function public.notify_assigned_plan();

-- Komentář k tréninku: trenér → svěřenec, svěřenec → jeho trenéři
create or replace function public.notify_workout_comment() returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  author text := coalesce(public.display_name(new.author_id), '');
  snippet text := left(new.body, 140);
  title jsonb := jsonb_build_object('cs', 'Nový komentář k tréninku', 'sk', 'Nový komentár k tréningu', 'en', 'New workout comment');
  body jsonb := jsonb_build_object('cs', author || ': ' || snippet, 'sk', author || ': ' || snippet, 'en', author || ': ' || snippet);
  c record;
begin
  if new.author_id = new.athlete_id then
    for c in select coach_id from public.coach_links where athlete_id = new.athlete_id and status = 'accepted' loop
      perform public.send_push(c.coach_id, 'coach', title, body,
        jsonb_build_object('url', '/team/log?athlete=' || new.athlete_id || '&log=' || new.log_id));
    end loop;
  else
    perform public.send_push(new.athlete_id, 'coach', title, body, jsonb_build_object('url', '/log/' || new.log_id));
  end if;
  return new;
end;
$$;
drop trigger if exists workout_comments_notify on public.workout_comments;
create trigger workout_comments_notify after insert on public.workout_comments
  for each row execute function public.notify_workout_comment();

-- Nová zpráva
create or replace function public.notify_message() returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  sender text := coalesce(public.display_name(new.sender_id), 'Zvedej');
  snippet text := left(new.body, 140);
begin
  perform public.send_push(new.recipient_id, 'message',
    jsonb_build_object('cs', sender, 'sk', sender, 'en', sender),
    jsonb_build_object('cs', snippet, 'sk', snippet, 'en', snippet),
    jsonb_build_object('url', '/chat/' || new.sender_id));
  return new;
end;
$$;
drop trigger if exists messages_notify on public.messages;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_message();

/* ------------------------------ Přehled týmu ------------------------------ */

-- coach_team navíc vrací dny v týdnu, kdy má svěřenec podle aktivního plánu trénovat (0 = pondělí),
-- aby trenér viděl, kdo vynechal plánovaný trénink.
drop function if exists public.coach_team();
create or replace function public.coach_team()
returns table (
  athlete_id uuid,
  status text,
  share_bodyweight boolean,
  created_at timestamptz,
  profile jsonb,
  maxes jsonb,
  recent_logs jsonb,
  recent_wellness jsonb,
  plan_weekdays jsonb
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
         ), '[]'::jsonb) else '[]'::jsonb end,
         case when l.status = 'accepted' and coalesce((t.data ->> 'wellnessShareCoach')::boolean, false) then coalesce((
           select jsonb_agg(w)
             from jsonb_array_elements(t.data -> 'wellness') w
            where (w ->> 'date') >= to_char(current_date - 14, 'YYYY-MM-DD')
         ), '[]'::jsonb) else '[]'::jsonb end,
         case when l.status = 'accepted' then coalesce((
           select jsonb_agg(distinct (wd)::int)
             from jsonb_array_elements(t.data -> 'plans') pl,
                  jsonb_array_elements(pl -> 'days') d,
                  jsonb_array_elements_text(d -> 'weekdays') wd
            where pl ->> 'status' = 'active'
              and (pl ->> 'startDate') <= to_char(current_date, 'YYYY-MM-DD')
              and (pl ->> 'endDate' is null or (pl ->> 'endDate') >= to_char(current_date, 'YYYY-MM-DD'))
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

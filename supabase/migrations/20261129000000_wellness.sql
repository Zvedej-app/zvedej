-- =====================================================================
--  Deník regenerace (spánek, energie, svaly, nálada, bolest) je uložen
--  v tréninkových datech uživatele (user_training.data.wellness).
--  Jde o údaje o zdraví (GDPR čl. 9) – zpracovávají se jen s výslovným souhlasem
--  (data.wellnessConsentAt) a trenér je vidí jen se zvláštním souhlasem
--  (data.wellnessShareCoach = true). Jinak je databáze trenérovi odstraní.
-- =====================================================================

create or replace function public.strip_for_coach(p_data jsonb, p_share_bodyweight boolean)
returns jsonb language sql immutable
as $$
  select case
    when p_data is null then null
    else
      (case when p_share_bodyweight then p_data else public.strip_bodyweight(p_data) end)
      - case when coalesce((p_data ->> 'wellnessShareCoach')::boolean, false) then '__none__' else 'wellness' end
  end
$$;

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
  return public.strip_for_coach(v_data, v_share);
end $$;

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
  recent_wellness jsonb
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
         -- regenerace jen se souhlasem svěřence, posledních 14 dní
         case when l.status = 'accepted' and coalesce((t.data ->> 'wellnessShareCoach')::boolean, false) then coalesce((
           select jsonb_agg(w)
             from jsonb_array_elements(t.data -> 'wellness') w
            where (w ->> 'date') >= to_char(current_date - 14, 'YYYY-MM-DD')
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

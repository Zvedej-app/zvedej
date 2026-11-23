-- =====================================================================
--  Přátelé a soukromé zprávy
-- =====================================================================

-- Žádosti o přátelství: requester → addressee, po přijetí status = 'accepted'
create table public.friendships (
  requester_id  uuid not null references public.profiles (id) on delete cascade,
  addressee_id  uuid not null references public.profiles (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
-- jedna dvojice = jeden vztah bez ohledu na směr
create unique index friendships_pair on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee on public.friendships (addressee_id, status);

alter table public.friendships enable row level security;
create policy "see own friendships" on public.friendships
  for select to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "send friend request" on public.friendships
  for insert to authenticated with check (requester_id = auth.uid() and status = 'pending');
create policy "accept friend request" on public.friendships
  for update to authenticated using (addressee_id = auth.uid()) with check (addressee_id = auth.uid() and status = 'accepted');
create policy "remove friendship" on public.friendships
  for delete to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
     where f.status = 'accepted'
       and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  )
$$;

-- Soukromé zprávy
create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references public.profiles (id) on delete cascade,
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  body          text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at    timestamptz not null default now(),
  read_at       timestamptz,
  check (sender_id <> recipient_id)
);
create index messages_thread on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index messages_recipient_unread on public.messages (recipient_id) where read_at is null;

-- Ochrana před spamem: nepřátelům lze poslat nejvýše 3 zprávy, než příjemce odpoví
create or replace function public.messages_before_insert()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  new.created_at := now();
  new.read_at := null;
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

create trigger messages_before_insert
before insert on public.messages
for each row execute function public.messages_before_insert();

alter table public.messages enable row level security;
create policy "see own messages" on public.messages
  for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "send messages" on public.messages
  for insert to authenticated with check (sender_id = auth.uid());
create policy "mark received messages as read" on public.messages
  for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- měnit lze jen read_at
create or replace function public.messages_only_read_at()
returns trigger language plpgsql
as $$
begin
  if new.sender_id <> old.sender_id or new.recipient_id <> old.recipient_id or new.body <> old.body or new.created_at <> old.created_at then
    raise exception 'Only read_at can be changed';
  end if;
  return new;
end $$;
create trigger messages_only_read_at
before update on public.messages
for each row execute function public.messages_only_read_at();

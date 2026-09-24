-- =====================================================================
-- The Objective Ledger (TOL-OS) — Household Dashboard schema
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- Design rules this schema enforces, taken from the framework docs:
--   * A household has at most two members (seat 'a' and seat 'b').
--   * Each person belongs to at most one household.
--   * Saturation checks (WP-02) can only be written by the person they
--     describe: user_id must equal the signed-in user. (wp02-asi-matrix.md,
--     hierarchy-matrix.md "Explicit exclusions")
--   * Nervous-system state check-ins are private to the person who logs
--     them; not even their household partner can read them.
--   * Everything else (register, ownership treaty, weekly closings) is
--     shared equally by both members.
-- =====================================================================

-- ---------- tables ----------

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  seat         text not null check (seat in ('a', 'b')),
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (household_id, seat),
  unique (user_id)
);

create table public.weeks (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  week_start   date not null,
  closed_at    timestamptz,
  closing_note text check (char_length(closing_note) <= 2000),
  snapshot     jsonb,  -- {wb, oc, as, solvency} frozen when the week is closed
  created_at   timestamptz not null default now(),
  unique (household_id, week_start)
);

create table public.ledger_items (
  id           uuid primary key default gen_random_uuid(),
  week_id      uuid not null references public.weeks(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  task         text not null default '' check (char_length(task) <= 120),
  hours_a      numeric(5,1) not null default 0 check (hours_a between 0 and 168),
  hours_b      numeric(5,1) not null default 0 check (hours_b between 0 and 168),
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

create table public.raci_tasks (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references public.households(id) on delete cascade,
  task             text not null default '' check (char_length(task) <= 120),
  frequency        text not null default '' check (char_length(frequency) <= 40),
  responsible_seat text check (responsible_seat in ('a', 'b')),
  accountable_seat text check (accountable_seat in ('a', 'b')),
  position         integer not null default 0,
  created_at       timestamptz not null default now()
);

create table public.asi_entries (
  id            uuid primary key default gen_random_uuid(),
  week_id       uuid not null references public.weeks(id) on delete cascade,
  household_id  uuid not null references public.households(id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sleep         smallint not null check (sleep between 0 and 4),
  workload      smallint not null check (workload between 0 and 4),
  conflict      smallint not null check (conflict between 0 and 4),
  physical      smallint not null check (physical between 0 and 4),
  time_pressure smallint not null check (time_pressure between 0 and 4),
  updated_at    timestamptz not null default now(),
  unique (week_id, user_id)
);

create table public.state_checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  state      text not null check (state in ('ventral', 'sympathetic', 'dorsal')),
  note       text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index on public.ledger_items (week_id);
create index on public.raci_tasks (household_id);
create index on public.asi_entries (week_id);
create index on public.state_checkins (user_id, created_at desc);

-- ---------- helper ----------

create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

-- ---------- row-level security ----------

alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.weeks             enable row level security;
alter table public.ledger_items      enable row level security;
alter table public.raci_tasks        enable row level security;
alter table public.asi_entries       enable row level security;
alter table public.state_checkins    enable row level security;

-- Signed-out visitors get nothing.
revoke all on public.households, public.household_members, public.weeks,
  public.ledger_items, public.raci_tasks, public.asi_entries,
  public.state_checkins from anon;

-- households: members can read and rename; creation only via create_household().
revoke insert, update, delete on public.households from authenticated;
grant update (name) on public.households to authenticated;

create policy "members read household" on public.households
  for select to authenticated using (public.is_household_member(id));
create policy "members rename household" on public.households
  for update to authenticated
  using (public.is_household_member(id)) with check (public.is_household_member(id));

-- household_members: members see each other; each person may edit only their
-- own display name. Joining and leaving go through the functions below.
revoke insert, update, delete on public.household_members from authenticated;
grant update (display_name) on public.household_members to authenticated;

create policy "members read members" on public.household_members
  for select to authenticated using (public.is_household_member(household_id));
create policy "edit own display name" on public.household_members
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- weeks: shared by the household.
create policy "members read weeks" on public.weeks
  for select to authenticated using (public.is_household_member(household_id));
create policy "members add weeks" on public.weeks
  for insert to authenticated with check (public.is_household_member(household_id));
create policy "members update weeks" on public.weeks
  for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ledger_items: shared register (the Lemonade Stand).
create policy "members read ledger" on public.ledger_items
  for select to authenticated using (public.is_household_member(household_id));
create policy "members add ledger" on public.ledger_items
  for insert to authenticated with check (
    public.is_household_member(household_id)
    and exists (select 1 from public.weeks w
                where w.id = week_id and w.household_id = ledger_items.household_id)
  );
create policy "members update ledger" on public.ledger_items
  for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy "members delete ledger" on public.ledger_items
  for delete to authenticated using (public.is_household_member(household_id));

-- raci_tasks: shared ownership treaty (WP-03).
create policy "members read raci" on public.raci_tasks
  for select to authenticated using (public.is_household_member(household_id));
create policy "members add raci" on public.raci_tasks
  for insert to authenticated with check (public.is_household_member(household_id));
create policy "members update raci" on public.raci_tasks
  for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy "members delete raci" on public.raci_tasks
  for delete to authenticated using (public.is_household_member(household_id));

-- asi_entries: readable by the household, writable only by the person described.
create policy "members read asi" on public.asi_entries
  for select to authenticated using (public.is_household_member(household_id));
create policy "write own asi" on public.asi_entries
  for insert to authenticated with check (
    user_id = auth.uid()
    and public.is_household_member(household_id)
    and exists (select 1 from public.weeks w
                where w.id = week_id and w.household_id = asi_entries.household_id)
  );
create policy "update own asi" on public.asi_entries
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own asi" on public.asi_entries
  for delete to authenticated using (user_id = auth.uid());

-- state_checkins: private to the person who logged them.
create policy "own checkins only" on public.state_checkins
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- functions (household membership & account deletion) ----------

create or replace function public.create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid  uuid;
  code text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'You already belong to a household';
  end if;

  loop
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    code := substr(code, 1, 5) || '-' || substr(code, 6, 5);
    exit when not exists (select 1 from households where invite_code = code);
  end loop;

  insert into households (name, invite_code, created_by)
  values (trim(p_name), code, auth.uid())
  returning id into hid;

  insert into household_members (household_id, user_id, display_name, seat)
  values (hid, auth.uid(), trim(p_display_name), 'a');

  return hid;
end;
$$;

create or replace function public.join_household(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid       uuid;
  free_seat text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'You already belong to a household';
  end if;

  select id into hid from households
  where invite_code = upper(trim(p_code))
  for update;

  if hid is null then
    raise exception 'That invite code does not match a household';
  end if;

  select s into free_seat
  from unnest(array['a', 'b']) as s
  where s not in (select seat from household_members where household_id = hid)
  order by s
  limit 1;

  if free_seat is null then
    raise exception 'That household already has two members';
  end if;

  insert into household_members (household_id, user_id, display_name, seat)
  values (hid, auth.uid(), trim(p_display_name), free_seat);

  return hid;
end;
$$;

create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  select household_id into hid from household_members where user_id = auth.uid();
  if hid is null then
    return;
  end if;

  delete from asi_entries where user_id = auth.uid() and household_id = hid;
  delete from household_members where user_id = auth.uid();

  if not exists (select 1 from household_members where household_id = hid) then
    delete from households where id = hid;
  end if;
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  perform public.leave_household();
  delete from state_checkins where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.is_household_member(uuid)       from public, anon;
revoke execute on function public.create_household(text, text)    from public, anon;
revoke execute on function public.join_household(text, text)      from public, anon;
revoke execute on function public.leave_household()               from public, anon;
revoke execute on function public.delete_my_account()             from public, anon;

grant execute on function public.is_household_member(uuid)        to authenticated;
grant execute on function public.create_household(text, text)     to authenticated;
grant execute on function public.join_household(text, text)       to authenticated;
grant execute on function public.leave_household()                to authenticated;
grant execute on function public.delete_my_account()              to authenticated;

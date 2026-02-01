-- ═══════════════════════════════════════════════════════════════
--  DropIn MVP — Supabase Schema Migration
--
--  Tables:  events · check_ins · giveaways
--
--  Design decisions:
--    • wallet_address is stored as citext (case-insensitive text)
--      so 0xAa... and 0xaa... always match — avoids the #1
--      duplicate-checkin bug in every wallet-based app.
--    • check_ins has a UNIQUE(event_id, wallet_address) constraint
--      enforced at the DB level, not just in app code.
--    • events.is_locked is flipped to TRUE by a trigger when a
--      giveaway row is inserted — no app-level race condition.
--    • All timestamps are timestamptz (UTC).
--    • RLS is on for every table. Policies use auth.jwt() to
--      extract the wallet from the Supabase JWT (set during
--      wallet-based auth or a custom JWT).
-- ═══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────
--  0. Extensions
-- ─────────────────────────────────────────────────────────────

create extension if not exists citext with schema public;


-- ─────────────────────────────────────────────────────────────
--  1. EVENTS
-- ─────────────────────────────────────────────────────────────

create table public.events (
  id            uuid        primary key default gen_random_uuid(),
  chain_event_id bigint     not null,          -- matches on-chain eventId
  title         text        not null,
  description   text,
  organizer     citext      not null,          -- wallet address
  max_attendees int,                           -- null = unlimited
  is_locked     boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint events_chain_event_id_unique unique (chain_event_id),
  constraint events_organizer_format      check  (organizer ~ '^0x[a-fA-F0-9]{40}$')
);

-- Fast lookup by organizer
create index idx_events_organizer on public.events (organizer);

comment on table  public.events is 'Off-chain event metadata. chain_event_id links to the on-chain DropInGiveaway contract.';
comment on column public.events.is_locked is 'Auto-set to TRUE when a giveaway is executed. Blocks new check-ins.';


-- ─────────────────────────────────────────────────────────────
--  2. CHECK_INS  (gasless attendee registration)
-- ─────────────────────────────────────────────────────────────

create table public.check_ins (
  id             uuid        primary key default gen_random_uuid(),
  event_id       uuid        not null references public.events(id) on delete cascade,
  wallet_address citext      not null,
  checked_in_at  timestamptz not null default now(),

  -- ★ Core constraint: one wallet per event
  constraint check_ins_one_per_event unique (event_id, wallet_address),
  constraint check_ins_wallet_format check  (wallet_address ~ '^0x[a-fA-F0-9]{40}$')
);

-- Indexes for common queries
create index idx_check_ins_event   on public.check_ins (event_id);
create index idx_check_ins_wallet  on public.check_ins (wallet_address);

comment on table public.check_ins is 'Gasless attendee check-ins stored off-chain. Synced to on-chain registerAttendee by the backend.';


-- ─────────────────────────────────────────────────────────────
--  3. GIVEAWAYS
-- ─────────────────────────────────────────────────────────────

create table public.giveaways (
  id             uuid        primary key default gen_random_uuid(),
  event_id       uuid        not null references public.events(id) on delete cascade,
  winner_count   int         not null,
  winners        citext[]    not null default '{}',   -- populated after on-chain draw
  tx_hash        text,                                -- on-chain transaction hash
  executed_at    timestamptz,
  created_at     timestamptz not null default now(),

  -- One giveaway per event
  constraint giveaways_one_per_event unique (event_id),
  constraint giveaways_winner_count  check  (winner_count > 0)
);

comment on table public.giveaways is 'Giveaway execution record. Created when organizer triggers draw; winners + tx_hash filled after on-chain confirmation.';


-- ─────────────────────────────────────────────────────────────
--  4. AUTO-LOCK TRIGGER
--     When a giveaway row is inserted, lock the parent event
--     so no more check-ins are accepted.
-- ─────────────────────────────────────────────────────────────

create or replace function public.fn_lock_event_on_giveaway()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.events
     set is_locked   = true,
         updated_at  = now()
   where id = new.event_id;
  return new;
end;
$$;

create trigger trg_lock_event_on_giveaway
  after insert on public.giveaways
  for each row
  execute function public.fn_lock_event_on_giveaway();


-- ─────────────────────────────────────────────────────────────
--  5. CHECK-IN GUARD TRIGGER
--     Reject inserts into check_ins if the event is locked.
-- ─────────────────────────────────────────────────────────────

create or replace function public.fn_block_checkin_if_locked()
returns trigger
language plpgsql
security definer
as $$
declare
  v_locked boolean;
begin
  select is_locked into v_locked
    from public.events
   where id = new.event_id;

  if v_locked then
    raise exception 'Event is locked — giveaway already executed'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger trg_block_checkin_if_locked
  before insert on public.check_ins
  for each row
  execute function public.fn_block_checkin_if_locked();


-- ─────────────────────────────────────────────────────────────
--  6. UPDATED_AT AUTO-TOUCH
-- ─────────────────────────────────────────────────────────────

create or replace function public.fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_events_updated_at
  before update on public.events
  for each row
  execute function public.fn_set_updated_at();


-- ─────────────────────────────────────────────────────────────
--  7. HELPER VIEW — attendee count per event
-- ─────────────────────────────────────────────────────────────

create or replace view public.v_event_summary as
select
  e.id,
  e.chain_event_id,
  e.title,
  e.description,
  e.organizer,
  e.max_attendees,
  e.is_locked,
  e.created_at,
  coalesce(c.attendee_count, 0) as attendee_count,
  g.id is not null               as giveaway_executed,
  g.winner_count,
  g.winners,
  g.tx_hash
from public.events e
left join lateral (
  select count(*)::int as attendee_count
    from public.check_ins ci
   where ci.event_id = e.id
) c on true
left join public.giveaways g on g.event_id = e.id;


-- ═══════════════════════════════════════════════════════════════
--  8. ROW LEVEL SECURITY
--
--  JWT claim used: auth.jwt()->>'wallet_address'
--  Set this claim when issuing the Supabase JWT during
--  wallet-based sign-in (e.g. SIWE → edge function → custom JWT).
-- ═══════════════════════════════════════════════════════════════

-- ── Enable RLS ──────────────────────────────────────────────

alter table public.events    enable row level security;
alter table public.check_ins enable row level security;
alter table public.giveaways enable row level security;


-- ── EVENTS policies ─────────────────────────────────────────

-- Anyone authenticated can read events
create policy "events_select_authenticated"
  on public.events for select
  to authenticated
  using (true);

-- Only the organizer can create their own events
create policy "events_insert_organizer"
  on public.events for insert
  to authenticated
  with check (
    lower(organizer) = lower(auth.jwt()->>'wallet_address')
  );

-- Only the organizer can update their own events
create policy "events_update_organizer"
  on public.events for update
  to authenticated
  using (
    lower(organizer) = lower(auth.jwt()->>'wallet_address')
  )
  with check (
    lower(organizer) = lower(auth.jwt()->>'wallet_address')
  );

-- Organizers can delete only their own events (if not locked)
create policy "events_delete_organizer"
  on public.events for delete
  to authenticated
  using (
    lower(organizer) = lower(auth.jwt()->>'wallet_address')
    and is_locked = false
  );


-- ── CHECK_INS policies ─────────────────────────────────────

-- Attendees can read their own check-ins
create policy "checkins_select_own"
  on public.check_ins for select
  to authenticated
  using (
    lower(wallet_address) = lower(auth.jwt()->>'wallet_address')
  );

-- Organizers can read all check-ins for their events
create policy "checkins_select_organizer"
  on public.check_ins for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
       where e.id = event_id
         and lower(e.organizer) = lower(auth.jwt()->>'wallet_address')
    )
  );

-- Any authenticated wallet can check itself in (gasless)
create policy "checkins_insert_self"
  on public.check_ins for insert
  to authenticated
  with check (
    lower(wallet_address) = lower(auth.jwt()->>'wallet_address')
  );


-- ── GIVEAWAYS policies ─────────────────────────────────────

-- Anyone authenticated can read giveaway results
create policy "giveaways_select_authenticated"
  on public.giveaways for select
  to authenticated
  using (true);

-- Only the organizer of the event can create a giveaway
create policy "giveaways_insert_organizer"
  on public.giveaways for insert
  to authenticated
  with check (
    exists (
      select 1 from public.events e
       where e.id = event_id
         and lower(e.organizer) = lower(auth.jwt()->>'wallet_address')
    )
  );

-- Only the organizer can update (to fill in winners/tx_hash after on-chain confirmation)
create policy "giveaways_update_organizer"
  on public.giveaways for update
  to authenticated
  using (
    exists (
      select 1 from public.events e
       where e.id = event_id
         and lower(e.organizer) = lower(auth.jwt()->>'wallet_address')
    )
  );

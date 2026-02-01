# DropIn Giveaway — On-Chain Giveaway Draws on Base

A mini-app for running verifiable on-chain giveaway draws at events.
Built with Next.js 15, OnchainKit, Wagmi, Supabase, and Frog (Farcaster Frames).

**Contract:** `0xAA49d591b259324671792C8f972486403895Ff9b` on Base mainnet.

---

## Architecture

```
┌─────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  Attendee   │────▶│  /event/[eventId]    │────▶│  Supabase    │
│  (phone)    │     │  Check-in page       │     │  check_ins   │
└─────────────┘     └─────────────────────┘     └──────────────┘
                                                       │
┌─────────────┐     ┌─────────────────────┐     ┌──────┴───────┐
│  Organizer  │────▶│  /giveaway           │────▶│  Base L2     │
│  (laptop)   │     │  Dashboard           │     │  Contract    │
└─────────────┘     └─────────────────────┘     └──────────────┘
                                                       │
┌─────────────┐     ┌─────────────────────┐            │
│  Farcaster  │────▶│  /api/frame          │────────────┘
│  user       │     │  Frog Frame          │  (reads logs)
└─────────────┘     └─────────────────────┘
```

**Hybrid model:** Check-ins are gasless (Supabase only). The giveaway
draw itself happens on-chain for verifiability. The Farcaster Frame
reads winner data directly from Base event logs.

---

## Pages

| Route | Purpose |
|---|---|
| `/` | Redirects to `/giveaway` |
| `/giveaway` | Organizer dashboard — create events, view attendees, draw winners |
| `/event/[eventId]` | Attendee check-in — scan QR, connect wallet, check in |
| `/api/frame` | Farcaster Frame — view giveaway results |

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/events` | `POST` | Create event in Supabase |
| `/api/events` | `GET` | Get event by `chainEventId` or `organizer` |
| `/api/checkins` | `POST` | Gasless attendee check-in |
| `/api/checkins` | `GET` | List attendees for an event |
| `/api/giveaways` | `POST` | Create pending giveaway (locks event) |
| `/api/giveaways` | `PATCH` | Finalize with winners + tx hash |
| `/api/giveaways` | `GET` | Get giveaway result for an event |

---

## Setup

### 1. Install dependencies

```bash
cd dropin-giveaway
npm install
```

### 2. Environment variables

Already configured in `.env.local`:

```
NEXT_PUBLIC_ONCHAINKIT_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=https://wlklxhdsgzqlcmrodhld.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Supabase schema

If you haven't run the migration yet, execute `migration.sql` in
Supabase SQL Editor. If you already ran it, apply this **patch** to
add the missing columns to the view:

```sql
-- PATCH: add description + max_attendees to the summary view
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
```

### 4. Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Testing Guide

### Organizer Flow

1. **Open the dashboard** at `/giveaway`
2. **Connect wallet** (must be the organizer of the event)
3. **Enter event ID** (e.g. `1`) in the input field
   - If event doesn't exist on-chain → click "Create Event On-Chain"
   - This sends a `createEvent(1)` transaction, then saves to Supabase
4. **Switch to Attendees tab** — should show empty state initially
5. **Copy the check-in link** from the Overview tab
   - Share with attendees: `https://yourdomain.com/event/1`
6. **Watch attendees appear** as they check in (refresh page)
7. **Switch to Draw tab**:
   - Confirm attendee count matches expectations
   - Enter winner count (e.g. `2`)
   - Click **Run Giveaway**
   - Approve the on-chain transaction in your wallet
   - Watch the winner reveal animation
8. **Verify winners saved** — Overview tab shows winners + BaseScan link

### Attendee Flow

1. **Scan QR** or open `/event/1` directly
2. **Connect wallet** via Coinbase Wallet / Smart Wallet
3. **Click "Check In →"** — gasless, no gas fee
4. **See success state** — "You're in!"
5. **Try checking in again** — should show "Already checked in" state
6. **Try after giveaway drawn** — should show "Event closed" state

### Farcaster Frame

1. Share `https://yourdomain.com/api/frame` in a Farcaster cast
2. Frame shows landing with event ID input
3. Enter event ID → "View Results"
4. If not drawn → shows pending state with attendee count
5. If drawn → shows winner list with addresses + BaseScan link

### Contract Verification

The contract is deployed on **Base mainnet**. To verify:

1. Open [BaseScan](https://basescan.org/address/0xAA49d591b259324671792C8f972486403895Ff9b#events)
2. Check the **Events** tab for:
   - `EventCreated(uint256 indexed eventId, address indexed organizer)`
   - `AttendeeRegistered(uint256 indexed eventId, address indexed attendee, uint256 attendeeCount)`
   - `GiveawayWinners(uint256 indexed eventId, address[] winners)`
3. Verify the contract address matches across:
   - `lib/calls.ts` → `DROP_IN_GIVEAWAY_ADDRESS`
   - `app/api/frame/[[...routes]]/route.ts` → `CONTRACT`

### Data Consistency Checks

After running through both flows:

| Check | Where |
|---|---|
| Event exists on-chain | BaseScan → Events tab → `EventCreated` |
| Event exists in Supabase | Supabase → Table Editor → `events` |
| Attendees on-chain | BaseScan → `AttendeeRegistered` events |
| Attendees in Supabase | Supabase → `check_ins` table |
| Winners on-chain | BaseScan → `GiveawayWinners` event |
| Winners in Supabase | Supabase → `giveaways` table |
| Event locked after draw | Supabase → `events.is_locked = true` |

---

## File Structure

```
dropin-giveaway/
├── app/
│   ├── api/
│   │   ├── checkins/route.ts      ← Gasless check-in API
│   │   ├── events/route.ts        ← Event CRUD API
│   │   ├── frame/[[...routes]]/   ← Farcaster Frame (Frog)
│   │   │   └── route.ts
│   │   └── giveaways/route.ts     ← Giveaway lifecycle API
│   ├── event/[eventId]/
│   │   └── page.tsx               ← Attendee check-in page
│   ├── giveaway/
│   │   └── page.tsx               ← Organizer dashboard
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   ← Redirect → /giveaway
├── lib/
│   ├── api.ts                     ← Frontend fetch client
│   ├── calls.ts                   ← On-chain call builders + ABI
│   ├── database.types.ts
│   ├── providers.tsx              ← Wagmi + OnchainKit + RQ
│   ├── supabase-server.ts         ← Service role client
│   ├── supabase.ts                ← DB operations reference
│   └── wagmi.ts                   ← Wagmi config for Base
├── migration.sql                  ← Full Supabase schema
├── .env.local
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Known Limitations (MVP)

- **No SIWE auth** — API routes use service role key. Wallet address
  comes from request body. For production, add SIWE → Supabase JWT.
- **No real-time updates** — attendee list requires page refresh.
  Add Supabase Realtime for live updates.
- **Frame shows max 8 winners** — OG image space is limited.
  Links to BaseScan for full list.
- **Contract is on Base mainnet** — transactions require real
  ETH on Base for gas.

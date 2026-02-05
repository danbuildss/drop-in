# DropIn — On-Chain Giveaway Draws

A premium Web3 app for running verifiable on-chain giveaway draws at IRL events.
Built with Next.js 15, Privy Auth, Supabase, and deployed on Base.

## What's New in v0.2.0

- **Auth**: Replaced OnchainKit/Wagmi with Privy. Supports MetaMask, Coinbase Wallet, WalletConnect, email, and Google login.
- **Landing Page**: New premium dark mode landing page with hero, 3-step explainer, and Privy login CTA.
- **Dashboard**: Completely redesigned with sidebar navigation, stat cards, event creation form, and event list.
- **Check-in Page**: Mobile-first redesign with success animations and cleaner UX.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Auth**: Privy (@privy-io/react-auth)
- **Database**: Supabase (PostgreSQL)
- **Smart Contract**: Base L2
- **Styling**: CSS-in-JS with CSS variables
- **Icons**: Lucide React

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero and CTA |
| `/giveaway` | Organizer dashboard |
| `/giveaway/event/[eventId]` | Event management (attendees, run draw) |
| `/event/[eventId]` | Attendee check-in page |
| `/api/frame` | Farcaster Frame |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Update `.env.local`:

```bash
# Privy - Get from https://dashboard.privy.io
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id

# WalletConnect - Get from https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Run Supabase migration

If not already done, run `migration.sql` in the Supabase SQL Editor.

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
dropin-giveaway/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── layout.tsx               # Root layout with Privy
│   ├── globals.css              # Design tokens
│   ├── giveaway/
│   │   ├── page.tsx             # Dashboard
│   │   └── event/[eventId]/     # Event management
│   ├── event/[eventId]/         # Check-in page
│   └── api/                     # API routes (unchanged)
├── components/
│   ├── Sidebar.tsx              # Dashboard sidebar
│   └── DashboardLayout.tsx      # Dashboard wrapper
├── lib/
│   ├── providers.tsx            # Privy + React Query
│   ├── api.ts                   # API client
│   ├── calls.ts                 # Contract ABIs
│   └── ...
└── ...
```

## Design System

Colors (CSS variables in globals.css):

- `--bg-base`: #0a0f1e (dark navy)
- `--bg-surface`: #111827
- `--bg-elevated`: #1f2937
- `--amber`: #d97706 (accent)
- `--green`: #10b981 (success)
- `--red`: #ef4444 (error)

## Privy Configuration

Privy is configured in `lib/providers.tsx` with:

- Dark theme with amber accent
- Wallet-first login
- Login methods: wallet, email, google
- Embedded wallet creation for non-crypto users
- Base network as default chain

## Contract

**Address**: `0xAA49d591b259324671792C8f972486403895Ff9b`  
**Chain**: Base mainnet

Functions:
- `createEvent(uint256 eventId)`
- `registerAttendee(uint256 eventId, address attendee)`
- `runGiveaway(uint256 eventId, uint256 winnerCount)`

## API Routes

All API routes remain unchanged from v0.1.0:

- `POST /api/events` - Create event
- `GET /api/events` - Get event(s)
- `POST /api/checkins` - Check in attendee
- `GET /api/checkins` - List attendees
- `POST /api/giveaways` - Create giveaway
- `PATCH /api/giveaways` - Finalize with winners
- `GET /api/giveaways` - Get giveaway result

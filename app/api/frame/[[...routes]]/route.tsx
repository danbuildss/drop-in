// ─────────────────────────────────────────────────────────────
//  app/api/frame/[[...routes]]/route.ts
//
//  Farcaster Frame powered by frog.fm
//  Hosted inside the existing Next.js app via catch-all route.
//
//  Flow:
//    / (initial)  → Text input for event ID → "View Results"
//    /results     → Reads on-chain data from Base:
//                   1. getEvent(eventId) for organizer + status
//                   2. getLogs for GiveawayWinners event
//                   3. Supabase fallback for event title
//                   Renders a styled OG image with winners
//
//  How on-chain data is fetched:
//    We create a viem publicClient connected to Base mainnet.
//    - readContract() calls getEvent() to confirm the giveaway
//      was executed and to get attendee count.
//    - getLogs() scans the contract for the GiveawayWinners
//      event filtered by the indexed eventId topic. This returns
//      the winner addresses array from the event's non-indexed
//      data field.
//    - If no logs are found (event not drawn yet), we show a
//      "pending" frame state instead.
//    All reads are free RPC calls — no gas, no wallet needed.
// ─────────────────────────────────────────────────────────────

/** @jsxImportSource frog/jsx */
import { Frog, Button, TextInput } from "frog";
import { handle } from "frog/next";
import {
  createPublicClient,
  http,
  parseAbiItem,
  type Address,
} from "viem";
import { base } from "viem/chains";

// ── Contract config ──────────────────────────────────────────

const CONTRACT: Address =
  "0xAA49d591b259324671792C8f972486403895Ff9b";

const GET_EVENT_ABI = [
  {
    type: "function",
    name: "getEvent",
    stateMutability: "view",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [
      { name: "organizer", type: "address" },
      { name: "attendeeCount", type: "uint256" },
      { name: "giveawayExecuted", type: "bool" },
    ],
  },
] as const;

const GIVEAWAY_WINNERS_EVENT = parseAbiItem(
  "event GiveawayWinners(uint256 indexed eventId, address[] winners)"
);

// ── Viem client (read-only, no wallet) ───────────────────────

const client = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

// ── Supabase URL for title lookup (optional enrichment) ──────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchEventTitle(
  chainEventId: number
): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/events?chain_event_id=eq.${chainEventId}&select=title`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) return rows[0].title;
  } catch {}
  return null;
}

// ── Helpers ───────────────────────────────────────────────────

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ── Frog app ─────────────────────────────────────────────────

const app = new Frog({
  basePath: "/api/frame",
  title: "DropIn Giveaway Results",
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Frame 1: Landing — enter event ID
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.frame("/", (c) => {
  return c.res({
    image: (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(145deg, #0c0c0e 0%, #1a1508 100%)",
          color: "#e8e6e1",
          fontFamily: "monospace",
          padding: "40px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #d97706, #fbbf24, #d97706)",
            marginBottom: "24px",
            fontSize: "36px",
          }}
        >
          🎰
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "32px",
            fontWeight: 700,
            marginBottom: "12px",
            color: "#e8e6e1",
          }}
        >
          DropIn Giveaway
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "18px",
            color: "#8a8880",
          }}
        >
          Enter an event ID to view winners
        </div>
      </div>
    ),
    intents: [
      <TextInput placeholder="Event ID (e.g. 1)" />,
      <Button action="/results">View Results</Button>,
    ],
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Frame 2: Results — fetch on-chain data, display winners
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

app.frame("/results", async (c) => {
  const eventIdRaw = c.inputText ?? "";
  const eventId = parseInt(eventIdRaw, 10);

  // ── Invalid input ─────────────────────────────────────────
  if (isNaN(eventId) || eventId <= 0) {
    return c.res({
      image: (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "#0c0c0e",
            color: "#ef4444",
            fontFamily: "monospace",
            padding: "40px",
          }}
        >
          <div style={{ display: "flex", fontSize: "48px", marginBottom: "16px" }}>
            ❌
          </div>
          <div style={{ display: "flex", fontSize: "24px", fontWeight: 600 }}>
            Invalid Event ID
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "16px",
              color: "#8a8880",
              marginTop: "8px",
            }}
          >
            Please enter a valid number
          </div>
        </div>
      ),
      intents: [
        <TextInput placeholder="Event ID (e.g. 1)" />,
        <Button action="/results">Try Again</Button>,
        <Button action="/">← Back</Button>,
      ],
    });
  }

  // ── Read on-chain event data ──────────────────────────────
  try {
    const [organizer, attendeeCount, giveawayExecuted] =
      (await client.readContract({
        address: CONTRACT,
        abi: GET_EVENT_ABI,
        functionName: "getEvent",
        args: [BigInt(eventId)],
      })) as [Address, bigint, boolean];

    // Check if event exists
    if (organizer === "0x0000000000000000000000000000000000000000") {
      return c.res({
        image: (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              background: "#0c0c0e",
              color: "#8a8880",
              fontFamily: "monospace",
              padding: "40px",
            }}
          >
            <div style={{ display: "flex", fontSize: "48px", marginBottom: "16px" }}>
              📭
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "24px",
                fontWeight: 600,
                color: "#e8e6e1",
              }}
            >
              Event #{eventId} Not Found
            </div>
            <div style={{ display: "flex", fontSize: "16px", marginTop: "8px" }}>
              This event doesn&apos;t exist on Base
            </div>
          </div>
        ),
        intents: [
          <TextInput placeholder="Try another ID" />,
          <Button action="/results">Search</Button>,
          <Button action="/">← Back</Button>,
        ],
      });
    }

    // ── Giveaway not yet executed ───────────────────────────
    if (!giveawayExecuted) {
      const title = (await fetchEventTitle(eventId)) ?? `Event #${eventId}`;

      return c.res({
        image: (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(145deg, #0c0c0e 0%, #141417 100%)",
              color: "#e8e6e1",
              fontFamily: "monospace",
              padding: "40px",
            }}
          >
            <div style={{ display: "flex", fontSize: "48px", marginBottom: "16px" }}>
              ⏳
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "28px",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              {title}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "18px",
                color: "#d97706",
                marginBottom: "16px",
              }}
            >
              Giveaway not drawn yet
            </div>
            <div
              style={{
                display: "flex",
                gap: "32px",
                fontSize: "16px",
                color: "#8a8880",
              }}
            >
              <div style={{ display: "flex" }}>
                👥 {attendeeCount.toString()} attendees
              </div>
              <div style={{ display: "flex" }}>
                🔗 by {truncAddr(organizer)}
              </div>
            </div>
          </div>
        ),
        intents: [
          <Button action="/results">🔄 Refresh</Button>,
          <Button action="/">← Back</Button>,
        ],
      });
    }

    // ── Fetch GiveawayWinners event log from chain ──────────
    //
    //  viem's getLogs() queries the Base RPC node for event logs
    //  matching our contract address + event signature + indexed
    //  eventId topic. We scope from a recent deploy block to
    //  avoid scanning millions of blocks (which would timeout).
    //
    //  This is a free eth_getLogs call — no gas, no wallet.
    //
    const CONTRACT_DEPLOY_BLOCK = 25_000_000n; // approx late Jan 2025
    const logs = await client.getLogs({
      address: CONTRACT,
      event: GIVEAWAY_WINNERS_EVENT,
      args: { eventId: BigInt(eventId) },
      fromBlock: CONTRACT_DEPLOY_BLOCK,
      toBlock: "latest",
    });

    const winners: string[] =
      logs.length > 0 ? (logs[0].args.winners as string[]) : [];

    // Enrich with title from Supabase
    const title = (await fetchEventTitle(eventId)) ?? `Event #${eventId}`;

    // ── Render winners frame ────────────────────────────────
    return c.res({
      image: (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(145deg, #1a1508 0%, #0c0c0e 50%, #0a1f0e 100%)",
            color: "#e8e6e1",
            fontFamily: "monospace",
            padding: "36px 40px",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: "26px",
                  fontWeight: 700,
                  color: "#e8e6e1",
                }}
              >
                {title}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  fontSize: "14px",
                  color: "#8a8880",
                  marginTop: "4px",
                }}
              >
                <div style={{ display: "flex" }}>
                  👥 {attendeeCount.toString()} attended
                </div>
                <div style={{ display: "flex" }}>
                  🏆 {winners.length} winner{winners.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, #d97706, #fbbf24)",
                fontSize: "22px",
              }}
            >
              🎊
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "1px",
              background: "rgba(217, 119, 6, 0.2)",
              marginBottom: "18px",
            }}
          />

          {/* Winner list */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              flex: 1,
            }}
          >
            {winners.slice(0, 8).map((addr, i) => (
              <div
                key={addr}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  background:
                    i === 0
                      ? "rgba(217, 119, 6, 0.1)"
                      : "rgba(255, 255, 255, 0.03)",
                  border:
                    i === 0
                      ? "1px solid rgba(217, 119, 6, 0.2)"
                      : "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background:
                      i === 0
                        ? "linear-gradient(135deg, #d97706, #fbbf24)"
                        : "rgba(255, 255, 255, 0.06)",
                    color: i === 0 ? "#0c0c0e" : "#8a8880",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  #{i + 1}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "16px",
                    color:
                      i === 0 ? "#d97706" : "#e8e6e1",
                    fontWeight: i === 0 ? 600 : 400,
                  }}
                >
                  {truncAddr(addr)}
                </div>
                {i === 0 && (
                  <div style={{ display: "flex", fontSize: "16px" }}>
                    👑
                  </div>
                )}
              </div>
            ))}
            {winners.length > 8 && (
              <div
                style={{
                  display: "flex",
                  fontSize: "14px",
                  color: "#56554f",
                  padding: "4px 16px",
                }}
              >
                +{winners.length - 8} more winners
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "16px",
              fontSize: "12px",
              color: "#56554f",
            }}
          >
            <div style={{ display: "flex" }}>
              DropIn Giveaway • Base
            </div>
            <div style={{ display: "flex" }}>
              Event #{eventId}
            </div>
          </div>
        </div>
      ),
      intents: [
        <Button.Link
          href={`https://basescan.org/address/${CONTRACT}#events`}
        >
          BaseScan
        </Button.Link>,
        <TextInput placeholder="Another event ID" />,
        <Button action="/results">Search</Button>,
        <Button action="/">← Back</Button>,
      ],
    });
  } catch (err) {
    // ── RPC or unexpected error ─────────────────────────────
    return c.res({
      image: (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "#0c0c0e",
            color: "#ef4444",
            fontFamily: "monospace",
            padding: "40px",
          }}
        >
          <div style={{ display: "flex", fontSize: "48px", marginBottom: "16px" }}>
            ⚠️
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "24px",
              fontWeight: 600,
              color: "#e8e6e1",
            }}
          >
            Failed to load event
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "14px",
              color: "#8a8880",
              marginTop: "8px",
            }}
          >
            RPC error — try again in a moment
          </div>
        </div>
      ),
      intents: [
        <Button action="/results">🔄 Retry</Button>,
        <Button action="/">← Back</Button>,
      ],
    });
  }
});

// ── Next.js route handlers ───────────────────────────────────

export const GET = handle(app);
export const POST = handle(app);

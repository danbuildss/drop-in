// ─────────────────────────────────────────────────────────────
//  app/giveaway/page.tsx — Organizer Dashboard
//
//  Design: Telegram Mini App aesthetic matching /event/[eventId].
//  Dark cards, rounded surfaces, amber gradients, compact mobile
//  layout, playful badges, bottom-anchored CTAs.
//
//  Flow:
//    1. Connect wallet
//    2. Enter chain event ID → loads on-chain + off-chain data
//    3. View attendee list (from Supabase)
//    4. Set winner count → "Run Giveaway" executes on-chain tx
//    5. After tx success → decode GiveawayWinners event → reveal
//       winners with staggered animation → save to Supabase
// ─────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { base } from "wagmi/chains";
import { decodeEventLog, type Address } from "viem";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { Avatar, Name, Identity } from "@coinbase/onchainkit/identity";
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from "@coinbase/onchainkit/transaction";
import type { LifecycleStatus } from "@coinbase/onchainkit/transaction";

import {
  buildRunGiveawayCalls,
  buildCreateEventCalls,
  getEventReadConfig,
  getAttendeesReadConfig,
  dropInGiveawayAbi,
  type ContractCall,
  type EventView,
} from "@/lib/calls";
import {
  apiGetEventSummary,
  apiGetAttendees,
  apiCreateGiveaway,
  apiFinalizeGiveaway,
  apiGetGiveaway,
  apiCreateEvent,
  type ApiEventSummary,
  type ApiCheckIn,
} from "@/lib/api";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BASE_CHAIN_ID = base.id;
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

type DashView = "overview" | "attendees" | "draw";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Page
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function OrganizerDashboard() {
  const { address, isConnected } = useAccount();

  // ── State ───────────────────────────────────────────────────
  const [eventIdInput, setEventIdInput] = useState("");
  const [activeView, setActiveView] = useState<DashView>("overview");
  const [winnerCount, setWinnerCount] = useState("");
  const [winners, setWinners] = useState<string[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [drawState, setDrawState] = useState<
    "idle" | "pending" | "confirming" | "success" | "error"
  >("idle");
  const [drawError, setDrawError] = useState("");

  // Off-chain data
  const [dbEvent, setDbEvent] = useState<ApiEventSummary | null>(null);
  const [attendees, setAttendees] = useState<ApiCheckIn[]>([]);
  const [dbLoading, setDbLoading] = useState(false);

  // ── Derived ─────────────────────────────────────────────────
  const eventIdBn = useMemo(() => {
    try {
      return BigInt(eventIdInput || "0");
    } catch {
      return 0n;
    }
  }, [eventIdInput]);

  const winnerCountBn = useMemo(() => {
    try {
      return BigInt(winnerCount || "0");
    } catch {
      return 0n;
    }
  }, [winnerCount]);

  // ── On-chain reads ──────────────────────────────────────────
  const { data: eventData, refetch: refetchOnChain } = useReadContract({
    ...getEventReadConfig(eventIdBn),
    query: { enabled: eventIdBn > 0n },
  }) as {
    data: [Address, bigint, boolean] | undefined;
    refetch: () => void;
  };

  const { data: onChainAttendees } = useReadContract({
    ...getAttendeesReadConfig(eventIdBn),
    query: { enabled: eventIdBn > 0n },
  }) as { data: Address[] | undefined };

  const onChainEvent: EventView | null = eventData
    ? {
        organizer: eventData[0],
        attendeeCount: eventData[1],
        giveawayExecuted: eventData[2],
      }
    : null;

  const eventExists =
    onChainEvent !== null && onChainEvent.organizer !== ZERO_ADDR;
  const isOrganizer =
    eventExists && address
      ? onChainEvent!.organizer.toLowerCase() === address.toLowerCase()
      : false;

  // ── Load off-chain data when event ID changes ───────────────
  useEffect(() => {
    if (eventIdBn <= 0n) {
      setDbEvent(null);
      setAttendees([]);
      return;
    }

    setDbLoading(true);
    apiGetEventSummary(Number(eventIdBn))
      .then((data) => {
        setDbEvent(data);
        return apiGetAttendees(data.id);
      })
      .then((list) => {
        setAttendees(list);
        setDbLoading(false);
      })
      .catch(() => {
        setDbEvent(null);
        setAttendees([]);
        setDbLoading(false);
      });
  }, [eventIdBn]);

  // ── Refresh helpers ─────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    refetchOnChain();
    if (eventIdBn > 0n) {
      try {
        const ev = await apiGetEventSummary(Number(eventIdBn));
        setDbEvent(ev);
        const list = await apiGetAttendees(ev.id);
        setAttendees(list);
      } catch {}
    }
  }, [eventIdBn, refetchOnChain]);

  // ── Giveaway calls ─────────────────────────────────────────
  const giveawayCalls: ContractCall[] = useMemo(
    () =>
      buildRunGiveawayCalls({
        eventId: eventIdBn,
        winnerCount: winnerCountBn,
      }),
    [eventIdBn, winnerCountBn]
  );

  const createEventCalls: ContractCall[] = useMemo(
    () => buildCreateEventCalls({ eventId: eventIdBn }),
    [eventIdBn]
  );

  // ── Winner reveal animation ─────────────────────────────────
  useEffect(() => {
    if (drawState !== "success" || winners.length === 0) return;
    setRevealedCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setRevealedCount(i);
      if (i >= winners.length) clearInterval(interval);
    }, 400);
    return () => clearInterval(interval);
  }, [drawState, winners]);

  // ── Transaction lifecycle handler ───────────────────────────
  const handleTxStatus = useCallback(
    async (status: LifecycleStatus) => {
      if (status.statusName === "transactionPending") {
        setDrawState("pending");
      }

      if (status.statusName === "success") {
        setDrawState("confirming");

        // Try to decode winners from tx receipt logs
        try {
          const receipts = (status as any).statusData?.transactionReceipts;
          if (receipts && receipts.length > 0) {
            const receipt = receipts[0];
            for (const log of receipt.logs) {
              try {
                const decoded = decodeEventLog({
                  abi: dropInGiveawayAbi,
                  data: log.data,
                  topics: log.topics,
                });
                if (
                  decoded.eventName === "GiveawayWinners" &&
                  decoded.args
                ) {
                  const w = (decoded.args as any).winners as string[];
                  setWinners(w);

                  // Save to Supabase — create or fetch existing
                  if (dbEvent) {
                    try {
                      let giveawayId: string;
                      try {
                        const giveaway = await apiCreateGiveaway({
                          eventId: dbEvent.id,
                          winnerCount: Number(winnerCountBn),
                        });
                        giveawayId = giveaway.id;
                      } catch {
                        // 409 = already exists, fetch it
                        const existing = await apiGetGiveaway(dbEvent.id);
                        giveawayId = existing?.id ?? "";
                      }
                      if (giveawayId) {
                        await apiFinalizeGiveaway({
                          giveawayId,
                          winners: w,
                          txHash: receipt.transactionHash,
                        });
                      }
                    } catch {}
                  }

                  setDrawState("success");
                  refreshAll();
                  return;
                }
              } catch {}
            }
          }
        } catch {}

        // Fallback: if we couldn't decode, still mark success
        setDrawState("success");
        refreshAll();
      }

      if (status.statusName === "error") {
        setDrawState("error");
        setDrawError("Transaction failed. Please try again.");
      }
    },
    [dbEvent, winnerCountBn, refreshAll]
  );

  // ── Create event on-chain + off-chain handler ───────────────
  const handleCreateTxStatus = useCallback(
    async (status: LifecycleStatus) => {
      if (status.statusName === "success" && address) {
        try {
          await apiCreateEvent({
            chainEventId: Number(eventIdBn),
            title: `Event #${eventIdBn}`,
            organizer: address,
          });
        } catch {}
        refreshAll();
      }
    },
    [address, eventIdBn, refreshAll]
  );

  // ── Helpers ─────────────────────────────────────────────────
  const trunc = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const attendeeCount = dbEvent
    ? dbEvent.attendee_count
    : onChainEvent
    ? Number(onChainEvent.attendeeCount)
    : 0;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  Not connected
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (!isConnected) {
    return (
      <div style={s.shell}>
        <div style={s.topGlow} />
        <div style={s.heroConnect}>
          <div style={s.heroRing}>
            <div style={s.heroRingInner}>
              <span style={s.heroEmoji}>🎰</span>
            </div>
          </div>
          <h1 style={s.heroTitle}>Organizer Dashboard</h1>
          <p style={s.heroSub}>
            Connect your wallet to manage events and draw giveaway winners.
          </p>
          <div style={{ marginTop: 20 }}>
            <Wallet>
              <ConnectWallet />
            </Wallet>
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  Connected — Dashboard
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <div style={s.shell}>
      <div style={s.topGlow} />

      {/* ── Header ──────────────────────────────────────────── */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.headerDot} />
          <span style={s.headerLabel}>Dashboard</span>
        </div>
        <Wallet>
          <ConnectWallet>
            <Avatar className="h-5 w-5" />
            <Name />
          </ConnectWallet>
          <WalletDropdown>
            <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
              <Avatar />
              <Name />
            </Identity>
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </header>

      {/* ── Event ID input ──────────────────────────────────── */}
      <div style={s.inputCard}>
        <label style={s.inputLabel}>Event ID</label>
        <div style={s.inputRow}>
          <input
            type="number"
            min="1"
            placeholder="Enter chain event ID"
            value={eventIdInput}
            onChange={(e) => {
              setEventIdInput(e.target.value);
              setDrawState("idle");
              setWinners([]);
            }}
            style={s.input}
          />
          {eventExists && (
            <div style={s.liveBadge}>
              <span style={s.liveDot} />
              Live
            </div>
          )}
          {dbLoading && eventIdBn > 0n && (
            <div style={s.miniSpinner} />
          )}
        </div>
      </div>

      {/* ── No event found ──────────────────────────────────── */}
      {eventIdBn > 0n && !eventExists && !dbLoading && (
        <div style={s.emptyCard}>
          <span style={{ fontSize: "1.6rem", marginBottom: 8 }}>📭</span>
          <p style={s.emptyText}>
            Event #{eventIdInput} not found on-chain.
          </p>
          <p style={s.emptyHint}>Create it first:</p>
          <div style={{ marginTop: 12, width: "100%" }}>
            <Transaction
              chainId={BASE_CHAIN_ID}
              calls={createEventCalls}
              onStatus={handleCreateTxStatus}
            >
              <TransactionButton text="Create Event On-Chain" />
              <TransactionStatus>
                <TransactionStatusLabel />
                <TransactionStatusAction />
              </TransactionStatus>
            </Transaction>
          </div>
        </div>
      )}

      {/* ── Event loaded ────────────────────────────────────── */}
      {eventExists && (
        <>
          {/* Not organizer warning */}
          {!isOrganizer && (
            <div style={s.warnCard}>
              <span style={s.warnIcon}>⚠️</span>
              <div>
                <p style={s.warnTitle}>Not your event</p>
                <p style={s.warnSub}>
                  Connected as {trunc(address!)} but organizer is{" "}
                  {trunc(onChainEvent!.organizer)}.
                </p>
              </div>
            </div>
          )}

          {/* Tab bar */}
          <nav style={s.tabBar}>
            {(
              [
                ["overview", "Overview"],
                ["attendees", "Attendees"],
                ["draw", "Draw"],
              ] as [DashView, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                style={{
                  ...s.tab,
                  ...(activeView === key ? s.tabActive : {}),
                }}
              >
                {label}
                {key === "attendees" && (
                  <span style={s.tabBadge}>{attendeeCount}</span>
                )}
              </button>
            ))}
          </nav>

          {/* ━━━ OVERVIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeView === "overview" && (
            <div style={s.panel}>
              {/* Stats grid */}
              <div style={s.statsGrid}>
                <div style={s.statCard}>
                  <span style={s.statEmoji}>👥</span>
                  <span style={s.statNumber}>{attendeeCount}</span>
                  <span style={s.statLabel}>Checked In</span>
                </div>
                <div style={s.statCard}>
                  <span style={s.statEmoji}>🎯</span>
                  <span style={s.statNumber}>
                    {dbEvent?.max_attendees ?? "∞"}
                  </span>
                  <span style={s.statLabel}>Capacity</span>
                </div>
                <div style={s.statCard}>
                  <span style={s.statEmoji}>
                    {onChainEvent!.giveawayExecuted ? "✅" : "⏳"}
                  </span>
                  <span
                    style={{
                      ...s.statNumber,
                      fontSize: "0.95rem",
                      color: onChainEvent!.giveawayExecuted
                        ? "var(--green)"
                        : "var(--amber)",
                    }}
                  >
                    {onChainEvent!.giveawayExecuted ? "Drawn" : "Pending"}
                  </span>
                  <span style={s.statLabel}>Giveaway</span>
                </div>
                <div style={s.statCard}>
                  <span style={s.statEmoji}>🔗</span>
                  <span style={{ ...s.statNumber, fontSize: "0.95rem" }}>
                    #{eventIdInput}
                  </span>
                  <span style={s.statLabel}>Chain ID</span>
                </div>
              </div>

              {/* Organizer row */}
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Organizer</span>
                <span style={s.detailValue}>
                  {trunc(onChainEvent!.organizer)}
                  {isOrganizer && <span style={s.youTag}>you</span>}
                </span>
              </div>

              {/* On-chain attendees */}
              <div style={s.detailRow}>
                <span style={s.detailLabel}>On-chain attendees</span>
                <span style={s.detailValue}>
                  {onChainAttendees?.length ?? 0}
                </span>
              </div>

              {/* Off-chain attendees */}
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Off-chain check-ins</span>
                <span style={s.detailValue}>{attendees.length}</span>
              </div>

              {/* Winners (if drawn) */}
              {dbEvent?.winners && dbEvent.winners.length > 0 && (
                <div style={s.winnersSection}>
                  <span style={s.sectionTitle}>🏆 Winners</span>
                  {dbEvent.winners.map((w, i) => (
                    <div key={i} style={s.winnerRow}>
                      <span style={s.winnerRank}>#{i + 1}</span>
                      <span style={s.winnerAddr}>{trunc(w)}</span>
                    </div>
                  ))}
                  {dbEvent.tx_hash && (
                    <a
                      href={`https://basescan.org/tx/${dbEvent.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={s.txLink}
                    >
                      View on BaseScan →
                    </a>
                  )}
                </div>
              )}

              {/* Check-in link */}
              <div style={s.linkCard}>
                <span style={s.linkLabel}>Attendee check-in link</span>
                <div style={s.linkRow}>
                  <span style={s.linkUrl}>
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/event/${eventIdInput}`
                      : `/event/${eventIdInput}`}
                  </span>
                  <button
                    style={s.copyBtn}
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `${window.location.origin}/event/${eventIdInput}`
                      )
                    }
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ━━━ ATTENDEES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeView === "attendees" && (
            <div style={s.panel}>
              <div style={s.attendeeHeader}>
                <span style={s.sectionTitle}>
                  Checked-in Wallets
                </span>
                <span style={s.attendeeCount}>
                  {attendees.length}
                </span>
              </div>

              {attendees.length === 0 ? (
                <div style={s.emptyAttendees}>
                  <span style={{ fontSize: "2rem", marginBottom: 8 }}>
                    🦗
                  </span>
                  <p style={s.emptyText}>No attendees yet</p>
                  <p style={s.emptyHint}>
                    Share the check-in link to get started.
                  </p>
                </div>
              ) : (
                <div style={s.attendeeList}>
                  {attendees.map((a, i) => (
                    <div
                      key={a.id}
                      style={{
                        ...s.attendeeRow,
                        animationDelay: `${i * 0.04}s`,
                      }}
                    >
                      <div style={s.attendeeLeft}>
                        <span style={s.attendeeIndex}>{i + 1}</span>
                        <div style={s.attendeeAvatar}>
                          {a.wallet_address.slice(2, 4).toUpperCase()}
                        </div>
                        <span style={s.attendeeAddr}>
                          {trunc(a.wallet_address)}
                        </span>
                      </div>
                      <span style={s.attendeeTime}>
                        {new Date(a.checked_in_at).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ━━━ DRAW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {activeView === "draw" && (
            <div style={s.panel}>
              {/* Already drawn */}
              {onChainEvent!.giveawayExecuted && drawState !== "success" ? (
                <div style={s.drawnCard}>
                  <div style={s.drawnIcon}>✅</div>
                  <h3 style={s.drawnTitle}>Giveaway Complete</h3>
                  <p style={s.drawnSub}>
                    Winners have already been drawn for this event.
                  </p>
                  {dbEvent?.winners && dbEvent.winners.length > 0 && (
                    <div style={s.drawnWinners}>
                      {dbEvent.winners.map((w, i) => (
                        <div key={i} style={s.drawnWinnerPill}>
                          🏆 #{i + 1} {trunc(w)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : drawState === "success" ? (
                /* Winner reveal */
                <div style={s.revealCard}>
                  <div style={s.revealGlow} />
                  <span style={s.revealEmoji}>🎊</span>
                  <h3 style={s.revealTitle}>Winners Drawn!</h3>
                  <div style={s.revealList}>
                    {winners.map((w, i) => (
                      <div
                        key={i}
                        style={{
                          ...s.revealRow,
                          opacity: i < revealedCount ? 1 : 0,
                          transform:
                            i < revealedCount
                              ? "translateY(0) scale(1)"
                              : "translateY(12px) scale(0.95)",
                          transition:
                            "opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                        }}
                      >
                        <div style={s.revealRank}>
                          <span style={s.revealRankText}>#{i + 1}</span>
                        </div>
                        <span style={s.revealAddr}>{trunc(w)}</span>
                        <span style={s.revealTrophy}>🏆</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Draw form */
                <>
                  {/* Not organizer */}
                  {!isOrganizer ? (
                    <div style={s.warnCard}>
                      <span style={s.warnIcon}>🔒</span>
                      <div>
                        <p style={s.warnTitle}>Organizer only</p>
                        <p style={s.warnSub}>
                          Only {trunc(onChainEvent!.organizer)} can draw
                          winners.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Summary before draw */}
                      <div style={s.drawSummary}>
                        <div style={s.drawSummaryRow}>
                          <span style={s.drawSummaryLabel}>
                            Eligible attendees
                          </span>
                          <span style={s.drawSummaryValue}>
                            {attendeeCount}
                          </span>
                        </div>
                        <div style={s.drawSummaryRow}>
                          <span style={s.drawSummaryLabel}>
                            On-chain registered
                          </span>
                          <span style={s.drawSummaryValue}>
                            {onChainAttendees?.length ?? 0}
                          </span>
                        </div>
                      </div>

                      {/* Winner count input */}
                      <div style={s.drawInputCard}>
                        <label style={s.inputLabel}>
                          Number of winners
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={String(
                            onChainAttendees?.length ?? attendeeCount
                          )}
                          placeholder="e.g. 3"
                          value={winnerCount}
                          onChange={(e) => setWinnerCount(e.target.value)}
                          style={s.input}
                        />

                        {/* Validation hints */}
                        {winnerCountBn > 0n &&
                          onChainAttendees &&
                          winnerCountBn >
                            BigInt(onChainAttendees.length) && (
                            <p style={s.validationError}>
                              Cannot exceed {onChainAttendees.length}{" "}
                              on-chain attendees
                            </p>
                          )}

                        {(onChainAttendees?.length ?? 0) === 0 && (
                          <p style={s.validationWarn}>
                            No attendees registered on-chain yet.
                            Register them before drawing.
                          </p>
                        )}
                      </div>

                      {/* Transaction button */}
                      <div style={s.drawCta}>
                        {drawState === "pending" ||
                        drawState === "confirming" ? (
                          <div style={s.pendingCard}>
                            <div style={s.pendingSpinner} />
                            <p style={s.pendingText}>
                              {drawState === "pending"
                                ? "Waiting for confirmation..."
                                : "Decoding winners..."}
                            </p>
                          </div>
                        ) : (
                          <Transaction
                            chainId={BASE_CHAIN_ID}
                            calls={giveawayCalls}
                            onStatus={handleTxStatus}
                          >
                            <TransactionButton
                              text="🎰  Run Giveaway"
                              disabled={
                                winnerCountBn === 0n ||
                                !isOrganizer ||
                                (onChainAttendees?.length ?? 0) === 0 ||
                                winnerCountBn >
                                  BigInt(
                                    onChainAttendees?.length ?? 0
                                  )
                              }
                            />
                            <TransactionStatus>
                              <TransactionStatusLabel />
                              <TransactionStatusAction />
                            </TransactionStatus>
                          </Transaction>
                        )}

                        {drawState === "error" && (
                          <div style={s.errorCard}>
                            <p style={s.errorText}>{drawError}</p>
                            <button
                              style={s.retryBtn}
                              onClick={() => setDrawState("idle")}
                            >
                              Try Again
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Styles — Telegram Mini App aesthetic
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const s: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100dvh",
    maxWidth: 430,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
    padding: "0 16px 32px",
  },
  topGlow: {
    position: "absolute",
    top: -80,
    left: "50%",
    transform: "translateX(-50%)",
    width: 320,
    height: 200,
    borderRadius: "50%",
    background:
      "radial-gradient(ellipse, rgba(217,119,6,0.18) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },

  // Header
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 0",
    position: "relative",
    zIndex: 1,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "var(--amber)",
    boxShadow: "0 0 8px var(--amber-glow)",
  },
  headerLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
  },

  // Hero (not connected)
  heroConnect: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center" as const,
    padding: "2rem",
    position: "relative",
    zIndex: 1,
  },
  heroRing: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background:
      "conic-gradient(from 0deg, var(--amber), #fbbf24, var(--amber), #92400e, var(--amber))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
    marginBottom: 20,
  },
  heroRingInner: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "var(--bg-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  heroEmoji: { fontSize: "2rem" },
  heroTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "1.4rem",
    marginBottom: 8,
  },
  heroSub: {
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    maxWidth: 300,
  },

  // Input card
  inputCard: {
    position: "relative",
    zIndex: 1,
    marginBottom: 12,
  },
  inputLabel: {
    display: "block",
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 6,
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    padding: "12px 14px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.92rem",
    color: "var(--text-primary)",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    outline: "none",
  },
  liveBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
    borderRadius: 999,
    background: "var(--green-soft)",
    color: "var(--green)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--green)",
  },
  miniSpinner: {
    width: 18,
    height: 18,
    border: "2px solid var(--border)",
    borderTopColor: "var(--amber)",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },

  // Empty / not found
  emptyCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "28px 20px",
    borderRadius: 20,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    textAlign: "center" as const,
    position: "relative",
    zIndex: 1,
  },
  emptyText: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginBottom: 4,
  },
  emptyHint: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    color: "var(--text-muted)",
  },

  // Warning card
  warnCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "14px 16px",
    borderRadius: 16,
    background: "rgba(217, 119, 6, 0.06)",
    border: "1px solid rgba(217, 119, 6, 0.15)",
    marginBottom: 12,
    position: "relative",
    zIndex: 1,
  },
  warnIcon: { fontSize: "1.2rem", flexShrink: 0, marginTop: 1 },
  warnTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    fontSize: "0.9rem",
    color: "var(--amber)",
    marginBottom: 2,
  },
  warnSub: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
  },

  // Tab bar
  tabBar: {
    display: "flex",
    gap: 4,
    padding: 4,
    borderRadius: 16,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    marginBottom: 16,
    position: "relative",
    zIndex: 1,
  },
  tab: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px 0",
    borderRadius: 12,
    background: "transparent",
    border: "none",
    fontFamily: "var(--font-mono)",
    fontSize: "0.76rem",
    color: "var(--text-muted)",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  tabActive: {
    background: "rgba(217, 119, 6, 0.1)",
    color: "var(--amber)",
  },
  tabBadge: {
    padding: "1px 7px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    fontSize: "0.68rem",
    fontWeight: 500,
  },

  // Panel
  panel: {
    position: "relative",
    zIndex: 1,
    animation: "fadeIn 0.2s ease",
  },

  // Stats grid
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "16px 12px",
    borderRadius: 16,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
  },
  statEmoji: { fontSize: "1.3rem", marginBottom: 2 },
  statNumber: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "1.4rem",
    color: "var(--text-primary)",
  },
  statLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.62rem",
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },

  // Detail rows
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderRadius: 14,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    marginBottom: 6,
  },
  detailLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  detailValue: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  youTag: {
    fontSize: "0.6rem",
    padding: "2px 6px",
    borderRadius: 999,
    background: "var(--amber-soft)",
    color: "var(--amber)",
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },

  // Winners section in overview
  winnersSection: {
    padding: "16px",
    borderRadius: 16,
    background:
      "linear-gradient(145deg, #0a1f0e 0%, var(--bg-card) 100%)",
    border: "1px solid rgba(34, 197, 94, 0.15)",
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    display: "block",
    marginBottom: 10,
  },
  winnerRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 0",
  },
  winnerRank: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    color: "var(--amber)",
    width: 28,
  },
  winnerAddr: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.82rem",
    color: "var(--text-primary)",
  },
  txLink: {
    display: "inline-block",
    marginTop: 10,
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    color: "var(--amber)",
    textDecoration: "none",
  },

  // Check-in link card
  linkCard: {
    padding: "14px 16px",
    borderRadius: 14,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    marginTop: 8,
  },
  linkLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.68rem",
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    display: "block",
    marginBottom: 8,
  },
  linkRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 10px",
    borderRadius: 10,
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
  },
  linkUrl: {
    flex: 1,
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    color: "var(--text-muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  copyBtn: {
    padding: "4px 10px",
    borderRadius: 6,
    background: "var(--amber-soft)",
    border: "none",
    fontFamily: "var(--font-mono)",
    fontSize: "0.68rem",
    fontWeight: 500,
    color: "var(--amber)",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },

  // Attendee tab
  attendeeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  attendeeCount: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    padding: "4px 10px",
    borderRadius: 999,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
  },
  emptyAttendees: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px",
    textAlign: "center" as const,
  },
  attendeeList: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  attendeeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderRadius: 14,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    animation: "fadeIn 0.3s ease both",
  },
  attendeeLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  attendeeIndex: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.68rem",
    color: "var(--text-muted)",
    width: 18,
    textAlign: "right" as const,
  },
  attendeeAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    background:
      "linear-gradient(135deg, rgba(217,119,6,0.2), rgba(217,119,6,0.05))",
    border: "1px solid rgba(217,119,6,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-mono)",
    fontSize: "0.6rem",
    fontWeight: 500,
    color: "var(--amber)",
  },
  attendeeAddr: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.8rem",
    color: "var(--text-primary)",
  },
  attendeeTime: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.68rem",
    color: "var(--text-muted)",
  },

  // Draw tab
  drawSummary: {
    padding: "14px 16px",
    borderRadius: 16,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    marginBottom: 12,
  },
  drawSummaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 0",
  },
  drawSummaryLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    color: "var(--text-muted)",
  },
  drawSummaryValue: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.88rem",
    color: "var(--text-primary)",
    fontWeight: 500,
  },
  drawInputCard: {
    padding: "16px",
    borderRadius: 16,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    marginBottom: 12,
  },
  validationError: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    color: "var(--red)",
    marginTop: 6,
  },
  validationWarn: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    color: "var(--amber)",
    marginTop: 6,
  },
  drawCta: {
    position: "relative",
    zIndex: 1,
  },

  // Pending state
  pendingCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "28px 20px",
    borderRadius: 20,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    textAlign: "center" as const,
  },
  pendingSpinner: {
    width: 36,
    height: 36,
    border: "3px solid var(--border)",
    borderTopColor: "var(--amber)",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    marginBottom: 14,
  },
  pendingText: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
  },

  // Error state
  errorCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "16px",
    borderRadius: 16,
    background: "var(--red-soft)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    marginTop: 12,
    textAlign: "center" as const,
  },
  errorText: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.78rem",
    color: "var(--red)",
    marginBottom: 10,
  },
  retryBtn: {
    padding: "8px 20px",
    borderRadius: 10,
    background: "transparent",
    border: "1px solid var(--red)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    color: "var(--red)",
    cursor: "pointer",
  },

  // Already drawn card
  drawnCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "28px 20px",
    borderRadius: 20,
    background:
      "linear-gradient(145deg, #0a1f0e 0%, var(--bg-card) 100%)",
    border: "1px solid rgba(34, 197, 94, 0.15)",
    textAlign: "center" as const,
  },
  drawnIcon: { fontSize: "2.2rem", marginBottom: 10 },
  drawnTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "1.15rem",
    color: "var(--green)",
    marginBottom: 6,
  },
  drawnSub: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.78rem",
    color: "var(--text-secondary)",
    marginBottom: 14,
  },
  drawnWinners: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    width: "100%",
  },
  drawnWinnerPill: {
    padding: "8px 14px",
    borderRadius: 10,
    background: "rgba(34, 197, 94, 0.08)",
    border: "1px solid rgba(34, 197, 94, 0.12)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.78rem",
    color: "var(--text-primary)",
    textAlign: "left" as const,
  },

  // Winner reveal
  revealCard: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px 20px 24px",
    borderRadius: 24,
    background:
      "linear-gradient(145deg, #1a1508 0%, #12100a 50%, var(--bg-card) 100%)",
    border: "1px solid rgba(217, 119, 6, 0.2)",
    textAlign: "center" as const,
    overflow: "hidden",
  },
  revealGlow: {
    position: "absolute",
    top: -40,
    left: "50%",
    transform: "translateX(-50%)",
    width: 200,
    height: 120,
    borderRadius: "50%",
    background:
      "radial-gradient(ellipse, rgba(217,119,6,0.25) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  revealEmoji: {
    fontSize: "2.5rem",
    marginBottom: 10,
    position: "relative",
    zIndex: 1,
    animation: "scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)",
  },
  revealTitle: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "1.25rem",
    color: "var(--amber)",
    marginBottom: 18,
    position: "relative",
    zIndex: 1,
  },
  revealList: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    position: "relative",
    zIndex: 1,
  },
  revealRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: 14,
    background: "rgba(217, 119, 6, 0.06)",
    border: "1px solid rgba(217, 119, 6, 0.12)",
  },
  revealRank: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background:
      "linear-gradient(135deg, var(--amber), #fbbf24)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  revealRankText: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#0c0c0e",
  },
  revealAddr: {
    flex: 1,
    fontFamily: "var(--font-mono)",
    fontSize: "0.85rem",
    color: "var(--text-primary)",
    textAlign: "left" as const,
  },
  revealTrophy: {
    fontSize: "1.1rem",
  },
};

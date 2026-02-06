// ─────────────────────────────────────────────────────────────
//  lib/calls.ts — OnchainKit-compatible call builders for DropInGiveaway
// ─────────────────────────────────────────────────────────────

import { encodeFunctionData, type Hex, type Address } from "viem";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Deployed contract address on Base Sepolia (testnet)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const DROP_IN_GIVEAWAY_ADDRESS: Address =
  "0xAA49d591b259324671792C8f972486403895Ff9b";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ABI (only the functions the frontend needs)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const dropInGiveawayAbi = [
  // ── Write functions ───────────────────────────────────────
  {
    type: "function",
    name: "createEvent",
    stateMutability: "nonpayable",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "registerAttendee",
    stateMutability: "nonpayable",
    inputs: [
      { name: "eventId", type: "uint256" },
      { name: "attendee", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "runGiveaway",
    stateMutability: "nonpayable",
    inputs: [
      { name: "eventId", type: "uint256" },
      { name: "winnerCount", type: "uint256" },
    ],
    outputs: [],
  },

  // ── Read functions ────────────────────────────────────────
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
  {
    type: "function",
    name: "getAttendees",
    stateMutability: "view",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "isRegistered",
    stateMutability: "view",
    inputs: [
      { name: "eventId", type: "uint256" },
      { name: "attendee", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },

  // ── Events ────────────────────────────────────────────────
  {
    type: "event",
    name: "EventCreated",
    inputs: [
      { name: "eventId", type: "uint256", indexed: true },
      { name: "organizer", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "AttendeeRegistered",
    inputs: [
      { name: "eventId", type: "uint256", indexed: true },
      { name: "attendee", type: "address", indexed: true },
      { name: "attendeeCount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "GiveawayWinners",
    inputs: [
      { name: "eventId", type: "uint256", indexed: true },
      { name: "winners", type: "address[]", indexed: false },
    ],
  },
] as const;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ContractCall {
  to: Address;
  data: Hex;
  value?: bigint;
}

export interface CreateEventParams {
  eventId: bigint;
}

export interface RegisterAttendeeParams {
  eventId: bigint;
  attendee: Address;
}

export interface RunGiveawayParams {
  eventId: bigint;
  winnerCount: bigint;
}

export interface EventView {
  organizer: Address;
  attendeeCount: bigint;
  giveawayExecuted: boolean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Call builders  (write)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buildCreateEventCalls(
  params: CreateEventParams
): ContractCall[] {
  return [
    {
      to: DROP_IN_GIVEAWAY_ADDRESS,
      data: encodeFunctionData({
        abi: dropInGiveawayAbi,
        functionName: "createEvent",
        args: [params.eventId],
      }),
    },
  ];
}

export function buildRegisterAttendeeCalls(
  params: RegisterAttendeeParams
): ContractCall[] {
  return [
    {
      to: DROP_IN_GIVEAWAY_ADDRESS,
      data: encodeFunctionData({
        abi: dropInGiveawayAbi,
        functionName: "registerAttendee",
        args: [params.eventId, params.attendee],
      }),
    },
  ];
}

export function buildRunGiveawayCalls(
  params: RunGiveawayParams
): ContractCall[] {
  return [
    {
      to: DROP_IN_GIVEAWAY_ADDRESS,
      data: encodeFunctionData({
        abi: dropInGiveawayAbi,
        functionName: "runGiveaway",
        args: [params.eventId, params.winnerCount],
      }),
    },
  ];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Read helpers (for wagmi useReadContract)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function getEventReadConfig(eventId: bigint) {
  return {
    address: DROP_IN_GIVEAWAY_ADDRESS,
    abi: dropInGiveawayAbi,
    functionName: "getEvent" as const,
    args: [eventId] as const,
  };
}

export function getAttendeesReadConfig(eventId: bigint) {
  return {
    address: DROP_IN_GIVEAWAY_ADDRESS,
    abi: dropInGiveawayAbi,
    functionName: "getAttendees" as const,
    args: [eventId] as const,
  };
}

export function isRegisteredReadConfig(eventId: bigint, attendee: Address) {
  return {
    address: DROP_IN_GIVEAWAY_ADDRESS,
    abi: dropInGiveawayAbi,
    functionName: "isRegistered" as const,
    args: [eventId, attendee] as const,
  };
}

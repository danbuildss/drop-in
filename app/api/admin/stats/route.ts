// ─────────────────────────────────────────────────────────────
//  GET /api/admin/stats — Platform-wide analytics
//
//  Returns all stats in one payload for the admin dashboard.
//  Requires `x-wallet-address` header matching the admin wallet.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// Admin wallet (case-insensitive)
const ADMIN_WALLET = "0x84ea0b8d5b920e6a10043ab9c6f7500bcb2c9d25";

// Helper to get start of week (Sunday)
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  // Check admin authorization
  const walletHeader = req.headers.get("x-wallet-address");
  
  if (!walletHeader || walletHeader.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    // Calculate date ranges
    const now = new Date();
    const thisWeekStart = getStartOfWeek(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Run all queries in parallel
    const [
      eventsResult,
      checkInsResult,
      emailSubsResult,
      topEventsResult,
      recentCheckInsResult,
      thisWeekEventsResult,
      lastWeekEventsResult,
      thisWeekCheckInsResult,
      lastWeekCheckInsResult,
    ] = await Promise.all([
      // Total events
      supabaseAdmin
        .from("events")
        .select("id", { count: "exact", head: true }),
      
      // Total check-ins & unique wallets
      supabaseAdmin
        .from("check_ins")
        .select("wallet_address"),
      
      // Email subscribers by source
      supabaseAdmin
        .from("email_subscriptions")
        .select("source"),
      
      // Top 10 events by check-in count
      supabaseAdmin
        .from("v_event_summary")
        .select("id, title, organizer, attendee_count, created_at")
        .order("attendee_count", { ascending: false })
        .limit(10),
      
      // Recent 20 check-ins with event details
      supabaseAdmin
        .from("check_ins")
        .select(`
          id,
          wallet_address,
          checked_in_at,
          events!inner (
            title
          )
        `)
        .order("checked_in_at", { ascending: false })
        .limit(20),
      
      // Events this week
      supabaseAdmin
        .from("events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", thisWeekStart.toISOString()),
      
      // Events last week
      supabaseAdmin
        .from("events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", lastWeekStart.toISOString())
        .lt("created_at", thisWeekStart.toISOString()),
      
      // Check-ins this week
      supabaseAdmin
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .gte("checked_in_at", thisWeekStart.toISOString()),
      
      // Check-ins last week
      supabaseAdmin
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .gte("checked_in_at", lastWeekStart.toISOString())
        .lt("checked_in_at", thisWeekStart.toISOString()),
    ]);

    // Calculate unique wallets from check-ins
    const allWallets = checkInsResult.data?.map(c => c.wallet_address.toLowerCase()) || [];
    const uniqueWallets = new Set(allWallets).size;
    const totalCheckIns = allWallets.length;

    // Calculate email subscribers by source
    const emailSources: Record<string, number> = {};
    let totalEmailSubs = 0;
    emailSubsResult.data?.forEach(sub => {
      const source = sub.source || "unknown";
      emailSources[source] = (emailSources[source] || 0) + 1;
      totalEmailSubs++;
    });

    // Format top events
    const topEvents = topEventsResult.data?.map(event => ({
      id: event.id,
      title: event.title,
      organizer: event.organizer,
      checkInCount: event.attendee_count,
      createdAt: event.created_at,
    })) || [];

    // Format recent activity
    const recentActivity = recentCheckInsResult.data?.map(checkIn => ({
      id: checkIn.id,
      wallet: checkIn.wallet_address,
      eventTitle: (checkIn.events as any)?.title || "Unknown Event",
      timestamp: checkIn.checked_in_at,
    })) || [];

    // Compile stats
    const stats = {
      overview: {
        totalEvents: eventsResult.count || 0,
        totalCheckIns,
        uniqueWallets,
        emailSubscribers: totalEmailSubs,
      },
      growth: {
        eventsThisWeek: thisWeekEventsResult.count || 0,
        eventsLastWeek: lastWeekEventsResult.count || 0,
        checkInsThisWeek: thisWeekCheckInsResult.count || 0,
        checkInsLastWeek: lastWeekCheckInsResult.count || 0,
      },
      topEvents,
      recentActivity,
      emailsBySource: emailSources,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

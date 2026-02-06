// ─────────────────────────────────────────────────────────────
//  GET /api/admin/stats — Platform-wide analytics
//
//  Returns all stats in one payload for the admin dashboard.
//  Requires `x-wallet-address` header matching the admin wallet.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// Admin wallets (case-insensitive)
const ADMIN_WALLETS = [
  "0xAA49d591b259324671792C8f972486403895Ff9b",
  "0x84ea0b8d5b920e6a10043ab9c6f7500bcb2c9d25",
].map(w => w.toLowerCase());

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
  
  if (!walletHeader || !ADMIN_WALLETS.includes(walletHeader.toLowerCase())) {
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

    // Run queries with error handling for each
    let eventsResult, checkInsResult, emailSubsResult, topEventsResult, recentCheckInsResult;
    let thisWeekEventsResult, lastWeekEventsResult, thisWeekCheckInsResult, lastWeekCheckInsResult;

    // Total events
    eventsResult = await supabaseAdmin
      .from("events")
      .select("id", { count: "exact", head: true });
    
    // Total check-ins & unique wallets
    checkInsResult = await supabaseAdmin
      .from("check_ins")
      .select("wallet_address");
    
    // Email subscribers by source (may not exist yet)
    emailSubsResult = await supabaseAdmin
      .from("email_subscriptions")
      .select("source");
    if (emailSubsResult.error) {
      emailSubsResult = { data: [], error: null };
    }
    
    // Top 10 events - query events directly with check-in counts
    const eventsWithCounts = await supabaseAdmin
      .from("events")
      .select("id, title, organizer, created_at");
    
    // Get check-in counts per event
    const checkInCounts: Record<string, number> = {};
    if (checkInsResult.data) {
      const checkInsByEvent = await supabaseAdmin
        .from("check_ins")
        .select("event_id");
      checkInsByEvent.data?.forEach((c: any) => {
        checkInCounts[c.event_id] = (checkInCounts[c.event_id] || 0) + 1;
      });
    }
    
    // Combine events with counts
    topEventsResult = {
      data: eventsWithCounts.data?.map(e => ({
        ...e,
        attendee_count: checkInCounts[e.id] || 0
      })).sort((a, b) => b.attendee_count - a.attendee_count).slice(0, 10) || [],
      error: null
    };
    
    // Recent 20 check-ins
    recentCheckInsResult = await supabaseAdmin
      .from("check_ins")
      .select("id, wallet_address, checked_in_at, event_id")
      .order("checked_in_at", { ascending: false })
      .limit(20);
    
    // Events this week
    thisWeekEventsResult = await supabaseAdmin
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thisWeekStart.toISOString());
    
    // Events last week
    lastWeekEventsResult = await supabaseAdmin
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", lastWeekStart.toISOString())
      .lt("created_at", thisWeekStart.toISOString());
    
    // Check-ins this week
    thisWeekCheckInsResult = await supabaseAdmin
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .gte("checked_in_at", thisWeekStart.toISOString());
    
    // Check-ins last week
    lastWeekCheckInsResult = await supabaseAdmin
      .from("check_ins")
      .select("id", { count: "exact", head: true })
      .gte("checked_in_at", lastWeekStart.toISOString())
      .lt("checked_in_at", thisWeekStart.toISOString());
    
    // Get event titles for recent activity
    const eventTitles: Record<string, string> = {};
    eventsWithCounts.data?.forEach((e: any) => {
      eventTitles[e.id] = e.title;
    });

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
    const topEvents = topEventsResult.data?.map((event: any) => ({
      id: event.id,
      title: event.title,
      organizer: event.organizer,
      checkInCount: event.attendee_count || 0,
      createdAt: event.created_at,
    })) || [];

    // Format recent activity
    const recentActivity = recentCheckInsResult.data?.map((checkIn: any) => ({
      id: checkIn.id,
      wallet: checkIn.wallet_address,
      eventTitle: eventTitles[checkIn.event_id] || "Unknown Event",
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

// ─────────────────────────────────────────────────────────────
//  POST /api/subscribe — Email subscription endpoint
//  Body: { email, source, wallet? }
//
//  GET /api/subscribe — List all subscribers (admin only)
//  GET /api/subscribe?format=csv — Export as CSV
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

// Admin wallets that can access subscriber list
const ADMIN_WALLETS = [
  "0xAA49d591b259324671792C8f972486403895Ff9b",
  "0x84ea0b8d5b920e6a10043ab9c6f7500bcb2c9d25", // Dan
].map(w => w.toLowerCase());

// Simple email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, source = "landing", wallet } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Attempt to insert (upsert to handle duplicates gracefully)
    const { data, error } = await supabaseAdmin
      .from("email_subscriptions")
      .upsert(
        {
          email: normalizedEmail,
          source: source || "landing",
          wallet: wallet?.toLowerCase() || null,
        },
        {
          onConflict: "email",
          ignoreDuplicates: true,
        }
      )
      .select()
      .single();

    if (error) {
      // Handle duplicate gracefully - return success anyway
      if (error.code === "23505" || error.message.includes("duplicate")) {
        return NextResponse.json(
          { success: true, message: "Already subscribed" },
          { status: 200 }
        );
      }
      console.error("Subscribe error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, message: "Subscribed successfully" },
      { status: 201 }
    );
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletHeader = req.headers.get("x-wallet-address");
  const format = searchParams.get("format");

  // Check admin authorization
  if (!walletHeader || !ADMIN_WALLETS.includes(walletHeader.toLowerCase())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  // Fetch all subscribers
  const { data, error } = await supabaseAdmin
    .from("email_subscriptions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return CSV format if requested
  if (format === "csv") {
    const csvHeader = "id,email,source,wallet,created_at\n";
    const csvRows = (data || [])
      .map(row => 
        `${row.id},"${row.email}","${row.source}","${row.wallet || ""}","${row.created_at}"`
      )
      .join("\n");
    
    const csv = csvHeader + csvRows;
    
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="dropin-subscribers-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({
    count: data?.length || 0,
    subscribers: data || [],
  });
}

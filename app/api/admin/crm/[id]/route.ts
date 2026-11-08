/**
 * GET   /api/admin/crm/[id]  — full customer 360 profile
 * PATCH /api/admin/crm/[id]  — update notes { notes: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

type Stage = "new" | "lead" | "engaged" | "converted" | "repeat";

const PAID = new Set(["paid", "pending_verification"]);

function deriveStage(paidBooks: number, totalBooks: number, hasConvWithConversion: boolean): Stage {
  if (paidBooks >= 2) return "repeat";
  if (paidBooks === 1) return "converted";
  if (totalBooks > 0 || hasConvWithConversion) return "engaged";
  return "lead";
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;

  const db = supabaseAdmin();
  const id = params.id;

  const [
    { data: customer, error: custErr },
    { data: conversations },
    { data: bookings },
  ] = await Promise.all([
    db.from("customers")
      .select("id, phone_number, display_name, language_pref, notes, metadata, pdpa_consent, created_at, updated_at")
      .eq("id", id)
      .single(),
    db.from("conversations")
      .select("id, status, language, message_count, conversion_type, closing_persona, converted_at, handoff_reason, quality_flag, created_at, updated_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    db.from("bookings")
      .select("id, status, payment_status, total_sgd, travel_date, payment_ref, adults, children, special_requests, created_at, tour_packages ( name, name_zh, destination )")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (custErr || !customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const convs = conversations ?? [];
  const books = bookings ?? [];

  const paidBooks = books.filter((b) => PAID.has(b.payment_status)).length;
  const hasConvWithConversion = convs.some((c) => c.conversion_type);
  const stage: Stage = convs.length === 0
    ? "new"
    : deriveStage(paidBooks, books.length, hasConvWithConversion);

  const totalSpend = books
    .filter((b) => PAID.has(b.payment_status))
    .reduce((sum, b) => sum + (parseFloat(b.total_sgd) || 0), 0);

  const latestConv = convs[0];
  const lastActive = latestConv?.updated_at ?? latestConv?.created_at ?? customer.updated_at;

  return NextResponse.json({
    customer,
    conversations: convs,
    bookings: books,
    stats: {
      stage,
      total_spend: totalSpend,
      booking_count: books.length,
      conv_count: convs.length,
      last_active: lastActive,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;

  const db = supabaseAdmin();
  const { notes } = await req.json();

  const { error } = await db
    .from("customers")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

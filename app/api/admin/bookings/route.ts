/**
 * GET  /api/admin/bookings  — list bookings with customer + package info
 * PATCH /api/admin/bookings  — update booking status or payment_status
 *
 * Tenant scoping: uses tenant_id column added by migration 021.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const status         = searchParams.get("status");
  const payment_status = searchParams.get("payment_status");
  const limit          = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  let query = db
    .from("bookings")
    .select(`
      id, booking_type, status, travel_date, adults, children,
      total_sgd, payment_status, payment_ref, special_requests,
      created_at, updated_at,
      customers ( id, phone_number, display_name ),
      tour_packages ( id, name, destination, price_adult_sgd )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tenantId)                          query = query.eq("tenant_id", tenantId);
  if (status && status !== "all")        query = query.eq("status", status);
  if (payment_status && payment_status !== "all") query = query.eq("payment_status", payment_status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ bookings: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  const body = await req.json();
  const { id, status, payment_status, payment_ref } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Scope write to tenant
  if (tenantId) {
    const { data: check } = await db
      .from("bookings").select("id").eq("id", id).eq("tenant_id", tenantId).single();
    if (!check) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update: Record<string, string> = {};
  if (status)         update.status         = status;
  if (payment_status) update.payment_status = payment_status;
  if (payment_ref)    update.payment_ref    = payment_ref;

  const { error } = await db.from("bookings").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

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
  const page           = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const offset         = (page - 1) * limit;

  let query = db
    .from("bookings")
    .select(`
      id, booking_type, status, travel_date, adults, children,
      total_sgd, payment_status, payment_ref, special_requests,
      created_at, updated_at,
      customers ( id, phone_number, display_name ),
      tour_packages ( id, name, destination, price_adult_sgd )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (tenantId)                          query = query.eq("tenant_id", tenantId);
  if (status && status !== "all")        query = query.eq("status", status);
  if (payment_status && payment_status !== "all") query = query.eq("payment_status", payment_status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ bookings: data ?? [], total: count ?? 0, page, limit });
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

  // When marking a booking as paid, create the platform_transaction record
  if (payment_status === "paid") {
    await _createTransaction(db, id, payment_ref ?? null);
  }

  return NextResponse.json({ ok: true });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _createTransaction(db: any, bookingId: string, paymentRef: string | null) {
  try {
    // Check if transaction already exists for this booking
    const { data: existing } = await db
      .from("platform_transactions")
      .select("id")
      .eq("booking_id", bookingId)
      .limit(1);
    if (existing?.length) return; // idempotent — don't double-write

    // Fetch booking + package + customer
    const { data: booking } = await db
      .from("bookings")
      .select(`
        id, tenant_id, package_id, total_sgd, customer_id, customer_phone:customers(phone_number),
        customer_name:customers(display_name),
        tour_packages(id, name, vendor_id)
      `)
      .eq("id", bookingId)
      .single();
    if (!booking) return;

    const gross = Number(booking.total_sgd ?? 0);
    if (gross <= 0) return;

    // Fetch tenant fee percentages
    const bookingTenantId = booking.tenant_id as string | null;
    let platformFeePct = 15; // sensible default
    let agentFeePct = 0;
    if (bookingTenantId) {
      const { data: tenant } = await db
        .from("tenants")
        .select("platform_fee_pct, agent_fee_pct")
        .eq("id", bookingTenantId)
        .single();
      if (tenant) {
        platformFeePct = Number(tenant.platform_fee_pct ?? 15);
        agentFeePct    = Number(tenant.agent_fee_pct ?? 0);
      }
    }

    // Look up agent commission for this booking
    const { data: commission } = await db
      .from("agent_commissions")
      .select("id, agent_id, commission_sgd, commission_pct")
      .eq("source_id", bookingId)
      .limit(1);
    const comm = commission?.[0];
    const agentFeeSgd    = comm ? Number(comm.commission_sgd ?? 0) : Math.round(gross * agentFeePct) / 100;
    const platformFeeSgd = Math.round(gross * platformFeePct) / 100;
    const vendorPayout   = Math.max(0, gross - platformFeeSgd - agentFeeSgd);

    const txRecord = {
      tenant_id:            bookingTenantId,
      transaction_type:     "tour_booking",
      booking_id:           bookingId,
      product_id:           booking.tour_packages?.id ?? null,
      gross_amount_sgd:     gross,
      net_amount_sgd:       gross - platformFeeSgd,
      platform_fee_sgd:     platformFeeSgd,
      agent_fee_sgd:        agentFeeSgd,
      vendor_payout_sgd:    vendorPayout,
      agent_id:             comm?.agent_id ?? null,
      payment_status:       "paid",
      payment_ref:          paymentRef,
      payment_received_at:  new Date().toISOString(),
      customer_name:        booking.customer_name?.display_name ?? null,
      customer_phone:       booking.customer_phone?.phone_number ?? null,
    };

    await db.from("platform_transactions").insert(txRecord);

    // Mark agent commission as confirmed
    if (comm?.id) {
      await db.from("agent_commissions").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", comm.id);
    }
  } catch (err) {
    // Non-fatal — log but don't fail the booking update
    console.error("[platform_transaction] write failed:", err);
  }
}

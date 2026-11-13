/**
 * GET  /api/admin/orders        — list marketplace_orders (vendor_admin scoped by vendor_id)
 * PATCH /api/admin/orders       — update status or payment_status
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId, session } = auth;
  const vendorId = session.vendorId ?? null;

  const db = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const status         = searchParams.get("status");
  const payment_status = searchParams.get("payment_status");
  const limit          = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const page           = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const offset         = (page - 1) * limit;

  let q = db
    .from("marketplace_orders")
    .select(`
      id, order_no, status, payment_status, payment_method, payment_ref, paid_at,
      customer_name, customer_phone, items, item_count,
      subtotal_sgd, discount_sgd, total_sgd,
      platform_fee_sgd, agent_fee_sgd, vendor_payout_sgd,
      pickup_or_delivery, scheduled_at, fulfilled_at,
      customer_notes, vendor_notes, created_at, updated_at,
      vendors ( id, business_name )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (tenantId) q = q.eq("tenant_id", tenantId);
  if (vendorId) q = q.eq("vendor_id", vendorId);
  if (status && status !== "all")               q = q.eq("status", status);
  if (payment_status && payment_status !== "all") q = q.eq("payment_status", payment_status);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orders: data ?? [], total: count ?? 0, page, limit });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId, session } = auth;
  const vendorId = session.vendorId ?? null;

  const db = supabaseAdmin();
  const { id, status, payment_status, vendor_notes } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status)         { update.status = status; if (status === "completed") update.fulfilled_at = new Date().toISOString(); }
  if (payment_status) { update.payment_status = payment_status; if (payment_status === "paid") update.paid_at = new Date().toISOString(); }
  if (vendor_notes !== undefined) update.vendor_notes = vendor_notes;

  let q = db.from("marketplace_orders").update(update).eq("id", id);
  if (tenantId) q = q.eq("tenant_id", tenantId);
  if (vendorId) q = q.eq("vendor_id", vendorId);

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

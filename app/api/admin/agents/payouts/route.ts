/**
 * GET  /api/admin/agents/payouts  — agents with pending commissions + payout batch history
 * POST /api/admin/agents/payouts  — create a payout batch for an agent (marks commissions paid)
 * PATCH /api/admin/agents/payouts — update batch status (processing → paid)
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

  let agentQ = db
    .from("sales_agents")
    .select("id, name, phone, email, referral_code, commission_pct, total_earned_sgd, status")
    .eq("status", "active")
    .order("total_earned_sgd", { ascending: false });
  if (tenantId) agentQ = agentQ.eq("tenant_id", tenantId);

  let batchQ = db
    .from("agent_payout_batches")
    .select(`
      id, batch_no, total_sgd, commission_count, payment_method,
      payment_ref, status, period_from, period_to, notes, created_at, paid_at,
      sales_agents ( id, name, phone, referral_code )
    `)
    .order("created_at", { ascending: false })
    .limit(100);
  if (tenantId) batchQ = batchQ.eq("tenant_id", tenantId);

  const [{ data: agents }, { data: batches }] = await Promise.all([agentQ, batchQ]);

  // For each agent, sum pending commissions (already scoped via agent ownership)
  const enriched = await Promise.all(
    (agents ?? []).map(async (agent) => {
      const { data: pending } = await db
        .from("agent_commissions")
        .select("id, commission_sgd, source_type, source_ref, gross_amount_sgd, commission_pct, created_at")
        .eq("agent_id", agent.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      const total_pending = (pending ?? []).reduce((s, c) => s + (c.commission_sgd || 0), 0);

      return {
        ...agent,
        pending_commissions: pending ?? [],
        total_pending_sgd: Math.round(total_pending * 100) / 100,
      };
    })
  );

  return NextResponse.json({
    agents: enriched.filter(a => a.total_pending_sgd > 0 || a.pending_commissions.length > 0),
    all_agents: enriched,
    batches: batches ?? [],
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  const body = await req.json();
  const { agent_id, commission_ids, payment_method, payment_ref, period_from, period_to, notes } = body;

  if (!agent_id || !commission_ids?.length) {
    return NextResponse.json({ error: "agent_id and commission_ids required" }, { status: 400 });
  }

  // Fetch commissions — scope to tenant if applicable
  let commQ = db
    .from("agent_commissions")
    .select("id, commission_sgd, tenant_id")
    .in("id", commission_ids)
    .eq("agent_id", agent_id)
    .eq("status", "pending");
  if (tenantId) commQ = commQ.eq("tenant_id", tenantId);

  const { data: comms, error: fetchErr } = await commQ;

  if (fetchErr || !comms?.length) {
    return NextResponse.json({ error: "No pending commissions found" }, { status: 400 });
  }

  const total_sgd = Math.round(comms.reduce((s, c) => s + (c.commission_sgd || 0), 0) * 100) / 100;
  const resolved_tenant_id = tenantId ?? comms[0].tenant_id;

  // Generate batch number: PAY-YYYY-MM-NNN
  const prefix = `PAY-${new Date().toISOString().slice(0, 7)}`;
  const { count } = await db
    .from("agent_payout_batches")
    .select("*", { count: "exact", head: true })
    .like("batch_no", `${prefix}%`);
  const batch_no = `${prefix}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data: batch, error: batchErr } = await db
    .from("agent_payout_batches")
    .insert({
      tenant_id: resolved_tenant_id,
      agent_id,
      batch_no,
      total_sgd,
      commission_count: comms.length,
      payment_method: payment_method ?? "bank_transfer",
      payment_ref: payment_ref ?? null,
      period_from: period_from ?? null,
      period_to: period_to ?? null,
      notes: notes ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (batchErr) return NextResponse.json({ error: batchErr.message }, { status: 500 });

  const { error: updateErr } = await db
    .from("agent_commissions")
    .update({ status: "paid", paid_at: new Date().toISOString(), payout_batch_id: batch.id })
    .in("id", commission_ids);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ batch });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  const { id, status, payment_ref } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const update: Record<string, unknown> = { status };
  if (payment_ref) update.payment_ref = payment_ref;
  if (status === "paid") update.paid_at = new Date().toISOString();

  // Scope update: tenant_admin can only update their own batches
  let q = db.from("agent_payout_batches").update(update).eq("id", id);
  if (tenantId) q = q.eq("tenant_id", tenantId);

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

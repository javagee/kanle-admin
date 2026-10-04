/**
 * GET /api/cron/settle-commissions
 * Vercel cron — runs Monday 9 AM SGT.
 * Marks confirmed commissions as paid and creates payout batch records.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel cron auth
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date().toISOString();
  const batchDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  // Get all confirmed (not yet paid) commissions grouped by agent
  const { data: commissions } = await db
    .from("agent_commissions")
    .select("id, agent_id, commission_sgd")
    .eq("status", "confirmed");

  if (!commissions?.length) {
    return NextResponse.json({ settled: 0, message: "No confirmed commissions to settle" });
  }

  // Group by agent
  const byAgent: Record<string, { total: number; ids: string[] }> = {};
  for (const c of commissions) {
    if (!byAgent[c.agent_id]) byAgent[c.agent_id] = { total: 0, ids: [] };
    byAgent[c.agent_id].total += c.commission_sgd;
    byAgent[c.agent_id].ids.push(c.id);
  }

  let batchesCreated = 0;
  let seq = 1;

  for (const [agentId, { total, ids }] of Object.entries(byAgent)) {
    const batchNo = `PAY-${batchDate}-${String(seq++).padStart(3, "0")}`;

    // Create payout batch
    const { data: batch } = await db
      .from("agent_payout_batches")
      .insert({
        agent_id: agentId,
        tenant_id: process.env.TENANT_ID,
        batch_no: batchNo,
        total_sgd: Math.round(total * 100) / 100,
        commission_count: ids.length,
        status: "pending",
        period_from: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        period_to: now.slice(0, 10),
      })
      .select("id")
      .single();

    if (batch) {
      // Link commissions to batch and mark as paid
      await db
        .from("agent_commissions")
        .update({ status: "paid", paid_at: now, payout_batch_id: batch.id })
        .in("id", ids);

      batchesCreated++;
    }
  }

  return NextResponse.json({
    settled: commissions.length,
    batches_created: batchesCreated,
    agents_paid: Object.keys(byAgent).length,
  });
}

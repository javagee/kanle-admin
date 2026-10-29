/**
 * GET /api/agent/commissions?code=REF-XXXXXX
 * Full commission ledger for an agent.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: agents } = await db.from("sales_agents").select("id").eq("referral_code", code).limit(1);
  if (!agents?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const agentId = agents[0].id;

  const { data: commissions, error } = await db
    .from("agent_commissions")
    .select("id, source_type, source_id, source_ref, gross_amount_sgd, commission_pct, commission_sgd, status, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: payouts } = await db
    .from("agent_payout_batches")
    .select("id, batch_no, total_sgd, status, payment_method, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ commissions: commissions ?? [], payouts: payouts ?? [] });
}

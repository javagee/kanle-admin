/**
 * GET /api/admin/agents  — all agents with commission totals
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = supabaseAdmin();

  const { data: agents, error } = await db
    .from("sales_agents")
    .select("*")
    .order("total_earned_sgd", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich each agent with pending vs paid breakdown
  const enriched = await Promise.all(
    (agents ?? []).map(async (agent) => {
      const { data: comms } = await db
        .from("agent_commissions")
        .select("commission_sgd, status")
        .eq("agent_id", agent.id);

      const pending = comms?.filter(c => c.status === "pending")
        .reduce((s, c) => s + (c.commission_sgd || 0), 0) ?? 0;
      const paid = comms?.filter(c => c.status === "paid")
        .reduce((s, c) => s + (c.commission_sgd || 0), 0) ?? 0;

      const { count: leadCount } = await db
        .from("agent_leads")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agent.id);

      return {
        ...agent,
        pending_commission_sgd: Math.round(pending * 100) / 100,
        paid_commission_sgd: Math.round(paid * 100) / 100,
        lead_count: leadCount ?? 0,
      };
    })
  );

  return NextResponse.json({ agents: enriched });
}

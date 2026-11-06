/**
 * GET /api/admin/agents  — all agents with commission totals
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllRows(baseQuery: any, pageSize = 10): Promise<any[]> {
  const rows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await baseQuery.range(from, from + pageSize - 1);
    if (error || !data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();

  const agentBase = tenantId
    ? db.from("sales_agents").select("*").order("total_earned_sgd", { ascending: false }).eq("tenant_id", tenantId)
    : db.from("sales_agents").select("*").order("total_earned_sgd", { ascending: false });

  const agents = await fetchAllRows(agentBase);

  // Enrich each agent with pending vs paid breakdown
  const enriched = await Promise.all(
    (agents ?? []).map(async (agent) => {
      const comms = await fetchAllRows(
        db.from("agent_commissions").select("commission_sgd, status").eq("agent_id", agent.id)
      );

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

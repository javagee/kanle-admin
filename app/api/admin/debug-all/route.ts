import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId, session } = auth;

  const db = supabaseAdmin();
  const byTenant = (q: any) => tenantId ? q.eq("tenant_id", tenantId) : q;

  // Run each query individually to isolate failures
  const v = await byTenant(db.from("vendors").select("*", { count: "exact", head: true }));
  const a = await byTenant(db.from("sales_agents").select("id, status").eq("status", "active").limit(500));
  const s = await byTenant(db.from("sse_members").select("id, active").eq("active", true).limit(500));
  const t = await byTenant(db.from("platform_transactions").select("net_amount_sgd, platform_fee_sgd, created_at").order("created_at", { ascending: false }).limit(10));
  const c = await (tenantId
    ? db.from("agent_commissions").select("commission_sgd, status").eq("tenant_id", tenantId).limit(10)
    : db.from("agent_commissions").select("commission_sgd, status").limit(10));

  // Finance summary query (from finance route)
  let summaryQ: any = db.from("platform_transactions")
    .select("gross_amount_sgd, net_amount_sgd, platform_fee_sgd, agent_fee_sgd, vendor_payout_sgd, payment_status, transaction_type, created_at");
  if (tenantId) summaryQ = summaryQ.eq("tenant_id", tenantId);
  const finSummary = await summaryQ;

  // Agents route query
  let agentQ: any = db.from("sales_agents").select("id, name, status, total_earned_sgd").order("total_earned_sgd", { ascending: false });
  if (tenantId) agentQ = agentQ.eq("tenant_id", tenantId);
  const agentsRoute = await agentQ;

  return NextResponse.json({
    session_role: session.role,
    tenant_id_in_auth: tenantId,
    vendors:       { count: v.count,         error: v.error?.message },
    agents_active: { count: a.data?.length,  error: a.error?.message },
    sse_active:    { count: s.data?.length,  error: s.error?.message },
    transactions:  { data: t.data,           error: t.error?.message },
    commissions:   { data: c.data,           error: c.error?.message },
    finance_summary_all: { count: finSummary.data?.length, error: finSummary.error?.message, sample: finSummary.data?.slice(0,2) },
    agents_route:  { count: agentsRoute.data?.length, error: agentsRoute.error?.message, sample: agentsRoute.data?.slice(0,2) },
  });
}

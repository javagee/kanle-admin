import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId, session } = auth;

  const db = supabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byTenant = (q: any) => tenantId ? q.eq("tenant_id", tenantId) : q;

  // ── Basic counts ──────────────────────────────────────────────────────────
  const v = await byTenant(db.from("vendors").select("*", { count: "exact", head: true }));
  const a = await byTenant(db.from("sales_agents").select("id, status").eq("status", "active").limit(500));
  const s = await byTenant(db.from("sse_members").select("id, active").eq("active", true).limit(500));

  // ── Working transaction query (3 cols) ────────────────────────────────────
  const t = await byTenant(db.from("platform_transactions")
    .select("net_amount_sgd, platform_fee_sgd, created_at")
    .order("created_at", { ascending: false }).limit(10));

  // ── SELECT * to see all columns that actually exist ───────────────────────
  const tStar = await byTenant(db.from("platform_transactions").select("*").limit(2));

  // ── Test just gross_amount_sgd ────────────────────────────────────────────
  const tGross = await byTenant(db.from("platform_transactions").select("gross_amount_sgd").limit(2));

  // ── Full finance summary (wider column list) ──────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let summaryQ: any = db.from("platform_transactions")
    .select("gross_amount_sgd, net_amount_sgd, platform_fee_sgd, agent_fee_sgd, vendor_payout_sgd, payment_status, transaction_type, created_at");
  if (tenantId) summaryQ = summaryQ.eq("tenant_id", tenantId);
  const finSummary = await summaryQ;

  // ── Stats-route revenue calculation (replicates stats/route.ts exactly) ───
  const revQ = await byTenant(db.from("platform_transactions")
    .select("net_amount_sgd, platform_fee_sgd, created_at")
    .order("created_at", { ascending: false }).limit(500));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalRevenue = (revQ.data as any[])?.reduce((acc: number, r: any) => acc + (Number(r.net_amount_sgd) || 0), 0) ?? 0;

  // ── Agents route query ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let agentQ: any = db.from("sales_agents").select("id, name, status, total_earned_sgd").order("total_earned_sgd", { ascending: false });
  if (tenantId) agentQ = agentQ.eq("tenant_id", tenantId);
  const agentsRoute = await agentQ;

  // ── Finance JOIN query (like the finance route uses) ─────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let joinQ: any = db.from("platform_transactions").select(
    "id, net_amount_sgd, payment_status, vendors ( id, name ), sales_agents ( id, name )"
  ).limit(2);
  if (tenantId) joinQ = joinQ.eq("tenant_id", tenantId);
  const finJoin = await joinQ;

  // ── Table existence checks ────────────────────────────────────────────────
  const mktOrders = await db.from("marketplace_orders").select("*", { count: "exact", head: true });
  const bookings  = await db.from("bookings").select("*", { count: "exact", head: true });

  return NextResponse.json({
    session_role:        session.role,
    tenant_id_in_auth:   tenantId,
    vendors:             { count: v.count,            error: v.error?.message ?? null },
    agents_active:       { count: a.data?.length,     error: a.error?.message ?? null },
    sse_active:          { count: s.data?.length,     error: s.error?.message ?? null },
    transactions_3col:   { count: t.data?.length,     error: t.error?.message ?? null, sample: t.data?.slice(0,2) },
    transactions_star:   { error: tStar.error?.message ?? null, sample: tStar.data?.slice(0,1) },
    transactions_gross:  { count: tGross.data?.length, error: tGross.error?.message ?? null, sample: tGross.data?.slice(0,2) },
    finance_summary:     { count: finSummary.data?.length ?? null, error: finSummary.error?.message ?? null, sample: finSummary.data?.slice(0,1) },
    finance_join:        { count: finJoin.data?.length ?? null, error: finJoin.error?.message ?? null, sample: finJoin.data?.slice(0,1) },
    stats_revenue_calc:  { computed_total_sgd: Math.round(totalRevenue * 100) / 100, row_count: revQ.data?.length ?? 0, error: revQ.error?.message ?? null },
    agents_route:        { count: agentsRoute.data?.length, error: agentsRoute.error?.message ?? null, sample: agentsRoute.data?.slice(0,2) },
    table_exists:        {
      marketplace_orders: { count: mktOrders.count, error: mktOrders.error?.message ?? null },
      bookings:           { count: bookings.count,  error: bookings.error?.message ?? null },
    },
  });
}

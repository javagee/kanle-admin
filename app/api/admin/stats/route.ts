/**
 * GET /api/admin/stats
 * Dashboard KPIs — scoped to tenant for tenant_admin, platform-wide for super_admin.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// Supabase max-rows is configured low on this project; paginate to fetch all rows.
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

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byTenant = (q: any) => tenantId ? q.eq("tenant_id", tenantId) : q;

  // Count queries (HEAD requests) are unaffected by max-rows
  const [
    { count: totalVendors },
    { count: activeVendors },
    { count: totalOrders },
    { count: totalBookings },
  ] = await Promise.all([
    byTenant(db.from("vendors").select("*", { count: "exact", head: true })),
    byTenant(db.from("vendors").select("*", { count: "exact", head: true }).eq("status", "active")),
    byTenant(db.from("marketplace_orders").select("*", { count: "exact", head: true })),
    byTenant(db.from("bookings").select("*", { count: "exact", head: true })),
  ]);

  // Paginated fetches for data rows (parallel)
  const [agentRows, sseRows, revenueRows, commissionRows] = await Promise.all([
    fetchAllRows(byTenant(db.from("sales_agents").select("id, status").eq("status", "active"))),
    fetchAllRows(byTenant(db.from("sse_members").select("id, active").eq("active", true))),
    fetchAllRows(byTenant(
      db.from("platform_transactions")
        .select("net_amount_sgd, platform_fee_sgd, created_at")
        .order("created_at", { ascending: false })
    )),
    fetchAllRows(
      tenantId
        ? db.from("agent_commissions").select("commission_sgd, status").eq("tenant_id", tenantId)
        : db.from("agent_commissions").select("commission_sgd, status")
    ),
  ]);

  const totalAgents = agentRows.length;
  const sseMembers  = sseRows.length;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalRevenue      = revenueRows.reduce((s: number, r: any) => s + (Number(r.net_amount_sgd) || 0), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const platformFees      = revenueRows.reduce((s: number, r: any) => s + (Number(r.platform_fee_sgd) || 0), 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingCommission = commissionRows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((r: any) => r.status === "pending")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .reduce((s: number, r: any) => s + (Number(r.commission_sgd) || 0), 0);

  // Monthly revenue (last 6 months)
  const monthlyMap: Record<string, number> = {};
  for (const row of revenueRows) {
    const month = (row.created_at as string)?.slice(0, 7) ?? "";
    monthlyMap[month] = (monthlyMap[month] ?? 0) + (Number(row.net_amount_sgd) || 0);
  }
  const monthlyRevenue = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }));

  return NextResponse.json({
    vendors:  { total: totalVendors ?? 0, active: activeVendors ?? 0 },
    orders:   { total: totalOrders ?? 0 },
    bookings: { total: totalBookings ?? 0 },
    agents:   { total: totalAgents },
    sse:      { members: sseMembers },
    revenue: {
      total_sgd:                    Math.round(totalRevenue * 100) / 100,
      platform_fees_sgd:            Math.round(platformFees * 100) / 100,
      pending_agent_commission_sgd: Math.round(pendingCommission * 100) / 100,
      monthly:                      monthlyRevenue,
    },
    _scope: tenantId ? "tenant" : "platform",
  });
}

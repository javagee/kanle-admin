/**
 * GET /api/admin/stats
 * Dashboard KPIs — scoped to tenant for tenant_admin, platform-wide for super_admin.
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

  // Helper: apply tenant filter when present
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byTenant = (q: any) => tenantId ? q.eq("tenant_id", tenantId) : q;

  const [
    { count: totalVendors },
    { count: activeVendors },
    { count: totalOrders },
    { count: totalBookings },
    { count: totalAgents },
    { count: sseMembers },
    { data: revenueRows },
    { data: commissionRows },
  ] = await Promise.all([
    byTenant(db.from("vendors").select("*", { count: "exact", head: true })),
    byTenant(db.from("vendors").select("*", { count: "exact", head: true }).eq("status", "active")),
    byTenant(db.from("marketplace_orders").select("*", { count: "exact", head: true })),
    byTenant(db.from("bookings").select("*", { count: "exact", head: true })),
    byTenant(db.from("sales_agents").select("*", { count: "exact", head: true }).eq("status", "active")),
    byTenant(db.from("sse_members").select("*", { count: "exact", head: true }).eq("active", true)),
    byTenant(
      db.from("platform_transactions")
        .select("net_amount_sgd, platform_fee_sgd, created_at")
        .order("created_at", { ascending: false })
        .limit(500)
    ),
    tenantId
      ? db.from("agent_commissions").select("commission_sgd, status").eq("tenant_id", tenantId).limit(500)
      : db.from("agent_commissions").select("commission_sgd, status").limit(500),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalRevenue      = (revenueRows as any[])?.reduce((s: number, r: any) => s + (r.net_amount_sgd || 0), 0) ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const platformFees      = (revenueRows as any[])?.reduce((s: number, r: any) => s + (r.platform_fee_sgd || 0), 0) ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingCommission = (commissionRows as any[])?.filter((r: any) => r.status === "pending")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .reduce((s: number, r: any) => s + (r.commission_sgd || 0), 0) ?? 0;

  // Monthly revenue (last 6 months)
  const monthlyMap: Record<string, number> = {};
  for (const row of revenueRows ?? []) {
    const month = row.created_at?.slice(0, 7) ?? "";
    monthlyMap[month] = (monthlyMap[month] ?? 0) + (row.net_amount_sgd || 0);
  }
  const monthlyRevenue = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }));

  return NextResponse.json({
    vendors:  { total: totalVendors ?? 0, active: activeVendors ?? 0 },
    orders:   { total: totalOrders ?? 0 },
    bookings: { total: totalBookings ?? 0 },
    agents:   { total: totalAgents ?? 0 },
    sse:      { members: sseMembers ?? 0 },
    revenue: {
      total_sgd:                    Math.round(totalRevenue * 100) / 100,
      platform_fees_sgd:            Math.round(platformFees * 100) / 100,
      pending_agent_commission_sgd: Math.round(pendingCommission * 100) / 100,
      monthly:                      monthlyRevenue,
    },
    _scope: tenantId ? "tenant" : "platform",
  });
}

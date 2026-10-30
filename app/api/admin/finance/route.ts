/**
 * GET /api/admin/finance          — summary KPIs + transaction list
 * GET /api/admin/finance?export=csv — full CSV download
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
  const { searchParams } = new URL(req.url);
  const exportCsv     = searchParams.get("export") === "csv";
  const txType        = searchParams.get("type");
  const payStatus     = searchParams.get("payment_status");
  const dateFrom      = searchParams.get("date_from");
  const dateTo        = searchParams.get("date_to");
  const search        = searchParams.get("search");
  const page          = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit         = exportCsv ? 5000 : Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  // ── Base query ────────────────────────────────────────────────────────────
  const buildQuery = () => {
    let q = db.from("platform_transactions").select(
      "id, transaction_type, gross_amount_sgd, discount_applied_sgd, net_amount_sgd, " +
      "platform_fee_sgd, agent_fee_sgd, vendor_payout_sgd, payment_method, payment_status, " +
      "payment_ref, payment_received_at, customer_name, customer_phone, referral_code_used, " +
      "notes, created_at, " +
      "vendors ( id, name ), sales_agents ( id, name, referral_code )"
    );
    if (tenantId)  q = q.eq("tenant_id", tenantId);
    if (txType)    q = q.eq("transaction_type", txType);
    if (payStatus) q = q.eq("payment_status", payStatus);
    if (dateFrom)  q = q.gte("created_at", dateFrom);
    if (dateTo)    q = q.lte("created_at", dateTo + "T23:59:59Z");
    if (search)    q = q.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,payment_ref.ilike.%${search}%`);
    return q;
  };

  // ── CSV export ─────────────────────────────────────────────────────────────
  if (exportCsv) {
    const { data, error } = await buildQuery().order("created_at", { ascending: false }).limit(limit);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    type Row = Record<string, unknown> & { vendors?: { name?: string } | null };
    const csvHeaders = ["Date","Type","Customer","Phone","Gross SGD","Discount","Net SGD",
      "Platform Fee","Agent Fee","Vendor Payout","Payment Method","Payment Status",
      "Payment Ref","Agent Code","Vendor"];
    const csvRows = (data as unknown as Row[] ?? []).map(r => [
      String(r.created_at ?? "").slice(0, 10),
      r.transaction_type, r.customer_name ?? "", r.customer_phone ?? "",
      r.gross_amount_sgd, r.discount_applied_sgd ?? 0, r.net_amount_sgd,
      r.platform_fee_sgd ?? 0, r.agent_fee_sgd ?? 0, r.vendor_payout_sgd ?? 0,
      r.payment_method ?? "", r.payment_status, r.payment_ref ?? "",
      r.referral_code_used ?? "", r.vendors?.name ?? "",
    ]);

    const csv = [csvHeaders, ...csvRows].map(row => row.map(v => `"${v}"`).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="finance-export-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  }

  // ── Transactions (paginated) ───────────────────────────────────────────────
  const { data: txns, error: txnErr, count } = await buildQuery()
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (txnErr) return NextResponse.json({ error: txnErr.message }, { status: 500 });

  // ── KPI summary (unfiltered totals for the tenant) ─────────────────────────
  let summaryQ = db.from("platform_transactions")
    .select("gross_amount_sgd, net_amount_sgd, platform_fee_sgd, agent_fee_sgd, vendor_payout_sgd, payment_status, transaction_type, created_at");
  if (tenantId) summaryQ = summaryQ.eq("tenant_id", tenantId);
  const { data: allTxns } = await summaryQ;

  const paid    = (allTxns ?? []).filter(t => t.payment_status === "paid");
  const pending = (allTxns ?? []).filter(t => t.payment_status === "pending");
  const sum = (arr: typeof paid, field: keyof typeof paid[0]) =>
    arr.reduce((s, r) => s + (Number(r[field]) || 0), 0);

  // Monthly revenue — last 12 months
  const monthlyMap: Record<string, { gross: number; net: number; fees: number }> = {};
  for (const t of paid) {
    const m = t.created_at?.slice(0, 7) ?? "unknown";
    if (!monthlyMap[m]) monthlyMap[m] = { gross: 0, net: 0, fees: 0 };
    monthlyMap[m].gross += Number(t.gross_amount_sgd) || 0;
    monthlyMap[m].net   += Number(t.net_amount_sgd)   || 0;
    monthlyMap[m].fees  += Number(t.platform_fee_sgd) || 0;
  }
  const monthly = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, v]) => ({
      month,
      gross: Math.round(v.gross * 100) / 100,
      net:   Math.round(v.net   * 100) / 100,
      fees:  Math.round(v.fees  * 100) / 100,
    }));

  // Type breakdown
  const byType: Record<string, number> = {};
  for (const t of paid) {
    byType[t.transaction_type] = (byType[t.transaction_type] ?? 0) + (Number(t.net_amount_sgd) || 0);
  }

  return NextResponse.json({
    summary: {
      gross_sgd:         Math.round(sum(paid, "gross_amount_sgd") * 100) / 100,
      net_sgd:           Math.round(sum(paid, "net_amount_sgd")   * 100) / 100,
      platform_fees_sgd: Math.round(sum(paid, "platform_fee_sgd") * 100) / 100,
      agent_fees_sgd:    Math.round(sum(paid, "agent_fee_sgd")    * 100) / 100,
      vendor_payouts_sgd:Math.round(sum(paid, "vendor_payout_sgd")* 100) / 100,
      pending_sgd:       Math.round(sum(pending, "net_amount_sgd") * 100) / 100,
      paid_count:        paid.length,
      pending_count:     pending.length,
    },
    monthly,
    by_type: Object.entries(byType).map(([type, amount]) => ({
      type, amount: Math.round(amount * 100) / 100,
    })).sort((a, b) => b.amount - a.amount),
    transactions: txns ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}

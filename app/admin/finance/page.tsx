"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/AdminShell";

interface Summary {
  gross_sgd: number; net_sgd: number; platform_fees_sgd: number;
  agent_fees_sgd: number; vendor_payouts_sgd: number;
  pending_sgd: number; paid_count: number; pending_count: number;
}
interface MonthlyPoint { month: string; gross: number; net: number; fees: number; }
interface TypeBreakdown { type: string; amount: number; }
interface Transaction {
  id: string; transaction_type: string; gross_amount_sgd: number;
  discount_applied_sgd: number; net_amount_sgd: number;
  platform_fee_sgd: number; agent_fee_sgd: number; vendor_payout_sgd: number;
  payment_method: string | null; payment_status: string;
  payment_ref: string | null; payment_received_at: string | null;
  customer_name: string | null; customer_phone: string | null;
  referral_code_used: string | null; notes: string | null;
  created_at: string;
  vendors: { name: string } | null;
  sales_agents: { name: string; referral_code: string } | null;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
};

const PAY_COLORS: Record<string, React.CSSProperties> = {
  paid:     { background: "rgba(52,211,153,0.15)",  color: "#6ee7b7" },
  pending:  { background: "rgba(251,191,36,0.15)",  color: "#fde68a" },
  refunded: { background: "rgba(248,113,113,0.15)", color: "#f87171" },
};
const TYPE_LABELS: Record<string, string> = {
  tour_booking:       "🗓️ Tour",
  marketplace_order:  "🛍️ Market",
  subscription:       "📋 Subscription",
  voucher_redemption: "🎟️ Voucher",
};

const fmt = (n: number) => `S$${n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FinancePage() {
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [monthly, setMonthly]   = useState<MonthlyPoint[]>([]);
  const [byType, setByType]     = useState<TypeBreakdown[]>([]);
  const [txns, setTxns]         = useState<Transaction[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);

  const [typeFilter, setTypeFilter]   = useState("");
  const [statusFilter, setStatus]     = useState("");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [search, setSearch]           = useState("");
  const [expanded, setExpanded]       = useState<string | null>(null);

  const limit = 50;

  const load = useCallback(async (p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (typeFilter)   params.set("type", typeFilter);
    if (statusFilter) params.set("payment_status", statusFilter);
    if (dateFrom)     params.set("date_from", dateFrom);
    if (dateTo)       params.set("date_to", dateTo);
    if (search)       params.set("search", search);
    const res = await fetch(`/api/admin/finance?${params}`);
    const data = await res.json();
    setSummary(data.summary);
    setMonthly(data.monthly ?? []);
    setByType(data.by_type ?? []);
    setTxns(data.transactions ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, typeFilter, statusFilter, dateFrom, dateTo, search]);

  useEffect(() => { load(1); setPage(1); }, [typeFilter, statusFilter, dateFrom, dateTo, search]);
  useEffect(() => { load(page); }, [page]);

  const exportCsv = async () => {
    setExporting(true);
    const params = new URLSearchParams({ export: "csv" });
    if (typeFilter)   params.set("type", typeFilter);
    if (statusFilter) params.set("payment_status", statusFilter);
    if (dateFrom)     params.set("date_from", dateFrom);
    if (dateTo)       params.set("date_to", dateTo);
    if (search)       params.set("search", search);
    const res = await fetch(`/api/admin/finance?${params}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `finance-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    setExporting(false);
  };

  // Bar chart max
  const maxBar = Math.max(...monthly.map(m => m.gross), 1);

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <a href="/admin" className="text-sm transition-opacity hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.4)" }}>← Dashboard</a>
            <h1 className="text-xl font-bold text-white mt-1">Finance</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Platform revenue, transactions &amp; payouts
            </p>
          </div>
          <button onClick={exportCsv} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: "rgba(52,211,153,0.15)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.3)" }}>
            {exporting ? "Exporting…" : "⬇ Export CSV"}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: "Gross Revenue",    value: summary?.gross_sgd,          color: "#c084fc", sub: `${summary?.paid_count ?? 0} transactions` },
            { label: "Net Collected",    value: summary?.net_sgd,            color: "#6ee7b7", sub: "after discounts" },
            { label: "Platform Fees",    value: summary?.platform_fees_sgd,  color: "#60a5fa", sub: "platform 15%" },
            { label: "Agent Fees",       value: summary?.agent_fees_sgd,     color: "#f59e0b", sub: "referral commissions" },
            { label: "Vendor Payouts",   value: summary?.vendor_payouts_sgd, color: "#a78bfa", sub: "net to vendors" },
            { label: "Pending",          value: summary?.pending_sgd,        color: "#fca5a5", sub: `${summary?.pending_count ?? 0} unpaid` },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={GLASS} className="p-4">
              <p className="text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</p>
              <p className="text-2xl font-bold" style={{ color }}>
                {value !== undefined ? fmt(value) : "—"}
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Monthly bar chart */}
          <div style={{ ...GLASS, padding: "20px" }} className="lg:col-span-2">
            <p className="text-sm font-semibold text-white mb-4">Monthly Revenue (last 12 months)</p>
            {monthly.length === 0 ? (
              <div className="flex items-center justify-center h-32"
                style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                No transactions yet
              </div>
            ) : (
              <div className="flex items-end gap-2 h-32">
                {monthly.map(m => {
                  const h = Math.max(4, (m.gross / maxBar) * 100);
                  const fh = Math.max(2, (m.fees / maxBar) * 100);
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none"
                        style={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8, padding: "6px 10px", whiteSpace: "nowrap", fontSize: 11 }}>
                        <p className="text-white font-semibold">{m.month}</p>
                        <p style={{ color: "#c084fc" }}>Gross: {fmt(m.gross)}</p>
                        <p style={{ color: "#6ee7b7" }}>Net: {fmt(m.net)}</p>
                        <p style={{ color: "#60a5fa" }}>Fees: {fmt(m.fees)}</p>
                      </div>
                      <div className="w-full flex flex-col justify-end" style={{ height: "100px" }}>
                        <div style={{ height: `${h}%`, background: "rgba(192,132,252,0.4)",
                          borderRadius: "4px 4px 0 0", position: "relative" }}>
                          <div style={{ height: `${(fh / h) * 100}%`, background: "rgba(96,165,250,0.7)",
                            borderRadius: "4px 4px 0 0", position: "absolute", bottom: 0, left: 0, right: 0 }} />
                        </div>
                      </div>
                      <p className="text-center" style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                        {m.month.slice(5)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-4 mt-3">
              {[{ color: "rgba(192,132,252,0.4)", label: "Gross" },
                { color: "rgba(96,165,250,0.7)", label: "Platform fees" }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By type */}
          <div style={{ ...GLASS, padding: "20px" }}>
            <p className="text-sm font-semibold text-white mb-4">Revenue by Type</p>
            {byType.length === 0 ? (
              <div className="flex items-center justify-center h-32"
                style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>No data yet</div>
            ) : (
              <div className="space-y-3">
                {byType.map(({ type, amount }) => {
                  const pct = summary?.net_sgd ? Math.round((amount / summary.net_sgd) * 100) : 0;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white">{TYPE_LABELS[type] ?? type}</span>
                        <span className="text-xs font-semibold" style={{ color: "#c084fc" }}>{fmt(amount)}</span>
                      </div>
                      <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#7c3aed,#c084fc)", borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={GLASS} className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-40">
              <label className="block text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Search</label>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Customer, phone, ref…"
                className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-white/20"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Type</label>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm text-white"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }}>
                <option value="">All types</option>
                <option value="tour_booking">Tour Booking</option>
                <option value="marketplace_order">Marketplace</option>
                <option value="subscription">Subscription</option>
                <option value="voucher_redemption">Voucher</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Status</label>
              <select value={statusFilter} onChange={e => setStatus(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm text-white"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }}>
                <option value="">All statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm text-white"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none", colorScheme: "dark" }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm text-white"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none", colorScheme: "dark" }} />
            </div>
            {(typeFilter || statusFilter || dateFrom || dateTo || search) && (
              <button onClick={() => { setTypeFilter(""); setStatus(""); setDateFrom(""); setDateTo(""); setSearch(""); }}
                className="px-3 py-2 rounded-xl text-xs"
                style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Transactions table */}
        <div style={GLASS} className="overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <p className="text-sm font-semibold text-white">
              Transactions
              {total > 0 && <span className="ml-2 text-xs font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>
                {total.toLocaleString()} total
              </span>}
            </p>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</div>
          ) : txns.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No transactions yet</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                Transactions are recorded when bookings or marketplace orders are paid
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["Date", "Type", "Customer", "Gross", "Platform Fee", "Agent Fee", "Net", "Status"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold"
                          style={{ color: "rgba(255,255,255,0.35)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map(t => (
                      <>
                        <tr key={t.id}
                          onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                          className="cursor-pointer transition-colors"
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)",
                            background: expanded === t.id ? "rgba(255,255,255,0.03)" : undefined }}>
                          <td className="px-4 py-3 text-white whitespace-nowrap">
                            {new Date(t.created_at).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(124,58,237,0.2)", color: "#c084fc" }}>
                              {TYPE_LABELS[t.transaction_type] ?? t.transaction_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-white">{t.customer_name ?? "—"}</p>
                            {t.customer_phone && (
                              <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                                {t.customer_phone}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">
                            {fmt(t.gross_amount_sgd)}
                            {t.discount_applied_sgd > 0 && (
                              <p className="text-xs" style={{ color: "#fca5a5" }}>-{fmt(t.discount_applied_sgd)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#60a5fa" }}>
                            {fmt(t.platform_fee_sgd ?? 0)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#f59e0b" }}>
                            {fmt(t.agent_fee_sgd ?? 0)}
                          </td>
                          <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: "#6ee7b7" }}>
                            {fmt(t.net_amount_sgd)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                              style={PAY_COLORS[t.payment_status] ?? PAY_COLORS.pending}>
                              {t.payment_status}
                            </span>
                          </td>
                        </tr>
                        {expanded === t.id && (
                          <tr key={t.id + "-exp"}
                            style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <td colSpan={8} className="px-6 py-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                {[
                                  ["Vendor Payout", fmt(t.vendor_payout_sgd ?? 0)],
                                  ["Payment Method", t.payment_method ?? "—"],
                                  ["Payment Ref", t.payment_ref ?? "—"],
                                  ["Paid At", t.payment_received_at
                                    ? new Date(t.payment_received_at).toLocaleString("en-SG")
                                    : "—"],
                                  ["Agent", t.sales_agents?.name ?? "—"],
                                  ["Referral Code", t.referral_code_used ?? "—"],
                                  ["Vendor", t.vendors?.name ?? "—"],
                                  ["Notes", t.notes ?? "—"],
                                ].map(([k, v]) => (
                                  <div key={k}>
                                    <p style={{ color: "rgba(255,255,255,0.35)" }}>{k}</p>
                                    <p className="text-white mt-0.5">{v}</p>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-30"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}>
                      ← Prev
                    </button>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-30"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}>
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

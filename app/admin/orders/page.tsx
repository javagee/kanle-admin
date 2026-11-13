"use client";

import { useEffect, useState } from "react";

interface OrderItem {
  product_id: string;
  name: string;
  qty: number;
  unit_price_sgd: number;
  subtotal_sgd: number;
}

interface Order {
  id: string;
  order_no: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  payment_ref: string | null;
  paid_at: string | null;
  customer_name: string | null;
  customer_phone: string;
  items: OrderItem[];
  item_count: number;
  subtotal_sgd: number;
  discount_sgd: number;
  total_sgd: number;
  platform_fee_sgd: number;
  agent_fee_sgd: number;
  vendor_payout_sgd: number;
  pickup_or_delivery: string;
  scheduled_at: string | null;
  fulfilled_at: string | null;
  customer_notes: string | null;
  vendor_notes: string | null;
  created_at: string;
  updated_at: string;
  vendors: { id: string; business_name: string } | null;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
};

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending:    { background: "rgba(251,191,36,0.15)",  color: "#fde68a",  border: "1px solid rgba(251,191,36,0.3)" },
  confirmed:  { background: "rgba(96,165,250,0.15)",  color: "#93c5fd",  border: "1px solid rgba(96,165,250,0.3)" },
  processing: { background: "rgba(167,139,250,0.15)", color: "#c084fc",  border: "1px solid rgba(167,139,250,0.3)" },
  ready:      { background: "rgba(52,211,153,0.15)",  color: "#6ee7b7",  border: "1px solid rgba(52,211,153,0.3)" },
  completed:  { background: "rgba(148,163,184,0.15)", color: "#94a3b8",  border: "1px solid rgba(148,163,184,0.3)" },
  cancelled:  { background: "rgba(248,113,113,0.15)", color: "#fca5a5",  border: "1px solid rgba(248,113,113,0.3)" },
  refunded:   { background: "rgba(248,113,113,0.1)",  color: "#fca5a5",  border: "1px solid rgba(248,113,113,0.2)" },
};

const PAY_STYLES: Record<string, React.CSSProperties> = {
  unpaid:  { background: "rgba(248,113,113,0.15)", color: "#fca5a5" },
  paid:    { background: "rgba(52,211,153,0.15)",  color: "#6ee7b7" },
  partial: { background: "rgba(251,191,36,0.15)",  color: "#fde68a" },
  refunded:{ background: "rgba(148,163,184,0.15)", color: "#94a3b8" },
};

const STATUS_OPTS  = ["all","pending","confirmed","processing","ready","completed","cancelled","refunded"] as const;
const PAY_OPTS     = ["all","unpaid","paid","partial","refunded"] as const;
const FULFIL_STEPS = ["confirmed","processing","ready","completed"] as const;

function fmt(n: number) { return `S$${n.toFixed(2)}`; }
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [statusF, setStatusF]     = useState("all");
  const [payF, setPayF]           = useState("all");
  const [search, setSearch]       = useState("");
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [updating, setUpdating]   = useState<string | null>(null);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);

  const load = async (s = statusF, p = payF, pg = page) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(pg) });
    if (s !== "all") params.set("status", s);
    if (p !== "all") params.set("payment_status", p);
    const res = await fetch(`/api/admin/orders?${params}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patch = async (id: string, update: Record<string, string>) => {
    setUpdating(id);
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...update }),
    });
    await load();
    setUpdating(null);
  };

  const filtered = orders.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return o.order_no.toLowerCase().includes(s)
      || o.customer_phone.includes(s)
      || (o.customer_name?.toLowerCase().includes(s) ?? false);
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Summary counts from current page
  const pendingCount   = orders.filter(o => o.status === "pending").length;
  const unpaidCount    = orders.filter(o => o.payment_status === "unpaid").length;
  const totalRevenue   = orders.filter(o => o.payment_status === "paid").reduce((s, o) => s + o.total_sgd, 0);

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-5">
        <a href="/admin" className="text-sm hover:opacity-80 transition-opacity"
          style={{ color: "rgba(255,255,255,0.45)" }}>← Dashboard</a>
        <h1 className="text-xl font-bold text-white mt-1">Marketplace Orders</h1>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          {total} orders total
          {pendingCount > 0 && <span style={{ color: "#fde68a" }}> · {pendingCount} pending</span>}
          {unpaidCount > 0  && <span style={{ color: "#fca5a5" }}> · {unpaidCount} unpaid</span>}
          {totalRevenue > 0 && <span style={{ color: "#6ee7b7" }}> · {fmt(totalRevenue)} collected (this page)</span>}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Order no, phone, name…"
          className="px-3 py-2 rounded-xl text-sm text-white placeholder-white/20 w-56"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />

        <div className="flex gap-1 flex-wrap items-center">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => { setStatusF(s); setPage(1); load(s, payF, 1); }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all"
              style={statusF === s
                ? { background: "rgba(167,139,250,0.3)", color: "#c084fc" }
                : { color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)" }}>
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-1 flex-wrap items-center">
          {PAY_OPTS.map(p => (
            <button key={p} onClick={() => { setPayF(p); setPage(1); load(statusF, p, 1); }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all"
              style={payF === p
                ? { background: "rgba(52,211,153,0.2)", color: "#6ee7b7" }
                : { color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)" }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-center py-20 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24" style={{ color: "rgba(255,255,255,0.3)" }}>No orders found</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(o => {
            const isOpen = expanded === o.id;
            return (
              <div key={o.id} style={GLASS}>
                {/* Row */}
                <button className="w-full text-left px-4 py-3 flex items-center gap-4 flex-wrap"
                  onClick={() => setExpanded(isOpen ? null : o.id)}>

                  {/* Order no + vendor */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-white">{o.order_no}</span>
                      {o.vendors && (
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                          🛍️ {o.vendors.business_name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {o.customer_name || o.customer_phone}
                      {o.customer_name && <span style={{ color: "rgba(255,255,255,0.25)" }}> · {o.customer_phone}</span>}
                      {" · "}{o.item_count} item{o.item_count !== 1 ? "s" : ""}
                      {" · "}<span className="capitalize">{o.pickup_or_delivery}</span>
                    </p>
                  </div>

                  {/* Amount */}
                  <span className="font-semibold text-white text-sm">{fmt(o.total_sgd)}</span>

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                      style={STATUS_STYLES[o.status] ?? STATUS_STYLES.pending}>
                      {o.status}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                      style={PAY_STYLES[o.payment_status] ?? PAY_STYLES.unpaid}>
                      {o.payment_status}
                    </span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {timeAgo(o.created_at)}
                    </span>
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    <div className="mt-3 grid grid-cols-1 gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>

                      {/* Items */}
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>ITEMS</p>
                        <div className="space-y-1">
                          {(o.items ?? []).map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-white">{item.name}
                                <span style={{ color: "rgba(255,255,255,0.4)" }}> × {item.qty}</span>
                              </span>
                              <span style={{ color: "rgba(255,255,255,0.6)" }}>{fmt(item.subtotal_sgd)}</span>
                            </div>
                          ))}
                          <div className="border-t pt-1 mt-1 space-y-0.5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                            {o.discount_sgd > 0 && (
                              <div className="flex justify-between text-xs">
                                <span style={{ color: "#6ee7b7" }}>SSE Discount</span>
                                <span style={{ color: "#6ee7b7" }}>−{fmt(o.discount_sgd)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm font-semibold">
                              <span className="text-white">Total</span>
                              <span className="text-white">{fmt(o.total_sgd)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Payout breakdown + details */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>PAYOUT SPLIT</p>
                          <div className="space-y-0.5 text-xs">
                            {[
                              ["Platform fee", o.platform_fee_sgd],
                              ["Agent fee",    o.agent_fee_sgd],
                              ["Vendor payout",o.vendor_payout_sgd],
                            ].map(([label, val]) => (
                              <div key={label as string} className="flex justify-between">
                                <span style={{ color: "rgba(255,255,255,0.45)" }}>{label as string}</span>
                                <span style={{ color: "rgba(255,255,255,0.7)" }}>{fmt(val as number)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>FULFILLMENT</p>
                          <p className="text-xs capitalize" style={{ color: "rgba(255,255,255,0.6)" }}>
                            {o.pickup_or_delivery}
                            {o.scheduled_at && ` · ${new Date(o.scheduled_at).toLocaleString("en-SG")}`}
                            {o.fulfilled_at  && ` · fulfilled ${timeAgo(o.fulfilled_at)}`}
                          </p>
                          {o.customer_notes && (
                            <p className="text-xs mt-1" style={{ color: "#fde68a" }}>📝 {o.customer_notes}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fulfillment pipeline + actions */}
                    <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                      {/* Step pipeline */}
                      <div className="flex items-center gap-1">
                        {FULFIL_STEPS.map((step, i) => {
                          const idx = FULFIL_STEPS.indexOf(o.status as typeof FULFIL_STEPS[number]);
                          const done = i <= idx;
                          return (
                            <div key={step} className="flex items-center gap-1">
                              {i > 0 && <div style={{ width: 16, height: 1, background: done ? "#a78bfa" : "rgba(255,255,255,0.15)" }} />}
                              <span className="text-xs capitalize px-2 py-0.5 rounded-full"
                                style={done
                                  ? { background: "rgba(167,139,250,0.2)", color: "#c084fc" }
                                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}>
                                {step}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {o.customer_phone && (
                          <a href={`https://wa.me/${o.customer_phone.replace(/\D/g, "")}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                            style={{ background: "rgba(37,211,102,0.15)", color: "#4ade80", border: "1px solid rgba(37,211,102,0.3)" }}>
                            💬 WA Customer
                          </a>
                        )}
                        {o.payment_status === "unpaid" && (
                          <button onClick={() => patch(o.id, { payment_status: "paid" })}
                            disabled={updating === o.id}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40"
                            style={{ background: "rgba(52,211,153,0.15)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.3)" }}>
                            {updating === o.id ? "…" : "✓ Mark Paid"}
                          </button>
                        )}
                        {o.status === "pending" && (
                          <button onClick={() => patch(o.id, { status: "confirmed" })}
                            disabled={updating === o.id}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40"
                            style={{ background: "rgba(96,165,250,0.15)", color: "#93c5fd", border: "1px solid rgba(96,165,250,0.3)" }}>
                            {updating === o.id ? "…" : "▶ Confirm"}
                          </button>
                        )}
                        {o.status === "confirmed" && (
                          <button onClick={() => patch(o.id, { status: "processing" })}
                            disabled={updating === o.id}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40"
                            style={{ background: "rgba(167,139,250,0.15)", color: "#c084fc", border: "1px solid rgba(167,139,250,0.3)" }}>
                            {updating === o.id ? "…" : "⚙ Processing"}
                          </button>
                        )}
                        {o.status === "processing" && (
                          <button onClick={() => patch(o.id, { status: "ready" })}
                            disabled={updating === o.id}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40"
                            style={{ background: "rgba(52,211,153,0.15)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.3)" }}>
                            {updating === o.id ? "…" : "✓ Ready"}
                          </button>
                        )}
                        {o.status === "ready" && (
                          <button onClick={() => patch(o.id, { status: "completed" })}
                            disabled={updating === o.id}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40"
                            style={{ background: "rgba(52,211,153,0.2)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.4)" }}>
                            {updating === o.id ? "…" : "🎉 Complete"}
                          </button>
                        )}
                        {!["completed","cancelled","refunded"].includes(o.status) && (
                          <button onClick={() => patch(o.id, { status: "cancelled" })}
                            disabled={updating === o.id}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40"
                            style={{ background: "rgba(248,113,113,0.1)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.2)" }}>
                            {updating === o.id ? "…" : "✕ Cancel"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button disabled={page === 1}
            onClick={() => { const p = page - 1; setPage(p); load(statusF, payF, p); }}
            className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
            ← Prev
          </button>
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            {page} / {totalPages}
          </span>
          <button disabled={page === totalPages}
            onClick={() => { const p = page + 1; setPage(p); load(statusF, payF, p); }}
            className="px-3 py-1.5 rounded-lg text-sm disabled:opacity-30"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

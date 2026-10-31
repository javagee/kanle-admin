"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

interface Booking {
  id: string;
  booking_type: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  travel_date: string;
  adults: number;
  children: number;
  total_sgd: number | null;
  payment_status: string;
  payment_ref: string | null;
  special_requests: string | null;
  created_at: string;
  customers: { id: string; phone_number: string; display_name: string | null } | null;
  tour_packages: { id: string; name: string; destination: string; price_adult_sgd: number } | null;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
};

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending:   { background: "rgba(251,191,36,0.15)",  color: "#fde68a", border: "1px solid rgba(251,191,36,0.3)" },
  confirmed: { background: "rgba(52,211,153,0.15)",  color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.3)" },
  completed: { background: "rgba(96,165,250,0.15)",  color: "#93c5fd", border: "1px solid rgba(96,165,250,0.3)" },
  cancelled: { background: "rgba(248,113,113,0.15)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.3)" },
};

const PAYMENT_STYLES: Record<string, React.CSSProperties> = {
  unpaid:               { background: "rgba(248,113,113,0.15)", color: "#fca5a5" },
  paid:                 { background: "rgba(52,211,153,0.15)",  color: "#6ee7b7" },
  partial:              { background: "rgba(251,191,36,0.15)",  color: "#fde68a" },
  refunded:             { background: "rgba(148,163,184,0.15)", color: "#cbd5e1" },
  pending_verification: { background: "rgba(96,165,250,0.15)",  color: "#93c5fd" },
};

const STATUS_OPTS   = ["all", "pending", "confirmed", "completed", "cancelled"] as const;
const PAYMENT_OPTS  = ["all", "unpaid", "pending_verification", "paid", "partial", "refunded"] as const;

export default function BookingsPage() {
  const [bookings, setBookings]         = useState<Booking[]>([]);
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [payFilter, setPayFilter]       = useState("all");
  const [search, setSearch]             = useState("");
  const [updating, setUpdating]         = useState<string | null>(null);
  const [verifying, setVerifying]       = useState<string | null>(null);
  const [expanded, setExpanded]         = useState<string | null>(null);

  const load = async (s = statusFilter, p = payFilter) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (s !== "all") params.set("status", s);
    if (p !== "all") params.set("payment_status", p);
    const res = await fetch(`/api/admin/bookings?${params}`);
    const data = await res.json();
    setBookings(data.bookings ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patch = async (id: string, update: Record<string, string>) => {
    setUpdating(id);
    await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...update }),
    });
    await load(statusFilter, payFilter);
    setUpdating(null);
  };

  const verify = async (id: string) => {
    setVerifying(id);
    await fetch(`/api/admin/bookings/${id}/verify`, { method: "POST" });
    await load(statusFilter, payFilter);
    setVerifying(null);
  };

  const filtered = bookings.filter(b => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      b.customers?.display_name?.toLowerCase().includes(s) ||
      b.customers?.phone_number?.includes(s) ||
      b.tour_packages?.name?.toLowerCase().includes(s) ||
      b.tour_packages?.destination?.toLowerCase().includes(s) ||
      b.payment_ref?.toLowerCase().includes(s)
    );
  });

  const counts = {
    pending:              bookings.filter(b => b.status === "pending").length,
    confirmed:            bookings.filter(b => b.status === "confirmed").length,
    unpaid:               bookings.filter(b => b.payment_status === "unpaid" && b.status !== "cancelled").length,
    pendingVerification:  bookings.filter(b => b.payment_status === "pending_verification").length,
  };

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto">

        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <a href="/admin" className="text-sm transition-opacity hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.45)" }}>← Dashboard</a>
            <h1 className="text-xl font-bold text-white mt-1">Tour Bookings</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {bookings.length} total · {counts.pending} pending · {counts.unpaid} unpaid
              {counts.pendingVerification > 0 && (
                <span style={{ color: "#93c5fd", fontWeight: 600 }}> · {counts.pendingVerification} awaiting verification</span>
              )}
            </p>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {[
            { label: "Pending review",    value: counts.pending,             color: "#fde68a", bg: "rgba(251,191,36,0.1)" },
            { label: "Confirmed",          value: counts.confirmed,           color: "#6ee7b7", bg: "rgba(52,211,153,0.1)" },
            { label: "Awaiting payment",   value: counts.unpaid,              color: "#fca5a5", bg: "rgba(248,113,113,0.1)" },
            { label: "Needs verification", value: counts.pendingVerification, color: "#93c5fd", bg: "rgba(96,165,250,0.1)" },
          ].map(pill => (
            <div key={pill.label} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
              style={{ background: pill.bg, border: `1px solid ${pill.color}30` }}>
              <span className="text-2xl font-bold" style={{ color: pill.color }}>{pill.value}</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{pill.label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap items-center">
          {/* Status filter */}
          <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {STATUS_OPTS.map(s => (
              <button key={s}
                onClick={() => { setStatusFilter(s); load(s, payFilter); }}
                className="px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all"
                style={statusFilter === s
                  ? { background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }
                  : { color: "rgba(255,255,255,0.45)" }}>
                {s}
              </button>
            ))}
          </div>

          {/* Payment filter */}
          <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {PAYMENT_OPTS.map(p => (
              <button key={p}
                onClick={() => { setPayFilter(p); load(statusFilter, p); }}
                className="px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all"
                style={payFilter === p
                  ? { background: "rgba(96,165,250,0.3)", color: "#93c5fd" }
                  : { color: "rgba(255,255,255,0.45)" }}>
                {p}
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, package…"
            className="flex-1 min-w-48 rounded-xl px-4 py-2 text-sm text-white"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }}
          />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {filtered.length} booking{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Booking list */}
        {loading ? (
          <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.35)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.3)" }}>No bookings found</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(b => {
              const isExpanded = expanded === b.id;
              const travelDate = new Date(b.travel_date);
              const daysUntil  = Math.ceil((travelDate.getTime() - Date.now()) / 86400000);
              const isUrgent   = daysUntil <= 7 && daysUntil >= 0 && b.status !== "cancelled";
              const isPast     = daysUntil < 0;

              return (
                <div key={b.id} style={{ ...GLASS, borderLeft: isUrgent ? "3px solid #fde68a" : undefined }}>
                  {/* Main row */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : b.id)}
                  >
                    {/* Date block */}
                    <div className="flex-shrink-0 w-14 text-center rounded-lg py-2"
                      style={{ background: isPast ? "rgba(148,163,184,0.1)" : "rgba(167,139,250,0.15)" }}>
                      <div className="text-xs font-bold" style={{ color: isPast ? "#94a3b8" : "#c084fc" }}>
                        {travelDate.toLocaleDateString("en-SG", { month: "short" }).toUpperCase()}
                      </div>
                      <div className="text-xl font-extrabold text-white leading-none">
                        {travelDate.getDate()}
                      </div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {travelDate.getFullYear()}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">
                          {b.customers?.display_name || b.customers?.phone_number || "Unknown"}
                        </span>
                        {b.customers?.phone_number && b.customers.display_name && (
                          <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {b.customers.phone_number}
                          </span>
                        )}
                        {isUrgent && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                            style={{ background: "rgba(251,191,36,0.2)", color: "#fde68a" }}>
                            {daysUntil === 0 ? "TODAY" : `${daysUntil}d away`}
                          </span>
                        )}
                      </div>
                      <div className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                        {b.tour_packages?.name ?? "Unknown package"}
                        {b.tour_packages?.destination && (
                          <span style={{ color: "rgba(255,255,255,0.3)" }}> · {b.tour_packages.destination}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        <span>{b.adults}A{b.children > 0 ? ` ${b.children}C` : ""}</span>
                        {b.total_sgd && <span className="font-semibold text-white">S${b.total_sgd.toFixed(2)}</span>}
                        <span className="capitalize">{b.booking_type.replace("_", " ")}</span>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                        style={STATUS_STYLES[b.status] ?? STATUS_STYLES.pending}>
                        {b.status}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                        style={PAYMENT_STYLES[b.payment_status] ?? PAYMENT_STYLES.unpaid}>
                        {b.payment_status}
                      </span>
                      <span className="text-gray-500 text-xs ml-1">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                      <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Details */}
                        <div className="space-y-2 text-sm">
                          <div className="flex gap-2">
                            <span style={{ color: "rgba(255,255,255,0.4)", minWidth: 120 }}>Booking ID</span>
                            <span className="font-mono text-xs text-white">{b.id}</span>
                          </div>
                          <div className="flex gap-2">
                            <span style={{ color: "rgba(255,255,255,0.4)", minWidth: 120 }}>Created</span>
                            <span className="text-white">{new Date(b.created_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <div className="flex gap-2">
                            <span style={{ color: "rgba(255,255,255,0.4)", minWidth: 120 }}>Travel date</span>
                            <span className="text-white">{travelDate.toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                          </div>
                          <div className="flex gap-2">
                            <span style={{ color: "rgba(255,255,255,0.4)", minWidth: 120 }}>Pax</span>
                            <span className="text-white">{b.adults} adult{b.adults !== 1 ? "s" : ""}{b.children > 0 ? `, ${b.children} child${b.children !== 1 ? "ren" : ""}` : ""}</span>
                          </div>
                          {b.payment_ref && (
                            <div className="flex gap-2">
                              <span style={{ color: "rgba(255,255,255,0.4)", minWidth: 120 }}>Payment ref</span>
                              <span className="font-mono text-xs text-white">{b.payment_ref}</span>
                            </div>
                          )}
                          {b.special_requests && (
                            <div className="flex gap-2">
                              <span style={{ color: "rgba(255,255,255,0.4)", minWidth: 120 }}>Special requests</span>
                              <span className="text-white">{b.special_requests}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>Update Status</p>

                          <div className="flex gap-2 flex-wrap">
                            {(["pending", "confirmed", "completed", "cancelled"] as const).map(s => (
                              <button key={s}
                                disabled={b.status === s || updating === b.id}
                                onClick={() => patch(b.id, { status: s })}
                                className="text-xs px-3 py-1.5 rounded-lg font-semibold capitalize transition-all disabled:opacity-30"
                                style={b.status === s ? STATUS_STYLES[s] : {
                                  color: "rgba(255,255,255,0.5)",
                                  border: "1px solid rgba(255,255,255,0.15)",
                                  background: "rgba(255,255,255,0.05)",
                                }}>
                                {updating === b.id ? "…" : s}
                              </button>
                            ))}
                          </div>

                          <p className="text-xs font-semibold uppercase tracking-wide pt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Payment</p>

                          <div className="flex gap-2 flex-wrap">
                            {(["unpaid", "paid", "partial", "refunded"] as const).map(p => (
                              <button key={p}
                                disabled={b.payment_status === p || updating === b.id}
                                onClick={() => patch(b.id, { payment_status: p })}
                                className="text-xs px-3 py-1.5 rounded-lg font-semibold capitalize transition-all disabled:opacity-30"
                                style={b.payment_status === p ? PAYMENT_STYLES[p] : {
                                  color: "rgba(255,255,255,0.5)",
                                  border: "1px solid rgba(255,255,255,0.15)",
                                  background: "rgba(255,255,255,0.05)",
                                }}>
                                {updating === b.id ? "…" : p}
                              </button>
                            ))}
                          </div>

                          {/* Verify payment — shown when customer self-reported */}
                          {b.payment_status === "pending_verification" && (
                            <div className="pt-1">
                              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#93c5fd" }}>
                                ⚠️ Payment pending bank verification
                              </p>
                              <button
                                disabled={verifying === b.id}
                                onClick={() => verify(b.id)}
                                className="text-xs px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg,#34d399,#059669)", color: "#fff" }}
                              >
                                {verifying === b.id ? "Verifying…" : "✅ Verify Payment & Confirm Booking"}
                              </button>
                              <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                                Confirms booking + sends WhatsApp with QR to customer
                              </p>
                            </div>
                          )}

                          {/* Tracking link */}
                          {b.payment_ref && (
                            <a
                              href={`/booking/${b.payment_ref}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all mt-1"
                              style={{ background: "rgba(167,139,250,0.15)", color: "#c084fc", border: "1px solid rgba(167,139,250,0.3)" }}
                            >
                              🔗 Tracking page
                            </a>
                          )}

                          {b.customers?.phone_number && (
                            <a
                              href={`https://wa.me/${b.customers.phone_number.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all mt-1"
                              style={{ background: "rgba(37,211,102,0.15)", color: "#4ade80", border: "1px solid rgba(37,211,102,0.3)" }}
                            >
                              💬 WhatsApp customer
                            </a>
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
      </div>
    </AdminShell>
  );
}

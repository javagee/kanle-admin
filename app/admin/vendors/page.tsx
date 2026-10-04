"use client";

import { useEffect, useState } from "react";

interface Vendor {
  id: string;
  name: string;
  name_zh: string;
  category: string;
  description: string;
  phone: string;
  location: string;
  address: string;
  status: string;
  verified: boolean;
  monthly_fee_sgd: number;
  commission_pct: number;
  uen: string;
  created_at: string;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  activity:    { bg: "rgba(52,211,153,0.2)",  color: "#6ee7b7", label: "Activity" },
  food:        { bg: "rgba(251,191,36,0.2)",  color: "#fde68a", label: "Food & Dining" },
  transport:   { bg: "rgba(96,165,250,0.2)",  color: "#93c5fd", label: "Transport" },
  retail:      { bg: "rgba(167,139,250,0.2)", color: "#c4b5fd", label: "Retail" },
  wellness:    { bg: "rgba(244,114,182,0.2)", color: "#f9a8d4", label: "Wellness" },
  accommodation: { bg: "rgba(45,212,191,0.2)", color: "#99f6e4", label: "Accommodation" },
};

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  active:   { background: "rgba(52,211,153,0.2)",  color: "#6ee7b7" },
  pending:  { background: "rgba(251,191,36,0.2)",  color: "#fde68a" },
  inactive: { background: "rgba(248,113,113,0.2)", color: "#fca5a5" },
};

const FILTERS = ["all", "pending", "active", "inactive"] as const;

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = (status?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (status && status !== "all") params.set("status", status);
    fetch(`/api/admin/vendors?${params}`)
      .then(r => r.json())
      .then(d => { setVendors(d.vendors ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(filter); }, [filter]);

  const approve = async (id: string) => {
    setApprovingId(id);
    await fetch(`/api/admin/vendors/${id}/approve`, { method: "POST" });
    setApprovingId(null);
    load(filter);
  };

  const filtered = vendors.filter(v =>
    !search ||
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.category?.toLowerCase().includes(search.toLowerCase()) ||
    v.location?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = vendors.filter(v => v.status === "pending").length;

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #1a0533 0%, #3d1066 35%, #6B21A8 65%, #9333ea 100%)" }}
    >
      {/* Blobs */}
      <div className="fixed top-[-80px] right-[-60px] w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "#43A047" }} />
      <div className="fixed bottom-[-60px] left-[-40px] w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: "#1E88E5" }} />

      {/* Header */}
      <div
        className="relative z-10 px-8 py-5"
        style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <a href="/admin" className="text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              ← Dashboard
            </a>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-xl font-bold text-white">Vendor Management</h1>
              {pendingCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(251,191,36,0.25)", color: "#fde68a" }}>
                  {pendingCount} pending
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Approve vendors, manage listings and product catalog
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-8">

        {/* Filter + Search bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={filter === f
                  ? { background: "linear-gradient(135deg, #c084fc, #7c3aed)", color: "#fff" }
                  : { color: "rgba(255,255,255,0.45)" }}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vendors…"
            className="flex-1 min-w-48 rounded-xl px-4 py-2 text-sm text-white placeholder-white/30"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              outline: "none",
            }}
          />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {filtered.length} vendor{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Vendor list */}
        {loading ? (
          <p className="text-center py-16" style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.3)" }}>
            No vendors found
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(v => {
              const cat = CATEGORY_COLORS[v.category] ?? { bg: "rgba(255,255,255,0.1)", color: "#e2e8f0", label: v.category };
              const statusStyle = STATUS_STYLES[v.status] ?? STATUS_STYLES.inactive;

              return (
                <div
                  key={v.id}
                  className="rounded-2xl p-5 transition-all hover:scale-[1.003]"
                  style={{
                    ...GLASS,
                    borderLeft: v.status === "pending" ? "3px solid #fbbf24" : "1px solid rgba(255,255,255,0.14)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0"
                        style={{ background: cat.bg, color: cat.color }}
                      >
                        {v.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white truncate">{v.name}</span>
                          {v.name_zh && (
                            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{v.name_zh}</span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={statusStyle}>
                            {v.status}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: cat.bg, color: cat.color }}>
                            {cat.label}
                          </span>
                          {v.verified && (
                            <span className="text-xs" style={{ color: "#6ee7b7" }}>✓ verified</span>
                          )}
                        </div>

                        {v.description && (
                          <p className="text-xs mt-1 line-clamp-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {v.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-1.5 flex-wrap" style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                          {v.location && <span>📍 {v.location}</span>}
                          {v.phone && <span>📞 {v.phone}</span>}
                          {v.uen && <span>UEN: {v.uen}</span>}
                          <span>Commission: {v.commission_pct}%</span>
                          {v.monthly_fee_sgd > 0 && <span>Fee: S${v.monthly_fee_sgd}/mo</span>}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {v.status === "pending" && (
                        <button
                          onClick={() => approve(v.id)}
                          disabled={approvingId === v.id}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                          style={{
                            background: "linear-gradient(135deg, #34d399, #059669)",
                            color: "#fff",
                            boxShadow: "0 2px 12px rgba(52,211,153,0.3)",
                          }}
                        >
                          {approvingId === v.id ? "Approving…" : "✓ Approve"}
                        </button>
                      )}
                      <a
                        href={`/admin/vendors/${v.id}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                        style={{
                          color: "#a78bfa",
                          border: "1px solid rgba(167,139,250,0.3)",
                          background: "rgba(167,139,250,0.08)",
                        }}
                      >
                        View →
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

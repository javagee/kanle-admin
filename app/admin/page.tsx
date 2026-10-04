"use client";

import { useEffect, useState } from "react";

interface Stats {
  vendors: { total: number; active: number };
  orders: { total: number };
  bookings: { total: number };
  agents: { total: number };
  sse: { members: number };
  revenue: {
    total_sgd: number;
    platform_fees_sgd: number;
    pending_agent_commission_sgd: number;
    monthly: { month: string; amount: number }[];
  };
}

const GLASS_CARD = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.15)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
} as const;

const GLASS_CARD_LIGHT = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(139,47,201,0.12)",
  boxShadow: "0 2px 16px rgba(74,14,143,0.08)",
} as const;

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #1a0533 0%, #3d1066 35%, #6B21A8 65%, #9333ea 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="fixed top-[-100px] right-[-80px] w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "#E53935" }} />
      <div className="fixed bottom-[-60px] left-[-60px] w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: "#1E88E5" }} />
      <div className="fixed top-1/2 left-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "#FDD835" }} />

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
          <div className="flex items-center gap-3">
            {/* Mini logo blocks */}
            <div className="flex gap-0.5">
              {[
                { letter: "H", bg: "#E53935" },
                { letter: "I", bg: "#43A047" },
                { letter: "P", bg: "#1E88E5" },
                { letter: "Y", bg: "#FDD835", color: "#333" },
              ].map(({ letter, bg, color }, i) => (
                <div key={i} className="w-6 h-6 rounded flex items-center justify-center font-extrabold text-xs"
                  style={{ background: bg, color: color ?? "#fff" }}>
                  {letter}
                </div>
              ))}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">康乐·逍遥游 · Admin ERP</h1>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                HipyHub Tours · Managed by IES Entrepreneurs (S) Pte Ltd
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              <div>Commerce-as-a-Service Platform</div>
              <div className="font-mono mt-0.5">v2.0.0</div>
            </div>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{
                color: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-8">

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Revenue",       value: loading ? "—" : `S$${stats?.revenue.total_sgd?.toFixed(2) ?? 0}`,                    sub: "All transactions",     color: "#a78bfa" },
            { label: "Platform Fees",        value: loading ? "—" : `S$${stats?.revenue.platform_fees_sgd?.toFixed(2) ?? 0}`,            sub: "15% commission income", color: "#60a5fa" },
            { label: "Active Vendors",       value: loading ? "—" : `${stats?.vendors.active ?? 0}/${stats?.vendors.total ?? 0}`,        sub: "Approved / Total",     color: "#34d399" },
            { label: "SSE Members",          value: loading ? "—" : `${stats?.sse.members ?? 0}`,                                        sub: "Loyalty programme",    color: "#fbbf24" },
            { label: "Tour Bookings",        value: loading ? "—" : `${stats?.bookings.total ?? 0}`,                                     sub: "All time",             color: "#a78bfa" },
            { label: "Marketplace Orders",   value: loading ? "—" : `${stats?.orders.total ?? 0}`,                                       sub: "Vendor orders",        color: "#60a5fa" },
            { label: "Active Agents",        value: loading ? "—" : `${stats?.agents.total ?? 0}`,                                       sub: "Sales partners",       color: "#34d399" },
            { label: "Pending Payouts",      value: loading ? "—" : `S$${stats?.revenue.pending_agent_commission_sgd?.toFixed(2) ?? 0}`, sub: "Agent commissions",    color: "#f87171" },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl p-5" style={GLASS_CARD}>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                {kpi.label}
              </div>
              <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Monthly Revenue Chart */}
        {stats?.revenue.monthly && stats.revenue.monthly.length > 0 && (
          <div className="rounded-xl p-6 mb-8" style={GLASS_CARD}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "rgba(255,255,255,0.8)" }}>
              Monthly Revenue (SGD)
            </h2>
            <div className="flex items-end gap-3 h-32">
              {stats.revenue.monthly.map(({ month, amount }) => {
                const max = Math.max(...stats.revenue.monthly.map(m => m.amount));
                const pct = max > 0 ? (amount / max) * 100 : 0;
                return (
                  <div key={month} className="flex flex-col items-center flex-1">
                    <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                      S${amount.toFixed(0)}
                    </div>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(pct, 4)}%`,
                        background: "linear-gradient(180deg, #c084fc, #7c3aed)",
                      }}
                    />
                    <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {month.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "🏪 Vendor Management",
              desc: "Approve vendors, manage listings, view product catalog",
              links: [
                { label: "Pending approvals →", href: "/admin/vendors?status=pending" },
                { label: "All vendors →",        href: "/admin/vendors" },
              ],
              accent: "#34d399",
            },
            {
              title: "👥 Sales Agents",
              desc: "Track agent referrals, commissions, and payout batches",
              links: [
                { label: "Agent dashboard →",  href: "/admin/agents" },
                { label: "Pending payouts →",  href: "/admin/agents/payouts" },
              ],
              accent: "#60a5fa",
            },
            {
              title: "💳 SSE Loyalty",
              desc: "Manage SSE members, voucher issuance, tier upgrades",
              links: [
                { label: "Members list →", href: "/admin/sse" },
                { label: "Vouchers →",     href: "/admin/sse/vouchers" },
              ],
              accent: "#fbbf24",
            },
            {
              title: "📦 Orders & Bookings",
              desc: "Tour bookings + marketplace orders + payment status",
              links: [
                { label: "Tour bookings →",      href: "/admin/bookings" },
                { label: "Marketplace orders →", href: "/admin/orders" },
              ],
              accent: "#a78bfa",
            },
            {
              title: "💬 Conversations",
              desc: "WhatsApp conversations, handoff queue, security log",
              links: [
                { label: "Active chats →",  href: "/admin/conversations" },
                { label: "Security log →",  href: "/admin/security" },
              ],
              accent: "#f472b6",
            },
            {
              title: "🏢 Tenants",
              desc: "Onboard new clients, set WABA numbers, configure commission rates per tenant",
              links: [
                { label: "All tenants →",    href: "/admin/tenants" },
                { label: "Add new tenant →", href: "/admin/tenants" },
              ],
              accent: "#818cf8",
            },
            {
              title: "⚙️ Platform Settings",
              desc: "SSE rates, commission defaults, system config",
              links: [
                { label: "Commission rates →", href: "/admin/settings/commission" },
              ],
              accent: "#94a3b8",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="rounded-xl p-5 transition-all hover:scale-[1.01]"
              style={{
                ...GLASS_CARD,
                borderLeft: `3px solid ${card.accent}`,
              }}
            >
              <h3 className="font-semibold mb-1 text-white">{card.title}</h3>
              <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>{card.desc}</p>
              <div className="space-y-1">
                {card.links.map((l, j) => (
                  <a
                    key={j}
                    href={l.href}
                    className="block text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ color: card.accent }}
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs mt-10" style={{ color: "rgba(255,255,255,0.2)" }}>
          IES Entrepreneurs (S) Pte Ltd · Commerce-as-a-Service Platform · v2.0.0
        </p>
      </div>
    </div>
  );
}

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

interface ConvStats {
  summary: {
    total_conversations: number;
    total_converted: number;
    overall_rate_pct: number;
    avg_msgs_to_close: number;
    best_persona: string | null;
    best_persona_rate: number;
  };
}

const GLASS_CARD = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.15)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
} as const;


export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [convStats, setConvStats] = useState<ConvStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then(r => r.json()),
      fetch("/api/admin/conversion-stats").then(r => r.json()).catch(() => null),
    ]).then(([s, c]) => {
      setStats(s);
      setConvStats(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
      <div className="max-w-6xl mx-auto">

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

        {/* AI Conversion Intelligence strip */}
        <div className="rounded-xl p-5 mb-6" style={{ ...GLASS_CARD, borderLeft: "3px solid #a78bfa" }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                🤖 AI Conversion Intelligence · 90-day
              </div>
              <div className="flex items-center gap-6 mt-2 flex-wrap">
                {[
                  {
                    label: "Conversations",
                    value: loading ? "—" : `${convStats?.summary.total_conversations ?? 0}`,
                    color: "#a78bfa",
                  },
                  {
                    label: "Converted",
                    value: loading ? "—" : `${convStats?.summary.total_converted ?? 0}`,
                    color: "#34d399",
                  },
                  {
                    label: "Conversion Rate",
                    value: loading ? "—" : `${convStats?.summary.overall_rate_pct ?? 0}%`,
                    color: "#60a5fa",
                  },
                  {
                    label: "Avg Messages to Close",
                    value: loading ? "—" : `${convStats?.summary.avg_msgs_to_close ?? 0}`,
                    color: "#fbbf24",
                  },
                  {
                    label: "Best Persona",
                    value: loading
                      ? "—"
                      : convStats?.summary.best_persona
                      ? `${convStats.summary.best_persona} · ${convStats.summary.best_persona_rate}%`
                      : "—",
                    color: "#f472b6",
                  },
                ].map((m, i) => (
                  <div key={i}>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{m.label}</div>
                    <div className="text-lg font-bold capitalize" style={{ color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <a
              href="/admin/conversion"
              className="text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}
            >
              View full report →
            </a>
          </div>
        </div>

        {/* Monthly Revenue Chart */}
        {stats?.revenue.monthly && stats.revenue.monthly.length > 0 && (
          <div className="rounded-xl p-6 mb-8" style={GLASS_CARD}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "rgba(255,255,255,0.8)" }}>
              Monthly Revenue (SGD)
            </h2>
            <div className="flex items-end gap-3" style={{ height: 128 }}>
              {(() => {
                const max = Math.max(...stats.revenue.monthly.map(m => m.amount), 1);
                const BAR_MAX_H = 80; // px reserved for bars (labels take the rest)
                return stats.revenue.monthly.map(({ month, amount }) => {
                  const barH = Math.max(Math.round((amount / max) * BAR_MAX_H), 4);
                  return (
                    <div key={month} className="flex flex-col items-center flex-1" style={{ height: 128 }}>
                      <div className="flex-1 flex items-end w-full">
                        <div className="text-xs w-full text-center mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                          S${amount.toFixed(0)}
                        </div>
                      </div>
                      <div
                        className="w-full rounded-t-md"
                        style={{
                          height: barH,
                          background: "linear-gradient(180deg, #c084fc, #7c3aed)",
                        }}
                      />
                      <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {month.slice(5)}
                      </div>
                    </div>
                  );
                });
              })()}
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
              title: "🎓 LMS Platform",
              desc: "Manage schools, online courses, student enrollments, and payment verification",
              links: [
                { label: "All courses →",    href: "/admin/courses" },
                { label: "All students →",   href: "/admin/students" },
              ],
              accent: "#c084fc",
            },
            {
              title: "📊 Conversion Intelligence",
              desc: "AI persona conversion rates, weekly trends, avg messages to close",
              links: [
                { label: "Full conversion report →", href: "/admin/conversion" },
                { label: "Conversation log →",       href: "/admin/conversations" },
              ],
              accent: "#a78bfa",
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
  );
}

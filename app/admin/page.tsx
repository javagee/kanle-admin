"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

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
    <AdminShell>
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
    </AdminShell>
  );
}

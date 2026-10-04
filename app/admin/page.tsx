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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 text-white px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">康乐·逍遥游 · Admin ERP</h1>
            <p className="text-emerald-100 text-sm mt-1">HipyHub Tours · Managed by IES Entrepreneurs (S) Pte Ltd</p>
          </div>
          <div className="text-right text-sm text-emerald-100">
            <div>Commerce-as-a-Service Platform</div>
            <div className="font-mono text-xs mt-1">v2.0.0</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Revenue", value: loading ? "—" : `S$${stats?.revenue.total_sgd?.toFixed(2) ?? 0}`, sub: "All transactions", color: "text-emerald-600" },
            { label: "Platform Fees", value: loading ? "—" : `S$${stats?.revenue.platform_fees_sgd?.toFixed(2) ?? 0}`, sub: "15% commission income", color: "text-blue-600" },
            { label: "Active Vendors", value: loading ? "—" : `${stats?.vendors.active ?? 0}/${stats?.vendors.total ?? 0}`, sub: "Approved / Total", color: "text-purple-600" },
            { label: "SSE Members", value: loading ? "—" : `${stats?.sse.members ?? 0}`, sub: "Loyalty programme", color: "text-amber-600" },
            { label: "Tour Bookings", value: loading ? "—" : `${stats?.bookings.total ?? 0}`, sub: "All time", color: "text-emerald-600" },
            { label: "Marketplace Orders", value: loading ? "—" : `${stats?.orders.total ?? 0}`, sub: "Vendor orders", color: "text-blue-600" },
            { label: "Active Agents", value: loading ? "—" : `${stats?.agents.total ?? 0}`, sub: "Sales partners", color: "text-purple-600" },
            { label: "Pending Payouts", value: loading ? "—" : `S$${stats?.revenue.pending_agent_commission_sgd?.toFixed(2) ?? 0}`, sub: "Agent commissions", color: "text-red-500" },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{kpi.label}</div>
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-gray-400 mt-1">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Monthly Revenue Chart (simple bar) */}
        {stats?.revenue.monthly && stats.revenue.monthly.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Monthly Revenue (SGD)</h2>
            <div className="flex items-end gap-3 h-32">
              {stats.revenue.monthly.map(({ month, amount }) => {
                const max = Math.max(...stats.revenue.monthly.map(m => m.amount));
                const pct = max > 0 ? (amount / max) * 100 : 0;
                return (
                  <div key={month} className="flex flex-col items-center flex-1">
                    <div className="text-xs text-gray-500 mb-1">S${amount.toFixed(0)}</div>
                    <div
                      className="w-full bg-emerald-500 rounded-t-md transition-all"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                    <div className="text-xs text-gray-400 mt-1">{month.slice(5)}</div>
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
                { label: "All vendors →",       href: "/admin/vendors" },
              ],
              color: "border-emerald-400",
            },
            {
              title: "👥 Sales Agents",
              desc: "Track agent referrals, commissions, and payout batches",
              links: [
                { label: "Agent dashboard →",   href: "/admin/agents" },
                { label: "Pending payouts →",   href: "/admin/agents/payouts" },
              ],
              color: "border-blue-400",
            },
            {
              title: "💳 SSE Loyalty",
              desc: "Manage SSE members, voucher issuance, tier upgrades",
              links: [
                { label: "Members list →",      href: "/admin/sse" },
                { label: "Vouchers →",          href: "/admin/sse/vouchers" },
              ],
              color: "border-amber-400",
            },
            {
              title: "📦 Orders & Bookings",
              desc: "Tour bookings + marketplace orders + payment status",
              links: [
                { label: "Tour bookings →",     href: "/admin/bookings" },
                { label: "Marketplace orders →", href: "/admin/orders" },
              ],
              color: "border-purple-400",
            },
            {
              title: "💬 Conversations",
              desc: "WhatsApp conversations, handoff queue, security log",
              links: [
                { label: "Active chats →",      href: "/admin/conversations" },
                { label: "Security log →",      href: "/admin/security" },
              ],
              color: "border-rose-400",
            },
            {
              title: "🏢 Tenants",
              desc: "Onboard new clients, set WABA numbers, configure commission rates per tenant",
              links: [
                { label: "All tenants →",       href: "/admin/tenants" },
                { label: "Add new tenant →",    href: "/admin/tenants" },
              ],
              color: "border-indigo-400",
            },
            {
              title: "⚙️ Platform Settings",
              desc: "SSE rates, commission defaults, system config",
              links: [
                { label: "Commission rates →",  href: "/admin/settings/commission" },
              ],
              color: "border-gray-400",
            },
          ].map((card, i) => (
            <div key={i} className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${card.color} border border-gray-100`}>
              <h3 className="font-semibold text-gray-800 mb-1">{card.title}</h3>
              <p className="text-xs text-gray-500 mb-4">{card.desc}</p>
              <div className="space-y-1">
                {card.links.map((l, j) => (
                  <a key={j} href={l.href} className="block text-sm text-emerald-600 hover:text-emerald-800 font-medium">
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-300 mt-10">
          IES Entrepreneurs (S) Pte Ltd · Commerce-as-a-Service Platform · v2.0.0
        </p>
      </div>
    </div>
  );
}

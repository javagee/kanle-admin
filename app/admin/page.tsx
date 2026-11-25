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
  school?: {
    worksheets: number;
    courses: number;
    students: number;
    enrollments: number;
    revenue_sgd: number;
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
  const [role, setRole] = useState<string>("");
  const [features, setFeatures] = useState<Record<string, boolean | undefined> | null>(null);
  const [loading, setLoading] = useState(true);

  // Returns true for super_admin or when feature is not explicitly disabled
  const feat = (key: string) => role === "super_admin" || features === null || features[key] !== false;

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(u => {
      if (u?.role) setRole(u.role);
      if (u?.features) setFeatures(u.features);
    });
    Promise.all([
      fetch("/api/admin/stats").then(r => r.ok ? r.json() : null),
      fetch("/api/admin/conversion-stats").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([s, c]) => {
      setStats(s);
      setConvStats(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
      <div className="max-w-6xl mx-auto">

        {/* KPI Grid — school_operator sees LMS stats; everyone else sees tour/platform stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {role === "school_operator" ? ([
            { label: "Active Worksheets", value: loading ? "—" : `${stats?.school?.worksheets ?? 0}`,                         sub: "Published & available", color: "#a78bfa" },
            { label: "Published Courses",  value: loading ? "—" : `${stats?.school?.courses ?? 0}`,                           sub: "Live courses",          color: "#60a5fa" },
            { label: "Active Students",    value: loading ? "—" : `${stats?.school?.students ?? 0}`,                          sub: "Registered learners",  color: "#34d399" },
            { label: "Total Enrolments",   value: loading ? "—" : `${stats?.school?.enrollments ?? 0}`,                      sub: "All time",              color: "#fbbf24" },
            { label: "Course Revenue",     value: loading ? "—" : `S$${(stats?.school?.revenue_sgd ?? 0).toFixed(2)}`,        sub: "Paid enrolments",      color: "#f472b6" },
          ] as { label: string; value: string; sub: string; color: string }[]).map((kpi, i) => (
            <div key={i} className="rounded-xl p-5" style={GLASS_CARD}>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>{kpi.label}</div>
              <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{kpi.sub}</div>
            </div>
          )) : ([
            { label: "Total Revenue",       value: loading ? "—" : `S$${stats?.revenue?.total_sgd?.toFixed(2) ?? 0}`,                    sub: "All transactions",     color: "#a78bfa" },
            { label: role === "super_admin" ? "Platform Fees" : "Platform Fee Paid", value: loading ? "—" : `S$${stats?.revenue?.platform_fees_sgd?.toFixed(2) ?? 0}`, sub: role === "super_admin" ? "15% commission income" : "Charged by platform", color: "#60a5fa" },
            { label: "Active Vendors",       value: loading ? "—" : `${stats?.vendors?.active ?? 0}/${stats?.vendors?.total ?? 0}`,        sub: "Approved / Total",     color: "#34d399", featureKey: "vendors" },
            { label: "SSE Members",          value: loading ? "—" : `${stats?.sse?.members ?? 0}`,                                        sub: "Loyalty programme",    color: "#fbbf24", featureKey: "sse" },
            { label: "Tour Bookings",        value: loading ? "—" : `${stats?.bookings?.total ?? 0}`,                                     sub: "All time",             color: "#a78bfa" },
            { label: "Marketplace Orders",   value: loading ? "—" : `${stats?.orders?.total ?? 0}`,                                       sub: "Vendor orders",        color: "#60a5fa", featureKey: "vendors" },
            { label: "Active Agents",        value: loading ? "—" : `${stats?.agents?.total ?? 0}`,                                       sub: "Sales partners",       color: "#34d399" },
            { label: "Pending Payouts",      value: loading ? "—" : `S$${stats?.revenue?.pending_agent_commission_sgd?.toFixed(2) ?? 0}`, sub: "Agent commissions",    color: "#f87171" },
          ] as { label: string; value: string; sub: string; color: string; featureKey?: string }[])
          .filter(kpi => !kpi.featureKey || feat(kpi.featureKey))
          .map((kpi, i) => (
            <div key={i} className="rounded-xl p-5" style={GLASS_CARD}>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                {kpi.label}
              </div>
              <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* AI Conversion Intelligence strip — not relevant for school operators */}
        {role !== "school_operator" && (
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
                    value: loading ? "—" : `${convStats?.summary?.total_conversations ?? 0}`,
                    color: "#a78bfa",
                  },
                  {
                    label: "Converted",
                    value: loading ? "—" : `${convStats?.summary?.total_converted ?? 0}`,
                    color: "#34d399",
                  },
                  {
                    label: "Conversion Rate",
                    value: loading ? "—" : `${convStats?.summary?.overall_rate_pct ?? 0}%`,
                    color: "#60a5fa",
                  },
                  {
                    label: "Avg Messages to Close",
                    value: loading ? "—" : `${convStats?.summary?.avg_msgs_to_close ?? 0}`,
                    color: "#fbbf24",
                  },
                  {
                    label: "Best Persona",
                    value: loading
                      ? "—"
                      : convStats?.summary?.best_persona
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
        )}

        {/* Monthly Revenue Chart */}
        {stats?.revenue?.monthly && stats.revenue.monthly.length > 0 && (
          <div className="rounded-xl p-6 mb-8" style={GLASS_CARD}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "rgba(255,255,255,0.8)" }}>
              Monthly Revenue (SGD)
            </h2>
            {(() => {
              const max = Math.max(...stats.revenue.monthly.map(m => m.amount), 1);
              const BAR_MAX_PX = 80;
              return (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: BAR_MAX_PX + 44 }}>
                  {stats.revenue.monthly.map(({ month, amount }) => {
                    const barH = Math.max(Math.round((amount / max) * BAR_MAX_PX), 4);
                    return (
                      <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4, whiteSpace: "nowrap" }}>
                          S${amount.toFixed(0)}
                        </div>
                        <div style={{
                          width: "100%",
                          height: barH,
                          background: "linear-gradient(180deg, #c084fc, #7c3aed)",
                          borderRadius: "4px 4px 0 0",
                        }} />
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
                          {month.slice(5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Getting started — scoped to role, shown only when there's no data yet */}
        {!loading && stats && role === "school_operator" && (stats.school?.worksheets ?? 0) === 0 && (stats.school?.students ?? 0) === 0 && (
          <div className="rounded-xl p-6 mb-6" style={{ ...GLASS_CARD, borderLeft: "3px solid #34d399" }}>
            <p className="text-xs uppercase tracking-wide mb-1 font-semibold" style={{ color: "#34d399" }}>🚀 Getting Started</p>
            <p className="font-semibold text-white mb-1">Your school portal is ready — here&apos;s what to do first</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              {[
                { step: "1", text: "Upload your first worksheet", href: "/admin/worksheets", color: "#34d399" },
                { step: "2", text: "Create a course",             href: "/admin/courses",    color: "#a78bfa" },
                { step: "3", text: "Enrol your first student",    href: "/admin/students",   color: "#60a5fa" },
              ].map(item => (
                <a key={item.step} href={item.href}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 no-underline hover:opacity-80 transition-opacity"
                  style={{ background: `${item.color}12`, border: `1px solid ${item.color}30` }}>
                  <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}25`, color: item.color }}>{item.step}</span>
                  <span className="text-sm font-medium" style={{ color: item.color }}>{item.text} →</span>
                </a>
              ))}
            </div>
          </div>
        )}
        {!loading && stats && role !== "school_operator" && stats.bookings?.total === 0 && (stats.revenue?.total_sgd ?? 0) === 0 && (
          <div className="rounded-xl p-6 mb-6" style={{ ...GLASS_CARD, borderLeft: "3px solid #34d399" }}>
            <p className="text-xs uppercase tracking-wide mb-1 font-semibold" style={{ color: "#34d399" }}>🚀 Getting Started</p>
            <p className="font-semibold text-white mb-1">Your dashboard is ready — here&apos;s what to do first</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              {[
                { step: "1", text: "Add your first tour package",  href: "/admin/tours",    color: "#34d399" },
                { step: "2", text: "Configure booking preferences", href: "/admin/settings", color: "#a78bfa" },
                { step: "3", text: "Set up your AI persona",        href: "/admin/settings", color: "#60a5fa" },
              ].map(item => (
                <a key={item.step} href={item.href}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 no-underline hover:opacity-80 transition-opacity"
                  style={{ background: `${item.color}12`, border: `1px solid ${item.color}30` }}>
                  <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}25`, color: item.color }}>{item.step}</span>
                  <span className="text-sm font-medium" style={{ color: item.color }}>{item.text} →</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            {
              title: "📚 Worksheets",
              desc: "Upload and manage worksheets, set pricing, track downloads",
              links: [
                { label: "All worksheets →", href: "/admin/worksheets" },
              ],
              accent: "#a78bfa",
              schoolOnly: true,
            },
            {
              title: "🎓 Courses",
              desc: "Create courses, manage modules and lessons, publish to students",
              links: [
                { label: "All courses →",   href: "/admin/courses" },
              ],
              accent: "#60a5fa",
              schoolOnly: true,
            },
            {
              title: "👩‍🎓 Students",
              desc: "Student records, enrolments, payment verification",
              links: [
                { label: "All students →",   href: "/admin/students" },
              ],
              accent: "#34d399",
              schoolOnly: true,
            },
            {
              title: "🏪 Vendor Management",
              desc: "Approve vendors, manage listings, view product catalog",
              links: [
                { label: "Pending approvals →", href: "/admin/vendors?status=pending" },
                { label: "All vendors →",        href: "/admin/vendors" },
              ],
              accent: "#34d399",
              hideForSchool: true,
            },
            {
              title: "👥 Sales Agents",
              desc: "Track agent referrals, commissions, and payout batches",
              links: [
                { label: "Agent dashboard →",  href: "/admin/agents" },
                { label: "Pending payouts →",  href: "/admin/agents/payouts" },
              ],
              accent: "#60a5fa",
              hideForSchool: true,
            },
            {
              title: "💳 SSE Loyalty",
              desc: "Manage SSE members, voucher issuance, tier upgrades",
              links: [
                { label: "Members list →", href: "/admin/sse" },
                { label: "Vouchers →",     href: "/admin/sse/vouchers" },
              ],
              accent: "#fbbf24",
              hideForSchool: true,
            },
            {
              title: "🗺️ Tour Packages",
              desc: "Create and manage tour packages, pricing, departure days, inclusions",
              links: [
                { label: "All packages →",    href: "/admin/tours" },
                { label: "Add package →",     href: "/admin/tours" },
              ],
              accent: "#34d399",
              hideForSchool: true,
            },
            {
              title: "📦 Orders & Bookings",
              desc: "Tour bookings + marketplace orders + payment status",
              links: [
                { label: "Tour bookings →",      href: "/admin/bookings" },
                { label: "Marketplace orders →", href: "/admin/orders" },
              ],
              accent: "#a78bfa",
              hideForSchool: true,
            },
            {
              title: "💬 Conversations",
              desc: "WhatsApp conversations, handoff queue, security log",
              links: [
                { label: "Active chats →",  href: "/admin/conversations" },
                { label: "Security log →",  href: "/admin/security" },
              ],
              accent: "#f472b6",
              hideForSchool: true,
            },
            {
              title: "🏢 Tenants",
              desc: "Onboard new clients, set WABA numbers, configure commission rates per tenant",
              links: [
                { label: "All tenants →",    href: "/admin/tenants" },
                { label: "Add new tenant →", href: "/admin/tenants" },
              ],
              accent: "#818cf8",
              superOnly: true,
            },
            {
              title: "🎓 LMS Platform",
              desc: "Manage schools, online courses, student enrollments, and payment verification",
              links: [
                { label: "All courses →",    href: "/admin/courses" },
                { label: "All students →",   href: "/admin/students" },
              ],
              accent: "#c084fc",
              superOnly: true,
            },
            {
              title: "📊 Conversion Intelligence",
              desc: "AI persona conversion rates, weekly trends, avg messages to close",
              links: [
                { label: "Full conversion report →", href: "/admin/conversion" },
                { label: "Conversation log →",       href: "/admin/conversations" },
              ],
              accent: "#a78bfa",
              hideForSchool: true,
            },
            {
              title: "⚙️ Platform Settings",
              desc: "SSE rates, commission defaults, system config",
              links: [
                { label: "Commission rates →", href: "/admin/settings/commission" },
              ],
              accent: "#94a3b8",
              superOnly: true,
            },
          ] as { title: string; desc: string; links: { label: string; href: string }[]; accent: string; superOnly?: boolean; schoolOnly?: boolean; hideForSchool?: boolean }[])
          .filter(card => !card.superOnly || role === "super_admin")
          .filter(card => !card.schoolOnly || role === "school_operator")
          .filter(card => !card.hideForSchool || role !== "school_operator")
          .map((card, i) => (
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

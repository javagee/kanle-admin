"use client";

import { useEffect, useState } from "react";

interface PersonaStats {
  persona: string;
  label: string;
  total: number;
  converted: number;
  rate: number;
}

interface TypeStats {
  type: string;
  label: string;
  count: number;
}

interface WeekPoint {
  week: string;
  label: string;
  total: number;
  converted: number;
  rate: number;
}

interface ConversionData {
  summary: {
    total_conversations: number;
    total_converted: number;
    overall_rate_pct: number;
    avg_msgs_to_close: number;
    best_persona: string | null;
    best_persona_rate: number;
  };
  by_persona: PersonaStats[];
  by_type: TypeStats[];
  weekly_trend: WeekPoint[];
}

const GLASS = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.15)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
} as const;

const PERSONA_COLORS: Record<string, string> = {
  serena:  "#60a5fa",
  maya:    "#c084fc",
  aria:    "#34d399",
  unknown: "#64748b",
};

function RateBar({ rate, color }: { rate: number; color: string }) {
  return (
    <div className="w-full rounded-full h-2 mt-1" style={{ background: "rgba(255,255,255,0.08)" }}>
      <div
        className="h-2 rounded-full transition-all duration-700"
        style={{ width: `${Math.min(rate, 100)}%`, background: color }}
      />
    </div>
  );
}

export default function ConversionDashboard() {
  const [data, setData] = useState<ConversionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/conversion-stats")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const s = data?.summary;
  const maxWeekTotal = Math.max(...(data?.weekly_trend.map((w) => w.total) ?? [1]));

  return (
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Conversion Intelligence</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            AI persona performance · 90-day rolling window · Auto-updated on every booking &amp; purchase
          </p>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Conversations",
              value: loading ? "—" : `${s?.total_conversations ?? 0}`,
              sub: "Last 90 days",
              color: "#a78bfa",
            },
            {
              label: "Converted",
              value: loading ? "—" : `${s?.total_converted ?? 0}`,
              sub: "Bookings + purchases",
              color: "#34d399",
            },
            {
              label: "Conversion Rate",
              value: loading ? "—" : `${s?.overall_rate_pct ?? 0}%`,
              sub: "All personas combined",
              color: "#60a5fa",
            },
            {
              label: "Avg Messages to Close",
              value: loading ? "—" : `${s?.avg_msgs_to_close ?? 0}`,
              sub: "Converted conversations only",
              color: "#fbbf24",
            },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl p-5" style={GLASS}>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                {kpi.label}
              </div>
              <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          {/* Per-Persona Funnel */}
          <div className="rounded-xl p-6" style={GLASS}>
            <h2 className="text-sm font-semibold mb-5 text-white">Conversion Rate by Persona</h2>
            {loading ? (
              <div className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</div>
            ) : data?.by_persona.length === 0 ? (
              <div className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                No conversion data yet — bookings and purchases will appear here automatically.
              </div>
            ) : (
              <div className="space-y-5">
                {(data?.by_persona ?? []).map((p) => (
                  <div key={p.persona}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{p.label}</span>
                      <span className="text-sm font-bold" style={{ color: PERSONA_COLORS[p.persona] ?? "#94a3b8" }}>
                        {p.rate}%
                      </span>
                    </div>
                    <RateBar rate={p.rate} color={PERSONA_COLORS[p.persona] ?? "#94a3b8"} />
                    <div className="flex gap-3 mt-1 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      <span>{p.total} conversations</span>
                      <span>→</span>
                      <span style={{ color: "#34d399" }}>{p.converted} converted</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conversion by Type */}
          <div className="rounded-xl p-6" style={GLASS}>
            <h2 className="text-sm font-semibold mb-5 text-white">Conversions by Type</h2>
            {loading ? (
              <div className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</div>
            ) : data?.by_type.length === 0 ? (
              <div className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                No conversions recorded yet. This panel updates automatically when customers book or purchase.
              </div>
            ) : (
              <div className="space-y-4">
                {(data?.by_type ?? []).map((t, i) => {
                  const maxCount = Math.max(...(data?.by_type.map((x) => x.count) ?? [1]));
                  const pct = maxCount > 0 ? (t.count / maxCount) * 100 : 0;
                  const colors = ["#60a5fa", "#c084fc", "#34d399", "#fbbf24"];
                  const col = colors[i % colors.length];
                  return (
                    <div key={t.type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white">{t.label}</span>
                        <span className="text-sm font-bold" style={{ color: col }}>{t.count}</span>
                      </div>
                      <div className="w-full rounded-full h-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div className="h-2 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: col }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {s && s.best_persona && (
              <div className="mt-6 rounded-lg p-3" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
                <div className="text-xs font-semibold" style={{ color: "#34d399" }}>
                  🏆 Best Performing Persona
                </div>
                <div className="text-sm mt-1 text-white capitalize">
                  {s.best_persona} · {s.best_persona_rate}% conversion rate
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="rounded-xl p-6 mb-8" style={GLASS}>
          <h2 className="text-sm font-semibold mb-6 text-white">Weekly Conversion Trend (last 8 weeks)</h2>
          {loading ? (
            <div className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</div>
          ) : (data?.weekly_trend.length ?? 0) === 0 ? (
            <div className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              Not enough data yet — check back after a few weeks of conversations.
            </div>
          ) : (
            <div>
              {/* Stacked bar chart */}
              <div className="flex items-end gap-2 h-40">
                {(data?.weekly_trend ?? []).map((w) => {
                  const totalPct = maxWeekTotal > 0 ? (w.total / maxWeekTotal) * 100 : 0;
                  const convPct  = w.total > 0 ? (w.converted / w.total) * 100 : 0;
                  return (
                    <div key={w.week} className="flex flex-col items-center flex-1 gap-1">
                      <div className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {w.rate}%
                      </div>
                      <div className="relative w-full" style={{ height: `${Math.max(totalPct, 4)}%` }}>
                        {/* Total bar (background) */}
                        <div className="absolute inset-0 rounded-t-sm"
                          style={{ background: "rgba(255,255,255,0.08)" }} />
                        {/* Converted bar (overlay) */}
                        <div className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-700"
                          style={{
                            height: `${convPct}%`,
                            background: "linear-gradient(180deg, #34d399, #059669)",
                          }} />
                      </div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{w.label}</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,255,255,0.08)" }} />
                  Total conversations
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "#34d399" }} />
                  Converted
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Improvement Guidance */}
        <div className="rounded-xl p-6" style={{ ...GLASS, borderLeft: "3px solid #a78bfa" }}>
          <h2 className="text-sm font-semibold mb-4 text-white">📈 How to Improve These Numbers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            <div>
              <div className="font-semibold mb-1" style={{ color: "#60a5fa" }}>Under 10% rate?</div>
              Routing issue — customers aren&apos;t reaching the right persona. Check Aria&apos;s routing logs.
            </div>
            <div>
              <div className="font-semibold mb-1" style={{ color: "#c084fc" }}>10–20% rate?</div>
              Qualification working but close is weak. Review Serena&apos;s Hold Language and Step 5 scripts.
            </div>
            <div>
              <div className="font-semibold mb-1" style={{ color: "#34d399" }}>20%+ rate?</div>
              Best-in-class for WhatsApp tour bots in SEA. Focus on upsell and SSE membership conversion.
            </div>
          </div>
        </div>

        <p className="text-center text-xs mt-8" style={{ color: "rgba(255,255,255,0.15)" }}>
          Conversion data auto-updates on every booking and purchase · 90-day rolling window
        </p>
      </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

interface Agent {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  referral_code: string;
  commission_pct: number;
  total_earned_sgd: number;
  status: string;
  pending_commission_sgd: number;
  paid_commission_sgd: number;
  lead_count: number;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  active:   { background: "rgba(52,211,153,0.15)",  color: "#6ee7b7" },
  inactive: { background: "rgba(148,163,184,0.15)", color: "#94a3b8" },
  suspended:{ background: "rgba(248,113,113,0.15)", color: "#fca5a5" },
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/agents")
      .then(r => r.json())
      .then(d => { setAgents(d.agents ?? []); setLoading(false); });
  }, []);

  const totalPending = agents.reduce((s, a) => s + (a.pending_commission_sgd ?? 0), 0);
  const totalEarned  = agents.reduce((s, a) => s + (a.total_earned_sgd ?? 0), 0);

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <a href="/admin" className="text-sm hover:opacity-80 transition-opacity"
              style={{ color: "rgba(255,255,255,0.45)" }}>← Dashboard</a>
            <h1 className="text-xl font-bold text-white mt-1">Sales Agents</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {agents.length} agents · S${totalEarned.toFixed(2)} total earned · S${totalPending.toFixed(2)} pending payout
            </p>
          </div>
          <a href="/admin/agents/payouts"
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
            💸 Manage Payouts
          </a>
        </div>

        {/* Summary pills */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {[
            { label: "Total agents",    value: agents.length,                           color: "#c084fc", bg: "rgba(192,132,252,0.1)" },
            { label: "Active",          value: agents.filter(a => a.status === "active").length, color: "#6ee7b7", bg: "rgba(52,211,153,0.1)" },
            { label: "Total earned",    value: `S$${totalEarned.toFixed(2)}`,           color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
            { label: "Pending payout",  value: `S$${totalPending.toFixed(2)}`,          color: "#fde68a", bg: "rgba(251,191,36,0.1)" },
          ].map(p => (
            <div key={p.label} className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm"
              style={{ background: p.bg, border: `1px solid ${p.color}30` }}>
              <span className="text-xl font-bold" style={{ color: p.color }}>{p.value}</span>
              <span style={{ color: "rgba(255,255,255,0.45)" }}>{p.label}</span>
            </div>
          ))}
        </div>

        {/* Agent list */}
        {loading ? (
          <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.35)" }}>Loading…</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.3)" }}>No agents yet</div>
        ) : (
          <div className="space-y-3">
            {agents.map(a => (
              <div key={a.id} style={GLASS} className="p-4">
                <div className="flex items-center gap-4 flex-wrap">

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-white">{a.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                        style={STATUS_STYLE[a.status] ?? STATUS_STYLE.inactive}>{a.status}</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded"
                        style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa" }}>
                        {a.referral_code}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      <span>{a.phone}</span>
                      {a.email && <span>{a.email}</span>}
                      <span>{a.commission_pct}% commission rate</span>
                      <span>{a.lead_count} leads</span>
                    </div>
                  </div>

                  {/* Financials */}
                  <div className="flex gap-6 text-right flex-shrink-0">
                    <div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Total Earned</div>
                      <div className="font-bold text-white">S${Number(a.total_earned_sgd ?? 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Pending</div>
                      <div className="font-bold" style={{ color: a.pending_commission_sgd > 0 ? "#fde68a" : "rgba(255,255,255,0.3)" }}>
                        S${Number(a.pending_commission_sgd ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Paid Out</div>
                      <div className="font-bold" style={{ color: "#6ee7b7" }}>S${Number(a.paid_commission_sgd ?? 0).toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  {a.pending_commission_sgd > 0 && (
                    <a href="/admin/agents/payouts"
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex-shrink-0"
                      style={{ background: "rgba(251,191,36,0.15)", color: "#fde68a", border: "1px solid rgba(251,191,36,0.3)" }}>
                      Pay out →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

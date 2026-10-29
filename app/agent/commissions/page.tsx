"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Commission {
  id: string;
  source_type: string;
  source_ref: string;
  gross_amount_sgd: number;
  commission_pct: number;
  commission_sgd: number;
  status: string;
  created_at: string;
}

interface Payout {
  id: string;
  batch_no: string;
  total_sgd: number;
  status: string;
  payment_method: string;
  created_at: string;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)", backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.14)",
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  pending: { bg: "rgba(251,191,36,0.15)",  color: "#fbbf24" },
  batched: { bg: "rgba(96,165,250,0.15)",  color: "#60a5fa" },
  paid:    { bg: "rgba(52,211,153,0.15)",  color: "#34d399" },
};

const NAV = [
  { href: "/agent/portal",      label: "Dashboard" },
  { href: "/agent/leads",       label: "Leads" },
  { href: "/agent/commissions", label: "Commissions", active: true },
];

export default function AgentCommissionsPage() {
  const router = useRouter();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState("");
  const [agentCode, setAgentCode] = useState("");
  const [totals, setTotals] = useState({ pending: 0, paid: 0 });

  useEffect(() => {
    const code = sessionStorage.getItem("agent_code");
    if (!code) { router.push("/agent/login"); return; }
    setAgentCode(code);

    Promise.all([
      fetch(`/api/agent?code=${code}`).then(r => r.json()),
      fetch(`/api/agent/commissions?code=${code}`).then(r => r.json()),
    ]).then(([profile, commsData]) => {
      setAgentName(profile.agent?.name ?? "");
      setTotals({
        pending: profile.commissions?.pending_sgd ?? 0,
        paid: profile.commissions?.paid_sgd ?? 0,
      });
      setCommissions(commsData.commissions ?? []);
      setPayouts(commsData.payouts ?? []);
    }).catch(() => {
      sessionStorage.removeItem("agent_code");
      router.push("/agent/login");
    }).finally(() => setLoading(false));
  }, [router]);

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a1a 0%,#0d1f0d 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif" }}>Loading…</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a1a 0%,#0d1f0d 100%)", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#009658,#00c473)", padding: "20px 28px" }}>
        <h1 style={{ color: "white", fontSize: 20, fontWeight: 700, margin: 0 }}>👋 {agentName}</h1>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, margin: "3px 0 0" }}>
          HipyHub Sales Partner · <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{agentCode}</span>
        </p>
      </div>

      {/* Nav */}
      <div style={{ background: "rgba(0,0,0,0.3)", display: "flex", gap: 4, padding: "0 28px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {NAV.map(n => (
          <Link key={n.href} href={n.href} style={{
            padding: "12px 18px", fontSize: 13, fontWeight: 600, textDecoration: "none",
            color: n.active ? "#00c473" : "rgba(255,255,255,0.45)",
            borderBottom: n.active ? "2px solid #00c473" : "2px solid transparent",
          }}>{n.label}</Link>
        ))}
      </div>

      <div style={{ maxWidth: 960, margin: "28px auto", padding: "0 20px" }}>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
          <div style={{ ...GLASS, background: "rgba(26,26,46,0.9)", borderRadius: 14, padding: "18px 20px" }}>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Pending Payout</p>
            <p style={{ color: "#f5a623", fontSize: 28, fontWeight: 800, margin: "6px 0 0" }}>S${totals.pending.toFixed(2)}</p>
          </div>
          <div style={{ ...GLASS, borderRadius: 14, padding: "18px 20px" }}>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Total Paid Out</p>
            <p style={{ color: "#34d399", fontSize: 28, fontWeight: 800, margin: "6px 0 0" }}>S${totals.paid.toFixed(2)}</p>
          </div>
          <div style={{ ...GLASS, borderRadius: 14, padding: "18px 20px" }}>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Total Earned</p>
            <p style={{ color: "#60a5fa", fontSize: 28, fontWeight: 800, margin: "6px 0 0" }}>S${(totals.pending + totals.paid).toFixed(2)}</p>
          </div>
        </div>

        {/* Commission ledger */}
        <div style={{ ...GLASS, borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ color: "white", fontSize: 15, fontWeight: 700, margin: 0 }}>Commission Ledger</h2>
          </div>
          {commissions.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>No commissions yet</p>
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Commissions appear here when a referred customer confirms a booking</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.3)" }}>
                  {["Reference", "Booking Value", "Commission", "Rate", "Status", "Date"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commissions.map((c, i) => {
                  const st = STATUS_STYLE[c.status] ?? { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" };
                  return (
                    <tr key={c.id} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
                      <td style={{ padding: "12px 16px" }}>
                        <p style={{ color: "white", fontSize: 13, fontFamily: "monospace", fontWeight: 600, margin: 0 }}>{c.source_ref || "—"}</p>
                        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: "2px 0 0" }}>{c.source_type?.replace("_", " ")}</p>
                      </td>
                      <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.7)", fontSize: 14 }}>S${c.gross_amount_sgd?.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", color: "#34d399", fontSize: 14, fontWeight: 700 }}>S${c.commission_sgd?.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.45)", fontSize: 13 }}>{c.commission_pct}%</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{formatDate(c.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Payout history */}
        {payouts.length > 0 && (
          <div style={{ ...GLASS, borderRadius: 16, overflow: "hidden", marginBottom: 32 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <h2 style={{ color: "white", fontSize: 15, fontWeight: 700, margin: 0 }}>Payout History</h2>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.3)" }}>
                  {["Batch", "Amount", "Method", "Status", "Date"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payouts.map((p, i) => (
                  <tr key={p.id} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
                    <td style={{ padding: "12px 16px", color: "white", fontFamily: "monospace", fontSize: 13 }}>{p.batch_no}</td>
                    <td style={{ padding: "12px 16px", color: "#34d399", fontWeight: 700 }}>S${p.total_sgd?.toFixed(2)}</td>
                    <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>{p.payment_method?.replace("_", " ")}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: p.status === "completed" ? "rgba(52,211,153,0.15)" : "rgba(96,165,250,0.15)", color: p.status === "completed" ? "#34d399" : "#60a5fa" }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, textAlign: "center", marginBottom: 32 }}>
          Payouts are processed monthly. Minimum S$50 to trigger a payout. Contact your manager for queries.
        </p>
      </div>
    </div>
  );
}

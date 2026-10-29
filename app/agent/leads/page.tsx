"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Lead {
  id: string;
  customer_phone: string;
  customer_name?: string;
  status: string;
  source_channel: string;
  converted_to?: string;
  created_at: string;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)", backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.14)",
};

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  enquiry:    { bg: "rgba(167,139,250,0.15)", color: "#a78bfa" },
  qualified:  { bg: "rgba(251,191,36,0.15)",  color: "#fbbf24" },
  booked:     { bg: "rgba(52,211,153,0.15)",  color: "#34d399" },
  lost:       { bg: "rgba(248,113,113,0.15)", color: "#f87171" },
  link_click: { bg: "rgba(96,165,250,0.15)",  color: "#60a5fa" },
};

const NAV = [
  { href: "/agent/portal",      label: "Dashboard" },
  { href: "/agent/leads",       label: "Leads",       active: true },
  { href: "/agent/commissions", label: "Commissions" },
];

export default function AgentLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState("");
  const [agentCode, setAgentCode] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const code = sessionStorage.getItem("agent_code");
    if (!code) { router.push("/agent/login"); return; }
    setAgentCode(code);

    Promise.all([
      fetch(`/api/agent?code=${code}`).then(r => r.json()),
      fetch(`/api/agent/leads?code=${code}`).then(r => r.json()),
    ]).then(([profile, leadsData]) => {
      setAgentName(profile.agent?.name ?? "");
      setLeads(leadsData.leads ?? []);
    }).catch(() => {
      sessionStorage.removeItem("agent_code");
      router.push("/agent/login");
    }).finally(() => setLoading(false));
  }, [router]);

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function maskPhone(p: string) {
    if (!p || p === "unknown") return "—";
    return p.length > 6 ? p.slice(0, 4) + "****" + p.slice(-3) : p;
  }

  const filtered = filter === "all" ? leads : leads.filter(l => l.status === filter);

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

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {["all", "link_click", "enquiry", "qualified", "booked", "lost"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                background: filter === f ? "#009658" : "rgba(255,255,255,0.08)",
                color: filter === f ? "white" : "rgba(255,255,255,0.5)",
              }}>
              {f === "all" ? `All (${leads.length})` : `${f.replace("_", " ")} (${leads.filter(l => l.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Leads table */}
        <div style={{ ...GLASS, borderRadius: 16, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 15 }}>No leads yet</p>
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Share your referral link to start tracking customers</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.3)" }}>
                  {["Customer", "Status", "Channel", "Date"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => {
                  const st = STATUS_STYLE[lead.status] ?? { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" };
                  return (
                    <tr key={lead.id} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
                      <td style={{ padding: "12px 16px" }}>
                        <p style={{ color: "white", fontSize: 14, fontWeight: 600, margin: 0 }}>
                          {lead.customer_name || "Unknown"}
                        </p>
                        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, fontFamily: "monospace", margin: "2px 0 0" }}>
                          {maskPhone(lead.customer_phone)}
                        </p>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>
                          {lead.status.replace("_", " ")}
                        </span>
                        {lead.converted_to && (
                          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "4px 0 0" }}>→ Booking ref</p>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                        {lead.source_channel?.replace("_", " ")}
                      </td>
                      <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                        {formatDate(lead.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AgentData {
  agent: { name: string; referral_code: string; commission_pct: number; phone: string };
  commissions: { pending_sgd: number; paid_sgd: number; total_sgd: number; count: number };
  leads: { total: number; enquiry: number; qualified: number; booked: number; lost: number; link_click: number };
  referral_link: string | null;
  trackable_link: string | null;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)", backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
};

export default function AgentPortalPage() {
  const router = useRouter();
  const [data, setData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const code = sessionStorage.getItem("agent_code");
    if (!code) { router.push("/agent/login"); return; }
    fetch(`/api/agent?code=${code}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => { sessionStorage.removeItem("agent_code"); router.push("/agent/login"); })
      .finally(() => setLoading(false));
  }, [router]);

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(null), 2000); });
  }

  function logout() { sessionStorage.removeItem("agent_code"); router.push("/agent/login"); }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a1a 0%,#0d1f0d 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif" }}>Loading…</p>
    </div>
  );
  if (!data) return null;

  const { agent, commissions, leads, referral_link, trackable_link } = data;
  const conversionRate = leads.total > 0 ? Math.round((leads.booked / leads.total) * 100) : 0;
  const qrLink = trackable_link || referral_link;
  const qrUrl = qrLink ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=009658&bgcolor=ffffff&data=${encodeURIComponent(qrLink)}` : null;

  const NAV = [
    { href: "/agent/portal",      label: "Dashboard",   active: true  },
    { href: "/agent/leads",       label: "Leads",       active: false },
    { href: "/agent/commissions", label: "Commissions", active: false },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a1a 0%,#0d1f0d 100%)", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#009658,#00c473)", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ color: "white", fontSize: 20, fontWeight: 700, margin: 0 }}>👋 {agent.name}</h1>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, margin: "3px 0 0" }}>
            HipyHub Sales Partner · <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{agent.referral_code}</span>
          </p>
        </div>
        <button onClick={logout} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", padding: "6px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
          Sign out
        </button>
      </div>

      {/* Nav tabs */}
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

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Pending Commission", value: `S$${commissions.pending_sgd.toFixed(2)}`, sub: "Awaiting payout", color: "#f5a623", dark: true },
            { label: "Total Earned",       value: `S$${commissions.total_sgd.toFixed(2)}`,   sub: `${commissions.count} confirmed deals`, color: "#34d399" },
            { label: "Commission Rate",    value: `${agent.commission_pct}%`,                sub: "Per confirmed booking", color: "#60a5fa" },
            { label: "Total Leads",        value: `${leads.total}`,                          sub: `${conversionRate}% conversion`, color: "#a78bfa" },
          ].map((k, i) => (
            <div key={i} style={{ ...GLASS, borderRadius: 14, padding: "18px 20px", background: k.dark ? "rgba(26,26,46,0.9)" : "rgba(255,255,255,0.07)" }}>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>{k.label}</p>
              <p style={{ color: k.color, fontSize: 26, fontWeight: 800, margin: "6px 0 4px" }}>{k.value}</p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Sales pipeline */}
        <div style={{ ...GLASS, borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <h2 style={{ color: "white", fontSize: 15, fontWeight: 700, margin: "0 0 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
            📊 Sales Pipeline
          </h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "Link Clicks",  num: leads.link_click, color: "#60a5fa" },
              { label: "Enquiries",   num: leads.enquiry,    color: "#a78bfa" },
              { label: "Qualified",   num: leads.qualified,  color: "#fbbf24" },
              { label: "Booked ✅",   num: leads.booked,     color: "#34d399" },
              { label: "Lost",        num: leads.lost,       color: "#f87171" },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, minWidth: 90, textAlign: "center",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: "14px 8px",
              }}>
                <p style={{ color: s.color, fontSize: 28, fontWeight: 800, margin: 0 }}>{s.num}</p>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", margin: "6px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Referral link section */}
        <div style={{ ...GLASS, borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <h2 style={{ color: "white", fontSize: 15, fontWeight: 700, margin: "0 0 4px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
            🔗 Your Referral Link
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, margin: "12px 0 16px" }}>
            Share this link. When a customer taps it, WhatsApp opens with your code pre-filled — booking automatically credited to you.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: qrUrl ? "1fr auto" : "1fr", gap: 20, alignItems: "start" }}>
            <div>
              {/* Trackable link */}
              {trackable_link && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>
                    Share link (with click tracking)
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ flex: 1, background: "rgba(0,150,88,0.12)", border: "1px solid rgba(0,150,88,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#34d399", fontFamily: "monospace", wordBreak: "break-all" }}>
                      {trackable_link}
                    </div>
                    <button onClick={() => copy(trackable_link, "track")}
                      style={{ padding: "10px 14px", borderRadius: 8, background: copied === "track" ? "#009658" : "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {copied === "track" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {/* Direct wa.me link */}
              {referral_link && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>
                    Direct WhatsApp link
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "monospace", wordBreak: "break-all" }}>
                      {referral_link}
                    </div>
                    <button onClick={() => copy(referral_link, "direct")}
                      style={{ padding: "10px 14px", borderRadius: 8, background: copied === "direct" ? "#009658" : "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {copied === "direct" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {referral_link && (
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Book your next trip with HipyHub! Use my code ${agent.referral_code} when you chat with us 🌏 ${trackable_link || referral_link}`)}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: "inline-block", padding: "10px 20px", borderRadius: 8, background: "#25d366", color: "white", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                    📤 Share on WhatsApp
                  </a>
                )}
                {!referral_link && (
                  <p style={{ color: "#f87171", fontSize: 13 }}>⚠️ WABA_PHONE not configured. Contact admin.</p>
                )}
              </div>
            </div>

            {/* QR code */}
            {qrUrl && (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" }}>QR Code</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="Referral QR code" style={{ width: 160, height: 160, borderRadius: 12, border: "4px solid white", background: "white" }} />
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: "8px 0 0" }}>Print on flyers or cards</p>
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 14, padding: "18px 22px", marginBottom: 32 }}>
          <h3 style={{ color: "#f5a623", fontSize: 14, margin: "0 0 10px" }}>💡 How to maximise commissions</h3>
          <ul style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Share your link in WhatsApp groups, Facebook groups, and social media</li>
            <li>Ask customers to tap your link before they message HipyHub — code must be in their first message</li>
            <li>Focus on group bookings (3+ pax) — higher ticket = higher commission</li>
            <li>Print the QR code on a business card or flyer for offline referrals</li>
            <li>Mention the SSE loyalty programme — customers love the 20% discount angle</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

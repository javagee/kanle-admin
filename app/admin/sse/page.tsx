"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

interface Member {
  id: string;
  membership_no: string;
  name: string;
  phone: string;
  email?: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  save_pct: number;
  earn_rate: number;
  total_spend_sgd: number;
  total_saved_sgd: number;
  voucher_balance_sgd: number;
  referral_code?: string;
  referral_count: number;
  active: boolean;
  joined_at?: string;
  customers?: { phone_number?: string; display_name?: string };
}

interface Stats {
  total: number;
  active: number;
  total_voucher_balance: number;
  total_spend_sgd: number;
  by_tier: { bronze: number; silver: number; gold: number; platinum: number };
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
};

const TIER_STYLES: Record<string, React.CSSProperties> = {
  bronze:   { background: "rgba(205,127,50,0.2)",  color: "#cd7f32", border: "1px solid rgba(205,127,50,0.4)" },
  silver:   { background: "rgba(192,192,192,0.2)", color: "#c0c0c0", border: "1px solid rgba(192,192,192,0.4)" },
  gold:     { background: "rgba(255,215,0,0.2)",   color: "#ffd700", border: "1px solid rgba(255,215,0,0.4)" },
  platinum: { background: "rgba(167,139,250,0.2)", color: "#c4b5fd", border: "1px solid rgba(167,139,250,0.4)" },
};

const INPUT: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
  color: "white", fontSize: 13, outline: "none",
};
const LABEL: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4,
};

const EMPTY_FORM = { name: "", phone: "", email: "", tier: "bronze", save_pct: "5", earn_rate: "1", voucher_balance_sgd: "0" };

export default function SSEPage() {
  const [members, setMembers]       = useState<Member[]>([]);
  const [stats, setStats]           = useState<Stats | null>(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [editing, setEditing]       = useState<{ id: string; field: string; value: string } | null>(null);

  const load = async (s = search, t = tierFilter) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (s) params.set("search", s);
    if (t !== "all") params.set("tier", t);
    const r = await fetch(`/api/admin/sse?${params}`);
    const d = await r.json();
    setMembers(d.members ?? []);
    setStats(d.stats ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patch = async (id: string, updates: Record<string, unknown>) => {
    await fetch("/api/admin/sse", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    await load();
  };

  const enroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    const r = await fetch("/api/admin/sse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, save_pct: Number(form.save_pct), earn_rate: Number(form.earn_rate), voucher_balance_sgd: Number(form.voucher_balance_sgd) }),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) { setError(d.error ?? "Enroll failed"); return; }
    setShowForm(false);
    setForm({ ...EMPTY_FORM });
    await load();
  };

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <AdminShell>
      <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ color: "white", fontSize: 24, fontWeight: 700, margin: 0 }}>⭐ SSE Members</h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, margin: "4px 0 0" }}>
              Spend · Save · Earn — loyalty programme
            </p>
          </div>
          <button onClick={() => { setShowForm(true); setError(""); }}
            style={{ padding: "10px 20px", borderRadius: 8, background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "white", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            + Enroll Member
          </button>
        </div>

        {/* Stats row */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Members",  value: stats.total,                          color: "white" },
              { label: "Active",         value: stats.active,                          color: "#34d399" },
              { label: "Voucher Pool",   value: `S$${stats.total_voucher_balance.toFixed(2)}`, color: "#fbbf24" },
              { label: "Total Spend",    value: `S$${stats.total_spend_sgd.toFixed(2)}`,       color: "#60a5fa" },
              { label: "Bronze",         value: stats.by_tier.bronze,                  color: "#cd7f32" },
              { label: "Silver",         value: stats.by_tier.silver,                  color: "#c0c0c0" },
              { label: "Gold",           value: stats.by_tier.gold,                    color: "#ffd700" },
              { label: "Platinum",       value: stats.by_tier.platinum,                color: "#c4b5fd" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ ...GLASS, borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>{label}</p>
                <p style={{ color, fontSize: 22, fontWeight: 700, margin: "4px 0 0" }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <input value={search} onChange={e => { setSearch(e.target.value); load(e.target.value, tierFilter); }}
            placeholder="Search name, phone, membership no…"
            style={{ ...INPUT, width: 280 }} />
          {(["all", "bronze", "silver", "gold", "platinum"] as const).map(t => (
            <button key={t} onClick={() => { setTierFilter(t); load(search, t); }}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                background: tierFilter === t ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                color: tierFilter === t ? "white" : "rgba(255,255,255,0.45)" }}>
              {t}
            </button>
          ))}
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, alignSelf: "center" }}>{members.length} members</span>
        </div>

        {/* Members table */}
        {loading ? (
          <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 40 }}>Loading…</p>
        ) : members.length === 0 ? (
          <div style={{ ...GLASS, borderRadius: 16, padding: 48, textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>No SSE members yet.</p>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Members join when they book through the bot or are enrolled manually.</p>
          </div>
        ) : (
          <div style={{ ...GLASS, borderRadius: 16, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Member", "Tier", "Spend", "Saved", "Vouchers", "Referrals", "Joined", "Status", ""].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map(m => (
                  <>
                    <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                      onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                      <td style={{ padding: "12px 14px" }}>
                        <p style={{ color: "white", fontWeight: 600, fontSize: 13, margin: 0 }}>{m.name}</p>
                        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "monospace", margin: 0 }}>{m.membership_no}</p>
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, margin: 0 }}>{m.phone}</p>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "capitalize", ...TIER_STYLES[m.tier] }}>
                          {m.tier}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", color: "#60a5fa", fontWeight: 700, fontSize: 13 }}>S${Number(m.total_spend_sgd).toFixed(2)}</td>
                      <td style={{ padding: "12px 14px", color: "#34d399", fontSize: 13 }}>S${Number(m.total_saved_sgd).toFixed(2)}</td>
                      <td style={{ padding: "12px 14px" }}>
                        {editing?.id === m.id && editing.field === "voucher" ? (
                          <form onSubmit={async ev => { ev.stopPropagation(); ev.preventDefault(); await patch(m.id, { voucher_balance_sgd: Number(editing.value) }); setEditing(null); }} onClick={e => e.stopPropagation()}>
                            <input autoFocus type="number" step="0.01" value={editing.value}
                              onChange={e => setEditing({ ...editing, value: e.target.value })}
                              style={{ width: 80, padding: "3px 6px", borderRadius: 6, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.3)", color: "white", fontSize: 12 }} />
                            <button type="submit" style={{ marginLeft: 4, color: "#34d399", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>✓</button>
                          </form>
                        ) : (
                          <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                            title="Click to edit"
                            onClick={e => { e.stopPropagation(); setEditing({ id: m.id, field: "voucher", value: String(Number(m.voucher_balance_sgd).toFixed(2)) }); }}>
                            S${Number(m.voucher_balance_sgd).toFixed(2)} ✏
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
                        {m.referral_count > 0 ? (
                          <span style={{ color: "#a78bfa" }}>{m.referral_count} ref{m.referral_count !== 1 ? "s" : ""}</span>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                        {m.joined_at ? new Date(m.joined_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: m.active ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
                          color: m.active ? "#34d399" : "#f87171" }}>
                          {m.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{expanded === m.id ? "▲" : "▼"}</span>
                      </td>
                    </tr>

                    {expanded === m.id && (
                      <tr key={`${m.id}-exp`}>
                        <td colSpan={9} style={{ padding: "0 14px 16px", background: "rgba(255,255,255,0.03)" }}>
                          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", paddingTop: 12 }}>
                            {/* Details */}
                            <div style={{ flex: 1, minWidth: 200 }}>
                              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", margin: "0 0 8px", letterSpacing: "0.5px" }}>Details</p>
                              {[
                                ["Email", m.email || "—"],
                                ["Referral Code", m.referral_code || "—"],
                                ["Save Rate", `${m.save_pct}%`],
                                ["Earn Rate", `${m.earn_rate}× per S$1`],
                              ].map(([k, v]) => (
                                <div key={k} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, minWidth: 110 }}>{k}</span>
                                  <span style={{ color: "white", fontSize: 12 }}>{v}</span>
                                </div>
                              ))}
                            </div>
                            {/* Actions */}
                            <div>
                              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textTransform: "uppercase", margin: "0 0 8px", letterSpacing: "0.5px" }}>Tier</p>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {(["bronze","silver","gold","platinum"] as const).map(t => (
                                  <button key={t} disabled={m.tier === t}
                                    onClick={() => patch(m.id, { tier: t })}
                                    style={{ padding: "4px 12px", borderRadius: 8, border: "none", cursor: m.tier === t ? "default" : "pointer", fontSize: 11, fontWeight: 600, textTransform: "capitalize",
                                      opacity: m.tier === t ? 1 : 0.5, ...TIER_STYLES[t] }}>
                                    {t}
                                  </button>
                                ))}
                              </div>
                              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                                <button onClick={() => patch(m.id, { active: !m.active })}
                                  style={{ padding: "5px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                                    background: m.active ? "rgba(248,113,113,0.12)" : "rgba(52,211,153,0.12)",
                                    color: m.active ? "#f87171" : "#34d399" }}>
                                  {m.active ? "Deactivate" : "Reactivate"}
                                </button>
                                {m.phone && (
                                  <a href={`https://wa.me/${m.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                                    style={{ padding: "5px 14px", borderRadius: 7, background: "rgba(37,211,102,0.12)", color: "#4ade80", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                                    💬 WhatsApp
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enroll modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          background: "rgba(10,0,30,0.7)", backdropFilter: "blur(8px)" }}>
          <div style={{ width: "100%", maxWidth: 480, borderRadius: 20,
            background: "linear-gradient(160deg,#1e0545 0%,#2d0f5e 100%)",
            border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <h2 style={{ color: "white", fontSize: 16, fontWeight: 700, margin: 0 }}>Enroll New SSE Member</h2>
            </div>
            <form onSubmit={enroll}>
              <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={LABEL}>Full Name *</label>
                  <input required style={INPUT} value={form.name} onChange={e => f("name", e.target.value)} placeholder="Tan Mei Ling" />
                </div>
                <div>
                  <label style={LABEL}>Phone *</label>
                  <input required style={INPUT} value={form.phone} onChange={e => f("phone", e.target.value)} placeholder="+6591234567" />
                </div>
                <div>
                  <label style={LABEL}>Email</label>
                  <input type="email" style={INPUT} value={form.email} onChange={e => f("email", e.target.value)} placeholder="optional" />
                </div>
                <div>
                  <label style={LABEL}>Starting Tier</label>
                  <select style={{ ...INPUT, cursor: "pointer" }} value={form.tier} onChange={e => f("tier", e.target.value)}>
                    {["bronze","silver","gold","platinum"].map(t => <option key={t} value={t} style={{ background: "#1e0545" }}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LABEL}>Save Rate (%)</label>
                  <input type="number" min="0" max="100" style={INPUT} value={form.save_pct} onChange={e => f("save_pct", e.target.value)} />
                </div>
                <div>
                  <label style={LABEL}>Opening Voucher (S$)</label>
                  <input type="number" min="0" step="0.01" style={INPUT} value={form.voucher_balance_sgd} onChange={e => f("voucher_balance_sgd", e.target.value)} />
                </div>
              </div>
              {error && <p style={{ color: "#f87171", fontSize: 13, margin: "0 24px 12px" }}>⚠️ {error}</p>}
              <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ padding: "8px 18px", borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: "8px 20px", borderRadius: 9, background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "white", border: "none", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Enrolling…" : "Enroll"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

"use client";

import { useEffect, useState } from "react";

const NAVY2   = "#0F1442";
const CYAN    = "#00E5FF";
const VIOLET  = "#a78bfa";
const PURPLE  = "#7c3aed";
const TEXT    = "#e2e8f0";
const MUTED   = "rgba(226,232,240,0.5)";
const BORDER  = "rgba(0,229,255,0.18)";
const BORDER_V = "rgba(167,139,250,0.25)";
const CARD    = "rgba(255,255,255,0.03)";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 7, fontSize: 13,
  background: "rgba(255,255,255,0.05)", color: TEXT,
  border: "1px solid rgba(255,255,255,0.12)", outline: "none", boxSizing: "border-box",
};

interface Tenant {
  id: string;
  slug: string;
  name: string;
  name_zh: string | null;
  whatsapp_number_id: string | null;
  ai_persona_name: string | null;
  ai_persona_name_zh: string | null;
  ai_system_prompt: string | null;
  logo_url: string | null;
  primary_color: string | null;
  plan: string;
  monthly_fee_sgd: number;
  platform_fee_pct: number;
  agent_fee_pct: number;
  active: boolean;
}

type Tab = "branding" | "persona" | "finance";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [role, setRole]     = useState<string>("");
  const [tab, setTab]       = useState<Tab>("branding");
  const [form, setForm]     = useState<Partial<Tenant>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [err, setErr]       = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(u => setRole(u.role));
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(d => { setTenant(d.tenant); setForm(d.tenant ?? {}); });
  }, []);

  const set = (k: keyof Tenant, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true); setErr(""); setSaved(false);
    const r = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else { const d = await r.json(); setErr(d.error ?? "Save failed"); }
    setSaving(false);
  };

  if (!tenant) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <div style={{ width: 28, height: 28, border: `3px solid ${VIOLET}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "branding", label: "Branding", icon: "🎨" },
    { key: "persona",  label: "AI Persona", icon: "🤖" },
    ...(role === "super_admin" ? [{ key: "finance" as Tab, label: "Finance", icon: "💰" }] : []),
  ];

  return (
    <div style={{ maxWidth: 720 }}>
      <a href="/admin" style={{ fontSize: 12, color: MUTED, textDecoration: "none" }}>← Dashboard</a>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 0 20px" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 }}>Settings</h1>
          <p style={{ fontSize: 12, color: MUTED, margin: "3px 0 0" }}>
            {tenant.name} · <span style={{ color: CYAN }}>{tenant.slug}</span>
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {saved && <span style={{ fontSize: 12, color: "#4ade80" }}>✓ Saved</span>}
          {err && <span style={{ fontSize: 12, color: "#f87171" }}>{err}</span>}
          <button onClick={save} disabled={saving} style={{
            padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`,
            color: "#fff", border: "none", opacity: saving ? 0.6 : 1,
            boxShadow: "0 2px 8px rgba(124,58,237,0.4)",
          }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: "pointer",
            background: tab === t.key ? "rgba(124,58,237,0.2)" : "transparent",
            color: tab === t.key ? VIOLET : MUTED,
            border: `1px solid ${tab === t.key ? BORDER_V : "rgba(255,255,255,0.08)"}`,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24, display: "grid", gap: 20 }}>

        {/* ── BRANDING ── */}
        {tab === "branding" && <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Business Name (English)">
              <input value={form.name ?? ""} onChange={e => set("name", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Business Name (Chinese)">
              <input value={form.name_zh ?? ""} onChange={e => set("name_zh", e.target.value)} placeholder="e.g. 康乐·逍遥游" style={inputStyle} />
            </Field>
          </div>

          <Field label="Logo URL" hint="Direct link to your logo image (PNG/SVG recommended)">
            <input value={form.logo_url ?? ""} onChange={e => set("logo_url", e.target.value)} placeholder="https://..." style={inputStyle} />
          </Field>

          <Field label="Primary Brand Colour">
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="color" value={form.primary_color ?? "#25D366"} onChange={e => set("primary_color", e.target.value)}
                style={{ width: 44, height: 36, padding: 2, borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", cursor: "pointer" }} />
              <input value={form.primary_color ?? ""} onChange={e => set("primary_color", e.target.value)} placeholder="#25D366" style={{ ...inputStyle, flex: 1 }} />
            </div>
          </Field>

          <Field label="WhatsApp Phone Number ID" hint="Meta Business → WhatsApp → Phone Number ID">
            <input value={form.whatsapp_number_id ?? ""} onChange={e => set("whatsapp_number_id", e.target.value)} placeholder="123456789012345" style={inputStyle} />
          </Field>

          <div style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.12)" }}>
            <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
              <span style={{ color: CYAN, fontWeight: 600 }}>Plan:</span> {tenant.plan.toUpperCase()} &nbsp;·&nbsp;
              <span style={{ color: CYAN, fontWeight: 600 }}>Status:</span> {tenant.active ? "Active ✓" : "Inactive"}
            </p>
          </div>
        </>}

        {/* ── AI PERSONA ── */}
        {tab === "persona" && <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Persona Name (English)" hint="e.g. Serena, Maya, Aria">
              <input value={form.ai_persona_name ?? ""} onChange={e => set("ai_persona_name", e.target.value)} placeholder="Serena" style={inputStyle} />
            </Field>
            <Field label="Persona Name (Chinese)" hint="e.g. 思琳娜">
              <input value={form.ai_persona_name_zh ?? ""} onChange={e => set("ai_persona_name_zh", e.target.value)} placeholder="思琳娜" style={inputStyle} />
            </Field>
          </div>

          <Field label="Custom System Prompt" hint="Overrides the default Serena prompt. Leave blank to use the platform default.">
            <textarea
              value={form.ai_system_prompt ?? ""}
              onChange={e => set("ai_system_prompt", e.target.value)}
              rows={12}
              placeholder="You are [Name], the AI assistant for [Business]…"
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, fontFamily: "monospace", fontSize: 12 }}
            />
          </Field>

          <div style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(253,224,71,0.05)", border: "1px solid rgba(253,224,71,0.15)" }}>
            <p style={{ fontSize: 12, color: "rgba(253,224,71,0.8)", margin: 0 }}>
              ⚠️ Changing the system prompt affects all WhatsApp conversations for this tenant immediately on the next message.
            </p>
          </div>
        </>}

        {/* ── FINANCE (super_admin only) ── */}
        {tab === "finance" && role === "super_admin" && <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <Field label="Monthly Fee (SGD)">
              <input type="number" min="0" step="0.01" value={form.monthly_fee_sgd ?? ""} onChange={e => set("monthly_fee_sgd", parseFloat(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Platform Fee %" hint="Charged to vendor per transaction">
              <input type="number" min="0" max="100" step="0.5" value={form.platform_fee_pct ?? ""} onChange={e => set("platform_fee_pct", parseFloat(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Agent Commission %" hint="Paid to referral agents">
              <input type="number" min="0" max="100" step="0.5" value={form.agent_fee_pct ?? ""} onChange={e => set("agent_fee_pct", parseFloat(e.target.value))} style={inputStyle} />
            </Field>
          </div>

          <Field label="Plan">
            <select value={form.plan ?? "starter"} onChange={e => set("plan", e.target.value)} style={inputStyle}>
              {["starter","growth","enterprise"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </Field>

          <div style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)" }}>
            <p style={{ fontSize: 12, color: "rgba(248,113,113,0.8)", margin: 0 }}>
              ⚠️ Fee changes take effect on the next transaction. Existing bookings are not retroactively adjusted.
            </p>
          </div>
        </>}
      </div>
    </div>
  );
}

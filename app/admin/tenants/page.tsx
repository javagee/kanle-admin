"use client";

import { useEffect, useState } from "react";

interface Tenant {
  id: string;
  name: string;
  name_zh: string;
  slug: string;
  whatsapp_number_id: string;
  ai_persona_name: string;
  plan: string;
  monthly_fee_sgd: number;
  platform_fee_pct: number;
  agent_fee_pct: number;
  primary_color: string;
  active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  name: "", name_zh: "", slug: "", whatsapp_number_id: "",
  ai_persona_name: "Serena", ai_persona_name_zh: "思琳娜",
  plan: "starter", monthly_fee_sgd: "299", platform_fee_pct: "15",
  agent_fee_pct: "15", primary_color: "#25D366",
};

const GLASS = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
} as const;

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "10px",
  padding: "8px 12px",
  fontSize: "13px",
  color: "#fff",
  outline: "none",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.5)",
  marginBottom: "5px",
};

const planBadge = (plan: string): React.CSSProperties => {
  const map: Record<string, React.CSSProperties> = {
    starter:    { background: "rgba(148,163,184,0.2)", color: "#cbd5e1" },
    growth:     { background: "rgba(96,165,250,0.2)",  color: "#93c5fd" },
    enterprise: { background: "rgba(167,139,250,0.2)", color: "#c4b5fd" },
  };
  return map[plan] ?? map.starter;
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/tenants")
      .then(r => r.json())
      .then(d => { setTenants(d.tenants ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setShowForm(true);
  };

  const openEdit = (t: Tenant) => {
    setEditing(t);
    setForm({
      name: t.name, name_zh: t.name_zh ?? "", slug: t.slug,
      whatsapp_number_id: t.whatsapp_number_id ?? "",
      ai_persona_name: t.ai_persona_name ?? "Serena",
      ai_persona_name_zh: "思琳娜",
      plan: t.plan, monthly_fee_sgd: String(t.monthly_fee_sgd),
      platform_fee_pct: String(t.platform_fee_pct),
      agent_fee_pct: String(t.agent_fee_pct),
      primary_color: t.primary_color ?? "#25D366",
    });
    setError("");
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    const url = editing ? `/api/admin/tenants/${editing.id}` : "/api/admin/tenants";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
    setShowForm(false);
    load();
  };

  const deactivate = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"? Their WhatsApp bot will stop responding.`)) return;
    await fetch(`/api/admin/tenants/${id}`, { method: "DELETE" });
    load();
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(""), 2000);
  };

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #1a0533 0%, #3d1066 35%, #6B21A8 65%, #9333ea 100%)" }}
    >
      {/* Blobs */}
      <div className="fixed top-[-80px] right-[-60px] w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "#E53935" }} />
      <div className="fixed bottom-[-60px] left-[-40px] w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: "#1E88E5" }} />

      {/* Header */}
      <div
        className="relative z-10 px-8 py-5"
        style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <a href="/admin" className="text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.5)" }}>
              ← Dashboard
            </a>
            <h1 className="text-xl font-bold text-white mt-1">Tenant Management</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Each tenant = one WhatsApp Business Account on the platform
            </p>
          </div>
          <button
            onClick={openCreate}
            className="font-semibold px-5 py-2 rounded-xl text-sm transition-all"
            style={{
              background: "linear-gradient(135deg, #c084fc, #7c3aed)",
              color: "#fff",
              boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
            }}
          >
            + New Tenant
          </button>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-8 py-8">

        {loading ? (
          <p className="text-center py-16" style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p>
        ) : tenants.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>No tenants yet</p>
            <button
              onClick={openCreate}
              className="px-6 py-2 rounded-xl font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #c084fc, #7c3aed)" }}
            >
              Add your first tenant
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {tenants.map(t => (
              <div
                key={t.id}
                className={`rounded-2xl p-6 transition-all ${!t.active ? "opacity-40" : "hover:scale-[1.005]"}`}
                style={GLASS}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-lg"
                      style={{ backgroundColor: t.primary_color ?? "#7c3aed" }}
                    >
                      {t.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white">{t.name}</h3>
                        {t.name_zh && (
                          <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>{t.name_zh}</span>
                        )}
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={planBadge(t.plan)}
                        >
                          {t.plan}
                        </span>
                        {!t.active && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                            inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 flex-wrap" style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                        <span>/{t.slug}</span>
                        <span>AI: {t.ai_persona_name}</span>
                        <span>S${t.monthly_fee_sgd}/mo</span>
                        <span>Platform: {t.platform_fee_pct}%</span>
                        <span>Agent: {t.agent_fee_pct}%</span>
                      </div>
                      {t.whatsapp_number_id && (
                        <div className="mt-1" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                          WABA: <span className="font-mono">{t.whatsapp_number_id}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => copyId(t.id)}
                      className="text-xs font-mono px-2 py-1 rounded-lg transition-all"
                      style={{
                        color: copied === t.id ? "#a78bfa" : "rgba(255,255,255,0.35)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.05)",
                      }}
                      title="Copy Tenant ID"
                    >
                      {copied === t.id ? "Copied!" : t.id.slice(0, 8) + "…"}
                    </button>
                    <button
                      onClick={() => openEdit(t)}
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-all"
                      style={{
                        color: "#a78bfa",
                        border: "1px solid rgba(167,139,250,0.3)",
                        background: "rgba(167,139,250,0.08)",
                      }}
                    >
                      Edit
                    </button>
                    {t.active && (
                      <button
                        onClick={() => deactivate(t.id, t.name)}
                        className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-all"
                        style={{
                          color: "#f87171",
                          border: "1px solid rgba(248,113,113,0.3)",
                          background: "rgba(248,113,113,0.08)",
                        }}
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,0,30,0.7)", backdropFilter: "blur(8px)" }}>
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{
              background: "linear-gradient(160deg, #1e0545 0%, #2d0f5e 100%)",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            }}
          >
            {/* Modal header */}
            <div className="px-8 py-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <h2 className="text-lg font-bold text-white">
                {editing ? `Edit — ${editing.name}` : "New Tenant"}
              </h2>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                Each tenant gets their own isolated data partition and WhatsApp number.
              </p>
            </div>

            <div className="px-8 py-6 grid grid-cols-2 gap-4">
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label style={LABEL_STYLE}>Business Name (English) *</label>
                  <input value={form.name} onChange={e => f("name", e.target.value)}
                    style={INPUT_STYLE} placeholder="HipyHub Tours" />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Business Name (Chinese)</label>
                  <input value={form.name_zh} onChange={e => f("name_zh", e.target.value)}
                    style={INPUT_STYLE} placeholder="康乐·逍遥游" />
                </div>
              </div>

              <div>
                <label style={LABEL_STYLE}>Slug * (unique URL key)</label>
                <input value={form.slug} onChange={e => f("slug", e.target.value.toLowerCase().replace(/\s/g, "-"))}
                  style={{ ...INPUT_STYLE, fontFamily: "monospace" }} placeholder="hipyhub" />
              </div>

              <div>
                <label style={LABEL_STYLE}>WhatsApp Phone Number ID</label>
                <input value={form.whatsapp_number_id} onChange={e => f("whatsapp_number_id", e.target.value)}
                  style={{ ...INPUT_STYLE, fontFamily: "monospace" }} placeholder="1308836422319418" />
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Meta → WhatsApp → Phone Numbers
                </p>
              </div>

              <div>
                <label style={LABEL_STYLE}>AI Persona Name (English)</label>
                <input value={form.ai_persona_name} onChange={e => f("ai_persona_name", e.target.value)}
                  style={INPUT_STYLE} placeholder="Serena" />
              </div>

              <div>
                <label style={LABEL_STYLE}>AI Persona Name (Chinese)</label>
                <input value={form.ai_persona_name_zh} onChange={e => f("ai_persona_name_zh", e.target.value)}
                  style={INPUT_STYLE} placeholder="思琳娜" />
              </div>

              <div>
                <label style={LABEL_STYLE}>Plan</label>
                <select value={form.plan} onChange={e => f("plan", e.target.value)}
                  style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                  <option value="starter" style={{ background: "#1e0545" }}>Starter — S$299/mo</option>
                  <option value="growth"  style={{ background: "#1e0545" }}>Growth — S$599/mo</option>
                  <option value="enterprise" style={{ background: "#1e0545" }}>Enterprise — custom</option>
                </select>
              </div>

              <div>
                <label style={LABEL_STYLE}>Monthly Fee (SGD)</label>
                <input value={form.monthly_fee_sgd} onChange={e => f("monthly_fee_sgd", e.target.value)}
                  type="number" min="0" style={INPUT_STYLE} />
              </div>

              <div>
                <label style={LABEL_STYLE}>Platform Fee %</label>
                <input value={form.platform_fee_pct} onChange={e => f("platform_fee_pct", e.target.value)}
                  type="number" min="0" max="100" style={INPUT_STYLE} />
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                  % of each vendor transaction kept by platform
                </p>
              </div>

              <div>
                <label style={LABEL_STYLE}>Agent Commission %</label>
                <input value={form.agent_fee_pct} onChange={e => f("agent_fee_pct", e.target.value)}
                  type="number" min="0" max="100" style={INPUT_STYLE} />
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>% paid to referral sales agents</p>
              </div>

              <div className="flex items-end gap-3">
                <div>
                  <label style={LABEL_STYLE}>Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.primary_color} onChange={e => f("primary_color", e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer"
                      style={{ border: "1px solid rgba(255,255,255,0.2)", background: "transparent" }} />
                    <input value={form.primary_color} onChange={e => f("primary_color", e.target.value)}
                      style={{ ...INPUT_STYLE, width: "120px", fontFamily: "monospace" }}
                      placeholder="#25D366" />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mx-8 mb-4 px-4 py-3 rounded-xl text-sm"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                {error}
              </div>
            )}

            <div className="px-8 py-5 flex justify-end gap-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2 text-sm font-medium rounded-xl transition-all"
                style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-6 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #c084fc, #7c3aed)",
                  color: "#fff",
                  boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
                }}
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Tenant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

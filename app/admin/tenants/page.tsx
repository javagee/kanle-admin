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

  const planBadge = (plan: string) => {
    const styles: Record<string, string> = {
      starter: "bg-gray-100 text-gray-600",
      growth: "bg-blue-100 text-blue-700",
      enterprise: "bg-purple-100 text-purple-700",
    };
    return styles[plan] ?? "bg-gray-100 text-gray-600";
  };

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 text-white px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <a href="/admin" className="text-emerald-200 text-sm hover:text-white">← Dashboard</a>
            <h1 className="text-xl font-bold mt-1">Tenant Management</h1>
            <p className="text-emerald-100 text-xs">Each tenant = one WhatsApp Business Account on the platform</p>
          </div>
          <button
            onClick={openCreate}
            className="bg-white text-emerald-700 font-semibold px-5 py-2 rounded-lg text-sm hover:bg-emerald-50"
          >
            + New Tenant
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* Tenant cards */}
        {loading ? (
          <p className="text-gray-400 text-center py-16">Loading…</p>
        ) : tenants.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-4">No tenants yet</p>
            <button onClick={openCreate} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold">
              Add your first tenant
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {tenants.map(t => (
              <div key={t.id} className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${!t.active ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: t.primary_color ?? "#25D366" }}
                    >
                      {t.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{t.name}</h3>
                        {t.name_zh && <span className="text-gray-400 text-sm">{t.name_zh}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadge(t.plan)}`}>
                          {t.plan}
                        </span>
                        {!t.active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">inactive</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span>/{t.slug}</span>
                        <span>AI: {t.ai_persona_name}</span>
                        <span>Fee: S${t.monthly_fee_sgd}/mo</span>
                        <span>Platform: {t.platform_fee_pct}%</span>
                        <span>Agent: {t.agent_fee_pct}%</span>
                      </div>
                      {t.whatsapp_number_id && (
                        <div className="mt-1 text-xs text-gray-400">
                          WABA: <span className="font-mono">{t.whatsapp_number_id}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Copy UUID */}
                    <button
                      onClick={() => copyId(t.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 border border-gray-200 rounded font-mono"
                      title="Copy Tenant ID"
                    >
                      {copied === t.id ? "Copied!" : t.id.slice(0, 8) + "…"}
                    </button>
                    <button
                      onClick={() => openEdit(t)}
                      className="text-sm text-emerald-600 hover:text-emerald-800 font-medium px-3 py-1 border border-emerald-200 rounded-lg"
                    >
                      Edit
                    </button>
                    {t.active && (
                      <button
                        onClick={() => deactivate(t.id, t.name)}
                        className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1 border border-red-200 rounded-lg"
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

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-8 py-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {editing ? `Edit — ${editing.name}` : "New Tenant"}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Each tenant gets their own isolated data partition and WhatsApp number.
              </p>
            </div>

            <div className="px-8 py-6 grid grid-cols-2 gap-4">
              {/* Business name */}
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Business Name (English) *</label>
                  <input value={form.name} onChange={e => f("name", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="HipyHub Tours" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Business Name (Chinese)</label>
                  <input value={form.name_zh} onChange={e => f("name_zh", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="康乐·逍遥游" />
                </div>
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Slug * (unique URL key)</label>
                <input value={form.slug} onChange={e => f("slug", e.target.value.toLowerCase().replace(/\s/g, "-"))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
                  placeholder="hipyhub" />
              </div>

              {/* WABA number */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp Phone Number ID</label>
                <input value={form.whatsapp_number_id} onChange={e => f("whatsapp_number_id", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
                  placeholder="1308836422319418" />
                <p className="text-xs text-gray-400 mt-1">From Meta → WhatsApp → Phone Numbers</p>
              </div>

              {/* AI Persona */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">AI Persona Name (English)</label>
                <input value={form.ai_persona_name} onChange={e => f("ai_persona_name", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Serena" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">AI Persona Name (Chinese)</label>
                <input value={form.ai_persona_name_zh} onChange={e => f("ai_persona_name_zh", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="思琳娜" />
              </div>

              {/* Plan */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                <select value={form.plan} onChange={e => f("plan", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  <option value="starter">Starter — S$299/mo</option>
                  <option value="growth">Growth — S$599/mo</option>
                  <option value="enterprise">Enterprise — custom</option>
                </select>
              </div>

              {/* Monthly fee */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Fee (SGD)</label>
                <input value={form.monthly_fee_sgd} onChange={e => f("monthly_fee_sgd", e.target.value)}
                  type="number" min="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              {/* Commission rates */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Platform Fee %</label>
                <input value={form.platform_fee_pct} onChange={e => f("platform_fee_pct", e.target.value)}
                  type="number" min="0" max="100"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <p className="text-xs text-gray-400 mt-1">% of each vendor transaction kept by platform</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Agent Commission %</label>
                <input value={form.agent_fee_pct} onChange={e => f("agent_fee_pct", e.target.value)}
                  type="number" min="0" max="100"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <p className="text-xs text-gray-400 mt-1">% paid to referral sales agents</p>
              </div>

              {/* Brand color */}
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.primary_color} onChange={e => f("primary_color", e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-gray-200" />
                    <input value={form.primary_color} onChange={e => f("primary_color", e.target.value)}
                      className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="#25D366" />
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mx-8 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="px-8 py-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)}
                className="px-5 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="px-6 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Tenant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

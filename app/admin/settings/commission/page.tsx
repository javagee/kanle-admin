"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

interface Tenant {
  id: string;
  name: string;
  name_zh: string | null;
  slug: string;
  platform_fee_pct: number;
  agent_fee_pct: number;
  active: boolean;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
};
const INPUT: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "#fff",
  padding: "6px 10px",
  outline: "none",
  width: 80,
  textAlign: "right",
};

export default function CommissionSettingsPage() {
  const [tenants, setTenants]   = useState<Tenant[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<Record<string, { platform: string; agent: string }>>({});
  const [saving, setSaving]     = useState<string | null>(null);
  const [saved, setSaved]       = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/tenants")
      .then(r => r.json())
      .then(d => {
        setTenants(d.tenants ?? []);
        const init: Record<string, { platform: string; agent: string }> = {};
        (d.tenants ?? []).forEach((t: Tenant) => {
          init[t.id] = {
            platform: String(t.platform_fee_pct ?? 15),
            agent:    String(t.agent_fee_pct    ?? 0),
          };
        });
        setEditing(init);
        setLoading(false);
      });
  }, []);

  const save = async (tenant: Tenant) => {
    const vals = editing[tenant.id];
    if (!vals) return;
    setSaving(tenant.id);
    await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform_fee_pct: parseFloat(vals.platform),
        agent_fee_pct:    parseFloat(vals.agent),
      }),
    });
    setSaving(null);
    setSaved(tenant.id);
    setTimeout(() => setSaved(null), 2000);
  };

  const changed = (t: Tenant) => {
    const e = editing[t.id];
    return e && (parseFloat(e.platform) !== t.platform_fee_pct || parseFloat(e.agent) !== t.agent_fee_pct);
  };

  return (
    <AdminShell>
      <div className="max-w-3xl mx-auto">

        <div className="mb-6">
          <a href="/admin/settings" className="text-sm hover:opacity-80 transition-opacity"
            style={{ color: "rgba(255,255,255,0.45)" }}>← Settings</a>
          <h1 className="text-xl font-bold text-white mt-1">Commission Rates</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Platform fee and default agent fee per tenant — applied to each booking transaction
          </p>
        </div>

        {/* Legend */}
        <div className="mb-5 p-4 rounded-xl text-sm space-y-1"
          style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}>
          <p style={{ color: "rgba(255,255,255,0.7)" }}>
            <span className="font-semibold text-white">Platform fee %</span> — deducted from gross; becomes platform revenue
          </p>
          <p style={{ color: "rgba(255,255,255,0.7)" }}>
            <span className="font-semibold text-white">Default agent fee %</span> — used when no agent-specific rate is set; vendor receives gross minus both fees
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.35)" }}>Loading…</div>
        ) : (
          <div className="space-y-3">
            {tenants.map(t => (
              <div key={t.id} style={GLASS} className="p-4">
                <div className="flex items-center gap-4 flex-wrap">

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white">
                      {t.name_zh || t.name}
                      {!t.active && <span className="ml-2 text-xs text-gray-500">(inactive)</span>}
                    </div>
                    <div className="text-xs mt-0.5 font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>{t.slug}</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Platform fee
                      <input
                        type="number" min="0" max="100" step="0.5"
                        value={editing[t.id]?.platform ?? t.platform_fee_pct}
                        onChange={e => setEditing(prev => ({ ...prev, [t.id]: { ...prev[t.id], platform: e.target.value } }))}
                        style={INPUT}
                      />
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>%</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Agent fee
                      <input
                        type="number" min="0" max="100" step="0.5"
                        value={editing[t.id]?.agent ?? t.agent_fee_pct}
                        onChange={e => setEditing(prev => ({ ...prev, [t.id]: { ...prev[t.id], agent: e.target.value } }))}
                        style={INPUT}
                      />
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>%</span>
                    </label>

                    <button
                      onClick={() => save(t)}
                      disabled={!changed(t) || saving === t.id}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                      style={saved === t.id
                        ? { background: "rgba(52,211,153,0.2)", color: "#6ee7b7" }
                        : { background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                      {saving === t.id ? "Saving…" : saved === t.id ? "✓ Saved" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

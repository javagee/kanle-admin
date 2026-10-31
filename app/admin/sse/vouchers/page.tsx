"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

interface Member {
  id: string;
  membership_no: string;
  name: string;
  phone: string;
  tier: string;
  voucher_balance_sgd: number;
  total_spend_sgd: number;
}

interface Stats {
  total_pool_sgd: number;
  members_with_balance: number;
  total_members: number;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
};
const TIER_COLOR: Record<string, string> = {
  bronze: "#cd7f32", silver: "#c0c0c0", gold: "#fbbf24", platinum: "#e2e8f0",
};

export default function VouchersPage() {
  const [members, setMembers]   = useState<Member[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [modal, setModal]       = useState<Member | null>(null);
  const [amount, setAmount]     = useState("");
  const [mode, setMode]         = useState<"add" | "deduct" | "set">("add");
  const [note, setNote]         = useState("");
  const [saving, setSaving]     = useState(false);
  const [flash, setFlash]       = useState("");

  const load = async (s = search) => {
    const params = new URLSearchParams();
    if (s) params.set("search", s);
    const res = await fetch(`/api/admin/sse/vouchers?${params}`);
    const data = await res.json();
    setMembers(data.members ?? []);
    setStats(data.stats ?? null);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const openModal = (m: Member) => {
    setModal(m); setAmount(""); setMode("add"); setNote(""); setFlash("");
  };

  const submit = async () => {
    if (!modal || !amount) return;
    setSaving(true);
    const res = await fetch("/api/admin/sse/vouchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: modal.id, amount: parseFloat(amount), mode, note }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setFlash(`✓ Balance updated: S$${data.previous_balance.toFixed(2)} → S$${data.new_balance.toFixed(2)}`);
      await load();
      setTimeout(() => { setModal(null); setFlash(""); }, 1500);
    } else {
      setFlash(`Error: ${data.error}`);
    }
  };

  return (
    <AdminShell>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <a href="/admin/sse" className="text-sm hover:opacity-80 transition-opacity"
            style={{ color: "rgba(255,255,255,0.45)" }}>← SSE Members</a>
          <h1 className="text-xl font-bold text-white mt-1">Voucher Management</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Issue, adjust, or deduct voucher credits per member
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex gap-3 mb-6 flex-wrap">
            {[
              { label: "Total voucher pool",     value: `S$${stats.total_pool_sgd.toFixed(2)}`, color: "#fbbf24" },
              { label: "Members with balance",   value: stats.members_with_balance,             color: "#a78bfa" },
              { label: "Total active members",   value: stats.total_members,                    color: "#6ee7b7" },
            ].map(p => (
              <div key={p.label} className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${p.color}30` }}>
                <span className="text-xl font-bold" style={{ color: p.color }}>{p.value}</span>
                <span style={{ color: "rgba(255,255,255,0.45)" }}>{p.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="flex gap-3 mb-5">
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load(search)}
            placeholder="Search name, phone, membership no…"
            className="flex-1 rounded-xl px-4 py-2 text-sm text-white"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
          <button onClick={() => load(search)}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
            Search
          </button>
        </div>

        {/* Member list */}
        {loading ? (
          <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.35)" }}>Loading…</div>
        ) : (
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} style={GLASS} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{m.name}</span>
                    <span className="text-xs font-semibold capitalize px-1.5 py-0.5 rounded"
                      style={{ color: TIER_COLOR[m.tier] ?? "#fff", background: "rgba(255,255,255,0.07)" }}>
                      {m.tier}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {m.phone} · <span className="font-mono">{m.membership_no}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 mr-4">
                  <div className="font-bold" style={{ color: Number(m.voucher_balance_sgd) > 0 ? "#fbbf24" : "rgba(255,255,255,0.3)" }}>
                    S${Number(m.voucher_balance_sgd).toFixed(2)}
                  </div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>voucher balance</div>
                </div>

                <button onClick={() => openModal(m)}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 transition-all"
                  style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}>
                  Adjust
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Adjust modal */}
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
            <div style={{ ...GLASS, background: "#1a1035", width: "100%", maxWidth: 400, padding: 24 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white">{modal.name}</h3>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Current balance: <span className="font-bold text-white">S${Number(modal.voucher_balance_sgd).toFixed(2)}</span>
                  </p>
                </div>
                <button onClick={() => setModal(null)} style={{ color: "rgba(255,255,255,0.4)" }}>✕</button>
              </div>

              <div className="space-y-4">
                {/* Mode */}
                <div className="flex gap-2">
                  {(["add", "deduct", "set"] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all"
                      style={mode === m
                        ? { background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }
                        : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                      {m === "add" ? "+ Add" : m === "deduct" ? "− Deduct" : "= Set"}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "rgba(255,255,255,0.4)" }}>Amount (SGD)</label>
                  <input type="number" min="0" step="0.01" value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1"
                    style={{ color: "rgba(255,255,255,0.4)" }}>Note (optional)</label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Reason for adjustment"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
                </div>

                {flash && (
                  <p className="text-sm font-medium" style={{ color: flash.startsWith("✓") ? "#6ee7b7" : "#fca5a5" }}>
                    {flash}
                  </p>
                )}

                <button onClick={submit} disabled={saving || !amount}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                  {saving ? "Saving…" : `Confirm ${mode === "add" ? "+" : mode === "deduct" ? "−" : "="} S$${amount || "0.00"}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

interface Commission {
  id: string;
  commission_sgd: number;
  gross_amount_sgd: number;
  commission_pct: number;
  source_type: string;
  source_ref: string | null;
  created_at: string;
}

interface Agent {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  referral_code: string;
  commission_pct: number;
  total_earned_sgd: number;
  pending_commissions: Commission[];
  total_pending_sgd: number;
}

interface Batch {
  id: string;
  batch_no: string;
  total_sgd: number;
  commission_count: number;
  payment_method: string;
  payment_ref: string | null;
  status: string;
  period_from: string | null;
  period_to: string | null;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  sales_agents: { id: string; name: string; phone: string; referral_code: string } | null;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
};

const BATCH_STATUS: Record<string, React.CSSProperties> = {
  pending:    { background: "rgba(251,191,36,0.15)",  color: "#fde68a" },
  processing: { background: "rgba(96,165,250,0.15)",  color: "#93c5fd" },
  paid:       { background: "rgba(52,211,153,0.15)",  color: "#6ee7b7" },
};

const SOURCE_LABEL: Record<string, string> = {
  booking:          "Tour Booking",
  vendor_referral:  "Vendor Referral",
  marketplace_order:"Marketplace Order",
  subscription:     "Subscription",
};

export default function AgentPayoutsPage() {
  const [agents, setAgents]           = useState<Agent[]>([]);
  const [batches, setBatches]         = useState<Batch[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<"pending" | "history">("pending");
  const [selected, setSelected]       = useState<Agent | null>(null);
  const [checkedIds, setCheckedIds]   = useState<Set<string>>(new Set());
  const [payMethod, setPayMethod]     = useState("bank_transfer");
  const [payRef, setPayRef]           = useState("");
  const [notes, setNotes]             = useState("");
  const [creating, setCreating]       = useState(false);
  const [updating, setUpdating]       = useState<string | null>(null);
  const [successMsg, setSuccessMsg]   = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/agents/payouts");
    const data = await res.json();
    setAgents(data.agents ?? []);
    setBatches(data.batches ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selectAgent = (agent: Agent) => {
    setSelected(agent);
    setCheckedIds(new Set(agent.pending_commissions.map(c => c.id)));
    setPayRef("");
    setNotes("");
    setSuccessMsg("");
  };

  const toggleAll = () => {
    if (!selected) return;
    if (checkedIds.size === selected.pending_commissions.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(selected.pending_commissions.map(c => c.id)));
    }
  };

  const toggleId = (id: string) => {
    const next = new Set(checkedIds);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    setCheckedIds(next);
  };

  const checkedTotal = selected?.pending_commissions
    .filter(c => checkedIds.has(c.id))
    .reduce((s, c) => s + c.commission_sgd, 0) ?? 0;

  const createBatch = async () => {
    if (!selected || checkedIds.size === 0) return;
    setCreating(true);
    const res = await fetch("/api/admin/agents/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent_id: selected.id,
        commission_ids: Array.from(checkedIds),
        payment_method: payMethod,
        payment_ref: payRef || null,
        notes: notes || null,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) {
      setSuccessMsg(`Batch ${data.batch.batch_no} created — S$${data.batch.total_sgd.toFixed(2)}`);
      setSelected(null);
      setCheckedIds(new Set());
      await load();
    }
  };

  const markBatchPaid = async (id: string, payment_ref?: string) => {
    setUpdating(id);
    await fetch("/api/admin/agents/payouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "paid", payment_ref }),
    });
    await load();
    setUpdating(null);
  };

  const totalPending = agents.reduce((s, a) => s + a.total_pending_sgd, 0);

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <a href="/admin" className="text-sm transition-opacity hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.45)" }}>← Dashboard</a>
            <h1 className="text-xl font-bold text-white mt-1">Agent Payouts</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {agents.length} agents with pending commissions · S${totalPending.toFixed(2)} total due
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#6ee7b7" }}>
            ✓ {successMsg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 rounded-xl p-1 w-fit"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {(["pending", "history"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
              style={tab === t
                ? { background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }
                : { color: "rgba(255,255,255,0.45)" }}>
              {t === "pending" ? `Pending Payouts (${agents.length})` : `History (${batches.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.35)" }}>Loading…</div>
        ) : tab === "pending" ? (

          /* ── PENDING TAB ── */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Agent list */}
            <div className="space-y-3">
              {agents.length === 0 ? (
                <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>
                  No pending commissions
                </div>
              ) : agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => selectAgent(agent)}
                  className="w-full text-left transition-all"
                  style={{
                    ...GLASS,
                    padding: "16px",
                    borderColor: selected?.id === agent.id ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.1)",
                    background: selected?.id === agent.id ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{agent.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {agent.phone} · Code: <span className="font-mono">{agent.referral_code}</span>
                      </p>
                      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {agent.pending_commissions.length} unpaid commission{agent.pending_commissions.length !== 1 ? "s" : ""}
                        · {agent.commission_pct}% rate
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" style={{ color: "#a78bfa" }}>
                        S${agent.total_pending_sgd.toFixed(2)}
                      </p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>pending</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Payout creator */}
            {selected ? (
              <div style={{ ...GLASS, padding: 20 }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white">{selected.name}</h3>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Create payout batch
                    </p>
                  </div>
                  <button onClick={() => setSelected(null)}
                    className="text-xs px-2 py-1 rounded"
                    style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)" }}>
                    ✕
                  </button>
                </div>

                {/* Commission checkboxes */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "rgba(255,255,255,0.4)" }}>Commissions to include</p>
                    <button onClick={toggleAll} className="text-xs" style={{ color: "#a78bfa" }}>
                      {checkedIds.size === selected.pending_commissions.length ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selected.pending_commissions.map(c => (
                      <label key={c.id} className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={checkedIds.has(c.id)} onChange={() => toggleId(c.id)}
                          className="rounded" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white">
                              {SOURCE_LABEL[c.source_type] ?? c.source_type}
                              {c.source_ref && (
                                <span className="text-xs ml-1 font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                                  #{c.source_ref}
                                </span>
                              )}
                            </span>
                            <span className="text-sm font-semibold" style={{ color: "#6ee7b7" }}>
                              S${c.commission_sgd.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {c.commission_pct}% of S${c.gross_amount_sgd.toFixed(2)} ·{" "}
                            {new Date(c.created_at).toLocaleDateString("en-SG")}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-4"
                  style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {checkedIds.size} commission{checkedIds.size !== 1 ? "s" : ""} selected
                  </span>
                  <span className="text-lg font-bold" style={{ color: "#a78bfa" }}>
                    S${checkedTotal.toFixed(2)}
                  </span>
                </div>

                {/* Payment details */}
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1"
                      style={{ color: "rgba(255,255,255,0.4)" }}>Payment Method</label>
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }}>
                      <option value="bank_transfer" style={{ background: "#1a1a2e" }}>Bank Transfer</option>
                      <option value="paynow"        style={{ background: "#1a1a2e" }}>PayNow</option>
                      <option value="cash"          style={{ background: "#1a1a2e" }}>Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1"
                      style={{ color: "rgba(255,255,255,0.4)" }}>Payment Reference (optional)</label>
                    <input value={payRef} onChange={e => setPayRef(e.target.value)}
                      placeholder="Bank ref / PayNow ref"
                      className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1"
                      style={{ color: "rgba(255,255,255,0.4)" }}>Notes (optional)</label>
                    <input value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Oct 2026 payout"
                      className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/20"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
                  </div>
                </div>

                <button
                  onClick={createBatch}
                  disabled={creating || checkedIds.size === 0}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                  {creating ? "Creating batch…" : `Create Payout — S$${checkedTotal.toFixed(2)}`}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-xl"
                style={{ ...GLASS, minHeight: 200 }}>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                  ← Select an agent to create a payout
                </p>
              </div>
            )}
          </div>

        ) : (

          /* ── HISTORY TAB ── */
          <div className="space-y-3">
            {batches.length === 0 ? (
              <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.3)" }}>
                No payout batches yet
              </div>
            ) : batches.map(batch => (
              <div key={batch.id} style={GLASS} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-bold text-white">{batch.batch_no}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                        style={BATCH_STATUS[batch.status] ?? BATCH_STATUS.pending}>
                        {batch.status}
                      </span>
                      <span className="text-xs capitalize" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {batch.payment_method?.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {batch.sales_agents?.name ?? "Unknown agent"}
                      <span style={{ color: "rgba(255,255,255,0.3)" }}> · {batch.commission_count} commission{batch.commission_count !== 1 ? "s" : ""}</span>
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      <span>Created {new Date(batch.created_at).toLocaleDateString("en-SG")}</span>
                      {batch.paid_at && <span>Paid {new Date(batch.paid_at).toLocaleDateString("en-SG")}</span>}
                      {batch.payment_ref && <span className="font-mono">Ref: {batch.payment_ref}</span>}
                      {batch.notes && <span>{batch.notes}</span>}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold" style={{ color: "#a78bfa" }}>
                      S${batch.total_sgd.toFixed(2)}
                    </p>
                    {batch.status !== "paid" && (
                      <button
                        onClick={() => markBatchPaid(batch.id)}
                        disabled={updating === batch.id}
                        className="mt-2 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-40"
                        style={{ background: "rgba(52,211,153,0.15)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.3)" }}>
                        {updating === batch.id ? "…" : "✓ Mark Paid"}
                      </button>
                    )}
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

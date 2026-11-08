"use client";

import { useEffect, useState, useCallback } from "react";

type Stage = "new" | "lead" | "engaged" | "converted" | "repeat";

interface CRMCustomer {
  id: string;
  phone_number: string;
  display_name: string | null;
  language_pref: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  stage: Stage;
  total_spend: number;
  booking_count: number;
  conv_count: number;
  last_active: string;
  closing_persona: string | null;
}

interface Pipeline {
  new: number; lead: number; engaged: number; converted: number; repeat: number;
}

interface BookingDetail {
  id: string; status: string; payment_status: string;
  total_sgd: number | null; travel_date: string; payment_ref: string | null;
  adults: number; children: number; special_requests: string | null; created_at: string;
  tour_packages: { name: string; name_zh: string | null; destination: string } | null;
}

interface ConvDetail {
  id: string; status: string; language: string; message_count: number;
  conversion_type: string | null; closing_persona: string | null;
  converted_at: string | null; handoff_reason: string | null;
  quality_flag: string | null; created_at: string; updated_at: string;
}

interface CustomerDetail {
  customer: {
    id: string; phone_number: string; display_name: string | null;
    language_pref: string; notes: string | null; metadata: Record<string, unknown> | null;
    pdpa_consent: boolean; created_at: string; updated_at: string;
  };
  conversations: ConvDetail[];
  bookings: BookingDetail[];
  stats: { stage: Stage; total_spend: number; booking_count: number; conv_count: number; last_active: string };
}

// ── Style constants ────────────────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
};

const STAGE_STYLES: Record<Stage, React.CSSProperties> = {
  new:       { background: "rgba(148,163,184,0.2)",  color: "#94a3b8",  border: "1px solid rgba(148,163,184,0.3)" },
  lead:      { background: "rgba(96,165,250,0.2)",   color: "#93c5fd",  border: "1px solid rgba(96,165,250,0.3)" },
  engaged:   { background: "rgba(251,191,36,0.2)",   color: "#fde68a",  border: "1px solid rgba(251,191,36,0.3)" },
  converted: { background: "rgba(52,211,153,0.2)",   color: "#6ee7b7",  border: "1px solid rgba(52,211,153,0.3)" },
  repeat:    { background: "rgba(192,132,252,0.2)",  color: "#c084fc",  border: "1px solid rgba(192,132,252,0.3)" },
};

const STAGE_EMOJI: Record<Stage, string> = {
  new: "🆕", lead: "📱", engaged: "💬", converted: "✅", repeat: "🔁",
};

const LANG_FLAG: Record<string, string> = {
  mandarin: "🇨🇳", english: "🇬🇧", malay: "🇲🇾",
  tagalog: "🇵🇭", filipino: "🇵🇭", tamil: "🇮🇳", auto: "🌐",
};

const PERSONA_EMOJI: Record<string, string> = {
  serena: "🌏", maya: "🎓", aria: "✨",
};

const PAY_STYLES: Record<string, React.CSSProperties> = {
  paid:                 { background: "rgba(52,211,153,0.15)",  color: "#6ee7b7" },
  pending_verification: { background: "rgba(96,165,250,0.15)",  color: "#93c5fd" },
  unpaid:               { background: "rgba(248,113,113,0.15)", color: "#fca5a5" },
  partial:              { background: "rgba(251,191,36,0.15)",  color: "#fde68a" },
  refunded:             { background: "rgba(148,163,184,0.15)", color: "#94a3b8" },
};

const STAGES: Stage[] = ["new", "lead", "engaged", "converted", "repeat"];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

function Badge({ label, style }: { label: string; style: React.CSSProperties }) {
  return (
    <span style={{ ...style, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CRMPage() {
  const [customers, setCustomers]     = useState<CRMCustomer[]>([]);
  const [pipeline, setPipeline]       = useState<Pipeline>({ new: 0, lead: 0, engaged: 0, converted: 0, repeat: 0 });
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [selected, setSelected]       = useState<CRMCustomer | null>(null);
  const [detail, setDetail]           = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab]     = useState<"overview" | "bookings" | "convs">("overview");
  const [notes, setNotes]             = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (search) params.set("search", search);
    if (stageFilter !== "all") params.set("stage", stageFilter);
    const res = await fetch(`/api/admin/crm?${params}`);
    const data = await res.json();
    setCustomers(data.customers ?? []);
    setPipeline(data.pipeline ?? { new: 0, lead: 0, engaged: 0, converted: 0, repeat: 0 });
    setLoading(false);
  }, [search, stageFilter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (cust: CRMCustomer) => {
    setSelected(cust);
    setActiveTab("overview");
    setNotes(cust.notes ?? "");
    setNotesSaved(false);
    setDetailLoading(true);
    const res = await fetch(`/api/admin/crm/${cust.id}`);
    const data: CustomerDetail = await res.json();
    setDetail(data);
    setNotes(data.customer.notes ?? "");
    setDetailLoading(false);
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    await fetch(`/api/admin/crm/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  // Filtered list (stage filter already server-side, search may still be client-side re-filter)
  const visible = customers.filter((c) => {
    if (stageFilter !== "all" && c.stage !== stageFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.display_name ?? "").toLowerCase().includes(q) || c.phone_number.includes(q);
    }
    return true;
  });

  const panelOpen = !!selected;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <a href="/admin" className="text-sm hover:opacity-80 transition-opacity"
        style={{ color: "rgba(255,255,255,0.45)" }}>← Dashboard</a>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, marginBottom: 20 }}>
        <h1 className="text-xl font-bold text-white">CRM</h1>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{customers.length} contacts</span>
      </div>

      {/* Pipeline bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 20 }}>
        {STAGES.map((s) => {
          const isActive = stageFilter === s;
          return (
            <button key={s} onClick={() => setStageFilter(isActive ? "all" : s)}
              style={{
                ...GLASS,
                padding: "14px 12px", textAlign: "left", cursor: "pointer",
                background: isActive ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                border: isActive ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, transition: "all 0.15s",
              }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{STAGE_EMOJI[s]}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "white" }}>{pipeline[s]}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "capitalize", marginTop: 2 }}>{s}</div>
              {/* Stage color accent bar */}
              <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: STAGE_STYLES[s].color as string, opacity: 0.6 }} />
            </button>
          );
        })}
      </div>

      {/* Main layout: list + optional panel */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Left: list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone…"
              style={{
                flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 13, outline: "none",
              }}
            />
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as Stage | "all")}
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 13,
              }}>
              <option value="all">All stages</option>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_EMOJI[s]} {s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          {/* Table */}
          <div style={{ ...GLASS, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 60px 60px 90px 80px 60px",
              padding: "10px 16px", gap: 8,
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              <span>Stage</span><span>Customer</span><span style={{ textAlign: "center" }}>Lang</span>
              <span style={{ textAlign: "center" }}>Persona</span><span style={{ textAlign: "right" }}>Last Active</span>
              <span style={{ textAlign: "right" }}>Value</span><span style={{ textAlign: "right" }}>Bkgs</span>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading…</div>
            ) : visible.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No customers found</div>
            ) : visible.map((cust) => {
              const isSelected = selected?.id === cust.id;
              return (
                <div key={cust.id} onClick={() => openDetail(cust)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr 60px 60px 90px 80px 60px",
                    padding: "12px 16px", gap: 8, cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    background: isSelected ? "rgba(124,58,237,0.1)" : "transparent",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {/* Stage */}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Badge label={`${STAGE_EMOJI[cust.stage]} ${cust.stage}`} style={STAGE_STYLES[cust.stage]} />
                  </div>
                  {/* Name + phone */}
                  <div>
                    <div style={{ color: "white", fontSize: 13, fontWeight: 500 }}>
                      {cust.display_name ?? "Unknown"}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 }}>
                      {cust.phone_number}
                    </div>
                  </div>
                  {/* Language */}
                  <div style={{ textAlign: "center", fontSize: 16, lineHeight: "36px" }}>
                    {LANG_FLAG[cust.language_pref] ?? "🌐"}
                  </div>
                  {/* Persona */}
                  <div style={{ textAlign: "center", fontSize: 16, lineHeight: "36px" }}>
                    {cust.closing_persona ? (PERSONA_EMOJI[cust.closing_persona] ?? "🤖") : "—"}
                  </div>
                  {/* Last active */}
                  <div style={{ textAlign: "right", color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: "36px" }}>
                    {relativeTime(cust.last_active)}
                  </div>
                  {/* LTV */}
                  <div style={{ textAlign: "right", lineHeight: "36px" }}>
                    {cust.total_spend > 0
                      ? <span style={{ color: "#6ee7b7", fontSize: 13, fontWeight: 600 }}>S${cust.total_spend.toFixed(0)}</span>
                      : <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>—</span>}
                  </div>
                  {/* Bookings */}
                  <div style={{ textAlign: "right", color: cust.booking_count > 0 ? "white" : "rgba(255,255,255,0.3)", fontSize: 13, lineHeight: "36px" }}>
                    {cust.booking_count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: detail panel */}
        {panelOpen && (
          <div style={{
            width: 380, flexShrink: 0, ...GLASS,
            position: "sticky", top: 20,
            maxHeight: "calc(100vh - 120px)", overflowY: "auto",
          }}>
            {/* Panel header */}
            <div style={{
              padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ color: "white", fontWeight: 700, fontSize: 15 }}>
                  {selected!.display_name ?? selected!.phone_number}
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 }}>
                  {LANG_FLAG[selected!.language_pref] ?? "🌐"} {selected!.phone_number}
                </div>
                <div style={{ marginTop: 8 }}>
                  <Badge label={`${STAGE_EMOJI[selected!.stage]} ${selected!.stage}`} style={STAGE_STYLES[selected!.stage]} />
                </div>
              </div>
              <button onClick={() => { setSelected(null); setDetail(null); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>
                ×
              </button>
            </div>

            {/* Stats row */}
            {detail && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "12px 20px", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {[
                  { label: "Lifetime Value", value: `S$${detail.stats.total_spend.toFixed(0)}` },
                  { label: "Bookings", value: String(detail.stats.booking_count) },
                  { label: "Conversations", value: String(detail.stats.conv_count) },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <div style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{s.value}</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {(["overview", "bookings", "convs"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600,
                    background: "none", border: "none", cursor: "pointer",
                    color: activeTab === tab ? "white" : "rgba(255,255,255,0.4)",
                    borderBottom: activeTab === tab ? "2px solid #7c3aed" : "2px solid transparent",
                    transition: "all 0.15s",
                  }}>
                  {tab === "overview" ? "Overview" : tab === "bookings" ? "Bookings" : "Convs"}
                </button>
              ))}
            </div>

            {/* Panel body */}
            <div style={{ padding: "16px 20px" }}>
              {detailLoading ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13, padding: 20 }}>Loading…</div>
              ) : !detail ? null : (

                activeTab === "overview" ? (
                  <div>
                    {/* Info rows */}
                    {[
                      { label: "First seen", value: new Date(detail.customer.created_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) },
                      { label: "Last active", value: relativeTime(detail.stats.last_active) },
                      { label: "Language", value: `${LANG_FLAG[detail.customer.language_pref] ?? "🌐"} ${detail.customer.language_pref}` },
                      { label: "PDPA consent", value: detail.customer.pdpa_consent ? "✅ Yes" : "❌ No" },
                      ...(detail.customer.metadata?.agent_referral_code ? [{ label: "Agent ref", value: String(detail.customer.metadata.agent_referral_code) }] : []),
                    ].map((row) => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{row.label}</span>
                        <span style={{ color: "white", fontSize: 12 }}>{row.value}</span>
                      </div>
                    ))}

                    {/* Notes */}
                    <div style={{ marginTop: 16 }}>
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Notes</div>
                      <textarea value={notes} onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
                        placeholder="Add notes about this customer…"
                        rows={4}
                        style={{
                          width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8, padding: "10px 12px", color: "white", fontSize: 13,
                          resize: "vertical", outline: "none", boxSizing: "border-box",
                        }}
                      />
                      <button onClick={saveNotes} disabled={savingNotes}
                        style={{
                          marginTop: 8, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                          background: notesSaved ? "rgba(52,211,153,0.2)" : "rgba(124,58,237,0.3)",
                          border: `1px solid ${notesSaved ? "rgba(52,211,153,0.4)" : "rgba(124,58,237,0.5)"}`,
                          color: notesSaved ? "#6ee7b7" : "white", cursor: "pointer",
                        }}>
                        {savingNotes ? "Saving…" : notesSaved ? "✅ Saved" : "Save Notes"}
                      </button>
                    </div>
                  </div>

                ) : activeTab === "bookings" ? (
                  <div>
                    {detail.bookings.length === 0 ? (
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", padding: 20 }}>No bookings yet</div>
                    ) : detail.bookings.map((b) => (
                      <div key={b.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>
                            {b.tour_packages?.name_zh ?? b.tour_packages?.name ?? "Tour Package"}
                          </div>
                          <Badge label={b.payment_status} style={PAY_STYLES[b.payment_status] ?? PAY_STYLES.unpaid} />
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                          🗓 {b.travel_date} &nbsp;·&nbsp; 👥 {b.adults}A{b.children > 0 ? ` ${b.children}C` : ""} &nbsp;·&nbsp; 📍 {b.tour_packages?.destination ?? "—"}
                        </div>
                        <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{b.payment_ref ?? b.id.slice(0, 8).toUpperCase()}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: b.total_sgd ? "#6ee7b7" : "rgba(255,255,255,0.3)" }}>
                            {b.total_sgd ? `S$${Number(b.total_sgd).toFixed(0)}` : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                ) : (
                  <div>
                    {detail.conversations.length === 0 ? (
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textAlign: "center", padding: 20 }}>No conversations yet</div>
                    ) : detail.conversations.map((c) => (
                      <div key={c.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: 13, color: "white", fontWeight: 500 }}>
                            {c.closing_persona ? `${PERSONA_EMOJI[c.closing_persona] ?? "🤖"} ${c.closing_persona}` : "🤖 AI"}
                          </div>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                            {relativeTime(c.updated_at)}
                          </span>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                          {LANG_FLAG[c.language] ?? "🌐"} {c.language} &nbsp;·&nbsp; {c.message_count} msgs
                          {c.conversion_type && <span style={{ color: "#6ee7b7", marginLeft: 6 }}>· ✅ {c.conversion_type.replace("_", " ")}</span>}
                        </div>
                        {c.handoff_reason && (
                          <div style={{ marginTop: 4, fontSize: 11, color: "#fde68a" }}>↗ Handoff: {c.handoff_reason}</div>
                        )}
                        {c.quality_flag && (
                          <div style={{ marginTop: 4 }}>
                            <Badge label={c.quality_flag} style={{ background: "rgba(192,132,252,0.15)", color: "#c084fc", border: "1px solid rgba(192,132,252,0.3)" }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

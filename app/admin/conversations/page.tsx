"use client";

import { useEffect, useState, useRef } from "react";
import AdminShell from "@/components/AdminShell";

interface Customer { id: string; phone_number: string; display_name: string | null; language_pref: string; }
interface Conversation {
  id: string; status: string; language: string; message_count: number;
  handoff_reason: string | null; handoff_at: string | null;
  resolved_at: string | null; created_at: string; updated_at: string;
  customers: Customer | null;
}
interface Message {
  id: string; role: string; message_type: string;
  content: string | null; tokens_used: number | null; created_at: string;
}
interface SecurityEvent {
  id: string; event_type: string; severity: string;
  detail: Record<string, unknown>; created_at: string;
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  active:           { background: "rgba(52,211,153,0.15)",  color: "#6ee7b7" },
  pending_handoff:  { background: "rgba(251,191,36,0.15)",  color: "#fde68a" },
  human_active:     { background: "rgba(96,165,250,0.15)",  color: "#93c5fd" },
  resolved:         { background: "rgba(148,163,184,0.12)", color: "#94a3b8" },
  abandoned:        { background: "rgba(248,113,113,0.12)", color: "#fca5a5" },
};

const SEV_STYLES: Record<string, React.CSSProperties> = {
  low:    { background: "rgba(148,163,184,0.12)", color: "#94a3b8" },
  medium: { background: "rgba(251,191,36,0.15)",  color: "#fde68a" },
  high:   { background: "rgba(248,113,113,0.2)",  color: "#f87171" },
};

const LANG_FLAG: Record<string, string> = { mandarin: "🇨🇳", english: "🇬🇧", malay: "🇲🇾", auto: "🌐" };

const STATUS_OPTS = ["all", "active", "pending_handoff", "human_active", "resolved", "abandoned"] as const;

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
};

export default function ConversationsPage() {
  const [convs, setConvs]           = useState<Conversation[]>([]);
  const [secLog, setSecLog]         = useState<SecurityEvent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatus]   = useState("all");
  const [search, setSearch]         = useState("");
  const [tab, setTab]               = useState<"chats" | "security">("chats");
  const [selected, setSelected]     = useState<Conversation | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [updating, setUpdating]     = useState<string | null>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const load = async (s = statusFilter) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "60" });
    if (s !== "all") params.set("status", s);
    const res = await fetch(`/api/admin/conversations?${params}`);
    const data = await res.json();
    setConvs(data.conversations ?? []);
    setSecLog(data.security_log ?? []);
    setLoading(false);
  };

  const loadMessages = async (conv: Conversation) => {
    setSelected(conv);
    setMsgLoading(true);
    const res = await fetch(`/api/admin/conversations?id=${conv.id}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
    setMsgLoading(false);
    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const patchStatus = async (id: string, status: string) => {
    setUpdating(id);
    await fetch("/api/admin/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load(statusFilter);
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
    setUpdating(null);
  };

  useEffect(() => { load(); }, []);

  const filtered = convs.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.customers?.display_name?.toLowerCase().includes(s) ||
      c.customers?.phone_number?.includes(s) ||
      c.handoff_reason?.toLowerCase().includes(s)
    );
  });

  const handoffCount = convs.filter(c => c.status === "pending_handoff").length;
  const activeCount  = convs.filter(c => c.status === "active").length;
  const highSev      = secLog.filter(e => e.severity === "high").length;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-5">
          <a href="/admin" className="text-sm transition-opacity hover:opacity-80"
            style={{ color: "rgba(255,255,255,0.45)" }}>← Dashboard</a>
          <h1 className="text-xl font-bold text-white mt-1">Conversations</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            {activeCount} active · {handoffCount} awaiting handoff
            {highSev > 0 && <span style={{ color: "#f87171" }}> · ⚠️ {highSev} high-severity security events</span>}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 rounded-xl p-1 w-fit"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={() => setTab("chats")}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === "chats"
              ? { background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }
              : { color: "rgba(255,255,255,0.45)" }}>
            💬 Chats ({convs.length})
          </button>
          <button onClick={() => setTab("security")}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === "security"
              ? { background: highSev > 0 ? "rgba(248,113,113,0.3)" : "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }
              : { color: highSev > 0 ? "#f87171" : "rgba(255,255,255,0.45)" }}>
            🛡️ Security Log {highSev > 0 && `(${highSev} high)`}
          </button>
        </div>

        {tab === "chats" ? (
          <div className="flex gap-5" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>

            {/* Conversation list */}
            <div className="flex flex-col w-80 flex-shrink-0">
              {/* Filters */}
              <div className="space-y-2 mb-3">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or phone…"
                  className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-white/20"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
                <div className="flex gap-1 flex-wrap">
                  {STATUS_OPTS.map(s => (
                    <button key={s} onClick={() => { setStatus(s); load(s); }}
                      className="px-2 py-0.5 rounded-lg text-xs font-semibold capitalize transition-all"
                      style={statusFilter === s
                        ? { background: "rgba(167,139,250,0.3)", color: "#c084fc" }
                        : { color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)" }}>
                      {s === "pending_handoff" ? "handoff" : s === "human_active" ? "human" : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {loading ? (
                  <p className="text-center py-10 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</p>
                ) : filtered.length === 0 ? (
                  <p className="text-center py-10 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No conversations</p>
                ) : filtered.map(c => (
                  <button key={c.id} onClick={() => loadMessages(c)}
                    className="w-full text-left transition-all"
                    style={{
                      ...GLASS,
                      padding: "12px",
                      borderColor: selected?.id === c.id ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.08)",
                      background: selected?.id === c.id ? "rgba(167,139,250,0.08)" :
                        c.status === "pending_handoff" ? "rgba(251,191,36,0.05)" : "rgba(255,255,255,0.04)",
                    }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{LANG_FLAG[c.language] ?? "🌐"}</span>
                          <span className="font-semibold text-white text-sm truncate">
                            {c.customers?.display_name || c.customers?.phone_number || "Unknown"}
                          </span>
                        </div>
                        {c.customers?.display_name && (
                          <p className="text-xs font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {c.customers.phone_number}
                          </p>
                        )}
                        {c.handoff_reason && (
                          <p className="text-xs mt-1 line-clamp-1" style={{ color: "#fde68a" }}>
                            ↗ {c.handoff_reason}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                          style={STATUS_STYLES[c.status] ?? STATUS_STYLES.active}>
                          {c.status === "pending_handoff" ? "handoff" :
                           c.status === "human_active"    ? "human"   : c.status}
                        </span>
                        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                          {timeAgo(c.updated_at)}
                        </p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                          {c.message_count} msgs
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Message thread */}
            <div className="flex-1 flex flex-col min-w-0" style={GLASS}>
              {!selected ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                    ← Select a conversation to view messages
                  </p>
                </div>
              ) : (
                <>
                  {/* Thread header */}
                  <div className="px-5 py-4 border-b flex items-center justify-between"
                    style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {selected.customers?.display_name || selected.customers?.phone_number}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                          style={STATUS_STYLES[selected.status] ?? STATUS_STYLES.active}>
                          {selected.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {selected.customers?.phone_number} · {selected.message_count} messages ·{" "}
                        started {new Date(selected.created_at).toLocaleDateString("en-SG")}
                        {selected.handoff_reason && (
                          <span style={{ color: "#fde68a" }}> · Handoff: {selected.handoff_reason}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selected.customers?.phone_number && (
                        <a href={`https://wa.me/${selected.customers.phone_number.replace(/\D/g, "")}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                          style={{ background: "rgba(37,211,102,0.15)", color: "#4ade80", border: "1px solid rgba(37,211,102,0.3)" }}>
                          💬 Open WA
                        </a>
                      )}
                      {selected.status !== "resolved" && (
                        <button onClick={() => patchStatus(selected.id, "resolved")}
                          disabled={updating === selected.id}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-40"
                          style={{ background: "rgba(148,163,184,0.15)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.2)" }}>
                          {updating === selected.id ? "…" : "✓ Resolve"}
                        </button>
                      )}
                      {selected.status === "pending_handoff" && (
                        <button onClick={() => patchStatus(selected.id, "human_active")}
                          disabled={updating === selected.id}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-40"
                          style={{ background: "rgba(96,165,250,0.2)", color: "#93c5fd", border: "1px solid rgba(96,165,250,0.3)" }}>
                          {updating === selected.id ? "…" : "▶ Take over"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {msgLoading ? (
                      <p className="text-center py-10 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading messages…</p>
                    ) : messages.length === 0 ? (
                      <p className="text-center py-10 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No messages</p>
                    ) : messages.map(m => {
                      const isBot  = m.role === "assistant";
                      const isUser = m.role === "user";
                      return (
                        <div key={m.id} className={`flex ${isBot ? "justify-start" : isUser ? "justify-end" : "justify-center"}`}>
                          {m.role === "system" ? (
                            <span className="text-xs px-3 py-1 rounded-full"
                              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
                              {m.content}
                            </span>
                          ) : (
                            <div style={{
                              maxWidth: "72%",
                              background: isBot ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.08)",
                              border: `1px solid ${isBot ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.1)"}`,
                              borderRadius: isBot ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                              padding: "10px 14px",
                            }}>
                              <p className="text-sm text-white whitespace-pre-wrap break-words leading-relaxed">
                                {m.content || `[${m.message_type}]`}
                              </p>
                              <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                                {isBot ? "🤖 Bot" : "👤 Customer"}
                                {m.tokens_used ? ` · ${m.tokens_used} tokens` : ""}
                                {" · "}{new Date(m.created_at).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={msgEndRef} />
                  </div>
                </>
              )}
            </div>
          </div>

        ) : (
          /* ── SECURITY LOG TAB ── */
          <div className="space-y-2">
            {secLog.length === 0 ? (
              <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.3)" }}>No security events</div>
            ) : secLog.map(e => (
              <div key={e.id} className="flex items-start gap-4 px-4 py-3 rounded-xl"
                style={{
                  ...GLASS,
                  borderLeft: e.severity === "high" ? "3px solid #f87171" :
                              e.severity === "medium" ? "3px solid #fbbf24" : undefined,
                }}>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 mt-0.5 capitalize"
                  style={SEV_STYLES[e.severity] ?? SEV_STYLES.low}>
                  {e.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-white">{e.event_type.replace(/_/g, " ")}</span>
                    {Object.entries(e.detail ?? {}).slice(0, 3).map(([k, v]) => (
                      <span key={k} className="text-xs font-mono"
                        style={{ color: "rgba(255,255,255,0.35)" }}>
                        {k}: {String(v).slice(0, 40)}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {timeAgo(e.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

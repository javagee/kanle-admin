"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface Customer {
  id: string;
  phone_number: string;
  display_name: string | null;
  language_pref: string;
}

interface LastMessage {
  role: string;
  content: string | null;
  message_type: string;
  created_at: string;
}

interface InboxItem {
  id: string;
  status: "pending_handoff" | "human_active";
  language: string;
  message_count: number;
  handoff_reason: string | null;
  handoff_at: string | null;
  closing_persona: string | null;
  conversion_type: string | null;
  created_at: string;
  updated_at: string;
  idle_minutes: number;
  customers: Customer | null;
  last_message: LastMessage | null;
}

interface Message {
  id: string;
  role: string;
  message_type: string;
  content: string | null;
  tokens_used: number | null;
  created_at: string;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
};

const LANG_FLAG: Record<string, string> = {
  mandarin: "🇨🇳", english: "🇬🇧", malay: "🇲🇾", tagalog: "🇵🇭", tamil: "🇮🇳", auto: "🌐",
};
const PERSONA_EMOJI: Record<string, string> = { serena: "🌏", maya: "🎓", aria: "✨" };

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function urgencyColor(item: InboxItem) {
  if (item.status === "pending_handoff") {
    if (item.idle_minutes > 60) return "#f87171"; // red — waiting > 1hr
    if (item.idle_minutes > 20) return "#fbbf24"; // amber — waiting 20–60min
    return "#a78bfa";                              // purple — recent
  }
  return "#60a5fa"; // blue — human_active
}

export default function InboxPage() {
  const [items, setItems]           = useState<InboxItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<InboxItem | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [acting, setActing]         = useState<string | null>(null);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await fetch("/api/admin/inbox");
    const data = await res.json();
    setItems(data.items ?? []);
    if (!silent) setLoading(false);
  }, []);

  const loadThread = async (item: InboxItem) => {
    setSelected(item);
    setMsgLoading(true);
    const res = await fetch(`/api/admin/conversations?id=${item.id}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
    setMsgLoading(false);
    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const act = async (id: string, action: string) => {
    setActing(id);
    await fetch("/api/admin/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    await load(true);
    // If resolved or returned, deselect
    if (action === "resolve" || action === "return_to_bot") {
      setSelected(prev => (prev?.id === id ? null : prev));
    } else if (action === "take_over") {
      setSelected(prev => prev?.id === id ? { ...prev, status: "human_active" } : prev);
    }
    setActing(null);
  };

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const handoffCount     = items.filter(i => i.status === "pending_handoff").length;
  const humanActiveCount = items.filter(i => i.status === "human_active").length;
  const urgentCount      = items.filter(i => i.status === "pending_handoff" && i.idle_minutes > 20).length;

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-5">
        <a href="/admin" className="text-sm transition-opacity hover:opacity-80"
          style={{ color: "rgba(255,255,255,0.45)" }}>← Dashboard</a>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-xl font-bold text-white">Inbox</h1>
          {items.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: urgentCount > 0 ? "rgba(248,113,113,0.25)" : "rgba(167,139,250,0.2)",
                color: urgentCount > 0 ? "#f87171" : "#c084fc",
              }}>
              {items.length} pending
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          {handoffCount > 0
            ? <span style={{ color: "#fbbf24" }}>{handoffCount} awaiting handoff</span>
            : "No handoffs pending"}
          {humanActiveCount > 0 && (
            <span style={{ color: "rgba(255,255,255,0.4)" }}> · {humanActiveCount} in progress</span>
          )}
          <span style={{ color: "rgba(255,255,255,0.3)" }}> · refreshes every 30s</span>
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading inbox…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <span className="text-5xl">✅</span>
          <p className="text-white font-semibold text-lg">All clear</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            No conversations waiting for your attention right now.
          </p>
        </div>
      ) : (
        <div className="flex gap-5" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>

          {/* ── Item list ── */}
          <div className="flex flex-col w-96 flex-shrink-0 overflow-y-auto space-y-2 pr-1">
            {items.map(item => {
              const color = urgencyColor(item);
              const isSelected = selected?.id === item.id;
              const customerName = item.customers?.display_name || item.customers?.phone_number || "Unknown";
              return (
                <button key={item.id} onClick={() => loadThread(item)}
                  className="w-full text-left transition-all"
                  style={{
                    ...GLASS,
                    padding: "14px 16px",
                    borderColor: isSelected ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.08)",
                    background: isSelected ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.03)",
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 12,
                  }}>

                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{LANG_FLAG[item.language] ?? "🌐"}</span>
                      <span className="font-semibold text-white text-sm truncate">{customerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={item.status === "pending_handoff"
                          ? { background: "rgba(251,191,36,0.15)", color: "#fde68a" }
                          : { background: "rgba(96,165,250,0.15)", color: "#93c5fd" }}>
                        {item.status === "pending_handoff" ? "⏳ Handoff" : "🧑 Active"}
                      </span>
                    </div>
                  </div>

                  {/* Phone */}
                  {item.customers?.display_name && (
                    <p className="text-xs font-mono mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {item.customers.phone_number}
                    </p>
                  )}

                  {/* Handoff reason */}
                  {item.handoff_reason && (
                    <div className="flex items-start gap-1.5 mb-2">
                      <span className="text-xs" style={{ color: "#fde68a" }}>↗</span>
                      <p className="text-xs" style={{ color: "#fde68a" }}>{item.handoff_reason}</p>
                    </div>
                  )}

                  {/* Last message preview */}
                  {item.last_message?.content && (
                    <p className="text-xs line-clamp-2 mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                      <span style={{ color: "rgba(255,255,255,0.25)" }}>
                        {item.last_message.role === "user" ? "👤 " : "🤖 "}
                      </span>
                      {item.last_message.content.slice(0, 120)}
                      {item.last_message.content.length > 120 ? "…" : ""}
                    </p>
                  )}

                  {/* Footer row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.closing_persona && (
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {PERSONA_EMOJI[item.closing_persona] ?? "✨"} {item.closing_persona}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {item.message_count} msgs
                      </span>
                    </div>
                    <span className="text-xs font-semibold"
                      style={{ color: item.idle_minutes > 60 ? "#f87171" : item.idle_minutes > 20 ? "#fbbf24" : "rgba(255,255,255,0.35)" }}>
                      {timeAgo(item.updated_at)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Thread panel ── */}
          <div className="flex-1 flex flex-col min-w-0" style={GLASS}>
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <span className="text-3xl">👈</span>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Select a conversation</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">{LANG_FLAG[selected.language] ?? "🌐"}</span>
                        <span className="font-bold text-white">
                          {selected.customers?.display_name || selected.customers?.phone_number || "Unknown"}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={selected.status === "pending_handoff"
                            ? { background: "rgba(251,191,36,0.15)", color: "#fde68a" }
                            : { background: "rgba(96,165,250,0.15)", color: "#93c5fd" }}>
                          {selected.status === "pending_handoff" ? "⏳ Waiting for handoff" : "🧑 Human active"}
                        </span>
                      </div>
                      {selected.customers?.display_name && (
                        <p className="text-xs font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {selected.customers.phone_number}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {selected.handoff_reason && (
                          <span className="text-xs" style={{ color: "#fde68a" }}>↗ {selected.handoff_reason}</span>
                        )}
                        {selected.closing_persona && (
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                            last: {PERSONA_EMOJI[selected.closing_persona] ?? "✨"} {selected.closing_persona}
                          </span>
                        )}
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {selected.message_count} messages · {timeAgo(selected.updated_at)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      {selected.customers?.phone_number && (
                        <a href={`https://wa.me/${selected.customers.phone_number.replace(/\D/g, "")}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                          style={{ background: "rgba(37,211,102,0.15)", color: "#4ade80", border: "1px solid rgba(37,211,102,0.3)" }}>
                          💬 Open WA
                        </a>
                      )}
                      {selected.status === "pending_handoff" && (
                        <button onClick={() => act(selected.id, "take_over")}
                          disabled={acting === selected.id}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-40"
                          style={{ background: "rgba(96,165,250,0.2)", color: "#93c5fd", border: "1px solid rgba(96,165,250,0.3)" }}>
                          {acting === selected.id ? "…" : "▶ Take over"}
                        </button>
                      )}
                      {selected.status === "human_active" && (
                        <button onClick={() => act(selected.id, "return_to_bot")}
                          disabled={acting === selected.id}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-40"
                          style={{ background: "rgba(167,139,250,0.15)", color: "#c084fc", border: "1px solid rgba(167,139,250,0.25)" }}>
                          {acting === selected.id ? "…" : "🤖 Return to Bot"}
                        </button>
                      )}
                      <button onClick={() => act(selected.id, "resolve")}
                        disabled={acting === selected.id}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-40"
                        style={{ background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.2)" }}>
                        {acting === selected.id ? "…" : "✓ Resolve"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {msgLoading ? (
                    <p className="text-center py-10 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</p>
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
      )}
    </div>
  );
}

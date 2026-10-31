"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: "low" | "medium" | "high";
  phone_hash: string | null;
  tenant_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}

interface Counts { high: number; medium: number; low: number }

const SEV: Record<string, React.CSSProperties> = {
  high:   { background: "rgba(248,113,113,0.15)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.3)" },
  medium: { background: "rgba(251,191,36,0.15)",  color: "#fde68a", border: "1px solid rgba(251,191,36,0.3)" },
  low:    { background: "rgba(148,163,184,0.15)", color: "#cbd5e1", border: "1px solid rgba(148,163,184,0.3)" },
};

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
};

export default function SecurityPage() {
  const [events, setEvents]     = useState<SecurityEvent[]>([]);
  const [counts, setCounts]     = useState<Counts>({ high: 0, medium: 0, low: 0 });
  const [loading, setLoading]   = useState(true);
  const [severity, setSeverity] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async (sev = severity) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (sev !== "all") params.set("severity", sev);
    const res = await fetch(`/api/admin/security?${params}`);
    const data = await res.json();
    setEvents(data.events ?? []);
    setCounts(data.counts ?? { high: 0, medium: 0, low: 0 });
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <a href="/admin" className="text-sm hover:opacity-80 transition-opacity"
            style={{ color: "rgba(255,255,255,0.45)" }}>← Dashboard</a>
          <h1 className="text-xl font-bold text-white mt-1">Security Log</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Anti-scam events, rate limits, HMAC failures, suspicious activity
          </p>
        </div>

        {/* Severity pills */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {[
            { label: "High",   value: counts.high,   sev: "high" },
            { label: "Medium", value: counts.medium, sev: "medium" },
            { label: "Low",    value: counts.low,    sev: "low" },
          ].map(p => (
            <button key={p.sev} onClick={() => { setSeverity(p.sev === severity ? "all" : p.sev); load(p.sev === severity ? "all" : p.sev); }}
              className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition-all"
              style={{ ...SEV[p.sev], opacity: severity !== "all" && severity !== p.sev ? 0.4 : 1 }}>
              <span className="text-xl font-bold">{p.value}</span>
              <span>{p.label} severity</span>
            </button>
          ))}
          {severity !== "all" && (
            <button onClick={() => { setSeverity("all"); load("all"); }}
              className="px-3 py-2 rounded-xl text-xs"
              style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)" }}>
              Clear filter ✕
            </button>
          )}
        </div>

        {/* Event list */}
        {loading ? (
          <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.35)" }}>Loading…</div>
        ) : events.length === 0 ? (
          <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.3)" }}>No events found</div>
        ) : (
          <div className="space-y-2">
            {events.map(ev => {
              const isExpanded = expanded === ev.id;
              return (
                <div key={ev.id} style={GLASS}>
                  <div className="flex items-center gap-4 px-4 py-3 cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : ev.id)}>

                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0"
                      style={SEV[ev.severity]}>
                      {ev.severity}
                    </span>

                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-mono text-white">{ev.event_type}</span>
                      {ev.phone_hash && (
                        <span className="ml-3 text-xs font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {ev.phone_hash}
                        </span>
                      )}
                    </div>

                    <span className="text-xs flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {new Date(ev.created_at).toLocaleString("en-SG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{isExpanded ? "▲" : "▼"}</span>
                  </div>

                  {isExpanded && ev.detail && Object.keys(ev.detail).length > 0 && (
                    <div className="px-4 pb-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                      <pre className="mt-3 text-xs rounded-lg p-3 overflow-auto"
                        style={{ background: "rgba(0,0,0,0.3)", color: "#a5f3fc", maxHeight: 200 }}>
                        {JSON.stringify(ev.detail, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

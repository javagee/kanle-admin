"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourPackage {
  id: string;
  package_code: string;
  name: string;
  name_zh: string | null;
  destination: string;
  duration_days: number;
  duration_nights: number;
  price_adult_sgd: number;
  price_child_sgd: number;
  max_pax: number;
  departure_days: string[];
  inclusions: string[];
  exclusions: string[];
  ar_preview_url: string | null;
  active: boolean;
  created_at: string;
}

type FormState = {
  package_code: string; name: string; name_zh: string;
  destination: string; duration_days: string; duration_nights: string;
  price_adult_sgd: string; price_child_sgd: string; max_pax: string;
  departure_days: string[]; inclusions: string; exclusions: string; active: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAY_SHORT: Record<string,string> = {
  Monday:"Mon", Tuesday:"Tue", Wednesday:"Wed", Thursday:"Thu",
  Friday:"Fri", Saturday:"Sat", Sunday:"Sun",
};
const DEST_LABEL: Record<string,string> = { batam: "🏝️ Batam", bali: "🌺 Bali" };
const DEST_COLOR: Record<string,string> = { batam: "#34d399", bali: "#f472b6" };

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)", backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
};
const INPUT: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "10px", padding: "8px 12px", fontSize: "13px", color: "#fff", outline: "none",
};
const LABEL: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: "5px",
};

const EMPTY_FORM: FormState = {
  package_code: "", name: "", name_zh: "", destination: "batam",
  duration_days: "3", duration_nights: "2",
  price_adult_sgd: "", price_child_sgd: "", max_pax: "40",
  departure_days: [], inclusions: "", exclusions: "", active: true,
};

function toForm(p: TourPackage): FormState {
  return {
    package_code:    p.package_code,
    name:            p.name,
    name_zh:         p.name_zh ?? "",
    destination:     p.destination,
    duration_days:   String(p.duration_days),
    duration_nights: String(p.duration_nights),
    price_adult_sgd: String(p.price_adult_sgd),
    price_child_sgd: String(p.price_child_sgd),
    max_pax:         String(p.max_pax),
    departure_days:  p.departure_days ?? [],
    inclusions:      (p.inclusions ?? []).join("\n"),
    exclusions:      (p.exclusions ?? []).join("\n"),
    active:          p.active,
  };
}

function toPayload(f: FormState) {
  return {
    package_code:    f.package_code.trim(),
    name:            f.name.trim(),
    name_zh:         f.name_zh.trim() || null,
    destination:     f.destination,
    duration_days:   Number(f.duration_days) || 1,
    duration_nights: Number(f.duration_nights) || 0,
    price_adult_sgd: parseFloat(f.price_adult_sgd) || 0,
    price_child_sgd: parseFloat(f.price_child_sgd) || 0,
    max_pax:         Number(f.max_pax) || 40,
    departure_days:  f.departure_days,
    inclusions:      f.inclusions.split("\n").map(s => s.trim()).filter(Boolean),
    exclusions:      f.exclusions.split("\n").map(s => s.trim()).filter(Boolean),
    active:          f.active,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ToursPage() {
  const [packages, setPackages]  = useState<TourPackage[]>([]);
  const [loading, setLoading]    = useState(true);
  const [showForm, setShowForm]  = useState(false);
  const [editing, setEditing]    = useState<TourPackage | null>(null);
  const [form, setForm]          = useState<FormState>({ ...EMPTY_FORM });
  const [saving, setSaving]      = useState(false);
  const [formErr, setFormErr]    = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/tours")
      .then(r => r.ok ? r.json() : { packages: [] })
      .then(d => { setPackages(d.packages ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const f = (k: keyof FormState, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const toggleDay = (day: string) =>
    f("departure_days", form.departure_days.includes(day)
      ? form.departure_days.filter(d => d !== day)
      : [...form.departure_days, day]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setFormErr(""); setShowForm(true); };
  const openEdit   = (p: TourPackage) => { setEditing(p); setForm(toForm(p)); setFormErr(""); setShowForm(true); };

  const save = async () => {
    if (!form.name || !form.package_code) { setFormErr("Package code and name are required"); return; }
    setSaving(true); setFormErr("");
    const url    = editing ? `/api/admin/tours/${editing.id}` : "/api/admin/tours";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(form)),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormErr(data.error ?? "Save failed"); return; }
    setShowForm(false);
    load();
  };

  const toggleActive = async (pkg: TourPackage) => {
    const method = pkg.active ? "DELETE" : "PATCH";
    const body   = pkg.active ? undefined : JSON.stringify({ active: true });
    await fetch(`/api/admin/tours/${pkg.id}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
    });
    load();
  };

  const activeCount   = packages.filter(p => p.active).length;
  const inactiveCount = packages.length - activeCount;

  return (
    <>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <a href="/admin" className="text-xs hover:opacity-80" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>← Dashboard</a>
            <h1 className="text-xl font-bold text-white mt-1">Tour Packages</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {activeCount} active · {inactiveCount} inactive
            </p>
          </div>
          <button onClick={openCreate}
            className="font-semibold px-5 py-2 rounded-xl text-sm"
            style={{ background: "linear-gradient(135deg,#34d399,#059669)", color: "#fff", boxShadow: "0 4px 16px rgba(52,211,153,0.3)" }}>
            + New Package
          </button>
        </div>

        {loading ? (
          <p className="text-center py-16" style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p>
        ) : packages.length === 0 ? (
          <div className="text-center py-20 rounded-2xl" style={GLASS}>
            <p className="text-4xl mb-4">🗺️</p>
            <p className="text-lg font-semibold text-white mb-2">No tour packages yet</p>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Add your first package to start taking bookings</p>
            <button onClick={openCreate}
              className="px-6 py-2 rounded-xl font-semibold text-sm"
              style={{ background: "linear-gradient(135deg,#34d399,#059669)", color: "#fff" }}>
              Add first package
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {packages.map(pkg => (
              <div key={pkg.id}
                className={`rounded-2xl p-5 ${!pkg.active ? "opacity-50" : ""}`}
                style={GLASS}>
                <div className="flex items-start gap-4">

                  {/* Destination badge */}
                  <div className="rounded-xl px-3 py-1.5 flex-shrink-0 text-center" style={{
                    background: `${DEST_COLOR[pkg.destination] ?? "#a78bfa"}20`,
                    border: `1px solid ${DEST_COLOR[pkg.destination] ?? "#a78bfa"}40`,
                    minWidth: 72,
                  }}>
                    <p className="text-xs font-bold" style={{ color: DEST_COLOR[pkg.destination] ?? "#a78bfa" }}>
                      {DEST_LABEL[pkg.destination] ?? pkg.destination}
                    </p>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md"
                        style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>
                        {pkg.package_code}
                      </span>
                      <h3 className="font-semibold text-white">{pkg.name}</h3>
                      {pkg.name_zh && (
                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{pkg.name_zh}</span>
                      )}
                      {!pkg.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5" }}>inactive</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 flex-wrap" style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                      <span>⏱ {pkg.duration_days}D {pkg.duration_nights}N</span>
                      <span style={{ color: "#34d399" }}>👤 S${Number(pkg.price_adult_sgd).toFixed(0)}</span>
                      <span style={{ color: "#60a5fa" }}>🧒 S${Number(pkg.price_child_sgd).toFixed(0)}</span>
                      <span>👥 Max {pkg.max_pax} pax</span>
                      {pkg.departure_days?.length > 0 && (
                        <span>
                          🗓️ {pkg.departure_days.map(d => DAY_SHORT[d] ?? d).join(" · ")}
                        </span>
                      )}
                    </div>

                    {/* Inclusions preview */}
                    {pkg.inclusions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pkg.inclusions.slice(0, 4).map((inc, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(52,211,153,0.1)", color: "rgba(52,211,153,0.8)", border: "1px solid rgba(52,211,153,0.2)" }}>
                            ✓ {inc}
                          </span>
                        ))}
                        {pkg.inclusions.length > 4 && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
                            +{pkg.inclusions.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(pkg)}
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg"
                      style={{ color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.08)" }}>
                      Edit
                    </button>
                    <button onClick={() => toggleActive(pkg)}
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg"
                      style={pkg.active
                        ? { color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.08)" }
                        : { color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.25)", background: "rgba(52,211,153,0.08)" }}>
                      {pkg.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,0,30,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{ background: "linear-gradient(160deg,#1e0545 0%,#2d0f5e 100%)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>

            <div className="px-8 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <h2 className="text-lg font-bold text-white">{editing ? `Edit — ${editing.name}` : "New Tour Package"}</h2>
            </div>

            <div className="px-8 py-6 grid gap-5">

              {/* Row 1: code + name */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label style={LABEL}>Package Code *</label>
                  <input value={form.package_code} onChange={e => f("package_code", e.target.value.toUpperCase())}
                    placeholder="BTM-01" style={{ ...INPUT, fontFamily: "monospace" }} />
                </div>
                <div className="col-span-2">
                  <label style={LABEL}>Package Name (English) *</label>
                  <input value={form.name} onChange={e => f("name", e.target.value)}
                    placeholder="Leisure Tour Package" style={INPUT} />
                </div>
              </div>

              {/* Row 2: Chinese name + destination */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={LABEL}>Package Name (Chinese)</label>
                  <input value={form.name_zh} onChange={e => f("name_zh", e.target.value)}
                    placeholder="康乐·逍遥游" style={INPUT} />
                </div>
                <div>
                  <label style={LABEL}>Destination</label>
                  <div className="flex gap-2">
                    {["batam", "bali"].map(dest => (
                      <button key={dest} type="button" onClick={() => f("destination", dest)}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={form.destination === dest
                          ? { background: `${DEST_COLOR[dest]}20`, color: DEST_COLOR[dest], border: `1px solid ${DEST_COLOR[dest]}50` }
                          : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {DEST_LABEL[dest]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: duration + pricing */}
              <div>
                <p style={{ ...LABEL, marginBottom: 10 }}>Duration & Pricing</p>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label style={{ ...LABEL, fontSize: 10 }}>Days</label>
                    <input type="number" min="1" value={form.duration_days} onChange={e => f("duration_days", e.target.value)} style={INPUT} />
                  </div>
                  <div>
                    <label style={{ ...LABEL, fontSize: 10 }}>Nights</label>
                    <input type="number" min="0" value={form.duration_nights} onChange={e => f("duration_nights", e.target.value)} style={INPUT} />
                  </div>
                  <div>
                    <label style={{ ...LABEL, fontSize: 10 }}>Adult (SGD)</label>
                    <input type="number" min="0" step="0.01" value={form.price_adult_sgd} onChange={e => f("price_adult_sgd", e.target.value)}
                      placeholder="200" style={INPUT} />
                  </div>
                  <div>
                    <label style={{ ...LABEL, fontSize: 10 }}>Child (SGD)</label>
                    <input type="number" min="0" step="0.01" value={form.price_child_sgd} onChange={e => f("price_child_sgd", e.target.value)}
                      placeholder="140" style={INPUT} />
                  </div>
                </div>
              </div>

              {/* Row 4: max pax + active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={LABEL}>Max Pax Per Departure</label>
                  <input type="number" min="1" value={form.max_pax} onChange={e => f("max_pax", e.target.value)} style={INPUT} />
                </div>
                <div>
                  <label style={LABEL}>Status</label>
                  <button type="button" onClick={() => f("active", !form.active)}
                    className="w-full py-2 rounded-xl text-sm font-semibold transition-all"
                    style={form.active
                      ? { background: "rgba(52,211,153,0.15)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.3)" }
                      : { background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>
                    {form.active ? "✓ Active (visible to customers)" : "✗ Inactive (hidden)"}
                  </button>
                </div>
              </div>

              {/* Row 5: departure days */}
              <div>
                <label style={LABEL}>Departure Days</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {DAYS.map(day => (
                    <button key={day} type="button" onClick={() => toggleDay(day)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={form.departure_days.includes(day)
                        ? { background: "rgba(167,139,250,0.25)", color: "#c4b5fd", border: "1px solid rgba(167,139,250,0.4)" }
                        : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      {DAY_SHORT[day]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 6: inclusions / exclusions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={LABEL}>Inclusions <span style={{ fontWeight: 400, textTransform: "none" }}>(one per line)</span></label>
                  <textarea value={form.inclusions} onChange={e => f("inclusions", e.target.value)}
                    rows={5} placeholder={"Ferry tickets (SG–Batam–SG)\nHotel (2 nights)\nDaily breakfast\nAirport transfers"}
                    style={{ ...INPUT, resize: "vertical", lineHeight: 1.6, fontSize: 12 }} />
                </div>
                <div>
                  <label style={LABEL}>Exclusions <span style={{ fontWeight: 400, textTransform: "none" }}>(one per line)</span></label>
                  <textarea value={form.exclusions} onChange={e => f("exclusions", e.target.value)}
                    rows={5} placeholder={"Travel insurance\nPersonal expenses\nOptional activities"}
                    style={{ ...INPUT, resize: "vertical", lineHeight: 1.6, fontSize: 12 }} />
                </div>
              </div>

            </div>

            {formErr && (
              <div className="mx-8 mb-4 px-4 py-3 rounded-xl text-sm"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                {formErr}
              </div>
            )}

            <div className="px-8 py-5 flex justify-end gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button onClick={() => setShowForm(false)}
                className="px-5 py-2 text-sm font-medium rounded-xl"
                style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="px-6 py-2 text-sm font-bold rounded-xl disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#34d399,#059669)", color: "#fff", boxShadow: "0 4px 16px rgba(52,211,153,0.3)" }}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Package"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

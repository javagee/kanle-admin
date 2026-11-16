"use client";

import { useEffect, useState, useCallback } from "react";

const NAVY2  = "#0F1442";
const CYAN   = "#00E5FF";
const VIOLET = "#a78bfa";
const PURPLE = "#7c3aed";
const TEXT   = "#e2e8f0";
const MUTED  = "rgba(226,232,240,0.5)";
const BORDER = "rgba(0,229,255,0.18)";
const BORDER_V = "rgba(167,139,250,0.25)";
const ACTIVE_BG = "rgba(124,58,237,0.18)";
const CARD   = "rgba(255,255,255,0.03)";

const CATEGORIES = ["all","gear_rental","activity","food","accommodation","transport","retail","other"];
const PRICE_UNITS = ["per_item","per_pax","per_day","per_hour","per_set"];

interface Product {
  id: string;
  sku: string | null;
  name: string;
  name_zh: string | null;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  price_sgd: number;
  price_unit: string;
  min_qty: number;
  max_qty: number | null;
  stock_qty: number | null;
  image_urls: string[] | null;
  location: string | null;
  active: boolean;
  featured: boolean;
  created_at: string;
  vendors: { id: string; name: string } | null;
}

type ModalMode = "add" | "edit" | null;

const emptyForm = () => ({
  name: "", name_zh: "", description: "", category: "", sku: "",
  price_sgd: "", price_unit: "per_item", min_qty: "1", max_qty: "", stock_qty: "",
  location: "", tags: "", active: true, featured: false,
});

export default function ProductsPage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [activeFilter, setActive] = useState<"all"|"true"|"false">("all");
  const [catFilter, setCat]       = useState("all");
  const [modal, setModal]         = useState<ModalMode>(null);
  const [editing, setEditing]     = useState<Product | null>(null);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState("");
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (activeFilter !== "all") params.set("active", activeFilter);
    if (catFilter !== "all") params.set("category", catFilter);
    const r = await fetch(`/api/admin/products?${params}`);
    if (r.ok) {
      const d = await r.json();
      setProducts(d.products);
      setTotal(d.total);
    }
    setLoading(false);
  }, [page, activeFilter, catFilter]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(emptyForm()); setEditing(null); setErr(""); setModal("add"); };
  const openEdit = (p: Product) => {
    setForm({
      name: p.name, name_zh: p.name_zh ?? "", description: p.description ?? "",
      category: p.category ?? "", sku: p.sku ?? "",
      price_sgd: String(p.price_sgd), price_unit: p.price_unit,
      min_qty: String(p.min_qty), max_qty: p.max_qty ? String(p.max_qty) : "",
      stock_qty: p.stock_qty !== null ? String(p.stock_qty) : "",
      location: p.location ?? "", tags: (p.tags ?? []).join(", "),
      active: p.active, featured: p.featured,
    });
    setEditing(p);
    setErr("");
    setModal("edit");
  };

  const save = async () => {
    if (!form.name || !form.price_sgd) { setErr("Name and price are required"); return; }
    setSaving(true);
    setErr("");
    const body: Record<string, unknown> = {
      name: form.name, name_zh: form.name_zh || null,
      description: form.description || null, category: form.category || null,
      sku: form.sku || null, price_sgd: parseFloat(form.price_sgd),
      price_unit: form.price_unit, min_qty: parseInt(form.min_qty) || 1,
      max_qty: form.max_qty ? parseInt(form.max_qty) : null,
      stock_qty: form.stock_qty !== "" ? parseInt(form.stock_qty) : null,
      location: form.location || null,
      tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      active: form.active, featured: form.featured,
    };
    if (modal === "edit" && editing) body.id = editing.id;
    const r = await fetch("/api/admin/products", {
      method: modal === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) { setModal(null); load(); }
    else { const d = await r.json(); setErr(d.error ?? "Save failed"); }
    setSaving(false);
  };

  const toggleActive = async (p: Product) => {
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, active: !p.active }),
    });
    load();
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <a href="/admin" style={{ fontSize: 12, color: MUTED, textDecoration: "none" }}>← Dashboard</a>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: TEXT, margin: "4px 0 2px" }}>Products</h1>
          <p style={{ fontSize: 12, color: MUTED }}>{total} products total</p>
        </div>
        <button onClick={openAdd} style={{
          padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
          background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`,
          color: "#fff", border: "none", boxShadow: "0 2px 8px rgba(124,58,237,0.4)",
        }}>
          + Add Product
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {(["all","true","false"] as const).map(v => (
          <button key={v} onClick={() => { setActive(v); setPage(1); }} style={{
            padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
            background: activeFilter === v ? ACTIVE_BG : "transparent",
            color: activeFilter === v ? VIOLET : MUTED,
            border: `1px solid ${activeFilter === v ? BORDER_V : "rgba(255,255,255,0.08)"}`,
          }}>
            {v === "all" ? "All" : v === "true" ? "Active" : "Inactive"}
          </button>
        ))}
        <div style={{ width: 1, background: BORDER, margin: "0 4px" }} />
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => { setCat(c); setPage(1); }} style={{
            padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
            background: catFilter === c ? "rgba(0,229,255,0.1)" : "transparent",
            color: catFilter === c ? CYAN : MUTED,
            border: `1px solid ${catFilter === c ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.08)"}`,
          }}>
            {c === "all" ? "All categories" : c.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED }}>Loading…</div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: MUTED, background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <p>No products found. Add your first product.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {products.map(p => (
            <div key={p.id} style={{
              background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
              padding: 16, display: "flex", flexDirection: "column", gap: 8,
              opacity: p.active ? 1 : 0.55,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{p.name}</span>
                    {p.featured && (
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(253,224,71,0.15)", color: "#fde047", border: "1px solid rgba(253,224,71,0.3)" }}>
                        ★ Featured
                      </span>
                    )}
                    {!p.active && (
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  {p.name_zh && <div style={{ fontSize: 12, color: MUTED }}>{p.name_zh}</div>}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: CYAN, whiteSpace: "nowrap" }}>
                  S${Number(p.price_sgd).toFixed(2)}
                  <span style={{ fontSize: 10, color: MUTED, fontWeight: 400 }}> /{p.price_unit.replace("per_","")}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {p.category && (
                  <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "rgba(167,139,250,0.1)", color: VIOLET, border: `1px solid ${BORDER_V}` }}>
                    {p.category.replace(/_/g, " ")}
                  </span>
                )}
                {p.location && (
                  <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "rgba(0,229,255,0.07)", color: CYAN, border: "1px solid rgba(0,229,255,0.15)" }}>
                    📍 {p.location}
                  </span>
                )}
                {p.stock_qty !== null && (
                  <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.05)", color: MUTED, border: "1px solid rgba(255,255,255,0.08)" }}>
                    Stock: {p.stock_qty}
                  </span>
                )}
              </div>

              {p.description && (
                <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.4,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {p.description}
                </p>
              )}

              {(p.tags ?? []).length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {(p.tags ?? []).slice(0, 4).map(t => (
                    <span key={t} style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: "rgba(255,255,255,0.05)", color: MUTED }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => openEdit(p)} style={{
                  flex: 1, padding: "5px 0", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
                  background: "rgba(167,139,250,0.1)", color: VIOLET, border: `1px solid ${BORDER_V}`,
                }}>
                  Edit
                </button>
                <button onClick={() => toggleActive(p)} style={{
                  flex: 1, padding: "5px 0", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
                  background: p.active ? "rgba(248,113,113,0.08)" : "rgba(74,222,128,0.08)",
                  color: p.active ? "#f87171" : "#4ade80",
                  border: `1px solid ${p.active ? "rgba(248,113,113,0.2)" : "rgba(74,222,128,0.2)"}`,
                }}>
                  {p.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{
            padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: page === 1 ? "default" : "pointer",
            background: "transparent", color: page === 1 ? MUTED : TEXT, border: `1px solid ${BORDER}`, opacity: page === 1 ? 0.4 : 1,
          }}>← Prev</button>
          <span style={{ padding: "6px 14px", fontSize: 12, color: MUTED }}>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{
            padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: page === totalPages ? "default" : "pointer",
            background: "transparent", color: page === totalPages ? MUTED : TEXT, border: `1px solid ${BORDER}`, opacity: page === totalPages ? 0.4 : 1,
          }}>Next →</button>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <>
          <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            width: "min(560px, 95vw)", maxHeight: "90vh", overflowY: "auto",
            background: `linear-gradient(180deg, ${NAVY2} 0%, #0D1138 100%)`,
            border: `1px solid ${BORDER}`, borderRadius: 14,
            padding: 24, zIndex: 50,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: "0 0 20px" }}>
              {modal === "add" ? "Add Product" : "Edit Product"}
            </h2>

            <div style={{ display: "grid", gap: 14 }}>
              <Field label="Product Name *">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Snorkel Set Rental" style={inputStyle} />
              </Field>
              <Field label="Name (Chinese)">
                <input value={form.name_zh} onChange={e => setForm(f => ({ ...f, name_zh: e.target.value }))} placeholder="e.g. 浮潜套装租赁" style={inputStyle} />
              </Field>
              <Field label="Description">
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Short product description…" style={{ ...inputStyle, resize: "vertical" }} />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Price (SGD) *">
                  <input type="number" min="0" step="0.01" value={form.price_sgd} onChange={e => setForm(f => ({ ...f, price_sgd: e.target.value }))} placeholder="0.00" style={inputStyle} />
                </Field>
                <Field label="Price Unit">
                  <select value={form.price_unit} onChange={e => setForm(f => ({ ...f, price_unit: e.target.value }))} style={inputStyle}>
                    {PRICE_UNITS.map(u => <option key={u} value={u}>{u.replace("per_","per ")}</option>)}
                  </select>
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Field label="Min Qty">
                  <input type="number" min="1" value={form.min_qty} onChange={e => setForm(f => ({ ...f, min_qty: e.target.value }))} style={inputStyle} />
                </Field>
                <Field label="Max Qty">
                  <input type="number" min="1" value={form.max_qty} onChange={e => setForm(f => ({ ...f, max_qty: e.target.value }))} placeholder="Unlimited" style={inputStyle} />
                </Field>
                <Field label="Stock Qty">
                  <input type="number" min="0" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: e.target.value }))} placeholder="Unlimited" style={inputStyle} />
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Category">
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                    <option value="">— select —</option>
                    {CATEGORIES.filter(c => c !== "all").map(c => (
                      <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Location">
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. batam" style={inputStyle} />
                </Field>
              </div>

              <Field label="SKU">
                <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. SNK-001" style={inputStyle} />
              </Field>

              <Field label="Tags (comma-separated)">
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. snorkel, water sports, rental" style={inputStyle} />
              </Field>

              <div style={{ display: "flex", gap: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: TEXT, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                  Active
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: TEXT, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
                  Featured
                </label>
              </div>
            </div>

            {err && <p style={{ color: "#f87171", fontSize: 12, marginTop: 12 }}>{err}</p>}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(null)} style={{
                flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, cursor: "pointer",
                background: "transparent", color: MUTED, border: `1px solid ${BORDER}`,
              }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{
                flex: 2, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: `linear-gradient(135deg, ${PURPLE}, #6d28d9)`, color: "#fff", border: "none",
                opacity: saving ? 0.6 : 1,
              }}>{saving ? "Saving…" : modal === "add" ? "Add Product" : "Save Changes"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 7, fontSize: 13,
  background: "rgba(255,255,255,0.05)", color: TEXT,
  border: "1px solid rgba(255,255,255,0.12)", outline: "none", boxSizing: "border-box",
};

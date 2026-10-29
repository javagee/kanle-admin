"use client";

import { useEffect, useState, useRef } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE || "https://hipyhub.vercel.app";

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
};

interface Worksheet {
  id: string;
  title: string;
  title_zh?: string;
  subject: string;
  grade_level: string;
  curriculum: string;
  language: string;
  price_single_sgd: number;
  price_class_sgd?: number;
  price_school_sgd?: number;
  page_count?: number;
  active: boolean;
  preview_url?: string;
  file_url?: string;
  created_at: string;
}

interface UploadForm {
  title: string;
  title_zh: string;
  subject: string;
  grade_level: string;
  curriculum: string;
  language: string;
  description: string;
  page_count: string;
  price_single_sgd: string;
  price_class_sgd: string;
  price_school_sgd: string;
  preview_url: string;
}

const EMPTY_FORM: UploadForm = {
  title: "", title_zh: "", subject: "", grade_level: "",
  curriculum: "MOE-SG", language: "EN", description: "",
  page_count: "", price_single_sgd: "5.90",
  price_class_sgd: "", price_school_sgd: "",
  preview_url: "",
};

const SUBJECTS = ["math", "english", "science", "mandarin", "social_studies", "compliance", "other"];
const GRADES   = ["K1", "K2", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "corporate"];
const LANGS    = ["EN", "ZH", "MS"];
const CURRICULA = ["MOE-SG", "IB", "CBSE", "Cambridge", "custom"];

export default function WorksheetsAdminPage() {
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState<UploadForm>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchWorksheets(); }, []);

  async function fetchWorksheets() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/worksheets`);
      const d = await r.json();
      setWorksheets(d.worksheets || []);
    } catch {
      setError("Could not load worksheets");
    }
    setLoading(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Please select a PDF file"); return; }
    setUploading(true);
    setError("");

    try {
      // Step 1 — get a signed upload URL from the API
      setUploadProgress("Getting upload URL…");
      const urlRes = await fetch(
        `${API}/api/worksheets/admin/upload-url?filename=${encodeURIComponent(file.name)}&content_type=application/pdf`
      );
      if (!urlRes.ok) throw new Error("Could not get upload URL");
      const { upload_url, storage_path } = await urlRes.json();

      // Step 2 — PUT the file directly to Supabase Storage
      setUploadProgress("Uploading PDF…");
      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!putRes.ok) throw new Error("File upload failed");

      // Step 3 — Register the worksheet record in the DB
      setUploadProgress("Saving worksheet details…");
      const record = {
        title: form.title,
        title_zh: form.title_zh || undefined,
        subject: form.subject,
        grade_level: form.grade_level,
        curriculum: form.curriculum,
        language: form.language,
        description: form.description || undefined,
        page_count: form.page_count ? parseInt(form.page_count) : undefined,
        file_url: storage_path,
        preview_url: form.preview_url || undefined,
        price_single_sgd: parseFloat(form.price_single_sgd),
        price_class_sgd: form.price_class_sgd ? parseFloat(form.price_class_sgd) : undefined,
        price_school_sgd: form.price_school_sgd ? parseFloat(form.price_school_sgd) : undefined,
      };

      const createRes = await fetch(`${API}/api/worksheets/admin/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      if (!createRes.ok) throw new Error("Could not save worksheet details");

      setUploadProgress("Done!");
      setForm(EMPTY_FORM);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setShowUpload(false);
      await fetchWorksheets();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setUploading(false);
    setUploadProgress("");
  }

  async function toggleActive(ws: Worksheet) {
    await fetch(`${API}/api/worksheets/admin/create`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ws.id, active: !ws.active }),
    });
    await fetchWorksheets();
  }

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
    color: "white", fontSize: 14, outline: "none",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0a1a 0%,#0d1f0d 100%)", padding: "32px 24px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* Header */}
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h1 style={{ color: "white", fontSize: 24, fontWeight: 700, margin: 0 }}>📚 Worksheet Catalogue</h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, margin: "4px 0 0" }}>
              {worksheets.length} worksheet{worksheets.length !== 1 ? "s" : ""} · Upload PDF → auto-delivers via WhatsApp
            </p>
          </div>
          <button
            onClick={() => { setShowUpload(!showUpload); setError(""); }}
            style={{ padding: "10px 20px", borderRadius: 8, background: "#009658", color: "white", border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            {showUpload ? "✕ Cancel" : "+ Upload Worksheet"}
          </button>
        </div>

        {/* Upload form */}
        {showUpload && (
          <div style={{ ...GLASS, borderRadius: 16, padding: 28, marginBottom: 28 }}>
            <h2 style={{ color: "white", fontSize: 16, fontWeight: 700, margin: "0 0 20px" }}>Upload New Worksheet</h2>
            <form onSubmit={handleUpload}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>PDF File *</label>
                  <input ref={fileRef} type="file" accept="application/pdf" required onChange={e => setFile(e.target.files?.[0] || null)}
                    style={{ ...inputStyle, padding: "8px 14px" }} />
                  {file && <p style={{ color: "#34d399", fontSize: 12, marginTop: 4 }}>✓ {file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
                </div>

                <div>
                  <label style={labelStyle}>Title (English) *</label>
                  <input required style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="P3 Mathematics — Problem Sums" />
                </div>
                <div>
                  <label style={labelStyle}>Title (Chinese)</label>
                  <input style={inputStyle} value={form.title_zh} onChange={e => setForm({ ...form, title_zh: e.target.value })} placeholder="小三数学 — 应用题" />
                </div>

                <div>
                  <label style={labelStyle}>Subject *</label>
                  <select required style={selectStyle} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                    <option value="">Select subject</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Grade Level *</label>
                  <select required style={selectStyle} value={form.grade_level} onChange={e => setForm({ ...form, grade_level: e.target.value })}>
                    <option value="">Select grade</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Curriculum</label>
                  <select style={selectStyle} value={form.curriculum} onChange={e => setForm({ ...form, curriculum: e.target.value })}>
                    {CURRICULA.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Language</label>
                  <select style={selectStyle} value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
                    {LANGS.map(l => <option key={l} value={l}>{l === "EN" ? "English" : l === "ZH" ? "Chinese" : "Malay"}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Price — Single (S$) *</label>
                  <input required type="number" step="0.10" min="0" style={inputStyle} value={form.price_single_sgd} onChange={e => setForm({ ...form, price_single_sgd: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Price — Class Pack (S$)</label>
                  <input type="number" step="0.10" min="0" style={inputStyle} value={form.price_class_sgd} onChange={e => setForm({ ...form, price_class_sgd: e.target.value })} placeholder="e.g. 49.00" />
                </div>

                <div>
                  <label style={labelStyle}>Price — School Monthly (S$)</label>
                  <input type="number" step="1" min="0" style={inputStyle} value={form.price_school_sgd} onChange={e => setForm({ ...form, price_school_sgd: e.target.value })} placeholder="e.g. 199.00" />
                </div>
                <div>
                  <label style={labelStyle}>Page Count</label>
                  <input type="number" min="1" style={inputStyle} value={form.page_count} onChange={e => setForm({ ...form, page_count: e.target.value })} placeholder="12" />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Preview URL (first 2 pages, public link)</label>
                  <input style={inputStyle} value={form.preview_url} onChange={e => setForm({ ...form, preview_url: e.target.value })} placeholder="https://..." />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Description</label>
                  <textarea rows={2} style={{ ...inputStyle, resize: "vertical" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description for the AI to present to customers" />
                </div>
              </div>

              {error && <p style={{ color: "#f87171", fontSize: 13, margin: "12px 0 0" }}>⚠️ {error}</p>}
              {uploadProgress && <p style={{ color: "#34d399", fontSize: 13, margin: "12px 0 0" }}>⏳ {uploadProgress}</p>}

              <button type="submit" disabled={uploading}
                style={{ marginTop: 20, padding: "12px 32px", borderRadius: 8, background: uploading ? "#555" : "#009658", color: "white", border: "none", fontWeight: 700, fontSize: 15, cursor: uploading ? "not-allowed" : "pointer" }}>
                {uploading ? "Uploading…" : "Upload & Publish"}
              </button>
            </form>
          </div>
        )}

        {/* Worksheet list */}
        {loading ? (
          <p style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 60 }}>Loading…</p>
        ) : worksheets.length === 0 ? (
          <div style={{ ...GLASS, borderRadius: 16, padding: 48, textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>No worksheets yet.</p>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Click "Upload Worksheet" to add your first Canva export.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }}>
            {worksheets.map(ws => (
              <div key={ws.id} style={{ ...GLASS, borderRadius: 14, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: "white", fontWeight: 700, fontSize: 15, margin: 0 }}>{ws.title}</p>
                    {ws.title_zh && <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, margin: "2px 0 0" }}>{ws.title_zh}</p>}
                  </div>
                  <span style={{
                    padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: ws.active ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
                    color: ws.active ? "#34d399" : "#f87171",
                    border: `1px solid ${ws.active ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
                  }}>
                    {ws.active ? "Active" : "Hidden"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {[ws.subject, ws.grade_level, ws.curriculum, ws.language].filter(Boolean).map(tag => (
                    <span key={tag} style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{tag}</span>
                  ))}
                  {ws.page_count && <span style={{ padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{ws.page_count}pp</span>}
                </div>

                <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  <div>
                    <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: 0, textTransform: "uppercase" }}>Single</p>
                    <p style={{ color: "#34d399", fontWeight: 700, fontSize: 16, margin: 0 }}>S${ws.price_single_sgd?.toFixed(2)}</p>
                  </div>
                  {ws.price_class_sgd && (
                    <div>
                      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: 0, textTransform: "uppercase" }}>Class</p>
                      <p style={{ color: "#60a5fa", fontWeight: 700, fontSize: 16, margin: 0 }}>S${ws.price_class_sgd.toFixed(2)}</p>
                    </div>
                  )}
                  {ws.price_school_sgd && (
                    <div>
                      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, margin: 0, textTransform: "uppercase" }}>School/mo</p>
                      <p style={{ color: "#a78bfa", fontWeight: 700, fontSize: 16, margin: 0 }}>S${ws.price_school_sgd.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {ws.preview_url && (
                    <a href={ws.preview_url} target="_blank" rel="noreferrer"
                      style={{ flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 7, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", fontSize: 12, textDecoration: "none" }}>
                      👁 Preview
                    </a>
                  )}
                  <button onClick={() => toggleActive(ws)}
                    style={{ flex: 1, padding: "7px 0", borderRadius: 7, background: ws.active ? "rgba(248,113,113,0.12)" : "rgba(52,211,153,0.12)", color: ws.active ? "#f87171" : "#34d399", border: "none", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                    {ws.active ? "Hide" : "Publish"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

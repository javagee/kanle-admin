"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  title_zh: string | null;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  level: string;
  language: string;
  price_sgd: number;
  is_published: boolean;
  is_featured: boolean;
  total_lessons: number;
  total_duration_min: number;
  created_at: string;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
};
const LEVEL_COLOR: Record<string, string> = {
  beginner: "#6ee7b7", intermediate: "#fbbf24", advanced: "#f87171",
};

export default function CoursesPage() {
  const [courses, setCourses]   = useState<Course[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [showNew, setShowNew]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({
    title: "", title_zh: "", description: "", category: "",
    level: "beginner", language: "en", price_sgd: "0",
    thumbnail_url: "", is_published: false,
  });

  const load = async (q = search) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    const res = await fetch(`/api/admin/lms/courses?${params}`);
    const data = await res.json();
    setCourses(data.courses ?? []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.title) return;
    setSaving(true);
    await fetch("/api/admin/lms/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price_sgd: parseFloat(form.price_sgd) || 0 }),
    });
    setSaving(false);
    setShowNew(false);
    setForm({ title: "", title_zh: "", description: "", category: "", level: "beginner", language: "en", price_sgd: "0", thumbnail_url: "", is_published: false });
    load();
  };

  const togglePublish = async (c: Course) => {
    await fetch(`/api/admin/lms/courses/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !c.is_published }),
    });
    load();
  };

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <a href="/admin" className="text-sm hover:opacity-80 transition-opacity"
              style={{ color: "rgba(255,255,255,0.45)" }}>← Dashboard</a>
            <h1 className="text-xl font-bold text-white mt-1">Courses</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {courses.length} course{courses.length !== 1 ? "s" : ""} · {courses.filter(c => c.is_published).length} published
            </p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
            + New Course
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-3 mb-5">
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load(search)}
            placeholder="Search courses…"
            className="flex-1 rounded-xl px-4 py-2 text-sm text-white"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
        </div>

        {/* Course list */}
        {loading ? (
          <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.35)" }}>Loading…</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-24 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-5xl mb-4">🎓</div>
            <p className="text-white font-semibold">No courses yet</p>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Create your first course to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map(c => (
              <div key={c.id} style={GLASS} className="flex items-center gap-4 p-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden"
                  style={{ background: "rgba(167,139,250,0.15)" }}>
                  {c.thumbnail_url
                    ? <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">🎓</div>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white">{c.title}</span>
                    {c.title_zh && <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{c.title_zh}</span>}
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold capitalize"
                      style={{ color: LEVEL_COLOR[c.level] ?? "#fff", background: "rgba(255,255,255,0.06)" }}>
                      {c.level}
                    </span>
                    {c.is_featured && (
                      <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                        style={{ color: "#fbbf24", background: "rgba(251,191,36,0.1)" }}>⭐ Featured</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <span>{c.total_lessons} lessons</span>
                    {c.total_duration_min > 0 && <span>{c.total_duration_min} min</span>}
                    {c.category && <span>{c.category}</span>}
                    <span className="font-semibold" style={{ color: c.price_sgd > 0 ? "#fbbf24" : "#6ee7b7" }}>
                      {c.price_sgd > 0 ? `S$${c.price_sgd.toFixed(2)}` : "Free"}
                    </span>
                  </div>
                </div>

                {/* Publish toggle */}
                <button onClick={() => togglePublish(c)}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 transition-all"
                  style={c.is_published
                    ? { background: "rgba(52,211,153,0.15)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.3)" }
                    : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {c.is_published ? "✓ Published" : "Draft"}
                </button>

                {/* Edit link */}
                <Link href={`/admin/courses/${c.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 transition-all"
                  style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}>
                  Edit →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* New course modal */}
        {showNew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={e => { if (e.target === e.currentTarget) setShowNew(false); }}>
            <div style={{ ...GLASS, background: "#1a1035", width: "100%", maxWidth: 520, padding: 28, maxHeight: "90vh", overflowY: "auto" }}>
              <h3 className="font-bold text-white text-lg mb-5">New Course</h3>
              <div className="space-y-4">
                <Field label="Title (English)" required>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Introduction to Mandarin"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
                </Field>
                <Field label="Title (Chinese)">
                  <input value={form.title_zh} onChange={e => setForm(f => ({ ...f, title_zh: e.target.value }))}
                    placeholder="课程名称（中文）"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
                </Field>
                <Field label="Description">
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} placeholder="What will students learn?"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white resize-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Category">
                    <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      placeholder="e.g. Language"
                      className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
                  </Field>
                  <Field label="Price (SGD)">
                    <input type="number" min="0" step="0.01" value={form.price_sgd}
                      onChange={e => setForm(f => ({ ...f, price_sgd: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Level">
                    <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ background: "#1a1035", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }}>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </Field>
                  <Field label="Language">
                    <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white"
                      style={{ background: "#1a1035", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }}>
                      <option value="en">English</option>
                      <option value="zh">中文</option>
                      <option value="ms">Malay</option>
                    </select>
                  </Field>
                </div>
                <Field label="Thumbnail URL">
                  <input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                    placeholder="https://…"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
                </Field>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_published}
                    onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
                    className="w-4 h-4 accent-purple-500" />
                  <span className="text-sm text-white">Publish immediately</span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowNew(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                    Cancel
                  </button>
                  <button onClick={create} disabled={saving || !form.title}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-30"
                    style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                    {saving ? "Creating…" : "Create Course"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide mb-1"
        style={{ color: "rgba(255,255,255,0.4)" }}>
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

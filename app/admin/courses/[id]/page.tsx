"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AdminShell from "@/components/AdminShell";

interface Lesson  { id: string; title: string; video_type: string; video_url: string | null; video_duration_min: number; is_preview: boolean; sort_order: number; }
interface Question { id: string; question: string; options: string[]; correct_index: number; explanation: string | null; sort_order: number; }
interface Quiz    { id: string; title: string; passing_score: number; sort_order: number; lms_questions: Question[]; }
interface Module  { id: string; title: string; description: string | null; sort_order: number; lms_lessons: Lesson[]; lms_quizzes: Quiz[]; }
interface Course  {
  id: string; title: string; title_zh: string | null; description: string | null;
  thumbnail_url: string | null; category: string | null; level: string; language: string;
  price_sgd: number; is_published: boolean; is_featured: boolean;
  lms_modules: Module[];
}

const GLASS: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 };
const INPUT: React.CSSProperties = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", padding: "6px 10px", outline: "none", width: "100%" };
const VIDEO_ICON: Record<string, string> = { youtube: "▶ YT", vimeo: "▶ VM", upload: "⬆ File", stream: "☁ Stream" };

export default function CourseEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse]   = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [flash, setFlash]     = useState("");

  // New module form
  const [newModTitle, setNewModTitle] = useState("");
  const [addingMod, setAddingMod]     = useState(false);

  // Expanded module for adding lesson/quiz
  const [expandedMod, setExpandedMod]   = useState<string | null>(null);
  const [lessonForm, setLessonForm]     = useState({ title: "", video_type: "youtube", video_url: "", video_duration_min: "0", is_preview: false });
  const [quizForm, setQuizForm]         = useState({ title: "", passing_score: "70" });
  const [addingLesson, setAddingLesson] = useState(false);
  const [addingQuiz, setAddingQuiz]     = useState(false);
  const [tab, setTab]                   = useState<Record<string, "lessons" | "quizzes">>({});

  const load = async () => {
    const res = await fetch(`/api/admin/lms/courses/${id}`);
    const data = await res.json();
    setCourse(data.course ?? null);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const saveMeta = async () => {
    if (!course) return;
    setSaving(true);
    await fetch(`/api/admin/lms/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: course.title, title_zh: course.title_zh, description: course.description,
        thumbnail_url: course.thumbnail_url, category: course.category, level: course.level,
        language: course.language, price_sgd: course.price_sgd,
        is_published: course.is_published, is_featured: course.is_featured,
      }),
    });
    setSaving(false);
    setFlash("Saved ✓");
    setTimeout(() => setFlash(""), 2000);
  };

  const addModule = async () => {
    if (!newModTitle) return;
    setAddingMod(true);
    await fetch(`/api/admin/lms/courses/${id}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newModTitle, sort_order: (course?.lms_modules.length ?? 0) }),
    });
    setNewModTitle("");
    setAddingMod(false);
    load();
  };

  const deleteModule = async (modId: string) => {
    if (!confirm("Delete this module and all its lessons/quizzes?")) return;
    await fetch(`/api/admin/lms/modules/${modId}`, { method: "DELETE" });
    load();
  };

  const addLesson = async (modId: string) => {
    if (!lessonForm.title) return;
    setAddingLesson(true);
    await fetch(`/api/admin/lms/modules/${modId}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lessonForm, video_duration_min: parseInt(lessonForm.video_duration_min) || 0 }),
    });
    setLessonForm({ title: "", video_type: "youtube", video_url: "", video_duration_min: "0", is_preview: false });
    setAddingLesson(false);
    load();
  };

  const addQuiz = async (modId: string) => {
    if (!quizForm.title) return;
    setAddingQuiz(true);
    await fetch(`/api/admin/lms/modules/${modId}/quizzes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: quizForm.title, passing_score: parseInt(quizForm.passing_score) || 70 }),
    });
    setQuizForm({ title: "", passing_score: "70" });
    setAddingQuiz(false);
    load();
  };

  const deleteLesson = async (lessonId: string) => {
    await fetch(`/api/admin/lms/lessons/${lessonId}`, { method: "DELETE" });
    load();
  };

  if (loading) return <AdminShell><div className="text-center py-20" style={{ color: "rgba(255,255,255,0.35)" }}>Loading…</div></AdminShell>;
  if (!course) return <AdminShell><div className="text-center py-20" style={{ color: "#fca5a5" }}>Course not found</div></AdminShell>;

  const modules = [...(course.lms_modules ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <AdminShell>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <a href="/admin/courses" className="text-sm hover:opacity-80" style={{ color: "rgba(255,255,255,0.45)" }}>← Courses</a>
            <h1 className="text-xl font-bold text-white mt-1">{course.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {flash && <span className="text-sm font-semibold" style={{ color: "#6ee7b7" }}>{flash}</span>}
            <button onClick={saveMeta} disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Meta editor */}
        <div style={GLASS} className="p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Title (English)</Label>
            <input value={course.title} onChange={e => setCourse(c => c ? { ...c, title: e.target.value } : c)} style={INPUT} className="text-sm" />
          </div>
          <div>
            <Label>Title (中文)</Label>
            <input value={course.title_zh ?? ""} onChange={e => setCourse(c => c ? { ...c, title_zh: e.target.value } : c)} style={INPUT} className="text-sm" />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <textarea value={course.description ?? ""} onChange={e => setCourse(c => c ? { ...c, description: e.target.value } : c)}
              rows={2} style={{ ...INPUT, resize: "none" }} className="text-sm" />
          </div>
          <div>
            <Label>Category</Label>
            <input value={course.category ?? ""} onChange={e => setCourse(c => c ? { ...c, category: e.target.value } : c)} style={INPUT} className="text-sm" />
          </div>
          <div>
            <Label>Price (SGD) — 0 = free</Label>
            <input type="number" min="0" step="0.01" value={course.price_sgd}
              onChange={e => setCourse(c => c ? { ...c, price_sgd: parseFloat(e.target.value) || 0 } : c)} style={INPUT} className="text-sm" />
          </div>
          <div>
            <Label>Level</Label>
            <select value={course.level} onChange={e => setCourse(c => c ? { ...c, level: e.target.value } : c)}
              style={{ ...INPUT, background: "#1a1035" }} className="text-sm">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <Label>Language</Label>
            <select value={course.language} onChange={e => setCourse(c => c ? { ...c, language: e.target.value } : c)}
              style={{ ...INPUT, background: "#1a1035" }} className="text-sm">
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="ms">Malay</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Thumbnail URL</Label>
            <input value={course.thumbnail_url ?? ""} onChange={e => setCourse(c => c ? { ...c, thumbnail_url: e.target.value } : c)}
              placeholder="https://…" style={INPUT} className="text-sm" />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-white">
              <input type="checkbox" checked={course.is_published}
                onChange={e => setCourse(c => c ? { ...c, is_published: e.target.checked } : c)}
                className="w-4 h-4 accent-purple-500" />
              Published
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-white">
              <input type="checkbox" checked={course.is_featured}
                onChange={e => setCourse(c => c ? { ...c, is_featured: e.target.checked } : c)}
                className="w-4 h-4 accent-yellow-400" />
              Featured
            </label>
          </div>
        </div>

        {/* Modules */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-white">Modules</h2>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{modules.length} module{modules.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="space-y-3 mb-5">
          {modules.map((mod, mi) => {
            const modTab = tab[mod.id] ?? "lessons";
            const isOpen = expandedMod === mod.id;
            return (
              <div key={mod.id} style={GLASS}>
                {/* Module header */}
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedMod(isOpen ? null : mod.id)}>
                  <span className="text-xs font-mono w-6 text-center flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>M{mi + 1}</span>
                  <span className="flex-1 font-semibold text-white text-sm">{mod.title}</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {mod.lms_lessons?.length ?? 0} lessons · {mod.lms_quizzes?.length ?? 0} quizzes
                  </span>
                  <button onClick={e => { e.stopPropagation(); deleteModule(mod.id); }}
                    className="text-xs px-2 py-1 rounded opacity-40 hover:opacity-80 transition-opacity"
                    style={{ color: "#fca5a5" }}>✕</button>
                  <span style={{ color: "rgba(255,255,255,0.3)" }} className="text-xs">{isOpen ? "▲" : "▼"}</span>
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    {/* Tab switcher */}
                    <div className="flex gap-2 mt-3 mb-3">
                      {(["lessons", "quizzes"] as const).map(t => (
                        <button key={t} onClick={() => setTab(prev => ({ ...prev, [mod.id]: t }))}
                          className="px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all"
                          style={modTab === t
                            ? { background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }
                            : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}>
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* Lessons tab */}
                    {modTab === "lessons" && (
                      <div className="space-y-2">
                        {[...(mod.lms_lessons ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((l, li) => (
                          <div key={l.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.04)" }}>
                            <span className="text-xs font-mono w-5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{li + 1}</span>
                            <span className="text-sm text-white flex-1">{l.title}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded font-mono flex-shrink-0"
                              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                              {VIDEO_ICON[l.video_type] ?? l.video_type}
                            </span>
                            {l.video_duration_min > 0 && (
                              <span className="text-xs flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>{l.video_duration_min}m</span>
                            )}
                            {l.is_preview && (
                              <span className="text-xs px-1.5 rounded" style={{ color: "#6ee7b7", background: "rgba(52,211,153,0.1)" }}>Preview</span>
                            )}
                            <button onClick={() => deleteLesson(l.id)} className="text-xs opacity-40 hover:opacity-80" style={{ color: "#fca5a5" }}>✕</button>
                          </div>
                        ))}

                        {/* Add lesson form */}
                        <div className="mt-3 p-3 rounded-lg space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                          <p className="text-xs font-semibold uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Add Lesson</p>
                          <input value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="Lesson title" style={{ ...INPUT, fontSize: 13 }} />
                          <div className="flex gap-2">
                            <select value={lessonForm.video_type} onChange={e => setLessonForm(f => ({ ...f, video_type: e.target.value }))}
                              style={{ ...INPUT, background: "#0d0820", flex: "0 0 120px", fontSize: 13 }}>
                              <option value="youtube">YouTube</option>
                              <option value="vimeo">Vimeo</option>
                              <option value="upload">Upload</option>
                              <option value="stream">Stream</option>
                            </select>
                            <input value={lessonForm.video_url} onChange={e => setLessonForm(f => ({ ...f, video_url: e.target.value }))}
                              placeholder="Video URL or path" style={{ ...INPUT, fontSize: 13 }} />
                            <input type="number" min="0" value={lessonForm.video_duration_min}
                              onChange={e => setLessonForm(f => ({ ...f, video_duration_min: e.target.value }))}
                              placeholder="min" style={{ ...INPUT, flex: "0 0 60px", fontSize: 13 }} />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                              <input type="checkbox" checked={lessonForm.is_preview}
                                onChange={e => setLessonForm(f => ({ ...f, is_preview: e.target.checked }))}
                                className="accent-green-400" />
                              Free preview
                            </label>
                            <button onClick={() => addLesson(mod.id)} disabled={addingLesson || !lessonForm.title}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30"
                              style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                              {addingLesson ? "Adding…" : "+ Add Lesson"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Quizzes tab */}
                    {modTab === "quizzes" && (
                      <div className="space-y-2">
                        {[...(mod.lms_quizzes ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(q => (
                          <div key={q.id} className="px-3 py-2 rounded-lg"
                            style={{ background: "rgba(255,255,255,0.04)" }}>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-white flex-1">📝 {q.title}</span>
                              <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Pass: {q.passing_score}%</span>
                              <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{q.lms_questions?.length ?? 0} questions</span>
                            </div>
                            {q.lms_questions?.length > 0 && (
                              <div className="mt-2 space-y-1 ml-4">
                                {q.lms_questions.slice(0, 3).map((qq, qi) => (
                                  <p key={qq.id} className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                                    {qi + 1}. {qq.question.slice(0, 60)}{qq.question.length > 60 ? "…" : ""}
                                  </p>
                                ))}
                                {q.lms_questions.length > 3 && (
                                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>+{q.lms_questions.length - 3} more</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Add quiz form */}
                        <div className="mt-3 p-3 rounded-lg space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                          <p className="text-xs font-semibold uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Add Quiz</p>
                          <div className="flex gap-2">
                            <input value={quizForm.title} onChange={e => setQuizForm(f => ({ ...f, title: e.target.value }))}
                              placeholder="Quiz title" style={{ ...INPUT, fontSize: 13 }} />
                            <input type="number" min="0" max="100" value={quizForm.passing_score}
                              onChange={e => setQuizForm(f => ({ ...f, passing_score: e.target.value }))}
                              placeholder="Pass %" style={{ ...INPUT, flex: "0 0 70px", fontSize: 13 }} />
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => addQuiz(mod.id)} disabled={addingQuiz || !quizForm.title}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-30"
                              style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                              {addingQuiz ? "Adding…" : "+ Add Quiz"}
                            </button>
                          </div>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                            Questions can be added after creation via the quiz editor.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add module */}
        <div className="flex gap-3">
          <input value={newModTitle} onChange={e => setNewModTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addModule()}
            placeholder="New module title…"
            className="flex-1 rounded-xl px-4 py-2.5 text-sm text-white"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }} />
          <button onClick={addModule} disabled={addingMod || !newModTitle}
            className="px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-30"
            style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
            {addingMod ? "Adding…" : "+ Module"}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{children}</label>;
}

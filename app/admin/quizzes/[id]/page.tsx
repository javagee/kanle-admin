"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  sort_order: number;
}
interface Quiz {
  id: string;
  title: string;
  passing_score: number;
  course_id: string;
  lms_courses: { id: string; title: string } | null;
  lms_questions: Question[];
}

const GLASS: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 };
const INPUT: React.CSSProperties = { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#fff", padding: "6px 10px", outline: "none", width: "100%" };

const EMPTY_FORM = { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" };

export default function QuizEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz]         = useState<Quiz | null>(null);
  const [loading, setLoading]   = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [flash, setFlash]       = useState("");

  // Add question form
  const [form, setForm]         = useState(EMPTY_FORM);
  const [adding, setAdding]     = useState(false);

  // Edit question
  const [editId, setEditId]     = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch(`/api/admin/lms/quizzes/${id}`);
    const d = await res.json();
    setQuiz(d.quiz ?? null);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(""), 2000); };

  const saveMeta = async () => {
    if (!quiz) return;
    setSavingMeta(true);
    await fetch(`/api/admin/lms/quizzes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: quiz.title, passing_score: quiz.passing_score }),
    });
    setSavingMeta(false);
    showFlash("Saved ✓");
  };

  const addQuestion = async () => {
    const opts = form.options.filter(o => o.trim());
    if (!form.question.trim() || opts.length < 2) return;
    setAdding(true);
    await fetch(`/api/admin/lms/quizzes/${id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: form.question.trim(),
        options: opts,
        correct_index: form.correct_index,
        explanation: form.explanation.trim() || null,
      }),
    });
    setForm(EMPTY_FORM);
    setAdding(false);
    load();
  };

  const startEdit = (q: Question) => {
    setEditId(q.id);
    // Pad options to 4 slots for the editor
    const opts = [...q.options];
    while (opts.length < 4) opts.push("");
    setEditForm({ question: q.question, options: opts, correct_index: q.correct_index, explanation: q.explanation ?? "" });
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    const opts = editForm.options.filter(o => o.trim());
    await fetch(`/api/admin/lms/questions/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: editForm.question.trim(),
        options: opts,
        correct_index: editForm.correct_index,
        explanation: editForm.explanation.trim() || null,
      }),
    });
    setEditId(null);
    setSaving(false);
    load();
  };

  const deleteQuestion = async (qId: string) => {
    if (!confirm("Delete this question?")) return;
    setDeleting(qId);
    await fetch(`/api/admin/lms/questions/${qId}`, { method: "DELETE" });
    setDeleting(null);
    load();
  };

  if (loading) return <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.35)" }}>Loading…</div>;
  if (!quiz)   return <div className="text-center py-20" style={{ color: "#fca5a5" }}>Quiz not found</div>;

  const questions = [...(quiz.lms_questions ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          <a href="/admin/courses" className="hover:opacity-80">Courses</a>
          <span>›</span>
          {quiz.lms_courses && (
            <>
              <a href={`/admin/courses/${quiz.course_id}`} className="hover:opacity-80">{quiz.lms_courses.title}</a>
              <span>›</span>
            </>
          )}
          <span className="text-white">{quiz.title}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Quiz Editor</h1>
          <div className="flex items-center gap-2">
            {flash && <span className="text-sm font-semibold" style={{ color: "#6ee7b7" }}>{flash}</span>}
          </div>
        </div>

        {/* Quiz meta */}
        <div style={GLASS} className="p-4 mb-6 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Quiz Title</label>
            <input value={quiz.title} onChange={e => setQuiz(q => q ? { ...q, title: e.target.value } : q)} style={INPUT} className="text-sm" />
          </div>
          <div style={{ width: 100 }}>
            <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Pass Score %</label>
            <input type="number" min="0" max="100" value={quiz.passing_score}
              onChange={e => setQuiz(q => q ? { ...q, passing_score: parseInt(e.target.value) || 70 } : q)}
              style={INPUT} className="text-sm" />
          </div>
          <button onClick={saveMeta} disabled={savingMeta}
            className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
            {savingMeta ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Questions list */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white">Questions</h2>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="space-y-3 mb-6">
          {questions.length === 0 && (
            <div className="text-center py-8 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>No questions yet — add one below</p>
            </div>
          )}

          {questions.map((q, qi) => (
            <div key={q.id} style={GLASS} className="p-4">
              {editId === q.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Question</label>
                    <textarea value={editForm.question} onChange={e => setEditForm(f => ({ ...f, question: e.target.value }))}
                      rows={2} style={{ ...INPUT, resize: "none" }} className="text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Options (leave blank to omit)</label>
                    {editForm.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2 mb-2">
                        <input type="radio" name={`edit-correct-${q.id}`} checked={editForm.correct_index === oi}
                          onChange={() => setEditForm(f => ({ ...f, correct_index: oi }))}
                          className="flex-shrink-0 accent-green-400" title="Mark as correct" />
                        <input value={opt} onChange={e => setEditForm(f => { const o = [...f.options]; o[oi] = e.target.value; return { ...f, options: o }; })}
                          placeholder={`Option ${oi + 1}`} style={{ ...INPUT, fontSize: 13 }} />
                      </div>
                    ))}
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Radio = correct answer</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Explanation (optional)</label>
                    <input value={editForm.explanation} onChange={e => setEditForm(f => ({ ...f, explanation: e.target.value }))}
                      placeholder="Shown after answering" style={{ ...INPUT, fontSize: 13 }} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditId(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.55)" }}>Cancel</button>
                    <button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                      {saving ? "Saving…" : "Save Question"}
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div>
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono mt-0.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>Q{qi + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white mb-2">{q.question}</p>
                      <div className="space-y-1">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg"
                            style={{
                              background: oi === q.correct_index ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${oi === q.correct_index ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}`,
                              color: oi === q.correct_index ? "#6ee7b7" : "rgba(255,255,255,0.55)",
                            }}>
                            <span className="font-mono flex-shrink-0">{String.fromCharCode(65 + oi)}.</span>
                            <span>{opt}</span>
                            {oi === q.correct_index && <span className="ml-auto flex-shrink-0">✓ Correct</span>}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="text-xs mt-2 italic" style={{ color: "rgba(255,255,255,0.35)" }}>💡 {q.explanation}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(q)} className="text-xs px-2 py-1 rounded opacity-50 hover:opacity-90 transition-opacity"
                        style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>Edit</button>
                      <button onClick={() => deleteQuestion(q.id)} disabled={deleting === q.id}
                        className="text-xs px-2 py-1 rounded opacity-50 hover:opacity-90 transition-opacity disabled:opacity-20"
                        style={{ color: "#fca5a5" }}>
                        {deleting === q.id ? "…" : "✕"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add question form */}
        <div style={{ ...GLASS, background: "rgba(167,139,250,0.04)" }} className="p-5">
          <h3 className="font-semibold text-white mb-4 text-sm">Add Question</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Question</label>
              <textarea value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                rows={2} placeholder="Enter the question…" style={{ ...INPUT, resize: "none" }} className="text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Options — select the correct answer</label>
              {form.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2 mb-2">
                  <input type="radio" name="new-correct" checked={form.correct_index === oi}
                    onChange={() => setForm(f => ({ ...f, correct_index: oi }))}
                    className="flex-shrink-0 accent-green-400" title="Mark as correct" />
                  <input value={opt} onChange={e => setForm(f => { const o = [...f.options]; o[oi] = e.target.value; return { ...f, options: o }; })}
                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                    style={{ ...INPUT, fontSize: 13 }} />
                </div>
              ))}
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Radio selects the correct answer. Leave blank options blank — they will be omitted.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Explanation (optional)</label>
              <input value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                placeholder="Shown to student after they answer" style={{ ...INPUT, fontSize: 13 }} />
            </div>
            <div className="flex justify-end">
              <button onClick={addQuestion} disabled={adding || !form.question.trim() || form.options.filter(o => o.trim()).length < 2}
                className="px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-30"
                style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                {adding ? "Adding…" : "+ Add Question"}
              </button>
            </div>
          </div>
        </div>

      </div>
  );
}

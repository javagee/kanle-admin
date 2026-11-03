"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Lesson  { id: string; title: string; video_type: string; video_url: string | null; video_duration_min: number; is_preview: boolean; sort_order: number; }
interface Quiz    { id: string; title: string; passing_score: number; sort_order: number; }
interface Module  { id: string; title: string; sort_order: number; lms_lessons: Lesson[]; lms_quizzes: Quiz[]; }
interface Course  { id: string; title: string; title_zh: string | null; description: string | null; thumbnail_url: string | null; category: string | null; level: string; language: string; price_sgd: number; total_lessons: number; total_duration_min: number; lms_modules: Module[]; }

function getEmbedUrl(type: string, url: string): string | null {
  if (!url) return null;
  if (type === "youtube") {
    const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
  }
  if (type === "vimeo") {
    const m = url.match(/vimeo\.com\/(\d+)/);
    return m ? `https://player.vimeo.com/video/${m[1]}` : url;
  }
  return url;
}

export default function SlugCourseDetailPage() {
  const { slug, id }              = useParams<{ slug: string; id: string }>();
  const [course, setCourse]       = useState<Course | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeLesson, setActive] = useState<Lesson | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled]   = useState(false);
  const [expandedMod, setExpanded]= useState<string | null>(null);

  // Payment + cert state
  const [enrollmentId, setEnrollmentId]       = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus]     = useState<string>("free");
  const [proofUrl, setProofUrl]               = useState<string | null>(null);
  const [certId, setCertId]                   = useState<string | null>(null);
  const [courseComplete, setCourseComplete]   = useState(false);
  const [uploadingProof, setUploadingProof]   = useState(false);
  const [proofError, setProofError]           = useState("");
  const proofInputRef                         = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/learn/courses/${id}?tenant=${slug}`)
      .then(r => r.json())
      .then(d => {
        setCourse(d.course ?? null);
        setLoading(false);
        if (d.course?.lms_modules?.[0]) {
          setExpanded(d.course.lms_modules[0].id);
          const firstLesson = d.course.lms_modules[0].lms_lessons?.[0];
          if (firstLesson) setActive(firstLesson);
        }
      });

    fetch(`/api/learn/progress?course_id=${id}`)
      .then(r => r.json())
      .then(d => { if (d.completed_lessons) setCompleted(new Set(d.completed_lessons)); })
      .catch(() => {});

    fetch("/api/learn/enroll")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.enrollments)) {
          const e = d.enrollments.find((e: { course_id: string }) => e.course_id === id);
          if (e) {
            setEnrolled(true);
            setEnrollmentId(e.id);
            setPaymentStatus(e.payment_status ?? "free");
            setProofUrl(e.payment_proof_url ?? null);
            if (e.completed_at) setCourseComplete(true);
          }
        }
      })
      .catch(() => {});

    // Check for existing cert
    fetch("/api/learn/certificates")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.certificates) {
          const cert = d.certificates.find((c: { lms_courses?: { id: string } }) => c.lms_courses?.id === id);
          if (cert) setCertId(cert.id);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slug]);

  const enroll = async () => {
    setEnrolling(true);
    const res  = await fetch("/api/learn/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: id, tenant_slug: slug }),
    });
    const data = await res.json();
    if (res.status === 401) { window.location.href = `/learn/${slug}/login`; return; }
    if (data.enrollment) {
      setEnrolled(true);
      setEnrollmentId(data.enrollment.id);
      setPaymentStatus(data.enrollment.payment_status ?? "free");
    }
    setEnrolling(false);
  };

  const markComplete = async (lesson: Lesson) => {
    const res  = await fetch("/api/learn/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesson_id: lesson.id, course_id: id }),
    });
    const data = await res.json();
    setCompleted(prev => { const s = new Set(prev); s.add(lesson.id); return s; });
    if (data.course_complete) {
      setCourseComplete(true);
      if (data.cert_id) setCertId(data.cert_id);
    }
  };

  const uploadProof = async (file: File) => {
    if (!enrollmentId) return;
    if (file.size > 5 * 1024 * 1024) { setProofError("File too large (max 5 MB)"); return; }
    setUploadingProof(true); setProofError("");
    const fd = new FormData();
    fd.append("proof", file);
    const res  = await fetch(`/api/learn/enrollments/${enrollmentId}/proof`, { method: "POST", body: fd });
    const data = await res.json();
    setUploadingProof(false);
    if (!res.ok) { setProofError(data.error ?? "Upload failed"); return; }
    setProofUrl(data.proof_url);
    setPaymentStatus(data.enrollment?.payment_status ?? "pending_verification");
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0d0820" }} className="flex items-center justify-center">
      <div className="text-white">Loading…</div>
    </div>
  );
  if (!course) return (
    <div style={{ minHeight: "100vh", background: "#0d0820" }} className="flex items-center justify-center">
      <div style={{ color: "#fca5a5" }}>Course not found</div>
    </div>
  );

  const modules   = [...course.lms_modules].sort((a, b) => a.sort_order - b.sort_order);
  const isFree    = !course.price_sgd || course.price_sgd === 0;
  const canWatch  = (l: Lesson) => enrolled || l.is_preview || isFree;
  const embedUrl  = activeLesson ? getEmbedUrl(activeLesson.video_type, activeLesson.video_url ?? "") : null;
  const progress  = course.total_lessons > 0 ? Math.round((completed.size / course.total_lessons) * 100) : 0;
  const isPending = paymentStatus === "pending_verification";

  return (
    <div style={{ minHeight: "100vh", background: "#0d0820", color: "#fff" }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <Link href={`/learn/${slug}`} className="font-bold" style={{ color: "#a78bfa" }}>← HipyHub Learn</Link>
        <div className="flex items-center gap-3">
          {certId && (
            <Link href={`/learn/${slug}/certificates/${certId}`}
              className="text-sm px-4 py-1.5 rounded-xl font-bold"
              style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
              🎓 View Certificate
            </Link>
          )}
          {!enrolled && (
            <button onClick={enroll} disabled={enrolling}
              className="text-sm px-5 py-2 rounded-xl font-bold disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
              {enrolling ? "…" : isFree ? "Enrol Free" : `Enrol — S$${course.price_sgd.toFixed(2)}`}
            </button>
          )}
          {enrolled && !certId && (
            <span className="text-sm font-semibold" style={{ color: "#6ee7b7" }}>✓ Enrolled</span>
          )}
        </div>
      </nav>

      {/* Course complete banner */}
      {courseComplete && certId && (
        <div className="flex items-center justify-between px-6 py-3"
          style={{ background: "rgba(251,191,36,0.08)", borderBottom: "1px solid rgba(251,191,36,0.2)" }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">🏆</span>
            <div>
              <p className="text-sm font-bold text-white">Course complete!</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Your certificate has been issued.</p>
            </div>
          </div>
          <Link href={`/learn/${slug}/certificates/${certId}`}
            className="text-sm font-bold px-4 py-2 rounded-xl"
            style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1c1917" }}>
            View Certificate →
          </Link>
        </div>
      )}

      {/* Payment proof banner */}
      {enrolled && isPending && (
        <div className="px-6 py-4 border-b" style={{ background: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.2)" }}>
          <div className="flex items-start gap-4">
            <span className="text-2xl flex-shrink-0">💳</span>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm mb-1">Payment verification required</p>
              <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
                This is a paid course (S${course.price_sgd?.toFixed(2)}). Please upload your payment proof
                (bank transfer screenshot or receipt). Your school operator will verify and unlock full access.
              </p>
              {proofUrl ? (
                <div className="flex items-center gap-3">
                  <a href={proofUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl"
                    style={{ background: "rgba(52,211,153,0.1)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.25)" }}>
                    ✓ Proof uploaded — awaiting verification
                  </a>
                  <button onClick={() => proofInputRef.current?.click()}
                    className="text-xs px-3 py-1.5 rounded-xl"
                    style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)" }}>
                    Replace
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={() => proofInputRef.current?.click()} disabled={uploadingProof}
                    className="text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1c1917" }}>
                    {uploadingProof ? "Uploading…" : "📎 Upload payment proof"}
                  </button>
                  {proofError && <p className="text-xs" style={{ color: "#fca5a5" }}>{proofError}</p>}
                </div>
              )}
              <input ref={proofInputRef} type="file" accept="image/*,.pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadProof(f); e.target.value = ""; }} />
            </div>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-53px)]" style={{ height: `calc(100vh - ${enrolled && isPending ? "157px" : courseComplete && certId ? "106px" : "53px"})` }}>

        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 border-r overflow-y-auto" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)" }}>
          <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <h2 className="font-bold text-white text-sm">{course.title}</h2>
            {enrolled && course.total_lessons > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                  <span>{completed.size}/{course.total_lessons} completed</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#c084fc,#7c3aed)" }} />
                </div>
              </div>
            )}
          </div>

          {modules.map((mod, mi) => {
            const lessons = [...(mod.lms_lessons ?? [])].sort((a, b) => a.sort_order - b.sort_order);
            const quizzes = [...(mod.lms_quizzes ?? [])].sort((a, b) => a.sort_order - b.sort_order);
            const isOpen  = expandedMod === mod.id;
            return (
              <div key={mod.id}>
                <button onClick={() => setExpanded(isOpen ? null : mod.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{ background: isOpen ? "rgba(167,139,250,0.08)" : "transparent" }}>
                  <span className="text-xs font-mono flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>M{mi + 1}</span>
                  <span className="text-sm font-semibold text-white flex-1">{mod.title}</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div>
                    {lessons.map((l, li) => {
                      const isDone   = completed.has(l.id);
                      const isActive = activeLesson?.id === l.id;
                      return (
                        <button key={l.id} onClick={() => canWatch(l) ? setActive(l) : undefined}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all"
                          style={{
                            background: isActive ? "rgba(167,139,250,0.2)" : "transparent",
                            opacity: canWatch(l) ? 1 : 0.45,
                            cursor: canWatch(l) ? "pointer" : "not-allowed",
                          }}>
                          <span className="text-xs w-5 text-center flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>{li + 1}</span>
                          <span className="flex-1 text-xs text-white leading-snug">{l.title}</span>
                          {isDone && <span className="text-xs text-green-400 flex-shrink-0">✓</span>}
                          {l.is_preview && !isDone && <span className="text-xs flex-shrink-0" style={{ color: "#a78bfa" }}>Preview</span>}
                          {!canWatch(l) && <span className="text-xs flex-shrink-0">🔒</span>}
                        </button>
                      );
                    })}
                    {quizzes.map(q => (
                      enrolled ? (
                        <a key={q.id} href={`/learn/${slug}/quiz/${q.id}?course_id=${id}`}
                          className="flex items-center gap-3 px-4 py-2 text-xs transition-opacity hover:opacity-90"
                          style={{ color: "rgba(255,255,255,0.65)", textDecoration: "none" }}>
                          <span className="w-5 text-center flex-shrink-0">📝</span>
                          <span className="flex-1">{q.title}</span>
                          <span style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>Pass {q.passing_score}%</span>
                          <span style={{ color: "#a78bfa", flexShrink: 0 }}>→</span>
                        </a>
                      ) : (
                        <div key={q.id} className="flex items-center gap-3 px-4 py-2 text-xs"
                          style={{ color: "rgba(255,255,255,0.3)" }}>
                          <span className="w-5 text-center flex-shrink-0">📝</span>
                          <span className="flex-1">{q.title}</span>
                          <span style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>Pass {q.passing_score}%</span>
                          <span className="flex-shrink-0">🔒</span>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          {activeLesson ? (
            <div>
              <div className="relative w-full" style={{ paddingBottom: "56.25%", background: "#000" }}>
                {embedUrl ? (
                  <iframe src={embedUrl} className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                    No video available
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-white mb-1">{activeLesson.title}</h1>
                    {activeLesson.video_duration_min > 0 && (
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{activeLesson.video_duration_min} min</p>
                    )}
                  </div>
                  {enrolled && !completed.has(activeLesson.id) && (
                    <button onClick={() => markComplete(activeLesson)}
                      className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold"
                      style={{ background: "rgba(52,211,153,0.15)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.3)" }}>
                      ✓ Mark complete
                    </button>
                  )}
                  {completed.has(activeLesson.id) && (
                    <span className="flex-shrink-0 text-sm font-semibold" style={{ color: "#6ee7b7" }}>✓ Completed</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              {course.thumbnail_url && (
                <img src={course.thumbnail_url} alt="" className="w-32 h-32 rounded-2xl object-cover mb-6" />
              )}
              <h2 className="text-2xl font-bold text-white mb-2">{course.title}</h2>
              {course.description && <p className="mb-6 max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>{course.description}</p>}
              {!enrolled && (
                <button onClick={enroll} disabled={enrolling}
                  className="px-8 py-3 rounded-2xl text-base font-bold disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                  {enrolling ? "Enrolling…" : isFree ? "Start Learning — Free" : `Enrol — S$${course.price_sgd.toFixed(2)}`}
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
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

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse]         = useState<Course | null>(null);
  const [loading, setLoading]       = useState(true);
  const [activeLesson, setActive]   = useState<Lesson | null>(null);
  const [completed, setCompleted]   = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling]   = useState(false);
  const [enrolled, setEnrolled]     = useState(false);
  const [expandedMod, setExpanded]  = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/learn/courses/${id}`)
      .then(r => r.json())
      .then(d => {
        setCourse(d.course ?? null);
        setLoading(false);
        // Auto-expand first module and select first preview/free lesson
        if (d.course?.lms_modules?.[0]) {
          setExpanded(d.course.lms_modules[0].id);
          const firstLesson = d.course.lms_modules[0].lms_lessons?.[0];
          if (firstLesson) setActive(firstLesson);
        }
      });
    // Check progress
    fetch(`/api/learn/progress?course_id=${id}`)
      .then(r => r.json())
      .then(d => { if (d.completed_lessons) setCompleted(new Set(d.completed_lessons)); })
      .catch(() => {});
    // Check enrolment
    fetch("/api/learn/enroll")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.enrollments)) {
          setEnrolled(d.enrollments.some((e: { course_id: string }) => e.course_id === id));
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const enroll = async () => {
    setEnrolling(true);
    const res = await fetch("/api/learn/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: id }),
    });
    const data = await res.json();
    if (res.status === 401) { window.location.href = "/learn/login"; return; }
    if (data.enrollment) setEnrolled(true);
    setEnrolling(false);
  };

  const markComplete = async (lesson: Lesson) => {
    await fetch("/api/learn/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesson_id: lesson.id, course_id: id }),
    });
    setCompleted(prev => { const s = new Set(prev); s.add(lesson.id); return s; });
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

  const modules = [...course.lms_modules].sort((a, b) => a.sort_order - b.sort_order);
  const isFree  = !course.price_sgd || course.price_sgd === 0;
  const canWatch = (l: Lesson) => enrolled || l.is_preview || isFree;
  const embedUrl = activeLesson ? getEmbedUrl(activeLesson.video_type, activeLesson.video_url ?? "") : null;
  const progress = course.total_lessons > 0 ? Math.round((completed.size / course.total_lessons) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0820", color: "#fff" }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <Link href="/learn" className="font-bold" style={{ color: "#a78bfa" }}>← HipyHub Learn</Link>
        {!enrolled && (
          <button onClick={enroll} disabled={enrolling}
            className="text-sm px-5 py-2 rounded-xl font-bold disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
            {enrolling ? "…" : isFree ? "Enrol Free" : `Enrol — S$${course.price_sgd.toFixed(2)}`}
          </button>
        )}
        {enrolled && (
          <span className="text-sm font-semibold" style={{ color: "#6ee7b7" }}>✓ Enrolled</span>
        )}
      </nav>

      <div className="flex h-[calc(100vh-53px)]">

        {/* Sidebar — module/lesson list */}
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
                      const isDone  = completed.has(l.id);
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
                      <div key={q.id} className="flex items-center gap-3 px-4 py-2 text-xs"
                        style={{ color: "rgba(255,255,255,0.4)" }}>
                        <span className="w-5 text-center">📝</span>
                        <span className="flex-1">{q.title}</span>
                        <span style={{ color: "rgba(255,255,255,0.25)" }}>Pass {q.passing_score}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        {/* Main content — video player */}
        <main className="flex-1 overflow-y-auto">
          {activeLesson ? (
            <div>
              {/* Video */}
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

              {/* Lesson info */}
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

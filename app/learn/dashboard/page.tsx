"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Enrollment {
  id: string;
  course_id: string;
  payment_status: string;
  enrolled_at: string;
  completed_at: string | null;
  lms_courses: { id: string; title: string; thumbnail_url: string | null; total_lessons: number } | null;
}

export default function LearnDashboardPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    fetch("/api/learn/enroll")
      .then(r => { if (r.status === 401) { window.location.href = "/learn/login"; throw new Error("auth"); } return r.json(); })
      .then(d => { setEnrollments(d.enrollments ?? []); setLoading(false); })
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/learn/auth", { method: "DELETE" });
    window.location.href = "/learn";
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0d0820,#1a1035)" }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <Link href="/learn" className="font-bold" style={{ color: "#a78bfa" }}>HipyHub Learn</Link>
        <div className="flex items-center gap-3">
          <Link href="/learn" className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Browse courses</Link>
          <button onClick={logout} className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Sign out</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-white mb-2">My Learning</h1>
        <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
          {enrollments.length} course{enrollments.length !== 1 ? "s" : ""} enrolled
        </p>

        {loading ? (
          <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.35)" }}>Loading…</div>
        ) : enrollments.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-white font-semibold mb-2">No courses yet</p>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Browse and enrol in a course to get started</p>
            <Link href="/learn" className="px-6 py-3 rounded-xl text-sm font-bold inline-block"
              style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
              Browse courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrollments.map(e => {
              const c = e.lms_courses;
              if (!c) return null;
              const isComplete = !!e.completed_at;
              const needsPayment = e.payment_status === "pending_verification";
              return (
                <Link key={e.id} href={`/learn/courses/${c.id}`}
                  className="flex gap-4 p-4 rounded-2xl transition-all hover:opacity-90"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ background: "rgba(167,139,250,0.15)" }}>
                    {c.thumbnail_url
                      ? <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🎓</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm mb-1">{c.title}</h3>
                    <div className="flex items-center gap-2">
                      {isComplete && <span className="text-xs font-semibold" style={{ color: "#6ee7b7" }}>✓ Completed</span>}
                      {needsPayment && <span className="text-xs font-semibold" style={{ color: "#fbbf24" }}>⏳ Awaiting payment</span>}
                      {!isComplete && !needsPayment && (
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>In progress</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

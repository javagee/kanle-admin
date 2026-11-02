"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  title_zh: string | null;
  thumbnail_url: string | null;
  category: string | null;
  level: string;
  total_lessons: number;
  total_duration_min: number;
}
interface Certificate {
  id: string;
  issued_at: string;
  cert_url: string | null;
  lms_courses: Course | null;
  lms_students: { id: string; name: string } | null;
}

export default function CertificatesPage() {
  const [certs, setCerts]     = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/learn/certificates")
      .then(r => {
        if (r.status === 401) { window.location.href = "/learn/login"; throw new Error("auth"); }
        return r.json();
      })
      .then(d => { setCerts(d.certificates ?? []); setLoading(false); })
      .catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0d0820,#1a1035)", color: "#fff" }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <Link href="/learn" className="font-bold" style={{ color: "#a78bfa" }}>HipyHub Learn</Link>
        <div className="flex items-center gap-4">
          <Link href="/learn/dashboard" className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>My Courses</Link>
          <Link href="/learn" className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Browse</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-white mb-1">My Certificates</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Certificates earned by completing courses
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.35)" }}>Loading…</div>
        ) : certs.length === 0 ? (
          <div className="text-center py-20 rounded-3xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
            <div className="text-5xl mb-4">🎓</div>
            <p className="text-white font-semibold mb-2">No certificates yet</p>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>Complete a course to earn your first certificate</p>
            <Link href="/learn" className="px-6 py-3 rounded-2xl text-sm font-bold inline-block"
              style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
              Browse courses
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {certs.map(cert => {
              const course = cert.lms_courses;
              return (
                <div key={cert.id} className="flex gap-5 p-5 rounded-2xl items-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  {/* Thumbnail / badge */}
                  <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,rgba(192,132,252,0.25),rgba(124,58,237,0.25))", border: "1px solid rgba(167,139,250,0.2)" }}>
                    {course?.thumbnail_url
                      ? <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-2xl">🎓</span>}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{course?.title ?? "Course"}</p>
                    {course?.title_zh && (
                      <p className="text-sm truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{course.title_zh}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {course?.category && (
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{course.category}</span>
                      )}
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Issued {new Date(cert.issued_at).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Link href={`/learn/certificates/${cert.id}`}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-center transition-opacity hover:opacity-80"
                      style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

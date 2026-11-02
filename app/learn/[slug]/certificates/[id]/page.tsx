"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Certificate {
  id: string; issued_at: string;
  lms_courses: { id: string; title: string; title_zh: string | null; category: string | null; level: string; total_lessons: number; total_duration_min: number; } | null;
  lms_students: { id: string; name: string } | null;
  tenants: { name: string; slug: string } | null;
}

export default function SlugCertificatePage() {
  const { slug, id }              = useParams<{ slug: string; id: string }>();
  const [cert, setCert]           = useState<Certificate | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const certRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/learn/certificates/${id}`)
      .then(r => { if (!r.ok) { setNotFound(true); setLoading(false); throw new Error(); } return r.json(); })
      .then(d => { setCert(d.certificate ?? null); setLoading(false); })
      .catch(() => {});
  }, [id]);

  const print    = () => window.print();
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const copyLink = () => { navigator.clipboard.writeText(shareUrl).catch(() => {}); };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0d0820" }} className="flex items-center justify-center">
      <div className="text-white">Loading certificate…</div>
    </div>
  );
  if (notFound || !cert) return (
    <div style={{ minHeight: "100vh", background: "#0d0820" }} className="flex flex-col items-center justify-center gap-4">
      <div className="text-5xl">🎓</div>
      <p style={{ color: "#fca5a5" }}>Certificate not found</p>
      <Link href={`/learn/${slug}`} style={{ color: "#a78bfa" }}>← Back to Learn</Link>
    </div>
  );

  const course   = cert.lms_courses;
  const student  = cert.lms_students;
  const tenant   = cert.tenants;
  const issuedAt = new Date(cert.issued_at).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" });
  const certNo   = cert.id.slice(0, 8).toUpperCase();

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .cert-card { box-shadow: none !important; page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print" style={{ background: "#0d0820", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={`/learn/${slug}`} className="font-bold" style={{ color: "#a78bfa" }}>HipyHub Learn</Link>
          <div className="flex items-center gap-3">
            <button onClick={copyLink} className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
              Copy link
            </button>
            <button onClick={print} className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
              style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      <div style={{ minHeight: "100vh", background: "#0d0820", padding: "40px 16px" }} className="no-print-bg">
        <div className="max-w-3xl mx-auto">
          <div ref={certRef} className="cert-card" style={{
            background: "#fff", borderRadius: 24, overflow: "hidden",
            boxShadow: "0 32px 80px rgba(0,0,0,0.6)", fontFamily: "'Georgia', 'Times New Roman', serif",
          }}>
            <div style={{ height: 8, background: "linear-gradient(90deg,#7c3aed,#c084fc,#fbbf24,#c084fc,#7c3aed)" }} />
            <div style={{ padding: "52px 64px 44px", textAlign: "center", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.035, pointerEvents: "none", fontSize: 180, userSelect: "none" }}>🎓</div>
              <p style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7c3aed", fontFamily: "sans-serif", marginBottom: 4 }}>
                {tenant?.name ?? "HipyHub"}
              </p>
              <div style={{ width: 60, height: 2, background: "linear-gradient(90deg,#7c3aed,#c084fc)", margin: "0 auto 28px" }} />
              <p style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9ca3af", fontFamily: "sans-serif", marginBottom: 16 }}>
                Certificate of Completion
              </p>
              <p style={{ fontSize: 14, color: "#6b7280", fontFamily: "sans-serif", marginBottom: 8 }}>This is to certify that</p>
              <h1 style={{ fontSize: 40, fontWeight: "bold", color: "#1e1b4b", margin: "0 0 24px", letterSpacing: "-0.5px" }}>
                {student?.name ?? "Student"}
              </h1>
              <p style={{ fontSize: 14, color: "#6b7280", fontFamily: "sans-serif", marginBottom: 10 }}>has successfully completed</p>
              <div style={{ margin: "0 auto 8px", maxWidth: 480 }}>
                <h2 style={{ fontSize: 26, fontWeight: "bold", color: "#1e1b4b", margin: 0, lineHeight: 1.3 }}>{course?.title ?? "Course"}</h2>
                {course?.title_zh && <p style={{ fontSize: 17, color: "#6b7280", margin: "4px 0 0", fontFamily: "sans-serif" }}>{course.title_zh}</p>}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", margin: "16px 0 32px", flexWrap: "wrap" }}>
                {course?.category && (
                  <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "#f3f0ff", color: "#7c3aed", fontFamily: "sans-serif" }}>{course.category}</span>
                )}
                <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "#f3f0ff", color: "#7c3aed", fontFamily: "sans-serif", textTransform: "capitalize" }}>{course?.level ?? ""}</span>
                {(course?.total_lessons ?? 0) > 0 && (
                  <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "#f3f0ff", color: "#7c3aed", fontFamily: "sans-serif" }}>{course?.total_lessons} lessons</span>
                )}
              </div>
              <div style={{ width: "100%", height: 1, background: "linear-gradient(90deg,transparent,#e5e7eb,transparent)", margin: "0 0 28px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: "sans-serif" }}>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Date Issued</p>
                  <p style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>{issuedAt}</p>
                  <p style={{ fontSize: 11, color: "#d1d5db", marginTop: 6 }}>Cert #{certNo}</p>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#c084fc)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", boxShadow: "0 4px 16px rgba(124,58,237,0.35)" }}>
                    <span style={{ fontSize: 32 }}>🎓</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#9ca3af", letterSpacing: "0.06em" }}>VERIFIED</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ width: 140, borderBottom: "2px solid #1e1b4b", marginBottom: 6 }} />
                  <p style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>{tenant?.name ?? "HipyHub"}</p>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Authorised Signatory</p>
                </div>
              </div>
            </div>
            <div style={{ height: 6, background: "linear-gradient(90deg,#7c3aed,#c084fc,#7c3aed)" }} />
          </div>
          <p className="no-print text-center mt-6 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            Certificate ID: {cert.id} · Verify at {shareUrl}
          </p>
        </div>
      </div>
    </>
  );
}

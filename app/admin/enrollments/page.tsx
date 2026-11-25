"use client";

import { useEffect, useState, useCallback } from "react";

interface Course     { id: string; title: string; price_sgd: number; }
interface Enrollment { id: string; course_id: string; payment_status: string; payment_ref: string | null; payment_proof_url: string | null; amount_paid_sgd: number; enrolled_at: string; lms_courses: Course | null; }
interface Student    { id: string; name: string; email: string; phone: string | null; lms_enrollments: Enrollment[]; }

const GLASS: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 };

const statusStyle: Record<string, React.CSSProperties> = {
  free:                 { background: "rgba(99,102,241,0.15)",  color: "#818cf8" },
  pending_verification: { background: "rgba(251,191,36,0.15)",  color: "#fbbf24" },
  paid:                 { background: "rgba(52,211,153,0.15)",  color: "#6ee7b7" },
};

const fmt = (n: number) => `S$${Number(n).toFixed(2)}`;

export default function EnrollmentsPage() {
  const [students,   setStudents]   = useState<Student[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<"pending_verification" | "all">("pending_verification");
  const [search,     setSearch]     = useState("");
  const [verifying,  setVerifying]  = useState<string | null>(null);
  const [payRef,     setPayRef]     = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/admin/lms/students${q}`);
    const d = await res.json();
    setStudents(d.students ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  // Flatten enrollments from all students, apply filter
  const rows = students.flatMap(s =>
    s.lms_enrollments
      .filter(e => filter === "all" || e.payment_status === filter)
      .map(e => ({ ...e, student: s }))
  ).sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime());

  const pendingCount = students.flatMap(s => s.lms_enrollments).filter(e => e.payment_status === "pending_verification").length;

  const verify = async (enrollmentId: string, status: "paid" | "free") => {
    setVerifying(enrollmentId);
    await fetch(`/api/admin/lms/enrollments/${enrollmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status: status, payment_ref: payRef[enrollmentId] ?? null }),
    });
    setVerifying(null);
    load();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <a href="/admin" className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>← Dashboard</a>
          <h1 className="text-xl font-bold text-white mt-1">Enrollments</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Manage course enrollment payments
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
            {pendingCount} awaiting payment
          </span>
        )}
      </div>

      {/* Filters */}
      <div style={GLASS} className="p-4 flex flex-wrap gap-3 items-end">
        <div className="flex gap-2">
          {(["pending_verification", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: filter === f ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.05)",
                color: filter === f ? "#a78bfa" : "rgba(255,255,255,0.45)",
                border: `1px solid ${filter === f ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.08)"}`,
              }}>
              {f === "pending_verification" ? "Pending Payment" : "All Enrollments"}
            </button>
          ))}
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search student name or email…"
          className="flex-1 min-w-48 px-3 py-1.5 rounded-lg text-sm text-white placeholder-white/20"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", outline: "none" }}
        />
      </div>

      {/* Table */}
      <div style={GLASS} className="overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              {filter === "pending_verification" ? "No pending payments" : "No enrollments yet"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Student", "Course", "Amount", "Status", "Enrolled", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold"
                    style={{ color: "rgba(255,255,255,0.35)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{row.student.name}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{row.student.email}</p>
                  </td>
                  <td className="px-4 py-3 text-white">{row.lms_courses?.title ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "#6ee7b7" }}>
                    {fmt(row.amount_paid_sgd || row.lms_courses?.price_sgd || 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                      style={statusStyle[row.payment_status] ?? statusStyle.free}>
                      {row.payment_status === "pending_verification" ? "Awaiting" : row.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {new Date(row.enrolled_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    {row.payment_status === "pending_verification" ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={payRef[row.id] ?? ""}
                          onChange={e => setPayRef(r => ({ ...r, [row.id]: e.target.value }))}
                          placeholder="Ref #"
                          className="w-24 px-2 py-1 rounded text-xs text-white"
                          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }}
                        />
                        <button
                          onClick={() => verify(row.id, "paid")}
                          disabled={verifying === row.id}
                          className="px-2 py-1 rounded text-xs font-semibold disabled:opacity-40"
                          style={{ background: "rgba(52,211,153,0.2)", color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.3)" }}>
                          {verifying === row.id ? "…" : "Verify"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {row.payment_ref ?? "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

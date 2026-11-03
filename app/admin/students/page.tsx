"use client";
import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/AdminShell";

interface Course      { id: string; title: string; price_sgd: number; total_lessons: number; }
interface Enrollment  { id: string; course_id: string; payment_status: string; payment_ref: string | null; payment_proof_url: string | null; amount_paid_sgd: number; enrolled_at: string; completed_at: string | null; lms_courses: Course | null; }
interface Student     { id: string; name: string; email: string; phone: string | null; is_active: boolean; created_at: string; lms_enrollments: Enrollment[]; }

const statusBg: Record<string, string> = {
  free:                 "rgba(99,102,241,0.15)",
  pending_verification: "rgba(251,191,36,0.15)",
  paid:                 "rgba(52,211,153,0.15)",
};
const statusFg: Record<string, string> = {
  free:                 "#818cf8",
  pending_verification: "#fbbf24",
  paid:                 "#6ee7b7",
};
const statusLabel: Record<string, string> = {
  free:                 "Free",
  pending_verification: "Awaiting payment",
  paid:                 "Paid",
};

export default function StudentsPage() {
  const [students,   setStudents]   = useState<Student[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [verifying,  setVerifying]  = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState<Record<string, string>>({});
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    const res = await fetch(`/api/admin/lms/students${q ? `?search=${encodeURIComponent(q)}` : ""}`);
    const d = await res.json();
    setStudents(d.students ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(search); };

  const verifyPayment = async (enrollmentId: string, studentId: string) => {
    setVerifying(enrollmentId);
    await fetch(`/api/admin/lms/enrollments/${enrollmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status: "paid", payment_ref: paymentRef[enrollmentId] || undefined }),
    });
    const res = await fetch(`/api/admin/lms/students/${studentId}`);
    const d = await res.json();
    setStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, lms_enrollments: d.enrollments ?? s.lms_enrollments } : s
    ));
    setVerifying(null);
  };

  const toggleActive = async (student: Student) => {
    setTogglingId(student.id);
    await fetch(`/api/admin/lms/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !student.is_active }),
    });
    setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_active: !s.is_active } : s));
    setTogglingId(null);
  };

  const totalEnrolled  = students.reduce((n, s) => n + s.lms_enrollments.length, 0);
  const totalCompleted = students.reduce((n, s) => n + s.lms_enrollments.filter(e => !!e.completed_at).length, 0);
  const totalPending   = students.reduce((n, s) => n + s.lms_enrollments.filter(e => e.payment_status === "pending_verification").length, 0);

  return (
    <AdminShell>
      <div className="max-w-5xl mx-auto">
        <a href="/admin" className="text-sm hover:opacity-80 transition-opacity" style={{ color: "rgba(255,255,255,0.45)" }}>← Dashboard</a>
        <div className="flex items-center justify-between mt-1 mb-6">
          <h1 className="text-xl font-bold text-white">Students</h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="rounded-xl px-4 py-2 text-sm w-56"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", outline: "none", color: "#fff" }}
            />
            <button type="submit" className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(167,139,250,0.2)", color: "#a78bfa" }}>
              Search
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total students",   value: students.length,  warn: false },
            { label: "Total enrolments", value: totalEnrolled,    warn: false },
            { label: "Pending payment",  value: totalPending,     warn: totalPending > 0 },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-center"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${s.warn ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.08)"}` }}>
              <div className="text-2xl font-bold" style={{ color: s.warn ? "#fbbf24" : "#a78bfa" }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="grid text-xs font-semibold px-5 py-3"
            style={{ gridTemplateColumns: "1fr 1fr auto auto auto", gap: "1rem", color: "rgba(255,255,255,0.4)", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)" }}>
            <span>Student</span>
            <span>Email</span>
            <span>Courses</span>
            <span>Joined</span>
            <span>Status</span>
          </div>

          {loading ? (
            <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.35)" }}>Loading…</div>
          ) : students.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">👩‍🎓</div>
              <p className="text-white font-semibold">No students yet</p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Students appear here after registering at /learn/register</p>
            </div>
          ) : (
            students.map((s, i) => {
              const pendingCount = s.lms_enrollments.filter(e => e.payment_status === "pending_verification").length;
              const isOpen = expanded === s.id;
              return (
                <div key={s.id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : s.id)}
                    className="w-full grid px-5 py-3.5 text-left transition-colors"
                    style={{
                      gridTemplateColumns: "1fr 1fr auto auto auto",
                      gap: "1rem",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      background: isOpen ? "rgba(167,139,250,0.06)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                    }}>
                    <span className="text-sm font-medium text-white truncate flex items-center gap-2">
                      {s.name}
                      {pendingCount > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: "rgba(251,191,36,0.2)", color: "#fbbf24" }}>
                          {pendingCount} pending
                        </span>
                      )}
                    </span>
                    <span className="text-sm truncate" style={{ color: "rgba(255,255,255,0.55)" }}>{s.email}</span>
                    <span className="text-sm text-center" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {s.lms_enrollments.length}
                      {s.lms_enrollments.filter(e => !!e.completed_at).length > 0 && (
                        <span style={{ color: "#6ee7b7" }}> ({s.lms_enrollments.filter(e => !!e.completed_at).length}✓)</span>
                      )}
                    </span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {new Date(s.created_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "2-digit" })}
                    </span>
                    <span className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); toggleActive(s); }}
                        disabled={togglingId === s.id}
                        className="text-xs px-2 py-0.5 rounded-full font-semibold transition-all disabled:opacity-50"
                        style={{
                          background: s.is_active ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.06)",
                          color: s.is_active ? "#6ee7b7" : "rgba(255,255,255,0.35)",
                          border: `1px solid ${s.is_active ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.1)"}`,
                        }}>
                        {s.is_active ? "Active" : "Inactive"}
                      </button>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{isOpen ? "▲" : "▼"}</span>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 py-4" style={{ background: "rgba(0,0,0,0.25)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {s.phone && (
                        <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>Phone: {s.phone}</p>
                      )}
                      {s.lms_enrollments.length === 0 ? (
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>No enrolments yet.</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>Enrolled Courses</p>
                          {s.lms_enrollments.map(e => (
                            <div key={e.id} className="flex items-center justify-between rounded-xl px-4 py-3"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{e.lms_courses?.title ?? e.course_id}</p>
                                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                                  Enrolled {new Date(e.enrolled_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "2-digit" })}
                                  {e.completed_at && (
                                    <span style={{ color: "#6ee7b7" }}> · Completed {new Date(e.completed_at).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}</span>
                                  )}
                                  {e.payment_ref && <span> · Ref: {e.payment_ref}</span>}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                                  style={{ background: statusBg[e.payment_status] ?? "rgba(255,255,255,0.08)", color: statusFg[e.payment_status] ?? "#fff" }}>
                                  {statusLabel[e.payment_status] ?? e.payment_status}
                                </span>
                                {e.payment_status === "pending_verification" && (
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {e.payment_proof_url && (
                                      <a href={e.payment_proof_url} target="_blank" rel="noreferrer"
                                        className="flex-shrink-0 rounded-lg overflow-hidden border"
                                        style={{ borderColor: "rgba(251,191,36,0.4)" }}
                                        title="View payment proof">
                                        <img src={e.payment_proof_url} alt="proof"
                                          className="w-9 h-9 object-cover"
                                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                      </a>
                                    )}
                                    <input
                                      value={paymentRef[e.id] ?? ""}
                                      onChange={ev => setPaymentRef(p => ({ ...p, [e.id]: ev.target.value }))}
                                      placeholder="Ref # (optional)"
                                      className="text-xs rounded-lg px-2 py-1.5 w-28"
                                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", outline: "none" }}
                                    />
                                    <button
                                      onClick={() => verifyPayment(e.id, s.id)}
                                      disabled={verifying === e.id}
                                      className="text-xs px-3 py-1.5 rounded-xl font-bold disabled:opacity-50"
                                      style={{ background: "linear-gradient(135deg,#34d399,#059669)", color: "#fff" }}>
                                      {verifying === e.id ? "…" : "Verify"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!loading && students.length > 0 && (
          <p className="text-xs text-center mt-4" style={{ color: "rgba(255,255,255,0.3)" }}>
            {students.length} student{students.length !== 1 ? "s" : ""} · {totalEnrolled} enrolment{totalEnrolled !== 1 ? "s" : ""} · {totalCompleted} completed
          </p>
        )}
      </div>
    </AdminShell>
  );
}

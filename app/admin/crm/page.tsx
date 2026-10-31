"use client";
import AdminShell from "@/components/AdminShell";

export default function CRMPage() {
  return (
    <AdminShell>
      <div className="max-w-3xl mx-auto">
        <a href="/admin" className="text-sm hover:opacity-80 transition-opacity"
          style={{ color: "rgba(255,255,255,0.45)" }}>← Dashboard</a>
        <h1 className="text-xl font-bold text-white mt-1">CRM</h1>
        <div className="mt-12 text-center py-24 rounded-2xl"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-5xl mb-4">🗂️</div>
          <p className="text-white font-semibold text-lg">Coming Soon</p>
          <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            Customer relationship management — contacts, notes, follow-ups.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}

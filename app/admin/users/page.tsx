"use client";

import { useEffect, useState } from "react";

interface AdminUser {
  id: string; email: string; name: string; role: string;
  tenant_id: string | null; vendor_id: string | null;
  status: string; last_login_at: string | null; created_at: string;
  tenants?: { name: string; slug: string } | null;
}

const ROLE_OPTIONS = [
  { value: "tenant_admin",    label: "Tenant Admin" },
  { value: "school_operator", label: "School Operator" },
  { value: "vendor_admin",    label: "Vendor Admin" },
  { value: "super_admin",     label: "Super Admin" },
];

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)", backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
};
const INPUT: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "10px", padding: "8px 12px", fontSize: "13px", color: "#fff", outline: "none",
};
const LABEL: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: "5px",
};

const roleBadge = (role: string): React.CSSProperties => ({
  super_admin:    { background: "rgba(251,191,36,0.2)",  color: "#fbbf24" },
  tenant_admin:   { background: "rgba(96,165,250,0.2)",  color: "#93c5fd" },
  school_operator:{ background: "rgba(52,211,153,0.2)",  color: "#6ee7b7" },
  vendor_admin:   { background: "rgba(167,139,250,0.2)", color: "#c4b5fd" },
}[role] ?? { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" });

const EMPTY_FORM = { name: "", email: "", role: "tenant_admin", tenant_id: "", password: "" };

export default function UsersPage() {
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_FORM });
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState("");
  const [tenants, setTenants]     = useState<{ id: string; name: string; slug: string }[]>([]);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [newPw, setNewPw]         = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/users")
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetch("/api/admin/tenants")
      .then(r => r.json())
      .then(d => setTenants((d.tenants ?? []).map((t: { id: string; name: string; slug: string }) => ({ id: t.id, name: t.name, slug: t.slug }))));
  }, []);

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const save = async () => {
    setSaving(true); setFormError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tenant_id: form.tenant_id || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error ?? "Failed to create user"); return; }
    setShowForm(false);
    load();
  };

  const toggleStatus = async (user: AdminUser) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
  };

  const doResetPw = async () => {
    if (!resetTarget || newPw.length < 8) return;
    await fetch(`/api/admin/users/${resetTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPw }),
    });
    setResetTarget(null); setNewPw("");
  };

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const formatDate = (dt: string | null) => {
    if (!dt) return "Never";
    return new Date(dt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/admin/tenants" className="text-sm font-medium hover:opacity-80" style={{ color: "rgba(255,255,255,0.5)" }}>
              ← Tenants
            </a>
            <h1 className="text-xl font-bold text-white mt-1">Admin Users</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              All admin logins across all tenants
            </p>
          </div>
          <button onClick={() => { setForm({ ...EMPTY_FORM }); setFormError(""); setShowForm(true); }}
            className="font-semibold px-5 py-2 rounded-xl text-sm"
            style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}>
            + New User
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="flex-1 min-w-48 rounded-xl px-4 py-2 text-sm text-white"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="rounded-xl px-4 py-2 text-sm text-white"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none", cursor: "pointer" }}>
            <option value="all" style={{ background: "#1e0545" }}>All roles</option>
            {ROLE_OPTIONS.map(r => (
              <option key={r.value} value={r.value} style={{ background: "#1e0545" }}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total",     count: users.length,                                    color: "#a78bfa" },
            { label: "Active",    count: users.filter(u => u.status === "active").length,  color: "#6ee7b7" },
            { label: "Suspended", count: users.filter(u => u.status !== "active").length,  color: "#fca5a5" },
            { label: "Shown",     count: filtered.length,                                 color: "#fbbf24" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-center" style={GLASS}>
              <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.count}</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="text-center py-16" style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>No users match your filter</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 rounded-2xl" style={GLASS}>
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: "rgba(167,139,250,0.2)", color: "#a78bfa" }}>
                  {u.name.slice(0, 2).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white text-sm">{u.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={roleBadge(u.role)}>
                      {u.role.replace(/_/g, " ")}
                    </span>
                    {u.status !== "active" && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                        {u.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{u.email}</p>
                  {u.tenants && (
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Tenant: {u.tenants.name} <span className="font-mono">/{u.tenants.slug}</span>
                    </p>
                  )}
                </div>

                {/* Last login */}
                <div className="text-xs text-right flex-shrink-0 hidden md:block" style={{ color: "rgba(255,255,255,0.3)" }}>
                  <div>Last login</div>
                  <div style={{ color: "rgba(255,255,255,0.5)" }}>{formatDate(u.last_login_at)}</div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => { setResetTarget(u); setNewPw(""); }}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                    style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
                    Reset pw
                  </button>
                  {u.role !== "super_admin" && (
                    <button onClick={() => toggleStatus(u)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                      style={u.status === "active"
                        ? { color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.08)" }
                        : { color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.25)", background: "rgba(52,211,153,0.08)" }}>
                      {u.status === "active" ? "Suspend" : "Activate"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create user modal ──────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,0,30,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-2xl"
            style={{ background: "linear-gradient(160deg,#1e0545,#2d0f5e)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div className="px-7 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <h2 className="text-base font-bold text-white">New Admin User</h2>
            </div>
            <div className="px-7 py-5 space-y-4">
              <div>
                <label style={LABEL}>Full name</label>
                <input value={form.name} onChange={e => f("name", e.target.value)}
                  placeholder="Jane Smith" style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Email</label>
                <input type="email" value={form.email} onChange={e => f("email", e.target.value)}
                  placeholder="jane@example.com" style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Role</label>
                <select value={form.role} onChange={e => f("role", e.target.value)}
                  style={{ ...INPUT, cursor: "pointer" }}>
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value} style={{ background: "#1e0545" }}>{r.label}</option>
                  ))}
                </select>
              </div>
              {form.role !== "super_admin" && (
                <div>
                  <label style={LABEL}>Assign to Tenant</label>
                  <select value={form.tenant_id} onChange={e => f("tenant_id", e.target.value)}
                    style={{ ...INPUT, cursor: "pointer" }}>
                    <option value="" style={{ background: "#1e0545" }}>— select tenant —</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id} style={{ background: "#1e0545" }}>
                        {t.name} (/{t.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label style={LABEL}>Temporary Password</label>
                <input type="password" value={form.password} onChange={e => f("password", e.target.value)}
                  placeholder="Min. 8 characters" style={INPUT} />
              </div>
              {formError && (
                <p className="text-xs" style={{ color: "#fca5a5" }}>{formError}</p>
              )}
            </div>
            <div className="px-7 py-5 flex justify-end gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button onClick={() => setShowForm(false)} className="px-5 py-2 text-sm rounded-xl"
                style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="px-6 py-2 text-sm font-bold rounded-xl disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                {saving ? "Creating…" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset password modal ─────────────────────────────────────────────── */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,0,30,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "linear-gradient(160deg,#1e0545,#2d0f5e)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <h3 className="text-base font-bold text-white mb-1">Reset Password</h3>
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
              {resetTarget.name} · {resetTarget.email}
            </p>
            <label style={LABEL}>New Password</label>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
              placeholder="Min. 8 characters" style={{ ...INPUT, marginBottom: 16 }} />
            <div className="flex gap-2">
              <button onClick={doResetPw} disabled={newPw.length < 8}
                className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                Reset
              </button>
              <button onClick={() => { setResetTarget(null); setNewPw(""); }}
                className="flex-1 py-2 rounded-xl text-sm"
                style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

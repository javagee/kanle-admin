"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tenant {
  id: string; name: string; name_zh: string; slug: string;
  whatsapp_number_id: string; ai_persona_name: string;
  plan: string; monthly_fee_sgd: number; platform_fee_pct: number;
  agent_fee_pct: number; primary_color: string; active: boolean;
  created_at: string; metadata?: { tenant_type?: string };
}

interface AdminUser {
  id: string; email: string; name: string; role: string;
  status: string; last_login_at: string | null; created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TENANT_TYPES = [
  { value: "booking",     label: "Booking / Tours",   icon: "🗺️", desc: "WhatsApp bot + travel booking management" },
  { value: "school",      label: "School / LMS",      icon: "🎓", desc: "Online learning portal at /learn/[slug]" },
  { value: "marketplace", label: "Marketplace",       icon: "🛒", desc: "Multi-vendor e-commerce platform" },
];

const ROLE_OPTIONS = [
  { value: "tenant_admin",    label: "Tenant Admin",    desc: "Bookings, vendors, finance, CRM" },
  { value: "school_operator", label: "School Operator", desc: "Courses, students, quizzes" },
  { value: "vendor_admin",    label: "Vendor Admin",    desc: "Products and orders only" },
];

const EMPTY_TENANT = {
  name: "", name_zh: "", slug: "", whatsapp_number_id: "", whatsapp_token: "",
  ai_persona_name: "Serena", ai_persona_name_zh: "思琳娜",
  plan: "starter", monthly_fee_sgd: "299", platform_fee_pct: "15",
  agent_fee_pct: "15", primary_color: "#25D366", tenant_type: "booking",
};

const EMPTY_USER = { name: "", email: "", role: "tenant_admin", password: "" };

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

const planBadge = (plan: string): React.CSSProperties => ({
  starter:    { background: "rgba(148,163,184,0.2)", color: "#cbd5e1" },
  growth:     { background: "rgba(96,165,250,0.2)",  color: "#93c5fd" },
  enterprise: { background: "rgba(167,139,250,0.2)", color: "#c4b5fd" },
}[plan] ?? { background: "rgba(148,163,184,0.2)", color: "#cbd5e1" });

const roleBadge = (role: string): React.CSSProperties => ({
  super_admin:    { background: "rgba(251,191,36,0.2)",   color: "#fbbf24" },
  tenant_admin:   { background: "rgba(96,165,250,0.2)",   color: "#93c5fd" },
  school_operator:{ background: "rgba(52,211,153,0.2)",   color: "#6ee7b7" },
  vendor_admin:   { background: "rgba(167,139,250,0.2)",  color: "#c4b5fd" },
}[role] ?? { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" });

// ─── Component ────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const [tenants, setTenants]           = useState<Tenant[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showTenantForm, setShowTF]     = useState(false);
  const [editing, setEditing]           = useState<Tenant | null>(null);
  const [form, setForm]                 = useState({ ...EMPTY_TENANT });
  const [saving, setSaving]             = useState(false);
  const [tenantError, setTenantError]   = useState("");
  const [lastCreated, setLastCreated]   = useState<Tenant | null>(null);

  // User management per tenant
  const [expandedUsers, setExpandedUsers] = useState<string | null>(null);
  const [tenantUsers, setTenantUsers]     = useState<Record<string, AdminUser[]>>({});
  const [showUserForm, setShowUF]         = useState<string | null>(null); // tenantId
  const [userForm, setUserForm]           = useState({ ...EMPTY_USER });
  const [userSaving, setUserSaving]       = useState(false);
  const [userError, setUserError]         = useState("");
  const [resetTarget, setResetTarget]     = useState<AdminUser | null>(null);
  const [newPw, setNewPw]                 = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/tenants")
      .then(r => r.json())
      .then(d => { setTenants(d.tenants ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const loadUsers = async (tenantId: string) => {
    if (tenantUsers[tenantId]) return; // already loaded
    const res = await fetch(`/api/admin/users?tenant_id=${tenantId}`);
    const d   = await res.json();
    setTenantUsers(prev => ({ ...prev, [tenantId]: d.users ?? [] }));
  };

  const toggleUsers = (tenantId: string) => {
    if (expandedUsers === tenantId) { setExpandedUsers(null); return; }
    setExpandedUsers(tenantId);
    loadUsers(tenantId);
  };

  // ── Tenant CRUD ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null); setForm({ ...EMPTY_TENANT }); setTenantError(""); setShowTF(true);
  };

  const openEdit = (t: Tenant) => {
    setEditing(t);
    setForm({
      name: t.name, name_zh: t.name_zh ?? "", slug: t.slug,
      whatsapp_number_id: t.whatsapp_number_id ?? "", whatsapp_token: "",
      ai_persona_name: t.ai_persona_name ?? "Serena", ai_persona_name_zh: "思琳娜",
      plan: t.plan, monthly_fee_sgd: String(t.monthly_fee_sgd),
      platform_fee_pct: String(t.platform_fee_pct), agent_fee_pct: String(t.agent_fee_pct),
      primary_color: t.primary_color ?? "#25D366",
      tenant_type: t.metadata?.tenant_type ?? "booking",
    });
    setTenantError(""); setShowTF(true);
  };

  const saveTenant = async () => {
    setSaving(true); setTenantError("");
    const url    = editing ? `/api/admin/tenants/${editing.id}` : "/api/admin/tenants";
    const method = editing ? "PATCH" : "POST";
    const payload = {
      ...form,
      metadata: { tenant_type: form.tenant_type },
    };
    const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setTenantError(data.error ?? "Failed to save"); return; }
    setShowTF(false);
    if (!editing) setLastCreated(data.tenant ?? null);
    load();
  };

  const deactivate = async (id: string, name: string) => {
    if (!confirm(`Deactivate "${name}"? Their bot/portal will stop working.`)) return;
    await fetch(`/api/admin/tenants/${id}`, { method: "DELETE" });
    load();
  };

  // ── User CRUD ────────────────────────────────────────────────────────────────

  const openAddUser = (tenantId: string, defaultRole: string) => {
    const roleMap: Record<string, string> = {
      booking: "tenant_admin", school: "school_operator", marketplace: "tenant_admin",
    };
    setUserForm({ ...EMPTY_USER, role: defaultRole || roleMap.booking });
    setUserError(""); setShowUF(tenantId);
  };

  const saveUser = async (tenantId: string) => {
    setUserSaving(true); setUserError("");
    const res  = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...userForm, tenant_id: tenantId }),
    });
    const data = await res.json();
    setUserSaving(false);
    if (!res.ok) { setUserError(data.error ?? "Failed to create user"); return; }
    // Refresh user list for this tenant
    const r2 = await fetch(`/api/admin/users?tenant_id=${tenantId}`);
    const d2 = await r2.json();
    setTenantUsers(prev => ({ ...prev, [tenantId]: d2.users ?? [] }));
    setShowUF(null);
  };

  const toggleUserStatus = async (user: AdminUser, tenantId: string) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setTenantUsers(prev => ({
      ...prev,
      [tenantId]: (prev[tenantId] ?? []).map(u => u.id === user.id ? { ...u, status: newStatus } : u),
    }));
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
  const uf = (k: keyof typeof userForm, v: string) => setUserForm(p => ({ ...p, [k]: v }));

  const isSchool     = (t: Tenant) => t.metadata?.tenant_type === "school";
  const typeIcon     = (t: Tenant) => ({ booking: "🗺️", school: "🎓", marketplace: "🛒" }[t.metadata?.tenant_type ?? "booking"] ?? "🏢");
  const isSchoolForm = form.tenant_type === "school";

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/admin" className="text-sm font-medium hover:opacity-80" style={{ color: "rgba(255,255,255,0.5)" }}>← Dashboard</a>
            <h1 className="text-xl font-bold text-white mt-1">Tenant Management</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Manage client organisations and their admin logins
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin/users" className="text-sm font-semibold px-4 py-2 rounded-xl"
              style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}>
              All Users
            </a>
            <button onClick={openCreate} className="font-semibold px-5 py-2 rounded-xl text-sm"
              style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}>
              + New Tenant
            </button>
          </div>
        </div>

        {/* Post-create success panel */}
        {lastCreated && (
          <div className="mb-6 rounded-2xl p-5" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-white mb-1">✓ Tenant &ldquo;{lastCreated.name}&rdquo; created</p>
                {lastCreated.metadata?.tenant_type === "school" && (
                  <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Student portal: <span className="font-mono" style={{ color: "#a78bfa" }}>/learn/{lastCreated.slug}</span>
                  </p>
                )}
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Next: create an admin login so this tenant can access their dashboard.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button onClick={() => {
                  setLastCreated(null);
                  const tenantType = lastCreated.metadata?.tenant_type ?? "booking";
                  const roleDefault = tenantType === "school" ? "school_operator" : "tenant_admin";
                  openAddUser(lastCreated.id, roleDefault);
                  setExpandedUsers(lastCreated.id);
                  loadUsers(lastCreated.id);
                }}
                  className="px-4 py-2 rounded-xl text-sm font-bold"
                  style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                  + Create admin login
                </button>
                <button onClick={() => setLastCreated(null)} className="text-sm px-3 py-2 rounded-xl"
                  style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)" }}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center py-16" style={{ color: "rgba(255,255,255,0.4)" }}>Loading…</p>
        ) : tenants.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>No tenants yet</p>
            <button onClick={openCreate} className="px-6 py-2 rounded-xl font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)" }}>
              Add your first tenant
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {tenants.map(t => {
              const users     = tenantUsers[t.id] ?? [];
              const isExpanded = expandedUsers === t.id;
              const addingUser = showUserForm === t.id;
              const tType     = t.metadata?.tenant_type ?? "booking";

              return (
                <div key={t.id} className={`rounded-2xl overflow-hidden ${!t.active ? "opacity-40" : ""}`} style={GLASS}>
                  {/* Tenant row */}
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ backgroundColor: t.primary_color ?? "#7c3aed", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                          {typeIcon(t)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-white">{t.name}</h3>
                            {t.name_zh && <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>{t.name_zh}</span>}
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={planBadge(t.plan)}>{t.plan}</span>
                            {!t.active && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5" }}>inactive</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 flex-wrap" style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                            <span className="font-mono">/{t.slug}</span>
                            {isSchool(t)
                              ? <span style={{ color: "#a78bfa" }}>🎓 /learn/{t.slug}</span>
                              : <span>AI: {t.ai_persona_name}</span>}
                            <span>S${t.monthly_fee_sgd}/mo</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        {/* Users toggle */}
                        <button onClick={() => toggleUsers(t.id)}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                          style={isExpanded
                            ? { background: "rgba(167,139,250,0.2)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }
                            : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          👤 Users {isExpanded && tenantUsers[t.id] ? `(${tenantUsers[t.id].length})` : ""}
                        </button>
                        <button onClick={() => openEdit(t)} className="text-sm font-semibold px-3 py-1.5 rounded-lg"
                          style={{ color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.08)" }}>
                          Edit
                        </button>
                        {t.active && (
                          <button onClick={() => deactivate(t.id, t.name)} className="text-sm font-semibold px-3 py-1.5 rounded-lg"
                            style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)" }}>
                            Deactivate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Users panel */}
                  {isExpanded && (
                    <div className="border-t px-5 pb-5" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.15)" }}>
                      <div className="flex items-center justify-between pt-4 mb-3">
                        <p className="text-xs font-semibold uppercase" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>
                          Admin Logins
                        </p>
                        <button onClick={() => openAddUser(t.id, tType === "school" ? "school_operator" : "tenant_admin")}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                          style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                          + Add login
                        </button>
                      </div>

                      {/* User list */}
                      {!tenantUsers[t.id] ? (
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Loading…</p>
                      ) : users.length === 0 && !addingUser ? (
                        <div className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                          <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>No admin logins yet</p>
                          <button onClick={() => openAddUser(t.id, tType === "school" ? "school_operator" : "tenant_admin")}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                            style={{ background: "rgba(167,139,250,0.2)", color: "#a78bfa" }}>
                            Create first login
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {users.map(u => (
                            <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ background: "rgba(167,139,250,0.2)", color: "#a78bfa" }}>
                                {u.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{u.email}</p>
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={roleBadge(u.role)}>
                                {u.role.replace("_", " ")}
                              </span>
                              {u.status === "suspended" && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                                  style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5" }}>suspended</span>
                              )}
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button onClick={() => { setResetTarget(u); setNewPw(""); }}
                                  className="text-xs px-2 py-1 rounded-lg"
                                  style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)" }}>
                                  Reset pw
                                </button>
                                <button onClick={() => toggleUserStatus(u, t.id)}
                                  className="text-xs px-2 py-1 rounded-lg"
                                  style={u.status === "active"
                                    ? { color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.08)" }
                                    : { color: "#6ee7b7", border: "1px solid rgba(52,211,153,0.25)", background: "rgba(52,211,153,0.08)" }}>
                                  {u.status === "active" ? "Suspend" : "Activate"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add user inline form */}
                      {addingUser && (
                        <div className="mt-3 p-4 rounded-2xl" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.2)" }}>
                          <p className="text-xs font-semibold uppercase mb-3" style={{ color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>
                            New Admin Login
                          </p>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label style={LABEL}>Full name</label>
                              <input value={userForm.name} onChange={e => uf("name", e.target.value)}
                                placeholder="Jane Smith" style={INPUT} />
                            </div>
                            <div>
                              <label style={LABEL}>Email</label>
                              <input type="email" value={userForm.email} onChange={e => uf("email", e.target.value)}
                                placeholder="jane@school.com" style={INPUT} />
                            </div>
                            <div>
                              <label style={LABEL}>Role</label>
                              <select value={userForm.role} onChange={e => uf("role", e.target.value)}
                                style={{ ...INPUT, cursor: "pointer" }}>
                                {ROLE_OPTIONS.map(r => (
                                  <option key={r.value} value={r.value} style={{ background: "#1e0545" }}>
                                    {r.label} — {r.desc}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={LABEL}>Temporary password</label>
                              <input type="password" value={userForm.password} onChange={e => uf("password", e.target.value)}
                                placeholder="Min. 8 characters" style={INPUT} />
                            </div>
                          </div>
                          {userError && <p className="text-xs mb-2" style={{ color: "#fca5a5" }}>{userError}</p>}
                          <div className="flex gap-2">
                            <button onClick={() => saveUser(t.id)} disabled={userSaving}
                              className="px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                              style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                              {userSaving ? "Creating…" : "Create login"}
                            </button>
                            <button onClick={() => setShowUF(null)} className="px-4 py-2 rounded-xl text-xs"
                              style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)" }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tenant form modal ─────────────────────────────────────────────────── */}
      {showTenantForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,0,30,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{ background: "linear-gradient(160deg,#1e0545 0%,#2d0f5e 100%)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>

            <div className="px-8 py-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <h2 className="text-lg font-bold text-white">{editing ? `Edit — ${editing.name}` : "New Tenant"}</h2>
            </div>

            <div className="px-8 pt-6 pb-2">
              {/* Tenant type picker */}
              {!editing && (
                <div className="mb-5">
                  <label style={LABEL}>Tenant Type</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {TENANT_TYPES.map(tt => (
                      <button key={tt.value} onClick={() => f("tenant_type", tt.value)}
                        className="p-3 rounded-xl text-left transition-all"
                        style={form.tenant_type === tt.value
                          ? { background: "rgba(167,139,250,0.2)", border: "1px solid rgba(167,139,250,0.5)" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <div className="text-xl mb-1">{tt.icon}</div>
                        <div className="text-xs font-semibold text-white">{tt.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{tt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Common fields */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label style={LABEL}>Business Name (English) *</label>
                  <input value={form.name} onChange={e => f("name", e.target.value)}
                    style={INPUT} placeholder={isSchoolForm ? "Bright Minds Academy" : "HipyHub Tours"} />
                </div>
                <div>
                  <label style={LABEL}>Business Name (Chinese)</label>
                  <input value={form.name_zh} onChange={e => f("name_zh", e.target.value)}
                    style={INPUT} placeholder="康乐·逍遥游" />
                </div>
                <div>
                  <label style={LABEL}>Slug * (unique URL key)</label>
                  <input value={form.slug} onChange={e => f("slug", e.target.value.toLowerCase().replace(/\s/g, "-").replace(/[^a-z0-9-]/g, ""))}
                    style={{ ...INPUT, fontFamily: "monospace" }} placeholder={isSchoolForm ? "bright-minds" : "hipyhub"} />
                  {isSchoolForm && form.slug && (
                    <p className="text-xs mt-1" style={{ color: "#a78bfa" }}>Portal: /learn/{form.slug}</p>
                  )}
                </div>
                <div className="flex items-end gap-3">
                  <div>
                    <label style={LABEL}>Brand Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.primary_color} onChange={e => f("primary_color", e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer"
                        style={{ border: "1px solid rgba(255,255,255,0.2)", background: "transparent" }} />
                      <input value={form.primary_color} onChange={e => f("primary_color", e.target.value)}
                        style={{ ...INPUT, width: "120px", fontFamily: "monospace" }} placeholder="#25D366" />
                    </div>
                  </div>
                </div>
              </div>

              {/* WhatsApp fields — only for non-school */}
              {!isSchoolForm && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="col-span-2 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    <p className="text-xs font-semibold uppercase mb-3" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>
                      WhatsApp Configuration
                    </p>
                  </div>
                  <div>
                    <label style={LABEL}>WhatsApp Phone Number ID</label>
                    <input value={form.whatsapp_number_id} onChange={e => f("whatsapp_number_id", e.target.value)}
                      style={{ ...INPUT, fontFamily: "monospace" }} placeholder="1308836422319418" />
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Meta → WhatsApp → Phone Numbers</p>
                  </div>
                  <div>
                    <label style={LABEL}>WhatsApp API Token</label>
                    <input type="password" value={form.whatsapp_token} onChange={e => f("whatsapp_token", e.target.value)}
                      style={{ ...INPUT, fontFamily: "monospace" }} placeholder={editing ? "Leave blank to keep" : "EAAxxxxxxxx…"} />
                  </div>
                  <div>
                    <label style={LABEL}>AI Persona Name (English)</label>
                    <input value={form.ai_persona_name} onChange={e => f("ai_persona_name", e.target.value)}
                      style={INPUT} placeholder="Serena" />
                  </div>
                  <div>
                    <label style={LABEL}>AI Persona Name (Chinese)</label>
                    <input value={form.ai_persona_name_zh} onChange={e => f("ai_persona_name_zh", e.target.value)}
                      style={INPUT} placeholder="思琳娜" />
                  </div>
                </div>
              )}

              {/* Billing */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <p className="text-xs font-semibold uppercase mb-3" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>
                    Billing & Fees
                  </p>
                </div>
                <div>
                  <label style={LABEL}>Plan</label>
                  <select value={form.plan} onChange={e => f("plan", e.target.value)} style={{ ...INPUT, cursor: "pointer" }}>
                    <option value="starter"    style={{ background: "#1e0545" }}>Starter — S$299/mo</option>
                    <option value="growth"     style={{ background: "#1e0545" }}>Growth — S$599/mo</option>
                    <option value="enterprise" style={{ background: "#1e0545" }}>Enterprise — custom</option>
                  </select>
                </div>
                <div>
                  <label style={LABEL}>Monthly Fee (SGD)</label>
                  <input value={form.monthly_fee_sgd} onChange={e => f("monthly_fee_sgd", e.target.value)}
                    type="number" min="0" style={INPUT} />
                </div>
                <div>
                  <label style={LABEL}>Platform Fee %</label>
                  <input value={form.platform_fee_pct} onChange={e => f("platform_fee_pct", e.target.value)}
                    type="number" min="0" max="100" style={INPUT} />
                </div>
                <div>
                  <label style={LABEL}>Agent Commission %</label>
                  <input value={form.agent_fee_pct} onChange={e => f("agent_fee_pct", e.target.value)}
                    type="number" min="0" max="100" style={INPUT} />
                </div>
              </div>
            </div>

            {tenantError && (
              <div className="mx-8 mb-4 px-4 py-3 rounded-xl text-sm"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                {tenantError}
              </div>
            )}

            <div className="px-8 py-5 flex justify-end gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <button onClick={() => setShowTF(false)} className="px-5 py-2 text-sm font-medium rounded-xl"
                style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Cancel
              </button>
              <button onClick={saveTenant} disabled={saving}
                className="px-6 py-2 text-sm font-bold rounded-xl disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Tenant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset password modal ──────────────────────────────────────────────── */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,0,30,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "linear-gradient(160deg,#1e0545,#2d0f5e)", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <h3 className="text-base font-bold text-white mb-1">Reset Password</h3>
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>{resetTarget.name} · {resetTarget.email}</p>
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
    </AdminShell>
  );
}

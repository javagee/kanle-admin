"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_NAV, AdminRole } from "@/lib/session";

interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
  tenantId: string | null;
  vendorId: string | null;
}

interface AdminShellProps {
  children: ReactNode;
}

// QuantumSHIELD × HipyHub brand tokens
const NAVY   = "#0A0E2E";
const NAVY2  = "#0F1442";
const NAVY3  = "#161B52";
const CYAN   = "#00E5FF";
const BORDER = "rgba(0,229,255,0.15)";
const BORDER_VIOLET = "rgba(167,139,250,0.22)";
const VIOLET = "#a78bfa";
const PURPLE = "#7c3aed";
const TEXT   = "#e2e8f0";
const MUTED  = "rgba(226,232,240,0.45)";
const ACTIVE_BG = "rgba(124,58,237,0.25)";

const GLASS = {
  background: NAVY2,
  border: `1px solid ${BORDER}`,
  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
};

export default function AdminShell({ children }: AdminShellProps) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => {
        if (!r.ok) throw new Error("unauthenticated");
        return r.json();
      })
      .then(setUser)
      .catch(() => router.push("/login"));
  }, [router]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: NAVY }}>
        {/* Cyber radial glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(ellipse at 30% 30%, rgba(124,58,237,0.18) 0%, transparent 60%),
                       radial-gradient(ellipse at 70% 80%, rgba(0,229,255,0.07) 0%, transparent 50%)`,
        }} />
        <div style={{ width: 36, height: 36, border: `3px solid ${VIOLET}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const navItems = ROLE_NAV[user.role] ?? [];

  const roleLabel: Record<AdminRole, string> = {
    super_admin:     "Super Admin",
    tenant_admin:    "Tenant Admin",
    school_operator: "School Operator",
    vendor_admin:    "Vendor Admin",
  };

  return (
    <div style={{ height: "100vh", display: "flex", overflow: "hidden", background: NAVY, color: TEXT, fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 14, position: "relative" }}>

      {/* Background cyber glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(ellipse at 15% 20%, rgba(124,58,237,0.12) 0%, transparent 50%),
                     radial-gradient(ellipse at 85% 80%, rgba(0,229,255,0.06) 0%, transparent 45%)`,
      }} />

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 20 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        ...GLASS,
        position: "fixed", top: 0, left: 0, height: "100%", width: 232, zIndex: 30,
        display: "flex", flexDirection: "column",
        borderRight: `1px solid ${BORDER}`,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.2s ease",
        background: `linear-gradient(180deg, ${NAVY2} 0%, #0D1138 100%)`,
      }}
        className="lg:translate-x-0 lg:relative lg:transform-none"
      >
        {/* Logo */}
        <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${BORDER}` }}>
          {/* Cyan scan line accent */}
          <div style={{ height: 2, background: `linear-gradient(90deg, ${CYAN}, transparent)`, marginBottom: 16, borderRadius: 1 }} />
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {[
              { l: "H", bg: "#E53935" }, { l: "I", bg: "#43A047" }, { l: "P", bg: "#1E88E5" },
              { l: "Y", bg: "#FDD835", c: "#333" }, { l: "H", bg: PURPLE }, { l: "U", bg: PURPLE }, { l: "B", bg: PURPLE },
            ].map(({ l, bg, c }, i) => (
              <div key={i} style={{
                width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 11, background: bg, color: c ?? "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
              }}>
                {l}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: MUTED, letterSpacing: "0.5px", textTransform: "uppercase" }}>ERP Admin Portal</p>
        </div>

        {/* User info */}
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.name}
          </p>
          <p style={{ fontSize: 11, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
            {user.email}
          </p>
          <span style={{
            display: "inline-block", marginTop: 6, fontSize: 10, padding: "2px 8px",
            borderRadius: 4, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase",
            background: "rgba(167,139,250,0.15)", color: VIOLET, border: `1px solid ${BORDER_VIOLET}`,
          }}>
            {roleLabel[user.role]}
          </span>
          {user.tenantId && (
            <p style={{ fontSize: 10, color: "rgba(226,232,240,0.3)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Tenant: {user.tenantId.slice(0, 8)}…
            </p>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                  marginBottom: 2, textDecoration: "none", transition: "all 0.15s",
                  ...(active
                    ? { background: ACTIVE_BG, color: VIOLET, border: `1px solid ${BORDER_VIOLET}`, boxShadow: "0 0 12px rgba(167,139,250,0.1)" }
                    : { background: "transparent", color: MUTED, border: "1px solid transparent" }
                  ),
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = `rgba(0,229,255,0.05)`; (e.currentTarget as HTMLElement).style.color = TEXT; (e.currentTarget as HTMLElement).style.borderColor = `rgba(0,229,255,0.1)`; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = MUTED; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; } }}
              >
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "10px", borderTop: `1px solid ${BORDER}` }}>
          <button
            onClick={logout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8, fontSize: 13,
              background: "transparent", color: MUTED, border: "1px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.1)"; (e.currentTarget as HTMLElement).style.color = "#fca5a5"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(248,113,113,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = MUTED; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}
          >
            <span style={{ fontSize: 15 }}>🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", position: "relative", zIndex: 1 }}>
        {/* Top bar */}
        <header style={{
          position: "sticky", top: 0, zIndex: 10,
          display: "flex", alignItems: "center", gap: 16, padding: "0 20px", height: 52,
          background: `${NAVY2}cc`, borderBottom: `1px solid ${BORDER}`,
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        }}>
          {/* Mobile menu button */}
          <button
            style={{ display: "flex", background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 4 }}
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Cyan scan accent */}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00E676", boxShadow: "0 0 6px #00E676" }} />
            <span style={{ fontSize: 11, color: MUTED, letterSpacing: "0.3px" }}>
              {new Date().toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

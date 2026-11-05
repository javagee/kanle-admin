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
const NAVY2  = "#0F1442";
const NAVY3  = "#161B52";
const CYAN   = "#00E5FF";
const BORDER = "rgba(0,229,255,0.18)";
const BORDER_VIOLET = "rgba(167,139,250,0.25)";
const VIOLET = "#a78bfa";
const PURPLE = "#7c3aed";
const TEXT   = "#e2e8f0";
const MUTED  = "rgba(226,232,240,0.5)";
const ACTIVE_BG = "rgba(124,58,237,0.28)";

// Content background — slightly lighter than pure navy so glass cards are visible
const CONTENT_BG = "#0C1035";

export default function AdminShell({ children }: AdminShellProps) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: NAVY2 }}>
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

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${CYAN}, transparent)`, marginBottom: 14, borderRadius: 1 }} />
        <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
          {[
            { l: "H", bg: "#E53935" }, { l: "I", bg: "#43A047" }, { l: "P", bg: "#1E88E5" },
            { l: "Y", bg: "#FDD835", c: "#333" }, { l: "H", bg: PURPLE }, { l: "U", bg: PURPLE }, { l: "B", bg: PURPLE },
          ].map(({ l, bg, c }, i) => (
            <div key={i} style={{
              width: 25, height: 25, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 10, background: bg, color: c ?? "#fff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            }}>
              {l}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 10, color: MUTED, letterSpacing: "0.6px", textTransform: "uppercase" }}>ERP Admin Portal</p>
      </div>

      {/* User info */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.name}
        </p>
        <p style={{ fontSize: 11, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
          {user.email}
        </p>
        <span style={{
          display: "inline-block", marginTop: 5, fontSize: 10, padding: "2px 8px",
          borderRadius: 4, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase",
          background: "rgba(167,139,250,0.15)", color: VIOLET, border: `1px solid ${BORDER_VIOLET}`,
        }}>
          {roleLabel[user.role]}
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
        {navItems.map(item => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "8px 10px", borderRadius: 7, fontSize: 13, fontWeight: 500,
                marginBottom: 1, textDecoration: "none", transition: "all 0.15s",
                background: active ? ACTIVE_BG : "transparent",
                color: active ? VIOLET : MUTED,
                border: `1px solid ${active ? BORDER_VIOLET : "transparent"}`,
                boxShadow: active ? "0 0 10px rgba(167,139,250,0.08)" : "none",
              }}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "8px", borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <button
          onClick={logout}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 9,
            padding: "8px 10px", borderRadius: 7, fontSize: 13,
            background: "transparent", color: MUTED, border: "1px solid transparent",
            cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "rgba(248,113,113,0.12)";
            el.style.color = "#fca5a5";
            el.style.borderColor = "rgba(248,113,113,0.2)";
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "transparent";
            el.style.color = MUTED;
            el.style.borderColor = "transparent";
          }}
        >
          <span style={{ fontSize: 15 }}>🚪</span>
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div style={{ height: "100vh", display: "flex", overflow: "hidden", background: CONTENT_BG, color: TEXT, fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 14 }}>

      {/* Cyber background glows */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(ellipse at 10% 15%, rgba(124,58,237,0.1) 0%, transparent 45%),
                     radial-gradient(ellipse at 90% 85%, rgba(0,229,255,0.05) 0%, transparent 40%)`,
      }} />

      {/* ── Desktop sidebar (always visible) ─────────────────────────── */}
      <aside style={{
        width: 220, minWidth: 220, height: "100vh",
        background: `linear-gradient(180deg, ${NAVY2} 0%, #0D1138 100%)`,
        borderRight: `1px solid ${BORDER}`,
        display: "flex", flexDirection: "column",
        position: "relative", zIndex: 10, flexShrink: 0,
        boxShadow: "4px 0 20px rgba(0,0,0,0.3)",
      }}
        className="hidden lg:flex"
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar (drawer) ────────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 40 }}
            onClick={() => setMobileOpen(false)}
          />
          <aside style={{
            position: "fixed", top: 0, left: 0, height: "100vh", width: 220,
            background: `linear-gradient(180deg, ${NAVY2} 0%, #0D1138 100%)`,
            borderRight: `1px solid ${BORDER}`,
            display: "flex", flexDirection: "column",
            zIndex: 50, boxShadow: "4px 0 20px rgba(0,0,0,0.5)",
          }}>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", position: "relative", zIndex: 1 }}>

        {/* Top bar */}
        <header style={{
          position: "sticky", top: 0, zIndex: 10, flexShrink: 0,
          display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 50,
          background: `${NAVY2}e0`,
          borderBottom: `1px solid ${BORDER}`,
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        }}>
          {/* Mobile hamburger */}
          <button
            style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 4, display: "flex" }}
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div style={{ flex: 1 }} />

          {/* Status dot + date */}
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00E676", boxShadow: "0 0 6px #00E676", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: MUTED }}>
              {new Date().toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{
          flex: 1, overflowY: "auto",
          padding: "20px 24px",
          background: `linear-gradient(135deg, ${NAVY3}40 0%, transparent 60%)`,
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}

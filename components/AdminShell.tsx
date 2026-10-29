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
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen flex bg-gray-950 text-gray-100">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 bg-gray-900 border-r border-gray-800 z-30 transform transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0 lg:flex lg:flex-col`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-800">
          <div className="flex gap-1 mb-3">
            {[
              { l: "H", bg: "#E53935" }, { l: "I", bg: "#43A047" }, { l: "P", bg: "#1E88E5" },
              { l: "Y", bg: "#FDD835", c: "#333" }, { l: "H", bg: "#6A1B9A" }, { l: "U", bg: "#6A1B9A" }, { l: "B", bg: "#6A1B9A" },
            ].map(({ l, bg, c }, i) => (
              <div key={i} className="w-7 h-7 rounded-md flex items-center justify-center font-extrabold text-xs shadow"
                style={{ background: bg, color: c ?? "#fff" }}>
                {l}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">ERP Admin Portal</p>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-gray-800">
          <p className="text-sm font-semibold text-white truncate">{user.name}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(139,47,201,0.3)", color: "#c084fc", border: "1px solid rgba(139,47,201,0.5)" }}>
            {roleLabel[user.role]}
          </span>
          {user.tenantId && (
            <p className="text-[10px] text-gray-500 mt-1 truncate">Tenant: {user.tenantId.slice(0, 8)}…</p>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? "bg-purple-700/40 text-purple-200 border border-purple-600/40"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"}`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-red-900/30 hover:text-red-300 transition-all"
          >
            <span className="text-base">🚪</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center gap-4 px-5 py-3 bg-gray-950 border-b border-gray-800">
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1" />
          <span className="text-xs text-gray-500">{new Date().toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NAVY  = "#0A0E2E";
const NAVY2 = "#0F1442";
const NAVY3 = "#161B52";
const CYAN  = "#00E5FF";
const VIOLET = "#a78bfa";
const PURPLE = "#7c3aed";
const MUTED  = "rgba(226,232,240,0.5)";
const BORDER = "rgba(0,229,255,0.2)";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      const landingMap: Record<string, string> = {
        super_admin:     "/admin",
        tenant_admin:    "/admin",
        school_operator: "/admin/worksheets",
        vendor_admin:    "/admin/products",
      };
      router.push(landingMap[data.role] ?? "/admin");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Invalid email or password. Please try again.");
      setPassword("");
    }
  };

  const [focused, setFocused] = useState<string | null>(null);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      position: "relative",
      background: NAVY,
      overflow: "hidden",
    }}>
      {/* Cyber radial glows */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse at 30% 25%, rgba(124,58,237,0.22) 0%, transparent 55%),
                     radial-gradient(ellipse at 75% 80%, rgba(0,229,255,0.09) 0%, transparent 45%)`,
      }} />

      {/* Animated scan line */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: 1, top: "35%",
        background: `linear-gradient(90deg, transparent, rgba(0,229,255,0.15), transparent)`,
        animation: "scan 6s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      <style>{`
        @keyframes scan {
          0%   { opacity: 0; transform: translateY(0); }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(40px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Login card */}
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: 380,
        background: NAVY2,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: "40px 36px",
        boxShadow: `0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(0,229,255,0.08)`,
        animation: "fadeIn 0.5s ease",
      }}>
        {/* Top cyan accent bar */}
        <div style={{ height: 2, background: `linear-gradient(90deg, ${CYAN}, ${VIOLET}, transparent)`, marginBottom: 28, borderRadius: 1 }} />

        {/* Logo block row */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 20 }}>
          {[
            { letter: "H", bg: "#E53935" },
            { letter: "I", bg: "#43A047" },
            { letter: "P", bg: "#1E88E5" },
            { letter: "Y", bg: "#FDD835", color: "#333" },
            { letter: "H", bg: PURPLE },
            { letter: "U", bg: PURPLE },
            { letter: "B", bg: PURPLE },
          ].map(({ letter, bg, color }, i) => (
            <div key={i} style={{
              width: 34, height: 34, borderRadius: 8, display: "flex",
              alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 13,
              background: bg, color: color ?? "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            }}>
              {letter}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.5px" }}>
            Admin Portal
          </h1>
          <p style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
            康乐·逍遥游 · ERP Platform
          </p>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              placeholder="admin@hipyhub.io"
              autoFocus
              required
              style={{
                width: "100%", padding: "11px 14px",
                background: NAVY3,
                border: `1px solid ${focused === "email" ? CYAN : BORDER}`,
                borderRadius: 8, color: "#e2e8f0", fontSize: 14,
                outline: "none", transition: "border-color 0.2s",
                boxShadow: focused === "email" ? `0 0 0 2px rgba(0,229,255,0.1)` : "none",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              placeholder="••••••••"
              required
              style={{
                width: "100%", padding: "11px 14px",
                background: NAVY3,
                border: `1px solid ${focused === "password" ? CYAN : BORDER}`,
                borderRadius: 8, color: "#e2e8f0", fontSize: 14,
                letterSpacing: "3px",
                outline: "none", transition: "border-color 0.2s",
                boxShadow: focused === "password" ? `0 0 0 2px rgba(0,229,255,0.1)` : "none",
              }}
            />
          </div>

          {error && (
            <p style={{
              fontSize: 12, textAlign: "center", padding: "8px 12px", borderRadius: 7,
              background: "rgba(248,113,113,0.1)", color: "#fca5a5",
              border: "1px solid rgba(248,113,113,0.25)",
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              width: "100%", padding: "12px", marginTop: 4,
              background: loading || !email || !password
                ? "rgba(167,139,250,0.2)"
                : `linear-gradient(135deg, ${PURPLE}, #9333ea)`,
              color: "#fff", border: `1px solid ${loading || !email || !password ? "rgba(167,139,250,0.2)" : "rgba(167,139,250,0.4)"}`,
              borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: loading || !email || !password ? "not-allowed" : "pointer",
              opacity: loading || !email || !password ? 0.5 : 1,
              transition: "all 0.2s",
              boxShadow: loading || !email || !password ? "none" : "0 4px 20px rgba(124,58,237,0.4)",
              letterSpacing: "0.3px",
            }}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 11, marginTop: 24, color: "rgba(226,232,240,0.2)" }}>
          IES Entrepreneurs (S) Pte Ltd
        </p>
      </div>
    </div>
  );
}

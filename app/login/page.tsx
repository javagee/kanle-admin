"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      // Role-based landing page
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

  const inputStyle = {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    backdropFilter: "blur(8px)",
  };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.6)";
    e.currentTarget.style.background = "rgba(255,255,255,0.15)";
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.2)";
    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #4a0e8f 0%, #8B2FC9 40%, #c05fe0 70%, #9b36d1 100%)",
      }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full opacity-30 blur-3xl" style={{ background: "#E53935" }} />
      <div className="absolute bottom-[-60px] right-[-60px] w-72 h-72 rounded-full opacity-25 blur-3xl" style={{ background: "#1E88E5" }} />
      <div className="absolute top-1/2 left-10 w-40 h-40 rounded-full opacity-20 blur-2xl" style={{ background: "#FDD835" }} />
      <div className="absolute bottom-24 left-1/3 w-48 h-48 rounded-full opacity-20 blur-3xl" style={{ background: "#43A047" }} />

      {/* Glassmorphism card */}
      <div
        className="relative w-full max-w-sm rounded-3xl p-8 z-10"
        style={{
          background: "rgba(255, 255, 255, 0.12)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          boxShadow: "0 8px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
        }}
      >
        {/* Logo block row */}
        <div className="flex justify-center gap-1 mb-6">
          {[
            { letter: "H", bg: "#E53935" },
            { letter: "I", bg: "#43A047" },
            { letter: "P", bg: "#1E88E5" },
            { letter: "Y", bg: "#FDD835", color: "#333" },
            { letter: "H", bg: "#6A1B9A" },
            { letter: "U", bg: "#6A1B9A" },
            { letter: "B", bg: "#6A1B9A" },
          ].map(({ letter, bg, color }, i) => (
            <div
              key={i}
              className="w-9 h-9 rounded-lg flex items-center justify-center font-extrabold text-base shadow-md"
              style={{ background: bg, color: color ?? "#fff" }}
            >
              {letter}
            </div>
          ))}
        </div>

        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-white tracking-wide">Admin Portal</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            康乐·逍遥游 · ERP
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@hipyhub.io"
              autoFocus
              required
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none transition-all"
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none transition-all"
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          {error && (
            <p
              className="text-xs text-center rounded-lg py-2 px-3"
              style={{ background: "rgba(229,57,53,0.25)", color: "#ffb3b3", border: "1px solid rgba(229,57,53,0.4)" }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-40 mt-2"
            style={{
              background: loading || !email || !password
                ? "rgba(255,255,255,0.2)"
                : "linear-gradient(135deg, #c05fe0, #6A1B9A)",
              color: "#fff",
              boxShadow: loading || !email || !password ? "none" : "0 4px 20px rgba(106,27,154,0.5)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <p
          className="text-center text-xs mt-8"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          IES Entrepreneurs (S) Pte Ltd
        </p>
      </div>
    </div>
  );
}

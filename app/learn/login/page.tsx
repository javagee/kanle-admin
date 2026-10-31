"use client";

import { useState } from "react";
import Link from "next/link";

export default function LearnLoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/learn/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) { window.location.href = "/learn/dashboard"; }
    else { setError(data.error ?? "Login failed"); setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0d0820,#1a1035)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 32 }}>
        <Link href="/learn" className="text-sm font-semibold" style={{ color: "#a78bfa" }}>← HipyHub Learn</Link>
        <h1 className="text-2xl font-bold text-white mt-4 mb-1">Welcome back</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>Sign in to continue learning</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
          </div>
          {error && <p className="text-sm" style={{ color: "#fca5a5" }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm mt-5" style={{ color: "rgba(255,255,255,0.4)" }}>
          New student?{" "}
          <Link href="/learn/register" style={{ color: "#a78bfa" }} className="font-semibold">Create account</Link>
        </p>
      </div>
    </div>
  );
}

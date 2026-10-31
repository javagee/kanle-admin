"use client";

import { useState } from "react";
import Link from "next/link";

export default function LearnRegisterPage() {
  const [form, setForm]     = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/learn/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tenant_slug: window.location.hostname.split(".")[0] }),
    });
    const data = await res.json();
    if (res.ok) { setDone(true); }
    else { setError(data.error ?? "Registration failed"); setLoading(false); }
  };

  if (done) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0d0820,#1a1035)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-white mb-2">Account created!</h1>
        <p className="mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>You can now sign in and start learning.</p>
        <Link href="/learn/login" className="px-6 py-3 rounded-xl text-sm font-bold inline-block"
          style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
          Sign in →
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0d0820,#1a1035)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 32 }}>
        <Link href="/learn" className="text-sm font-semibold" style={{ color: "#a78bfa" }}>← HipyHub Learn</Link>
        <h1 className="text-2xl font-bold text-white mt-4 mb-1">Create account</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>Join free and start learning today</p>

        <form onSubmit={submit} className="space-y-4">
          {[
            { key: "name",     label: "Full name",    type: "text",     placeholder: "Your name" },
            { key: "email",    label: "Email",         type: "email",    placeholder: "you@example.com" },
            { key: "phone",    label: "Phone (optional)", type: "tel",  placeholder: "+65 9123 4567" },
            { key: "password", label: "Password",      type: "password", placeholder: "Min. 8 characters" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} required={f.key !== "phone"}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
            </div>
          ))}
          {error && <p className="text-sm" style={{ color: "#fca5a5" }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm mt-5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Already have an account?{" "}
          <Link href="/learn/login" style={{ color: "#a78bfa" }} className="font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

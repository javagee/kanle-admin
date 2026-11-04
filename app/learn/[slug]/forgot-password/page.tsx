"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const { slug }          = useParams<{ slug: string }>();
  const [email, setEmail] = useState("");
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/learn/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, tenant_slug: slug }),
    });
    setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0d0820,#1a1035)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 32 }}>
        <Link href={`/learn/${slug}/login`} className="text-sm font-semibold" style={{ color: "#a78bfa" }}>← Back to login</Link>

        {sent ? (
          <>
            <div className="text-4xl mt-6 mb-3">📬</div>
            <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
              If <strong className="text-white">{email}</strong> is registered, you&apos;ll receive a reset link shortly. It expires in 1 hour.
            </p>
            <Link href={`/learn/${slug}/login`}
              className="block text-center w-full mt-6 py-3 rounded-xl text-sm font-bold"
              style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.3)" }}>
              Back to login
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mt-4 mb-1">Forgot password?</h1>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

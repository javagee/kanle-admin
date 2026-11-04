"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const { slug }                  = useParams<{ slug: string }>();
  const searchParams              = useSearchParams();
  const token                     = searchParams.get("token") ?? "";

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!token) setError("Missing reset token. Please request a new link.");
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    const res = await fetch("/api/learn/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (res.ok) { setDone(true); }
    else { setError(data.error ?? "Something went wrong."); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0d0820,#1a1035)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: 32 }}>

        {done ? (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h1 className="text-xl font-bold text-white mb-2">Password updated!</h1>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
              Your password has been reset. You can now sign in with your new password.
            </p>
            <Link href={`/learn/${slug}/login`}
              className="block text-center w-full py-3 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
              Go to login
            </Link>
          </>
        ) : (
          <>
            <Link href={`/learn/${slug}/login`} className="text-sm font-semibold" style={{ color: "#a78bfa" }}>← Back to login</Link>
            <h1 className="text-2xl font-bold text-white mt-4 mb-1">Set new password</h1>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>Choose a strong password — at least 8 characters.</p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Confirm password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", outline: "none" }} />
              </div>
              {error && <p className="text-sm" style={{ color: "#fca5a5" }}>{error}</p>}
              <button type="submit" disabled={loading || !token}
                className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

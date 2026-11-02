"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LearnLandingPage() {
  const router          = useRouter();
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!clean) { setError("Please enter a school code"); return; }
    setChecking(true);
    setError("");
    // Quick existence check
    const res = await fetch(`/api/learn/courses?tenant=${clean}&limit=1`);
    if (res.ok) {
      router.push(`/learn/${clean}`);
    } else {
      setError("School not found. Check the code and try again.");
      setChecking(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0d0820,#1a1035)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="text-center" style={{ maxWidth: 420, width: "100%" }}>
        <div className="text-6xl mb-6">🎓</div>
        <h1 className="text-3xl font-extrabold text-white mb-2">HipyHub Learn</h1>
        <p className="text-base mb-10" style={{ color: "rgba(255,255,255,0.45)" }}>
          Enter your school code to access your learning portal
        </p>

        <form onSubmit={go}>
          <div className="flex gap-2">
            <input
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="school-code"
              autoFocus
              className="flex-1 rounded-2xl px-5 py-3 text-sm text-white font-mono"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", outline: "none" }}
            />
            <button type="submit" disabled={checking}
              className="px-5 py-3 rounded-2xl text-sm font-bold disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
              {checking ? "…" : "Go →"}
            </button>
          </div>
          {error && <p className="text-sm mt-3" style={{ color: "#fca5a5" }}>{error}</p>}
        </form>

        <p className="text-xs mt-8" style={{ color: "rgba(255,255,255,0.2)" }}>
          Your school code is provided by your institution
        </p>
      </div>
    </div>
  );
}

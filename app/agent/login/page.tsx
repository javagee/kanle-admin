"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AgentLoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed.match(/^REF-[A-Z0-9]{6}$/)) {
      setError("Enter your referral code in the format REF-XXXXXX");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/agent?code=${trimmed}`);
      if (!r.ok) { setError("Code not found. Please check and try again."); setLoading(false); return; }
      sessionStorage.setItem("agent_code", trimmed);
      router.push("/agent/portal");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg,#0a0a1a 0%,#0d1f0d 100%)",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", padding: 24,
    }}>
      <div style={{
        width: "100%", maxWidth: 400,
        background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.14)", borderRadius: 20, padding: 40,
        boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
          <h1 style={{ color: "white", fontSize: 22, fontWeight: 700, margin: 0 }}>Agent Portal</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, margin: "8px 0 0" }}>
            HipyHub Sales Partner Dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", color: "rgba(255,255,255,0.55)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
            Your Referral Code
          </label>
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="REF-XXXXXX"
            maxLength={10}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 10, fontSize: 18,
              fontFamily: "monospace", fontWeight: 700, letterSpacing: 2,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              color: "white", outline: "none", textAlign: "center", boxSizing: "border-box",
            }}
          />
          {error && (
            <p style={{ color: "#f87171", fontSize: 13, margin: "10px 0 0", textAlign: "center" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 20, width: "100%", padding: "14px 0", borderRadius: 10,
              background: loading ? "#555" : "#009658", color: "white",
              border: "none", fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Checking…" : "Enter Dashboard"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 12, marginTop: 24 }}>
          Don&apos;t have a code? Contact your HipyHub manager to get registered.
        </p>
      </div>
    </div>
  );
}

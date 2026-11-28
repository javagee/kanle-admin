"use client";
import { useState, useEffect } from "react";

export default function ErGeBooksPage() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading]   = useState(false);

  function dismiss() {
    setFading(true);
    setTimeout(() => setVisible(false), 600);
  }

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data === "erge-ready") dismiss();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#111" }}>

      {visible && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "#0a1a08",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 24,
          transition: "opacity 0.6s ease",
          opacity: fading ? 0 : 1,
          pointerEvents: fading ? "none" : "auto",
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 40 }}>🎵</span>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 24, letterSpacing: 0.5 }}>
                ErGe Books
              </div>
              <div style={{ color: "#4ade80", fontSize: 12, letterSpacing: 1 }}>
                华文互动学习库 · powered by HipyHub
              </div>
            </div>
          </div>

          <div style={{
            width: 44, height: 44,
            border: "3px solid rgba(74,222,128,0.2)",
            borderTopColor: "#4ade80",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />

          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>
            Loading Mandarin learning content…
          </p>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <iframe
        src="https://erge-books.pages.dev/"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allow="autoplay"
        title="ErGe Books"
      />
    </div>
  );
}

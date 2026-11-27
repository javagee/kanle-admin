"use client";
import { useState, useRef } from "react";

export default function BooksPage() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading]   = useState(false);
  const iframeLoaded = useRef(false);

  function dismiss() {
    setFading(true);
    setTimeout(() => setVisible(false), 600);
  }

  function onIframeLoad() {
    if (iframeLoaded.current) return;
    iframeLoaded.current = true;
    // Keep overlay at least 4s so WASM has time to init before it disappears
    setTimeout(dismiss, 4000);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#111" }}>

      {visible && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "#0d0820",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 24,
          transition: "opacity 0.6s ease",
          opacity: fading ? 0 : 1,
          pointerEvents: fading ? "none" : "auto",
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 40 }}>📚</span>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 24, letterSpacing: 0.5 }}>
                ePAL Books
              </div>
              <div style={{ color: "#a78bfa", fontSize: 12, letterSpacing: 1 }}>
                powered by HipyHub
              </div>
            </div>
          </div>

          <div style={{
            width: 44, height: 44,
            border: "3px solid rgba(167,139,250,0.2)",
            borderTopColor: "#a78bfa",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />

          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, margin: 0 }}>
            Loading books…
          </p>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <iframe
        src="https://epal-books.pages.dev/"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allow="autoplay"
        title="ePAL Books"
        onLoad={onIframeLoad}
      />
    </div>
  );
}

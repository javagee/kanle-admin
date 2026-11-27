"use client";
import { useState } from "react";

export default function BooksPage() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#111" }}>
      {/* Branded loading screen */}
      {!loaded && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "#0d0820",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 24,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 36 }}>📚</span>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 22, letterSpacing: 0.5 }}>
                ePAL Books
              </div>
              <div style={{ color: "#a78bfa", fontSize: 12, letterSpacing: 1 }}>
                powered by HipyHub
              </div>
            </div>
          </div>

          {/* Spinner */}
          <div style={{
            width: 40, height: 40,
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
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

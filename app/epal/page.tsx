"use client";

// POC page — embeds the ePAL content engine inside the HipyHub portal.
// The underlying content URL is not exposed in any user-visible element.
export default function EpalPage() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#111", display: "flex", flexDirection: "column" }}>
      {/* Thin branded header */}
      <div style={{
        height: 40, flexShrink: 0,
        background: "linear-gradient(90deg,#0d0820,#1a1035)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", paddingInline: 16, gap: 10,
      }}>
        <span style={{ fontSize: 18 }}>📚</span>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: 0.3 }}>
          ePAL Books
        </span>
        <span style={{
          marginLeft: 6, fontSize: 10, fontWeight: 600,
          background: "linear-gradient(90deg,#c084fc,#7c3aed)",
          borderRadius: 999, padding: "2px 8px", color: "#fff", letterSpacing: 0.5,
        }}>
          POC
        </span>
        <div style={{ flex: 1 }} />
        <a href="/admin" style={{
          fontSize: 12, color: "rgba(255,255,255,0.4)",
          textDecoration: "none", padding: "4px 10px",
          borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
        }}>
          ← Dashboard
        </a>
      </div>

      {/* Full-height content frame */}
      <iframe
        src="https://epal-books.pages.dev/"
        style={{ flex: 1, border: "none", width: "100%", display: "block" }}
        allow="autoplay"
        title="ePAL Books"
      />
    </div>
  );
}

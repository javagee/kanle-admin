"use client";

export default function BooksPage() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#111" }}>
      <iframe
        src="https://epal-books.pages.dev/"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allow="autoplay"
        title="ePAL Books"
      />
    </div>
  );
}

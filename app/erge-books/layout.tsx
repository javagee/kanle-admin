import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ErGe Books — Mandarin Interactive Learning",
  description: "华文互动学习库 · 朗读儿歌 — Interactive Mandarin learning content for Nursery and K1 children.",
  openGraph: {
    title: "ErGe Books — Mandarin Interactive Learning",
    description: "华文互动学习库 · 朗读儿歌 — Interactive Mandarin learning for young children.",
    siteName: "HipyHub Education",
    type: "website",
    images: [{ url: "https://hipyhub-digital-services.vercel.app/og-erge-books.png", width: 1200, height: 630 }],
  },
};

export default function ErGeBooksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

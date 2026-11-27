import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ePAL Books — Interactive e-Learning",
  description: "e-PAL Textbooks, Activity Books and Readers for Nursery, K1 and K2 — interactive Flash-based learning content.",
  openGraph: {
    title: "ePAL Books — Interactive e-Learning",
    description: "e-PAL Textbooks, Activity Books and Readers for Nursery, K1 and K2.",
    siteName: "HipyHub Education",
    type: "website",
    images: [{ url: "/og-epal-books.png", width: 1263, height: 952 }],
  },
};

export default function EpalBooksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

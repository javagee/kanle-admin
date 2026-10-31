"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  title_zh: string | null;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  level: string;
  price_sgd: number;
  total_lessons: number;
  total_duration_min: number;
  is_featured: boolean;
}

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  beginner:     { bg: "rgba(52,211,153,0.15)",  text: "#6ee7b7" },
  intermediate: { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" },
  advanced:     { bg: "rgba(248,113,113,0.15)", text: "#f87171" },
};

export default function LearnHomePage() {
  const [courses, setCourses]   = useState<Course[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [level, setLevel]       = useState("all");

  const load = async (q = search, l = level) => {
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    if (l !== "all") params.set("level", l);
    const res = await fetch(`/api/learn/courses?${params}`);
    const data = await res.json();
    setCourses(data.courses ?? []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0d0820 0%,#1a1035 50%,#0d0820 100%)" }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div>
          <span className="text-white font-bold text-lg">HipyHub </span>
          <span style={{ color: "#a78bfa" }} className="font-bold text-lg">Learn</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/learn/login" className="text-sm px-4 py-1.5 rounded-xl font-semibold transition-all"
            style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}>
            Sign in
          </Link>
          <Link href="/learn/register" className="text-sm px-4 py-1.5 rounded-xl font-semibold transition-all"
            style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
            Join free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center px-4 py-16">
        <h1 className="text-4xl font-extrabold text-white mb-3">Learn anything, anywhere</h1>
        <p className="text-lg mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
          Courses designed for your community
        </p>

        {/* Search */}
        <div className="max-w-xl mx-auto flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load(search, level)}
            placeholder="Search courses…"
            className="flex-1 rounded-2xl px-5 py-3 text-sm text-white"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", outline: "none" }} />
          <button onClick={() => load(search, level)}
            className="px-5 py-3 rounded-2xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
            Search
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-16">

        {/* Level filter */}
        <div className="flex gap-2 mb-8 justify-center flex-wrap">
          {["all", "beginner", "intermediate", "advanced"].map(l => (
            <button key={l} onClick={() => { setLevel(l); load(search, l); }}
              className="px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-all"
              style={level === l
                ? { background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }
                : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {l === "all" ? "All levels" : l}
            </button>
          ))}
        </div>

        {/* Featured banner */}
        {courses.filter(c => c.is_featured).length > 0 && (
          <div className="mb-10">
            <h2 className="text-white font-bold text-lg mb-4">Featured</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.filter(c => c.is_featured).map(c => <CourseCard key={c.id} course={c} />)}
            </div>
          </div>
        )}

        {/* All courses */}
        <h2 className="text-white font-bold text-lg mb-4">
          {loading ? "Loading…" : `${courses.length} course${courses.length !== 1 ? "s" : ""}`}
        </h2>

        {loading ? (
          <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.35)" }}>Loading courses…</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.35)" }}>No courses found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map(c => <CourseCard key={c.id} course={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({ course: c }: { course: Course }) {
  const lc = LEVEL_COLORS[c.level] ?? LEVEL_COLORS.beginner;
  return (
    <Link href={`/learn/courses/${c.id}`}
      className="group block rounded-2xl overflow-hidden transition-transform hover:-translate-y-1"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
      {/* Thumbnail */}
      <div className="h-44 overflow-hidden" style={{ background: "rgba(167,139,250,0.12)" }}>
        {c.thumbnail_url
          ? <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-5xl">🎓</div>}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-white text-sm leading-snug">{c.title}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0"
            style={{ background: lc.bg, color: lc.text }}>
            {c.level}
          </span>
        </div>
        {c.title_zh && <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>{c.title_zh}</p>}
        {c.description && (
          <p className="text-xs mb-3 line-clamp-2" style={{ color: "rgba(255,255,255,0.45)" }}>{c.description}</p>
        )}
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: "rgba(255,255,255,0.35)" }}>{c.total_lessons} lessons</span>
          <span className="font-bold text-sm" style={{ color: c.price_sgd > 0 ? "#fbbf24" : "#6ee7b7" }}>
            {c.price_sgd > 0 ? `S$${c.price_sgd.toFixed(2)}` : "Free"}
          </span>
        </div>
      </div>
    </Link>
  );
}

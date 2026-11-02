"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

interface QuizQuestion { id: string; question: string; options: string[]; sort_order: number; }
interface QuizMeta     { id: string; title: string; passing_score: number; }
interface BestAttempt  { score: number; passed: boolean; attempted_at: string; }
interface ResultItem   { question_id: string; question: string; options: string[]; chosen_index: number; correct_index: number; is_correct: boolean; explanation: string | null; }

type Phase = "loading" | "ready" | "submitting" | "results" | "error";

export default function SlugQuizPage() {
  const { slug, id }       = useParams<{ slug: string; id: string }>();
  const searchParams       = useSearchParams();
  const courseId           = searchParams.get("course_id") ?? "";

  const [phase, setPhase]         = useState<Phase>("loading");
  const [quiz, setQuiz]           = useState<QuizMeta | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [best, setBest]           = useState<BestAttempt | null>(null);
  const [answers, setAnswers]     = useState<Record<string, number>>({});
  const [current, setCurrent]     = useState(0);
  const [results, setResults]     = useState<ResultItem[]>([]);
  const [score, setScore]         = useState(0);
  const [passed, setPassed]       = useState(false);
  const [errMsg, setErrMsg]       = useState("");

  useEffect(() => {
    fetch(`/api/learn/quiz/${id}`)
      .then(r => {
        if (r.status === 401) { window.location.href = `/learn/${slug}/login`; throw new Error("auth"); }
        if (r.status === 403) { setErrMsg("You need to be enrolled to take this quiz."); setPhase("error"); throw new Error("403"); }
        return r.json();
      })
      .then(d => {
        setQuiz(d.quiz);
        setQuestions(d.questions ?? []);
        setBest(d.best_attempt ?? null);
        setPhase("ready");
      })
      .catch(() => { if (phase === "loading") { setErrMsg("Could not load quiz."); setPhase("error"); } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slug]);

  const selectAnswer = (questionId: string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const submit = async () => {
    setPhase("submitting");
    const payload = questions.map(q => ({ question_id: q.id, chosen_index: answers[q.id] ?? -1 }));
    const res = await fetch(`/api/learn/quiz/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: payload }),
    });
    const data = await res.json();
    if (!res.ok) { setErrMsg(data.error ?? "Submission failed."); setPhase("error"); return; }
    setScore(data.score);
    setPassed(data.passed);
    setResults(data.results ?? []);
    setPhase("results");
  };

  const restart = () => { setAnswers({}); setCurrent(0); setPhase("ready"); };

  const answeredCount = Object.keys(answers).length;
  const allAnswered   = answeredCount === questions.length;
  const q             = questions[current];

  if (phase === "loading") return (
    <div style={{ minHeight: "100vh", background: "#0d0820" }} className="flex items-center justify-center">
      <div className="text-white">Loading quiz…</div>
    </div>
  );
  if (phase === "error") return (
    <div style={{ minHeight: "100vh", background: "#0d0820" }} className="flex flex-col items-center justify-center gap-4">
      <div style={{ color: "#fca5a5" }}>{errMsg}</div>
      {courseId && <Link href={`/learn/${slug}/courses/${courseId}`} style={{ color: "#a78bfa" }}>← Back to course</Link>}
    </div>
  );

  if (phase === "results") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0d0820,#1a1035)", color: "#fff" }}>
        <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <Link href={`/learn/${slug}`} className="font-bold" style={{ color: "#a78bfa" }}>HipyHub Learn</Link>
          {courseId && <Link href={`/learn/${slug}/courses/${courseId}`} className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>← Back to course</Link>}
        </nav>
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="rounded-3xl p-8 text-center mb-8"
            style={{ background: passed ? "rgba(52,211,153,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${passed ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.25)"}` }}>
            <div className="text-6xl mb-3">{passed ? "🏆" : "📚"}</div>
            <div className="text-5xl font-extrabold mb-2" style={{ color: passed ? "#6ee7b7" : "#fca5a5" }}>{score}%</div>
            <p className="text-lg font-bold mb-1" style={{ color: passed ? "#6ee7b7" : "#fca5a5" }}>{passed ? "Passed!" : "Not passed"}</p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              Passing score: {quiz?.passing_score}% · {results.filter(r => r.is_correct).length} / {results.length} correct
            </p>
          </div>
          <h2 className="font-bold text-white mb-4">Review</h2>
          <div className="space-y-4">
            {results.map((r, i) => (
              <div key={r.question_id} className="rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-sm font-medium text-white mb-3">
                  <span className="mr-2" style={{ color: r.is_correct ? "#6ee7b7" : "#fca5a5" }}>{r.is_correct ? "✓" : "✗"}</span>
                  Q{i + 1}. {r.question}
                </p>
                <div className="space-y-1.5">
                  {r.options.map((opt, oi) => {
                    const isChosen  = oi === r.chosen_index;
                    const isCorrect = oi === r.correct_index;
                    let bg = "rgba(255,255,255,0.03)", fg = "rgba(255,255,255,0.5)", border = "rgba(255,255,255,0.07)";
                    if (isCorrect)              { bg = "rgba(52,211,153,0.1)";  fg = "#6ee7b7"; border = "rgba(52,211,153,0.25)"; }
                    else if (isChosen)          { bg = "rgba(239,68,68,0.1)";   fg = "#fca5a5"; border = "rgba(239,68,68,0.25)"; }
                    return (
                      <div key={oi} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                        style={{ background: bg, border: `1px solid ${border}`, color: fg }}>
                        <span className="font-mono flex-shrink-0">{String.fromCharCode(65 + oi)}.</span>
                        <span className="flex-1">{opt}</span>
                        {isCorrect && <span className="flex-shrink-0 font-semibold">Correct</span>}
                        {isChosen && !isCorrect && <span className="flex-shrink-0 font-semibold">Your answer</span>}
                      </div>
                    );
                  })}
                </div>
                {r.explanation && <p className="text-xs mt-2 italic" style={{ color: "rgba(255,255,255,0.4)" }}>💡 {r.explanation}</p>}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-8 justify-center">
            {!passed && (
              <button onClick={restart} className="px-6 py-3 rounded-2xl text-sm font-bold"
                style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
                Try again
              </button>
            )}
            {courseId && (
              <Link href={`/learn/${slug}/courses/${courseId}`} className="px-6 py-3 rounded-2xl text-sm font-bold"
                style={{ background: "rgba(255,255,255,0.08)", color: "#fff" }}>
                Back to course
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const progress = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0d0820,#1a1035)", color: "#fff" }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <Link href={`/learn/${slug}`} className="font-bold" style={{ color: "#a78bfa" }}>HipyHub Learn</Link>
        {courseId && <Link href={`/learn/${slug}/courses/${courseId}`} className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>← Back to course</Link>}
      </nav>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white mb-1">{quiz?.title}</h1>
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span>Question {current + 1} of {questions.length}</span>
            <span>{answeredCount} answered · Pass: {quiz?.passing_score}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg,#c084fc,#7c3aed)" }} />
          </div>
        </div>
        {best && (
          <div className="mb-4 px-4 py-2 rounded-xl text-xs inline-flex items-center gap-2"
            style={{ background: best.passed ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.05)", color: best.passed ? "#6ee7b7" : "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {best.passed ? "🏆" : "📊"} Best attempt: {best.score}% — {best.passed ? "Passed" : "Not passed yet"}
          </div>
        )}
        {q && (
          <div className="rounded-3xl p-6 mb-6" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p className="text-base font-semibold text-white mb-5">{q.question}</p>
            <div className="space-y-3">
              {q.options.map((opt, oi) => {
                const chosen = answers[q.id] === oi;
                return (
                  <button key={oi} onClick={() => selectAnswer(q.id, oi)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-left transition-all"
                    style={{
                      background: chosen ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${chosen ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.08)"}`,
                      color: chosen ? "#e9d5ff" : "rgba(255,255,255,0.75)",
                    }}>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: chosen ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.08)", color: chosen ? "#a78bfa" : "rgba(255,255,255,0.4)" }}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
            className="px-5 py-2.5 rounded-2xl text-sm font-semibold disabled:opacity-20"
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)" }}>
            ← Previous
          </button>
          <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
            {questions.map((qq, i) => (
              <button key={qq.id} onClick={() => setCurrent(i)}
                className="w-7 h-7 rounded-full text-xs font-bold transition-all"
                style={{
                  background: i === current ? "linear-gradient(135deg,#c084fc,#7c3aed)" :
                               answers[qq.id] !== undefined ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.08)",
                  color: i === current || answers[qq.id] !== undefined ? "#fff" : "rgba(255,255,255,0.35)",
                }}>
                {i + 1}
              </button>
            ))}
          </div>
          {current < questions.length - 1 ? (
            <button onClick={() => setCurrent(c => c + 1)}
              className="px-5 py-2.5 rounded-2xl text-sm font-semibold"
              style={{ background: "rgba(167,139,250,0.2)", color: "#a78bfa" }}>
              Next →
            </button>
          ) : (
            <button onClick={submit} disabled={!allAnswered || phase === "submitting"}
              className="px-5 py-2.5 rounded-2xl text-sm font-bold disabled:opacity-30"
              style={{ background: "linear-gradient(135deg,#c084fc,#7c3aed)", color: "#fff" }}>
              {phase === "submitting" ? "Submitting…" : allAnswered ? "Submit Quiz" : `${answeredCount}/${questions.length} answered`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

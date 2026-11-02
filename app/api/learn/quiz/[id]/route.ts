/**
 * GET  /api/learn/quiz/[id] — quiz + questions for student (enrolled only)
 * POST /api/learn/quiz/[id] — submit attempt, returns score + correct answers
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const SESSION_OPTS = {
  password: process.env.ADMIN_SESSION_SECRET || "change-me-min-32-chars-long-secret!!",
  cookieName: "hipyhub_learn_session",
  cookieOptions: { secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 7 },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getStudent(): Promise<any | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getIronSession<any>(await cookies(), SESSION_OPTS);
  return session.studentId ? session : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getStudent();
  if (!sess) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();

  const { data: quiz, error } = await db
    .from("lms_quizzes")
    .select(`
      id, title, passing_score, course_id,
      lms_questions ( id, question, options, sort_order )
    `)
    .eq("id", id)
    .single();

  if (error || !quiz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify student is enrolled in the course
  const { data: enrollment } = await db
    .from("lms_enrollments")
    .select("id, payment_status")
    .eq("student_id", sess.studentId)
    .eq("course_id", quiz.course_id)
    .single();

  if (!enrollment || enrollment.payment_status === "pending_verification") {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  // Get student's previous best attempt
  const { data: best } = await db
    .from("lms_quiz_attempts")
    .select("id, score, passed, attempted_at")
    .eq("student_id", sess.studentId)
    .eq("quiz_id", id)
    .order("score", { ascending: false })
    .limit(1)
    .single();

  // Sort questions, strip correct_index from response
  const questions = [...(quiz.lms_questions ?? [])].sort((a, b) => a.sort_order - b.sort_order)
    .map(({ id, question, options, sort_order }) => ({ id, question, options, sort_order }));

  return NextResponse.json({ quiz: { id: quiz.id, title: quiz.title, passing_score: quiz.passing_score }, questions, best_attempt: best ?? null });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sess = await getStudent();
  if (!sess) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const db = supabaseAdmin();

  // answers: [{ question_id, chosen_index }]
  const { answers } = await req.json();
  if (!Array.isArray(answers)) return NextResponse.json({ error: "answers array required" }, { status: 400 });

  // Fetch quiz with correct answers
  const { data: quiz } = await db
    .from("lms_quizzes")
    .select("id, title, passing_score, course_id, lms_questions(id, correct_index, explanation, options, question)")
    .eq("id", id)
    .single();

  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  // Verify enrollment
  const { data: enrollment } = await db
    .from("lms_enrollments")
    .select("id, payment_status")
    .eq("student_id", sess.studentId)
    .eq("course_id", quiz.course_id)
    .single();

  if (!enrollment || enrollment.payment_status === "pending_verification") {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  // Score the attempt
  const questionMap = new Map((quiz.lms_questions ?? []).map(q => [q.id, q]));
  let correct = 0;
  const results = answers.map(({ question_id, chosen_index }: { question_id: string; chosen_index: number }) => {
    const q = questionMap.get(question_id);
    if (!q) return { question_id, chosen_index, correct_index: -1, is_correct: false, explanation: null };
    const is_correct = chosen_index === q.correct_index;
    if (is_correct) correct++;
    return { question_id, question: q.question, chosen_index, correct_index: q.correct_index, is_correct, explanation: q.explanation, options: q.options };
  });

  const total = questionMap.size;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = score >= quiz.passing_score;

  // Record attempt
  await db.from("lms_quiz_attempts").insert({
    student_id: sess.studentId,
    quiz_id: id,
    score,
    passed,
    answers,
  });

  return NextResponse.json({ score, passed, correct, total, passing_score: quiz.passing_score, results });
}

/**
 * POST /api/admin/lms/modules/[id]/quizzes — add quiz to module
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;

  const db = supabaseAdmin();
  const { data: mod } = await db.from("lms_modules").select("course_id").eq("id", params.id).single();
  if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const body = await req.json();
  const { data: quiz, error: quizErr } = await db
    .from("lms_quizzes")
    .insert({ module_id: params.id, course_id: mod.course_id, title: body.title, passing_score: body.passing_score ?? 70, sort_order: body.sort_order ?? 0 })
    .select()
    .single();
  if (quizErr) return NextResponse.json({ error: quizErr.message }, { status: 500 });

  // Insert questions if provided
  if (Array.isArray(body.questions) && body.questions.length > 0) {
    const rows = body.questions.map((q: { question: string; options: string[]; correct_index: number; explanation?: string }, i: number) => ({
      quiz_id: quiz.id,
      question: q.question,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation ?? null,
      sort_order: i,
    }));
    await db.from("lms_questions").insert(rows);
  }

  return NextResponse.json({ quiz }, { status: 201 });
}

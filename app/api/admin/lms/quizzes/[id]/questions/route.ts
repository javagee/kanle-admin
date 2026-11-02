/**
 * GET  /api/admin/lms/quizzes/[id]/questions — list questions for a quiz
 * POST /api/admin/lms/quizzes/[id]/questions — add a question
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("lms_questions")
    .select("id,question,options,correct_index,explanation,sort_order")
    .eq("quiz_id", id)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ questions: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const db = supabaseAdmin();
  const body = await req.json();

  if (!body.question || !Array.isArray(body.options) || body.options.length < 2) {
    return NextResponse.json({ error: "question and at least 2 options required" }, { status: 400 });
  }
  if (typeof body.correct_index !== "number" || body.correct_index < 0 || body.correct_index >= body.options.length) {
    return NextResponse.json({ error: "correct_index out of range" }, { status: 400 });
  }

  // Get current question count for sort_order
  const { count } = await db.from("lms_questions").select("*", { count: "exact", head: true }).eq("quiz_id", id);

  const { data, error } = await db
    .from("lms_questions")
    .insert({
      quiz_id:       id,
      question:      body.question,
      options:       body.options,
      correct_index: body.correct_index,
      explanation:   body.explanation ?? null,
      sort_order:    body.sort_order ?? (count ?? 0),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question: data }, { status: 201 });
}

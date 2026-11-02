/**
 * GET   /api/admin/lms/quizzes/[id] — quiz detail with questions
 * PATCH /api/admin/lms/quizzes/[id] — update quiz title / passing_score
 * DELETE /api/admin/lms/quizzes/[id] — delete quiz
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
    .from("lms_quizzes")
    .select(`
      id, title, passing_score, sort_order, course_id,
      lms_courses(id, title),
      lms_questions(id, question, options, correct_index, explanation, sort_order)
    `)
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ quiz: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const db = supabaseAdmin();
  const body = await req.json();

  const upd: Record<string, unknown> = {};
  if (body.title)                              upd.title         = body.title;
  if (typeof body.passing_score === "number")  upd.passing_score = body.passing_score;

  const { data, error } = await db.from("lms_quizzes").update(upd).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quiz: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const { error } = await supabaseAdmin().from("lms_quizzes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

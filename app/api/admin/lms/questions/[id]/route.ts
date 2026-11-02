/**
 * PATCH  /api/admin/lms/questions/[id] — update a question
 * DELETE /api/admin/lms/questions/[id] — delete a question
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const db = supabaseAdmin();
  const body = await req.json();

  const upd: Record<string, unknown> = {};
  if (body.question)       upd.question      = body.question;
  if (body.options)        upd.options       = body.options;
  if (typeof body.correct_index === "number") upd.correct_index = body.correct_index;
  if ("explanation" in body) upd.explanation = body.explanation;
  if (typeof body.sort_order === "number")    upd.sort_order    = body.sort_order;

  const { data, error } = await db.from("lms_questions").update(upd).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const { error } = await supabaseAdmin().from("lms_questions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

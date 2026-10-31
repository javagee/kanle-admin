/**
 * GET   /api/admin/lms/courses/[id] — course detail with modules+lessons+quizzes
 * PATCH /api/admin/lms/courses/[id] — update course
 * DELETE /api/admin/lms/courses/[id] — delete course
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

async function scopeCheck(db: ReturnType<typeof supabaseAdmin>, courseId: string, tenantId: string | null) {
  const q = db.from("lms_courses").select("id, tenant_id").eq("id", courseId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (tenantId ? q.eq("tenant_id", tenantId) : q).single() as any;
  return data;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();

  let q = db
    .from("lms_courses")
    .select(`
      *,
      lms_modules (
        id, title, description, sort_order,
        lms_lessons ( id, title, video_type, video_url, video_duration_min, is_preview, sort_order ),
        lms_quizzes ( id, title, passing_score, sort_order,
          lms_questions ( id, question, options, correct_index, explanation, sort_order )
        )
      )
    `)
    .eq("id", params.id)
    .order("sort_order", { referencedTable: "lms_modules", ascending: true });

  if (tenantId) q = q.eq("tenant_id", tenantId);

  const { data, error } = await q.single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ course: data });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  if (!(await scopeCheck(db, params.id, tenantId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const allowed = ["title","title_zh","description","thumbnail_url","category","level","language","price_sgd","is_published","is_featured"];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  const { error } = await db.from("lms_courses").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  if (!(await scopeCheck(db, params.id, tenantId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await db.from("lms_courses").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

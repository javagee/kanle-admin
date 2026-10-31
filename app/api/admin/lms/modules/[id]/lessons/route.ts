/**
 * POST /api/admin/lms/modules/[id]/lessons — add lesson to module
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
  const { data, error } = await db
    .from("lms_lessons")
    .insert({
      module_id:          params.id,
      course_id:          mod.course_id,
      title:              body.title,
      description:        body.description ?? null,
      video_type:         body.video_type ?? "youtube",
      video_url:          body.video_url ?? null,
      video_duration_min: body.video_duration_min ?? 0,
      is_preview:         body.is_preview ?? false,
      sort_order:         body.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update course lesson count
  await db.rpc("increment_course_lesson_count", { p_course_id: mod.course_id }).maybeSingle();

  return NextResponse.json({ lesson: data }, { status: 201 });
}

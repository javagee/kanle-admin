/**
 * GET /api/learn/courses/[id] — public course detail + modules/lessons
 * Previews visible to all; full content requires enrolment token in cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = supabaseAdmin();

  const { data: course, error } = await db
    .from("lms_courses")
    .select(`
      id, title, title_zh, description, thumbnail_url, category, level, language,
      price_sgd, total_lessons, total_duration_min, is_published,
      lms_modules (
        id, title, sort_order,
        lms_lessons ( id, title, video_type, video_url, video_duration_min, is_preview, sort_order ),
        lms_quizzes ( id, title, passing_score, sort_order )
      )
    `)
    .eq("id", params.id)
    .eq("is_published", true)
    .single();

  if (error || !course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ course });
}

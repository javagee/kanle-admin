/**
 * POST /api/learn/progress — mark lesson complete
 * GET  /api/learn/progress?course_id= — get progress for a course
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

async function getStudent() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getIronSession<any>(await cookies(), SESSION_OPTS);
  return session.studentId ? session : null;
}

export async function GET(req: NextRequest) {
  const sess = await getStudent();
  if (!sess) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("course_id");

  const db = supabaseAdmin();
  let q = db.from("lms_progress").select("lesson_id, completed_at").eq("student_id", sess.studentId);
  if (courseId) q = q.eq("course_id", courseId);

  const { data } = await q;
  return NextResponse.json({ completed_lessons: (data ?? []).map(r => r.lesson_id) });
}

export async function POST(req: NextRequest) {
  const sess = await getStudent();
  if (!sess) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { lesson_id, course_id } = await req.json();
  if (!lesson_id || !course_id) return NextResponse.json({ error: "lesson_id and course_id required" }, { status: 400 });

  const db = supabaseAdmin();

  // Upsert progress (ignore duplicate)
  await db.from("lms_progress")
    .upsert({ student_id: sess.studentId, lesson_id, course_id }, { onConflict: "student_id,lesson_id", ignoreDuplicates: true });

  // Check if course is complete
  const { count: totalLessons } = await db.from("lms_lessons").select("*", { count: "exact", head: true }).eq("course_id", course_id);
  const { count: doneLessons }  = await db.from("lms_progress").select("*", { count: "exact", head: true })
    .eq("student_id", sess.studentId).eq("course_id", course_id);

  const courseComplete = totalLessons && doneLessons && doneLessons >= totalLessons;

  if (courseComplete) {
    // Mark enrollment complete
    await db.from("lms_enrollments")
      .update({ completed_at: new Date().toISOString() })
      .eq("student_id", sess.studentId).eq("course_id", course_id).is("completed_at", null);
    // Issue certificate if not already issued
    const { data: existingCert } = await db.from("lms_certificates")
      .select("id").eq("student_id", sess.studentId).eq("course_id", course_id).single();
    if (!existingCert) {
      const { data: course } = await db.from("lms_courses").select("tenant_id").eq("id", course_id).single();
      await db.from("lms_certificates").insert({
        student_id: sess.studentId, course_id, tenant_id: course?.tenant_id,
      });
    }
  }

  return NextResponse.json({ ok: true, course_complete: !!courseComplete });
}

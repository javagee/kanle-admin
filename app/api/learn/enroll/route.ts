/**
 * POST /api/learn/enroll — enrol student in a course (free or initiate payment)
 * GET  /api/learn/enroll — list student's enrolled courses
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

export async function GET() {
  const sess = await getStudent();
  if (!sess) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("lms_enrollments")
    .select("id, course_id, payment_status, enrolled_at, completed_at, lms_courses(id, title, thumbnail_url, total_lessons)")
    .eq("student_id", sess.studentId)
    .order("enrolled_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enrollments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sess = await getStudent();
  if (!sess) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const db = supabaseAdmin();
  const { course_id } = await req.json();
  if (!course_id) return NextResponse.json({ error: "course_id required" }, { status: 400 });

  const { data: course } = await db.from("lms_courses").select("id, price_sgd, tenant_id").eq("id", course_id).single();
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // Check existing enrolment
  const { data: existing } = await db.from("lms_enrollments")
    .select("id, payment_status").eq("student_id", sess.studentId).eq("course_id", course_id).single();
  if (existing) return NextResponse.json({ enrollment: existing, already_enrolled: true });

  const isFree = !course.price_sgd || Number(course.price_sgd) === 0;

  const { data: enrollment, error } = await db
    .from("lms_enrollments")
    .insert({
      student_id:     sess.studentId,
      course_id,
      tenant_id:      course.tenant_id,
      payment_status: isFree ? "free" : "pending_verification",
      amount_paid_sgd: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ enrollment, requires_payment: !isFree, price_sgd: course.price_sgd });
}

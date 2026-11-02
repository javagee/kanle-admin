/**
 * GET  /api/admin/lms/students/[id] — student detail with progress
 * PATCH /api/admin/lms/students/[id] — toggle is_active
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;
  const { id } = await params;

  const db = supabaseAdmin();

  const studentQ = db.from("lms_students").select("id,name,email,phone,is_active,created_at").eq("id", id);
  if (tenantId) studentQ.eq("tenant_id", tenantId);
  const { data: student, error: se } = await studentQ.single();
  if (se || !student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: enrollments } = await db
    .from("lms_enrollments")
    .select("id,course_id,payment_status,payment_ref,amount_paid_sgd,enrolled_at,completed_at,lms_courses(id,title,price_sgd,total_lessons)")
    .eq("student_id", id)
    .order("enrolled_at", { ascending: false });

  const { data: certs } = await db
    .from("lms_certificates")
    .select("id,course_id,issued_at")
    .eq("student_id", id);

  const { data: progress } = await db
    .from("lms_progress")
    .select("lesson_id,course_id,completed_at")
    .eq("student_id", id);

  return NextResponse.json({ student, enrollments: enrollments ?? [], certificates: certs ?? [], progress: progress ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;
  const { id } = await params;

  const db = supabaseAdmin();
  const body = await req.json();

  const upd: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") upd.is_active = body.is_active;

  const q = db.from("lms_students").update(upd).eq("id", id);
  if (tenantId) q.eq("tenant_id", tenantId);
  const { data, error } = await q.select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ student: data });
}

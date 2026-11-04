/**
 * PATCH /api/admin/lms/enrollments/[id] — verify payment (pending_verification → paid)
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";
import { emailPaymentVerified } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;
  const { id } = await params;

  const db = supabaseAdmin();
  const body = await req.json();

  const allowed = ["free", "pending_verification", "paid"] as const;
  if (!allowed.includes(body.payment_status)) {
    return NextResponse.json({ error: "Invalid payment_status" }, { status: 400 });
  }

  const q = db
    .from("lms_enrollments")
    .update({ payment_status: body.payment_status, payment_ref: body.payment_ref ?? undefined })
    .eq("id", id);
  if (tenantId) q.eq("tenant_id", tenantId);

  const { data, error } = await q.select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send payment-verified email when status set to paid
  if (body.payment_status === "paid") {
    const { data: detail } = await db
      .from("lms_enrollments")
      .select("course_id, lms_students(name, email), lms_courses(id, title, tenant_id), tenants(slug)")
      .eq("id", id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student = (Array.isArray(detail?.lms_students) ? detail.lms_students[0] : detail?.lms_students) as { name: string; email: string } | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const course  = (Array.isArray(detail?.lms_courses)  ? detail.lms_courses[0]  : detail?.lms_courses)  as { id: string; title: string; tenant_id: string } | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenant  = (Array.isArray(detail?.tenants)       ? detail.tenants[0]       : detail?.tenants)       as { slug: string } | null;

    if (student && course && tenant) {
      emailPaymentVerified(student.email, student.name, course.title, tenant.slug, course.id).catch(() => {});
    }
  }

  return NextResponse.json({ enrollment: data });
}

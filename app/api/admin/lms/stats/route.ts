/**
 * GET /api/admin/lms/stats — enrollment/revenue/completion aggregates for tenant
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();

  // Fetch all enrollments for this tenant (or all tenants for super_admin)
  let q = db
    .from("lms_enrollments")
    .select("id, course_id, student_id, payment_status, amount_paid_sgd, completed_at");

  if (tenantId) q = q.eq("tenant_id", tenantId);

  const { data: enrollments, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = enrollments ?? [];

  // Summary aggregates
  const uniqueStudents = new Set(rows.map(r => r.student_id)).size;
  const totalEnrollments = rows.length;
  const totalCompletions = rows.filter(r => !!r.completed_at).length;
  const totalRevenue = rows
    .filter(r => r.payment_status === "paid")
    .reduce((sum, r) => sum + (Number(r.amount_paid_sgd) || 0), 0);
  const pendingPayments = rows.filter(r => r.payment_status === "pending_verification").length;

  // Per-course breakdown
  const byCourse: Record<string, {
    enrollments: number;
    completions: number;
    revenue_sgd: number;
    pending: number;
  }> = {};

  for (const r of rows) {
    if (!byCourse[r.course_id]) {
      byCourse[r.course_id] = { enrollments: 0, completions: 0, revenue_sgd: 0, pending: 0 };
    }
    const c = byCourse[r.course_id];
    c.enrollments++;
    if (r.completed_at) c.completions++;
    if (r.payment_status === "paid") c.revenue_sgd += Number(r.amount_paid_sgd) || 0;
    if (r.payment_status === "pending_verification") c.pending++;
  }

  return NextResponse.json({
    summary: {
      total_students: uniqueStudents,
      total_enrollments: totalEnrollments,
      total_completions: totalCompletions,
      total_revenue_sgd: totalRevenue,
      pending_payments: pendingPayments,
    },
    by_course: byCourse,
  });
}

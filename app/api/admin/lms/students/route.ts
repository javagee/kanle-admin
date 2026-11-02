/**
 * GET /api/admin/lms/students — list students with enrollment summary
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
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  let q = db
    .from("lms_students")
    .select(`
      id, name, email, phone, is_active, created_at,
      lms_enrollments(
        id, course_id, payment_status, enrolled_at, completed_at,
        lms_courses(id, title, price_sgd)
      )
    `)
    .order("created_at", { ascending: false });

  if (tenantId) q = q.eq("tenant_id", tenantId);
  if (search)   q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ students: data ?? [] });
}

/**
 * PATCH /api/admin/lms/enrollments/[id] — verify payment (pending_verification → paid)
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

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

  return NextResponse.json({ enrollment: data });
}

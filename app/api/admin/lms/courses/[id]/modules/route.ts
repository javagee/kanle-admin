/**
 * POST /api/admin/lms/courses/[id]/modules — add a module
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();

  // Scope check
  const scopeQ = db.from("lms_courses").select("id").eq("id", params.id);
  const { data: course } = await (tenantId ? scopeQ.eq("tenant_id", tenantId) : scopeQ).single();
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { data, error } = await db
    .from("lms_modules")
    .insert({ course_id: params.id, title: body.title, description: body.description ?? null, sort_order: body.sort_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ module: data }, { status: 201 });
}

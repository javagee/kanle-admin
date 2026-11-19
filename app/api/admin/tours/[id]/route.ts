import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const ALLOWED = [
  "name", "name_zh", "destination", "duration_days", "duration_nights",
  "price_adult_sgd", "price_child_sgd", "max_pax", "departure_days",
  "inclusions", "exclusions", "active", "ar_preview_url",
];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { session } = auth;
  if (!["super_admin", "tenant_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ALLOWED) {
    if (body[k] !== undefined) patch[k] = body[k];
  }

  const db = supabaseAdmin();
  let q = db.from("tour_packages").update(patch).eq("id", params.id);
  if (session.role !== "super_admin") q = q.eq("tenant_id", session.tenantId!);

  const { data, error } = await q.select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ package: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { session } = auth;
  if (!["super_admin", "tenant_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  let q = db
    .from("tour_packages")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (session.role !== "super_admin") q = q.eq("tenant_id", session.tenantId!);

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  if (auth.session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    if (!["active", "suspended"].includes(body.status)) {
      return NextResponse.json({ error: "status must be active or suspended" }, { status: 400 });
    }
    patch.status = body.status;
  }

  if (body.name)  patch.name  = body.name;
  if (body.email) patch.email = body.email.toLowerCase().trim();

  if (body.password) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    patch.hashed_password = await bcrypt.hash(body.password, 12);
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("admin_users")
    .update(patch)
    .eq("id", params.id)
    .select("id, email, name, role, tenant_id, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  if (auth.session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Guard: never delete the super_admin calling this
  const auth2 = auth as { session: { userId?: string } };
  if (auth2.session.userId === params.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("admin_users").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

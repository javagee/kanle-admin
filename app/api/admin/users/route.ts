import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  if (auth.session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenant_id");

  let q = db
    .from("admin_users")
    .select("id, email, name, role, tenant_id, vendor_id, status, last_login_at, created_at, tenants(name,slug)")
    .order("created_at", { ascending: false });

  if (tenantId) q = q.eq("tenant_id", tenantId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  if (auth.session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { email, name, role, tenant_id, vendor_id, password } = body;

  if (!email || !name || !role || !password) {
    return NextResponse.json({ error: "email, name, role, and password are required" }, { status: 400 });
  }

  const VALID_ROLES = ["super_admin", "tenant_admin", "school_operator", "vendor_admin"];
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const hashed_password = await bcrypt.hash(password, 12);

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("admin_users")
    .insert({
      email:           email.toLowerCase().trim(),
      name,
      role,
      tenant_id:       tenant_id || null,
      vendor_id:       vendor_id || null,
      hashed_password,
      status:          "active",
    })
    .select("id, email, name, role, tenant_id, vendor_id, status, created_at")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data }, { status: 201 });
}

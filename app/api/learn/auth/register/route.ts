/**
 * POST /api/learn/auth/register — student self-registration
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import * as bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { name, email, password, phone, tenant_slug } = await req.json();
  if (!name || !email || !password) return NextResponse.json({ error: "name, email, password required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const db = supabaseAdmin();

  // Resolve tenant
  let tenantId: string | null = null;
  if (tenant_slug) {
    const { data: t } = await db.from("tenants").select("id").eq("slug", tenant_slug).single();
    tenantId = t?.id ?? null;
  }
  if (!tenantId) return NextResponse.json({ error: "Invalid school" }, { status: 400 });

  const hash = await bcrypt.hash(password, 12);

  const { data, error } = await db
    .from("lms_students")
    .insert({ tenant_id: tenantId, name, email: email.toLowerCase(), password_hash: hash, phone: phone ?? null })
    .select("id, name, email")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, student: data }, { status: 201 });
}

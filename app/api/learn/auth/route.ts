/**
 * POST /api/learn/auth   — student login (email + password)
 * DELETE /api/learn/auth — logout
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import * as bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const SESSION_OPTS = {
  password: process.env.ADMIN_SESSION_SECRET || "change-me-min-32-chars-long-secret!!",
  cookieName: "hipyhub_learn_session",
  cookieOptions: { secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 7 },
};

export async function POST(req: NextRequest) {
  const { email, password, tenant_slug } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "email and password required" }, { status: 400 });

  const db = supabaseAdmin();

  // Resolve tenant
  let tenantId: string | null = null;
  if (tenant_slug) {
    const { data: t } = await db.from("tenants").select("id").eq("slug", tenant_slug).single();
    tenantId = t?.id ?? null;
  }

  let q = db.from("lms_students").select("id, name, email, password_hash, tenant_id, is_active").eq("email", email.toLowerCase());
  if (tenantId) q = q.eq("tenant_id", tenantId);

  const { data: student } = await q.single();
  if (!student || !student.is_active) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const valid = await bcrypt.compare(password, student.password_hash);
  if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getIronSession<any>(await cookies(), SESSION_OPTS);
  session.studentId  = student.id;
  session.studentName = student.name;
  session.tenantId   = student.tenant_id;
  await session.save();

  return NextResponse.json({ ok: true, student: { id: student.id, name: student.name, email: student.email } });
}

export async function DELETE() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getIronSession<any>(await cookies(), SESSION_OPTS);
  session.destroy();
  return NextResponse.json({ ok: true });
}

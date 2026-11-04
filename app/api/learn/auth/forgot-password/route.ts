/**
 * POST /api/learn/auth/forgot-password
 * Generates a reset token and emails the student a reset link.
 * Always returns 200 so email enumeration is not possible.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { randomBytes } from "crypto";
import { emailPasswordReset } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email, tenant_slug } = await req.json();
  if (!email || !tenant_slug) {
    return NextResponse.json({ ok: true }); // silent
  }

  const db = supabaseAdmin();

  // Resolve tenant
  const { data: tenant } = await db
    .from("tenants")
    .select("id")
    .eq("slug", tenant_slug)
    .single();

  if (!tenant) return NextResponse.json({ ok: true });

  // Find student
  const { data: student } = await db
    .from("lms_students")
    .select("id, name, email")
    .eq("email", email.toLowerCase())
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .single();

  if (!student) return NextResponse.json({ ok: true });

  // Generate token — 32 random bytes as hex
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await db
    .from("lms_students")
    .update({ reset_token: token, reset_token_expires_at: expires })
    .eq("id", student.id);

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/learn/${tenant_slug}/reset-password?token=${token}`;
  emailPasswordReset(student.email, student.name, resetUrl).catch(() => {});

  return NextResponse.json({ ok: true });
}

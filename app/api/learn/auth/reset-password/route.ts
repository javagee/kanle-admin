/**
 * POST /api/learn/auth/reset-password
 * Validates the reset token and updates the student's password.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import * as bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: "token and password required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Find student with matching token that hasn't expired
  const { data: student } = await db
    .from("lms_students")
    .select("id")
    .eq("reset_token", token)
    .gt("reset_token_expires_at", new Date().toISOString())
    .single();

  if (!student) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);

  await db
    .from("lms_students")
    .update({ password_hash: hash, reset_token: null, reset_token_expires_at: null })
    .eq("id", student.id);

  return NextResponse.json({ ok: true });
}

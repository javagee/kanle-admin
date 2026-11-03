/**
 * POST /api/learn/enrollments/[id]/proof
 * Student uploads payment proof image. Stores in Supabase Storage, saves URL on enrollment.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const SESSION_OPTS = {
  password: process.env.ADMIN_SESSION_SECRET || "change-me-min-32-chars-long-secret!!",
  cookieName: "hipyhub_learn_session",
  cookieOptions: { secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 7 },
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getIronSession<any>(await cookies(), SESSION_OPTS);
  if (!session.studentId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id: enrollmentId } = await params;
  const db = supabaseAdmin();

  // Verify enrollment belongs to this student
  const { data: enrollment } = await db
    .from("lms_enrollments")
    .select("id, payment_status, student_id")
    .eq("id", enrollmentId)
    .eq("student_id", session.studentId)
    .single();

  if (!enrollment) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  if (enrollment.payment_status === "paid") {
    return NextResponse.json({ error: "Payment already verified" }, { status: 409 });
  }

  // Parse multipart form
  const formData = await req.formData();
  const file = formData.get("proof") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const allowed = ["jpg", "jpeg", "png", "webp", "pdf"];
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: "Unsupported file type (jpg/png/webp/pdf)" }, { status: 415 });
  }

  const buffer    = Buffer.from(await file.arrayBuffer());
  const storagePath = `${enrollmentId}/${Date.now()}.${ext}`;

  // Ensure bucket exists (idempotent)
  await db.storage.createBucket("payment-proofs", { public: true }).catch(() => {});

  const { error: uploadErr } = await db.storage
    .from("payment-proofs")
    .upload(storagePath, buffer, { contentType: file.type, upsert: true });

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: { publicUrl } } = db.storage.from("payment-proofs").getPublicUrl(storagePath);

  // Save URL and bump status to pending_verification if it was free (shouldn't happen but guard)
  const newStatus = enrollment.payment_status === "free" ? "pending_verification" : enrollment.payment_status;
  const { data: updated, error: updateErr } = await db
    .from("lms_enrollments")
    .update({ payment_proof_url: publicUrl, payment_status: newStatus })
    .eq("id", enrollmentId)
    .select("id, payment_status, payment_proof_url")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ enrollment: updated, proof_url: publicUrl });
}

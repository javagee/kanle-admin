/**
 * GET /api/learn/certificates — list certificates for the logged-in student
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const SESSION_OPTS = {
  password: process.env.ADMIN_SESSION_SECRET || "change-me-min-32-chars-long-secret!!",
  cookieName: "hipyhub_learn_session",
  cookieOptions: { secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 7 },
};

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getIronSession<any>(await cookies(), SESSION_OPTS);
  if (!session.studentId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("lms_certificates")
    .select(`
      id, issued_at, cert_url,
      lms_courses ( id, title, title_zh, thumbnail_url, category, level, total_lessons, total_duration_min ),
      lms_students ( id, name )
    `)
    .eq("student_id", session.studentId)
    .order("issued_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ certificates: data ?? [] });
}

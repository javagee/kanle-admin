/**
 * GET /api/learn/certificates/[id] — public certificate detail (shareable)
 * No auth required — anyone with the ID can view.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin()
    .from("lms_certificates")
    .select(`
      id, issued_at,
      lms_courses ( id, title, title_zh, thumbnail_url, category, level, total_lessons, total_duration_min ),
      lms_students ( id, name ),
      tenants ( name, slug )
    `)
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  return NextResponse.json({ certificate: data });
}

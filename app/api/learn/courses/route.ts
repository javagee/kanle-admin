/**
 * GET /api/learn/courses — public course catalogue
 * Query: tenant_slug, category, search, level
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const tenantSlug = searchParams.get("tenant");
  const category   = searchParams.get("category");
  const search     = searchParams.get("search");
  const level      = searchParams.get("level");

  // Resolve tenant slug → id
  let tenantId: string | null = null;
  if (tenantSlug) {
    const { data: t } = await db.from("tenants").select("id").eq("slug", tenantSlug).single();
    tenantId = t?.id ?? null;
  }

  let q = db
    .from("lms_courses")
    .select("id, title, title_zh, description, thumbnail_url, category, level, language, price_sgd, total_lessons, total_duration_min, is_featured")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (tenantId) q = q.eq("tenant_id", tenantId);
  if (category)  q = q.eq("category", category);
  if (level)     q = q.eq("level", level);
  if (search)    q = q.ilike("title", `%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ courses: data ?? [] });
}

/**
 * GET  /api/admin/lms/courses — list courses for current tenant
 * POST /api/admin/lms/courses — create a course
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const search     = searchParams.get("search");
  const category   = searchParams.get("category");
  const published  = searchParams.get("published");

  let q = db
    .from("lms_courses")
    .select("id, title, title_zh, description, thumbnail_url, category, level, language, price_sgd, is_published, is_featured, total_lessons, total_duration_min, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (tenantId) q = q.eq("tenant_id", tenantId);
  if (search)   q = q.ilike("title", `%${search}%`);
  if (category) q = q.eq("category", category);
  if (published === "true")  q = q.eq("is_published", true);
  if (published === "false") q = q.eq("is_published", false);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ courses: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId, session } = auth;

  if (!tenantId) return NextResponse.json({ error: "tenant required" }, { status: 400 });

  const db = supabaseAdmin();
  const body = await req.json();

  const { data, error } = await db
    .from("lms_courses")
    .insert({
      tenant_id:    tenantId,
      title:        body.title,
      title_zh:     body.title_zh ?? null,
      description:  body.description ?? null,
      thumbnail_url: body.thumbnail_url ?? null,
      category:     body.category ?? null,
      level:        body.level ?? "beginner",
      language:     body.language ?? "en",
      price_sgd:    body.price_sgd ?? 0,
      is_published: body.is_published ?? false,
      is_featured:  body.is_featured ?? false,
      created_by:   session.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ course: data }, { status: 201 });
}

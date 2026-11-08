/**
 * GET  /api/admin/worksheets  — list worksheets (tenant-scoped)
 * POST /api/admin/worksheets  — create worksheet record
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
  const subject     = searchParams.get("subject");
  const grade       = searchParams.get("grade_level");
  const activeOnly  = searchParams.get("active") !== "false";

  let q = db.from("worksheets")
    .select("id, tenant_id, title, title_zh, subject, grade_level, curriculum, language, description, page_count, file_url, preview_url, price_single_sgd, price_class_sgd, price_school_sgd, active, tags, created_at")
    .order("created_at", { ascending: false });

  if (tenantId)   q = q.eq("tenant_id", tenantId);
  if (subject)    q = q.eq("subject", subject);
  if (grade)      q = q.eq("grade_level", grade);
  if (activeOnly) q = q.eq("active", true);

  // paginate to bypass Supabase max-rows limit
  const all: Record<string, unknown>[] = [];
  let from = 0;
  const pageSize = 10;
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await q.range(from, from + pageSize - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return NextResponse.json({ worksheets: all, total: all.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db   = supabaseAdmin();
  const body = await req.json();

  const record = {
    tenant_id:         tenantId ?? body.tenant_id ?? null,
    title:             body.title,
    title_zh:          body.title_zh ?? null,
    subject:           body.subject,
    grade_level:       body.grade_level,
    curriculum:        body.curriculum ?? "MOE-SG",
    language:          body.language ?? "EN",
    description:       body.description ?? null,
    page_count:        body.page_count ? Number(body.page_count) : null,
    file_url:          body.file_url ?? null,
    preview_url:       body.preview_url ?? null,
    price_single_sgd:  Number(body.price_single_sgd ?? 2.90),
    price_class_sgd:   body.price_class_sgd ? Number(body.price_class_sgd) : null,
    price_school_sgd:  body.price_school_sgd ? Number(body.price_school_sgd) : null,
    tags:              body.tags ?? [],
    active:            true,
  };

  const { data, error } = await db.from("worksheets").insert(record).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ worksheet: data });
}

/**
 * GET  /api/admin/products        — list vendor_products (vendor_admin scoped by vendor_id)
 * POST /api/admin/products        — create a product
 * PATCH /api/admin/products       — update a product
 * DELETE /api/admin/products?id=  — soft-delete (active=false)
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId, session } = auth;
  const vendorId = session.vendorId ?? null;

  const db = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const active   = searchParams.get("active");
  const category = searchParams.get("category");
  const limit    = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const offset   = (page - 1) * limit;

  let q = db
    .from("vendor_products")
    .select(`
      id, sku, name, name_zh, description, category, tags,
      price_sgd, price_unit, min_qty, max_qty, stock_qty,
      image_urls, location, active, featured,
      created_at, updated_at,
      vendors ( id, name )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (tenantId) q = q.eq("tenant_id", tenantId);
  if (vendorId) q = q.eq("vendor_id", vendorId);
  if (active !== null && active !== "all") q = q.eq("active", active === "true");
  if (category && category !== "all") q = q.eq("category", category);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ products: data ?? [], total: count ?? 0, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId, session } = auth;
  const vendorId = session.vendorId ?? null;

  const db = supabaseAdmin();
  const body = await req.json();

  if (!body.name || !body.price_sgd) {
    return NextResponse.json({ error: "name and price_sgd required" }, { status: 400 });
  }

  const insert: Record<string, unknown> = {
    tenant_id:   tenantId,
    vendor_id:   vendorId ?? body.vendor_id,
    name:        body.name,
    name_zh:     body.name_zh ?? null,
    description: body.description ?? null,
    category:    body.category ?? null,
    tags:        body.tags ?? [],
    price_sgd:   body.price_sgd,
    price_unit:  body.price_unit ?? "per_item",
    min_qty:     body.min_qty ?? 1,
    max_qty:     body.max_qty ?? null,
    stock_qty:   body.stock_qty ?? null,
    image_urls:  body.image_urls ?? [],
    location:    body.location ?? null,
    active:      body.active ?? true,
    featured:    body.featured ?? false,
    sku:         body.sku ?? null,
  };

  const { data, error } = await db.from("vendor_products").insert(insert).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId, session } = auth;
  const vendorId = session.vendorId ?? null;

  const db = supabaseAdmin();
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const allowed = ["name","name_zh","description","category","tags","price_sgd","price_unit",
    "min_qty","max_qty","stock_qty","image_urls","location","active","featured","sku"];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (body[k] !== undefined) update[k] = body[k];
  }

  let q = db.from("vendor_products").update(update).eq("id", body.id);
  if (tenantId) q = q.eq("tenant_id", tenantId);
  if (vendorId) q = q.eq("vendor_id", vendorId);

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId, session } = auth;
  const vendorId = session.vendorId ?? null;

  const db = supabaseAdmin();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  let q = db.from("vendor_products").update({ active: false, updated_at: new Date().toISOString() }).eq("id", id);
  if (tenantId) q = q.eq("tenant_id", tenantId);
  if (vendorId) q = q.eq("vendor_id", vendorId);

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

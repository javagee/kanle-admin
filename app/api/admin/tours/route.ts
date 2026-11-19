import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { session } = auth;

  const db = supabaseAdmin();
  let q = db
    .from("tour_packages")
    .select("id,package_code,name,name_zh,destination,duration_days,duration_nights,price_adult_sgd,price_child_sgd,max_pax,departure_days,inclusions,exclusions,ar_preview_url,active,created_at")
    .order("active", { ascending: false })
    .order("created_at", { ascending: false });

  if (session.role !== "super_admin") {
    if (!session.tenantId) return NextResponse.json({ packages: [] });
    q = q.eq("tenant_id", session.tenantId);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ packages: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { session } = auth;
  if (!["super_admin", "tenant_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.name || !body.package_code || !body.destination) {
    return NextResponse.json({ error: "name, package_code and destination are required" }, { status: 400 });
  }

  const tenantId = session.role === "super_admin" ? (body.tenant_id ?? null) : session.tenantId;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("tour_packages")
    .insert({
      tenant_id:       tenantId,
      package_code:    body.package_code,
      name:            body.name,
      name_zh:         body.name_zh || null,
      destination:     body.destination,
      duration_days:   Number(body.duration_days) || 1,
      duration_nights: Number(body.duration_nights) || 0,
      price_adult_sgd: Number(body.price_adult_sgd) || 0,
      price_child_sgd: Number(body.price_child_sgd) || 0,
      max_pax:         Number(body.max_pax) || 40,
      departure_days:  body.departure_days ?? [],
      inclusions:      body.inclusions ?? [],
      exclusions:      body.exclusions ?? [],
      ar_preview_url:  body.ar_preview_url || null,
      active:          body.active !== false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ package: data }, { status: 201 });
}

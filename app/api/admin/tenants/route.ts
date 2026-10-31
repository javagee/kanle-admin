import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  if (auth.session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenants: data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  if (auth.session.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const body = await req.json();

  if (!body.name || !body.slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("tenants")
    .insert({
      name:                body.name,
      name_zh:             body.name_zh || null,
      slug:                body.slug,
      whatsapp_number_id:  body.whatsapp_number_id || null,
      ai_persona_name:     body.ai_persona_name || "Serena",
      ai_persona_name_zh:  body.ai_persona_name_zh || "思琳娜",
      plan:                body.plan || "starter",
      monthly_fee_sgd:     Number(body.monthly_fee_sgd) || 299,
      platform_fee_pct:    Number(body.platform_fee_pct) || 15,
      agent_fee_pct:       Number(body.agent_fee_pct) || 15,
      primary_color:       body.primary_color || "#25D366",
      active:              true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ tenant: data }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = supabaseAdmin();
  const body = await req.json();

  const allowed = [
    "name", "name_zh", "slug", "whatsapp_number_id", "whatsapp_token",
    "ai_persona_name", "ai_persona_name_zh", "ai_system_prompt",
    "plan", "monthly_fee_sgd", "platform_fee_pct", "agent_fee_pct",
    "primary_color", "logo_url", "active", "plan_expires_at",
  ];
  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );
  patch.updated_at = new Date().toISOString();

  const { data, error } = await db
    .from("tenants")
    .update(patch)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ tenant: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = supabaseAdmin();
  // Soft delete — set active=false rather than destroying data
  const { error } = await db
    .from("tenants")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

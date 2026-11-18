/**
 * GET   /api/admin/settings  — fetch current tenant config
 * PATCH /api/admin/settings  — update current tenant config
 *
 * super_admin: must pass ?tenant_id=<uuid> (edits any tenant)
 * tenant_admin / vendor_admin: scoped to their own tenantId
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function resolveTenantId(session: { role: string; tenantId: string | null }, override: string | null): string | null {
  if (session.role === "super_admin") return override ?? null;
  return session.tenantId ?? null;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { session } = auth;
  const override = new URL(req.url).searchParams.get("tenant_id");
  const tenantId = resolveTenantId(session, override);

  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("tenants")
    .select(`
      id, slug, name, name_zh,
      whatsapp_number_id,
      ai_persona_name, ai_persona_name_zh, ai_system_prompt,
      logo_url, primary_color, plan,
      monthly_fee_sgd, platform_fee_pct, agent_fee_pct,
      active, metadata, created_at, updated_at
    `)
    .eq("id", tenantId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenant: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { session } = auth;
  const body = await req.json();
  const tenantId = resolveTenantId(session, body.tenant_id ?? null);

  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const allowed = [
    "name", "name_zh", "logo_url", "primary_color",
    "ai_persona_name", "ai_persona_name_zh", "ai_system_prompt",
    "whatsapp_number_id",
    // finance — super_admin only
    ...(session.role === "super_admin" ? ["platform_fee_pct","agent_fee_pct","monthly_fee_sgd","plan","active"] : []),
  ];

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (body[k] !== undefined) update[k] = body[k];
  }

  const db = supabaseAdmin();

  // Merge booking/notifications into existing metadata without overwriting other keys (e.g. tenant_type, features)
  if (body.booking !== undefined || body.notifications !== undefined) {
    const { data: cur } = await db.from("tenants").select("metadata").eq("id", tenantId).single();
    const curMeta = (cur?.metadata as Record<string, unknown>) ?? {};
    update.metadata = {
      ...curMeta,
      ...(body.booking       !== undefined ? { booking:       body.booking }       : {}),
      ...(body.notifications !== undefined ? { notifications: body.notifications } : {}),
    };
  }

  const { error } = await db.from("tenants").update(update).eq("id", tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

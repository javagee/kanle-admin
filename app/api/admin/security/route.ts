/**
 * GET /api/admin/security — security log events (super_admin only)
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
  const severity  = searchParams.get("severity");
  const event     = searchParams.get("event_type");
  const limit     = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);

  let q = db
    .from("security_log")
    .select("id, event_type, severity, phone_hash, detail, tenant_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  // tenant_admin sees only their tenant's events; super_admin sees all
  if (tenantId) q = q.eq("tenant_id", tenantId);
  if (severity && severity !== "all") q = q.eq("severity", severity);
  if (event    && event    !== "all") q = q.eq("event_type", event);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const counts = {
    high:   rows.filter(r => r.severity === "high").length,
    medium: rows.filter(r => r.severity === "medium").length,
    low:    rows.filter(r => r.severity === "low").length,
  };

  return NextResponse.json({ events: rows, counts, total: rows.length });
}

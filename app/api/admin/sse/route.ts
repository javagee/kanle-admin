/**
 * GET  /api/admin/sse   — list SSE members (tenant-scoped)
 * POST /api/admin/sse   — manually enroll a member
 * PATCH /api/admin/sse  — update tier, voucher balance, or active status
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
  const search = searchParams.get("search");
  const tier   = searchParams.get("tier");
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "100"), 200);

  let q = db
    .from("sse_members")
    .select(`
      id, membership_no, name, phone, email, tier,
      save_pct, earn_rate, earn_multiplier,
      total_spend_sgd, total_saved_sgd, total_earned_sgd,
      voucher_balance_sgd, referral_code, referral_count,
      active, joined_at, created_at,
      customers ( id, phone_number, display_name )
    `)
    .order("total_spend_sgd", { ascending: false })
    .limit(limit);

  if (tenantId) q = q.eq("tenant_id", tenantId);
  if (tier && tier !== "all") q = q.eq("tier", tier);
  if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,membership_no.ilike.%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Summary stats
  const members = data ?? [];
  const active  = members.filter(m => m.active);
  const totalVoucherBalance = active.reduce((s, m) => s + (Number(m.voucher_balance_sgd) || 0), 0);
  const totalSpend          = active.reduce((s, m) => s + (Number(m.total_spend_sgd) || 0), 0);

  return NextResponse.json({
    members,
    stats: {
      total:                 members.length,
      active:                active.length,
      total_voucher_balance: Math.round(totalVoucherBalance * 100) / 100,
      total_spend_sgd:       Math.round(totalSpend * 100) / 100,
      by_tier: {
        bronze:   members.filter(m => m.tier === "bronze").length,
        silver:   members.filter(m => m.tier === "silver").length,
        gold:     members.filter(m => m.tier === "gold").length,
        platinum: members.filter(m => m.tier === "platinum").length,
      },
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  const body = await req.json();

  if (!body.name || !body.phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }

  const memberNo = "SSE-" + Date.now().toString(36).toUpperCase().slice(-6);

  const { data, error } = await db.from("sse_members").insert({
    tenant_id:          tenantId,
    name:               body.name,
    phone:              body.phone,
    email:              body.email || null,
    membership_no:      memberNo,
    tier:               body.tier || "bronze",
    save_pct:           Number(body.save_pct) || 5,
    earn_rate:          Number(body.earn_rate) || 1,
    voucher_balance_sgd: Number(body.voucher_balance_sgd) || 0,
    active:             true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ member: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const allowed = ["tier", "voucher_balance_sgd", "active", "save_pct", "earn_rate", "earn_multiplier", "name", "email"];
  const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)));
  patch.updated_at = new Date().toISOString();

  let q = db.from("sse_members").update(patch).eq("id", id);
  if (tenantId) q = q.eq("tenant_id", tenantId);

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

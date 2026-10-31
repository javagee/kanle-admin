/**
 * GET  /api/admin/sse/vouchers — members with voucher balance > 0 + full list
 * POST /api/admin/sse/vouchers — issue/adjust voucher balance for a member
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

  let q = db
    .from("sse_members")
    .select("id, membership_no, name, phone, tier, voucher_balance_sgd, total_spend_sgd, active, joined_at")
    .eq("active", true)
    .order("voucher_balance_sgd", { ascending: false })
    .limit(200);

  if (tenantId) q = q.eq("tenant_id", tenantId);
  if (search)   q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,membership_no.ilike.%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const members = data ?? [];
  const totalPool = members.reduce((s, m) => s + Number(m.voucher_balance_sgd ?? 0), 0);

  return NextResponse.json({
    members,
    stats: {
      total_pool_sgd:   Math.round(totalPool * 100) / 100,
      members_with_balance: members.filter(m => Number(m.voucher_balance_sgd) > 0).length,
      total_members:    members.length,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  const body = await req.json();
  const { member_id, amount, mode, note } = body as {
    member_id: string;
    amount: number;
    mode: "set" | "add" | "deduct";
    note?: string;
  };

  if (!member_id || amount == null) {
    return NextResponse.json({ error: "member_id and amount required" }, { status: 400 });
  }

  // Fetch current balance
  let fetchQ = db.from("sse_members").select("id, voucher_balance_sgd, name").eq("id", member_id);
  if (tenantId) fetchQ = fetchQ.eq("tenant_id", tenantId);
  const { data: member, error: fetchErr } = await fetchQ.single();
  if (fetchErr || !member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const current = Number(member.voucher_balance_sgd ?? 0);
  let newBalance: number;
  if (mode === "set")    newBalance = amount;
  else if (mode === "add")    newBalance = Math.round((current + amount) * 100) / 100;
  else /* deduct */      newBalance = Math.max(0, Math.round((current - amount) * 100) / 100);

  let updateQ = db.from("sse_members")
    .update({ voucher_balance_sgd: newBalance, updated_at: new Date().toISOString() })
    .eq("id", member_id);
  if (tenantId) updateQ = updateQ.eq("tenant_id", tenantId);

  const { error: updateErr } = await updateQ;
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    member_id,
    previous_balance: current,
    new_balance: newBalance,
    note: note ?? null,
  });
}

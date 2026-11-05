import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;

  const db = supabaseAdmin();

  const [vendors, agentsAll, agentsActive, sseAll, sseActive, txns, commissions] = await Promise.all([
    db.from("vendors").select("*", { count: "exact", head: true }),
    db.from("sales_agents").select("id, name, status").limit(10),
    db.from("sales_agents").select("*", { count: "exact", head: true }).eq("status", "active"),
    db.from("sse_members").select("id, name, active").limit(10),
    db.from("sse_members").select("*", { count: "exact", head: true }).eq("active", true),
    db.from("platform_transactions").select("net_amount_sgd, payment_status").limit(5),
    db.from("agent_commissions").select("commission_sgd, status").limit(5),
  ]);

  return NextResponse.json({
    vendors:          { count: vendors.count,       error: vendors.error?.message },
    agents_all:       { data: agentsAll.data,       error: agentsAll.error?.message },
    agents_active:    { count: agentsActive.count,  error: agentsActive.error?.message },
    sse_all:          { data: sseAll.data,          error: sseAll.error?.message },
    sse_active:       { count: sseActive.count,     error: sseActive.error?.message },
    transactions:     { data: txns.data,            error: txns.error?.message },
    commissions:      { data: commissions.data,     error: commissions.error?.message },
    supabase_url:     process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_srv_key:      !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    srv_key_prefix:   process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 30) + "...",
  });
}

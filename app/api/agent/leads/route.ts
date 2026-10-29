/**
 * GET /api/agent/leads?code=REF-XXXXXX
 * Leads list for an agent — paginated, most recent first.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: agents } = await db.from("sales_agents").select("id").eq("referral_code", code).limit(1);
  if (!agents?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: leads, error } = await db
    .from("agent_leads")
    .select("id, customer_phone, customer_name, status, source_channel, converted_to, created_at")
    .eq("agent_id", agents[0].id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leads: leads ?? [] });
}

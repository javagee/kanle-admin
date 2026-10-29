/**
 * GET /api/agent?code=REF-XXXXXX
 * Returns agent profile + commission summary + lead counts.
 * Public route — authenticated by REF code knowledge only.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  const db = supabaseAdmin();

  const { data: agents, error } = await db
    .from("sales_agents")
    .select("*")
    .eq("referral_code", code)
    .eq("status", "active")
    .limit(1);

  if (error || !agents?.length)
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const agent = agents[0];

  // Commissions
  const { data: comms } = await db
    .from("agent_commissions")
    .select("commission_sgd, status, created_at")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false });

  const pending = comms?.filter(c => c.status === "pending").reduce((s, c) => s + (c.commission_sgd ?? 0), 0) ?? 0;
  const paid    = comms?.filter(c => c.status === "paid").reduce((s, c) => s + (c.commission_sgd ?? 0), 0) ?? 0;

  // Leads by status
  const { data: leads } = await db
    .from("agent_leads")
    .select("status")
    .eq("agent_id", agent.id);

  const leadCounts: Record<string, number> = {};
  for (const l of leads ?? []) {
    leadCounts[l.status] = (leadCounts[l.status] ?? 0) + 1;
  }

  const waba = process.env.WABA_PHONE ?? "";
  const refMsg = encodeURIComponent(`${code} Hi, I'd like to enquire about your packages!`);
  const referralLink = waba ? `https://wa.me/${waba}?text=${refMsg}` : null;
  const trackableLink = waba ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/ref/${code}` : null;

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      phone: agent.phone,
      referral_code: agent.referral_code,
      commission_pct: agent.commission_pct ?? 15,
      status: agent.status,
    },
    commissions: {
      pending_sgd: Math.round(pending * 100) / 100,
      paid_sgd: Math.round(paid * 100) / 100,
      total_sgd: Math.round((pending + paid) * 100) / 100,
      count: comms?.length ?? 0,
    },
    leads: {
      total: leads?.length ?? 0,
      enquiry:   leadCounts["enquiry"]   ?? 0,
      qualified: leadCounts["qualified"] ?? 0,
      booked:    leadCounts["booked"]    ?? 0,
      lost:      leadCounts["lost"]      ?? 0,
      link_click: leadCounts["link_click"] ?? 0,
    },
    referral_link: referralLink,
    trackable_link: trackableLink,
  });
}

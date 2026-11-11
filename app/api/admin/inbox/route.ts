/**
 * GET /api/admin/inbox          — pending_handoff + human_active conversations
 * GET /api/admin/inbox?count=1  — badge count only
 * PATCH /api/admin/inbox        — update conversation status (take over / resolve / return to bot)
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
  const countOnly = req.nextUrl.searchParams.get("count") === "1";

  let q = db
    .from("conversations")
    .select(`
      id, status, language, message_count, handoff_reason, handoff_at,
      closing_persona, conversion_type, created_at, updated_at,
      customers ( id, phone_number, display_name, language_pref )
    `)
    .in("status", ["pending_handoff", "human_active"])
    .order("updated_at", { ascending: false });

  if (tenantId) q = q.eq("tenant_id", tenantId);

  const { data: convs, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (countOnly) {
    return NextResponse.json({ count: convs?.length ?? 0 });
  }

  if (!convs || convs.length === 0) {
    return NextResponse.json({ items: [] });
  }

  // Fetch last message for each conversation
  const convIds = convs.map(c => c.id);
  const { data: lastMsgs } = await db
    .from("messages")
    .select("conversation_id, role, content, message_type, created_at")
    .in("conversation_id", convIds)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false });

  // Keep only the most recent message per conversation
  const lastMsgMap: Record<string, { role: string; content: string | null; message_type: string; created_at: string }> = {};
  for (const m of lastMsgs ?? []) {
    if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m;
  }

  const items = convs.map(c => ({
    ...c,
    last_message: lastMsgMap[c.id] ?? null,
    // Minutes since last activity
    idle_minutes: Math.floor((Date.now() - new Date(c.updated_at).getTime()) / 60000),
  }));

  // Sort: pending_handoff first, then by idle time desc
  items.sort((a, b) => {
    if (a.status === "pending_handoff" && b.status !== "pending_handoff") return -1;
    if (b.status === "pending_handoff" && a.status !== "pending_handoff") return 1;
    return b.idle_minutes - a.idle_minutes;
  });

  return NextResponse.json({ items });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  const { id, action } = await req.json();
  if (!id || !action) return NextResponse.json({ error: "id and action required" }, { status: 400 });

  const STATUS_MAP: Record<string, string> = {
    take_over:    "human_active",
    resolve:      "resolved",
    return_to_bot: "active",
  };

  const newStatus = STATUS_MAP[action];
  if (!newStatus) return NextResponse.json({ error: "unknown action" }, { status: 400 });

  const update: Record<string, unknown> = { status: newStatus };
  if (newStatus === "resolved") update.resolved_at = new Date().toISOString();

  let q = db.from("conversations").update(update).eq("id", id);
  if (tenantId) q = q.eq("tenant_id", tenantId);

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

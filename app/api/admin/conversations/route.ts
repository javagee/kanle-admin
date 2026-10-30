/**
 * GET /api/admin/conversations          — list conversations with customer info
 * GET /api/admin/conversations?id=uuid  — single conversation with full message thread
 * PATCH /api/admin/conversations        — update conversation status
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const id     = searchParams.get("id");
  const status = searchParams.get("status");
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  // Single conversation with messages
  if (id) {
    const [{ data: conv }, { data: messages }] = await Promise.all([
      db.from("conversations")
        .select("*, customers ( id, phone_number, display_name, language_pref )")
        .eq("id", id)
        .single(),
      db.from("messages")
        .select("id, role, message_type, content, tokens_used, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true })
        .limit(100),
    ]);
    return NextResponse.json({ conversation: conv, messages: messages ?? [] });
  }

  // List conversations
  let query = db
    .from("conversations")
    .select(`
      id, status, language, message_count, handoff_reason, handoff_at,
      resolved_at, created_at, updated_at,
      customers ( id, phone_number, display_name )
    `)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Security log summary (last 50 events)
  const { data: secEvents } = await db
    .from("security_log")
    .select("id, event_type, severity, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ conversations: data ?? [], security_log: secEvents ?? [] });
}

export async function PATCH(req: NextRequest) {
  const db = supabaseAdmin();
  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: "id and status required" }, { status: 400 });

  const update: Record<string, unknown> = { status };
  if (status === "resolved") update.resolved_at = new Date().toISOString();

  const { error } = await db.from("conversations").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

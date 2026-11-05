/**
 * PATCH /api/admin/conversations/flag
 * Level 1 RL: admin manually tags a conversation as a quality training example.
 * Body: { conversation_id, quality_flag, quality_note? }
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const VALID_FLAGS = ["training_example", "good", "needs_review", "bad", "clear"] as const;

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { email } = auth;

  const body = await req.json().catch(() => ({}));
  const { conversation_id, quality_flag, quality_note } = body;

  if (!conversation_id) {
    return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
  }
  if (!VALID_FLAGS.includes(quality_flag)) {
    return NextResponse.json({ error: `quality_flag must be one of: ${VALID_FLAGS.join(", ")}` }, { status: 400 });
  }

  const db = supabaseAdmin();

  const patch: Record<string, unknown> = {
    quality_flag: quality_flag === "clear" ? null : quality_flag,
    flagged_by:   quality_flag === "clear" ? null : email,
    flagged_at:   quality_flag === "clear" ? null : new Date().toISOString(),
  };
  if (quality_note !== undefined) patch.quality_note = quality_note ?? null;

  const { error } = await db
    .from("conversations")
    .update(patch)
    .eq("id", conversation_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If flagged as training_example, trigger background embedding via webhook internal call
  if (quality_flag === "training_example") {
    const webhookBase = process.env.WHATSAPP_WEBHOOK_URL ?? "";
    if (webhookBase) {
      fetch(`${webhookBase}/api/rag/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Internal-Key": process.env.INTERNAL_API_KEY ?? "" },
        body: JSON.stringify({ conversation_id }),
      }).catch(() => null); // fire-and-forget
    }
  }

  return NextResponse.json({ ok: true, flagged: quality_flag !== "clear" });
}

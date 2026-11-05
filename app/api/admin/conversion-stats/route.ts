/**
 * GET /api/admin/conversion-stats
 * AI persona conversion analytics for the dashboard.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const PERSONA_LABELS: Record<string, string> = {
  serena: "Serena 🌏 (Travel)",
  maya:   "Maya 🎓 (Learning)",
  aria:   "Aria ✨ (Concierge)",
};

const TYPE_LABELS: Record<string, string> = {
  tour_booking:              "Tour Booking",
  worksheet_purchase:        "Worksheet Purchase",
  booking_payment_confirmed: "Payment Confirmed",
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseQ = (q: any) => {
    q = q.gte("created_at", since);
    return tenantId ? q.eq("tenant_id", tenantId) : q;
  };

  const [{ data: allConvs }, { data: convertedConvs }, { data: msgCounts }] =
    await Promise.all([
      baseQ(db.from("conversations").select("id, created_at, closing_persona, conversion_type, converted_at")),
      baseQ(
        db.from("conversations")
          .select("id, created_at, closing_persona, conversion_type, converted_at")
          .not("converted_at", "is", null)
      ),
      baseQ(db.from("messages").select("conversation_id").eq("role", "user")),
    ]);

  const total     = allConvs?.length ?? 0;
  const converted = convertedConvs?.length ?? 0;
  const overallRate = total > 0 ? Math.round((converted / total) * 1000) / 10 : 0;

  // ── Per-persona breakdown ────────────────────────────────────────────────
  const personaMap: Record<string, { total: number; converted: number }> = {};
  for (const c of allConvs ?? []) {
    const p = c.closing_persona ?? "unknown";
    if (!personaMap[p]) personaMap[p] = { total: 0, converted: 0 };
    personaMap[p].total++;
    if (c.converted_at) personaMap[p].converted++;
  }
  const byPersona = Object.entries(personaMap).map(([persona, counts]) => ({
    persona,
    label: PERSONA_LABELS[persona] ?? persona,
    total: counts.total,
    converted: counts.converted,
    rate: counts.total > 0 ? Math.round((counts.converted / counts.total) * 1000) / 10 : 0,
  })).sort((a, b) => b.rate - a.rate);

  // ── Per-type breakdown ───────────────────────────────────────────────────
  const typeMap: Record<string, number> = {};
  for (const c of convertedConvs ?? []) {
    const t = c.conversion_type ?? "unknown";
    typeMap[t] = (typeMap[t] ?? 0) + 1;
  }
  const byType = Object.entries(typeMap).map(([type, count]) => ({
    type,
    label: TYPE_LABELS[type] ?? type,
    count,
  })).sort((a, b) => b.count - a.count);

  // ── Weekly trend (last 8 weeks) ──────────────────────────────────────────
  const weekMap: Record<string, { total: number; converted: number }> = {};
  for (const c of allConvs ?? []) {
    const d    = new Date(c.created_at);
    const mon  = new Date(d);
    mon.setDate(d.getDate() - d.getDay() + 1); // Monday of that week
    const key  = mon.toISOString().slice(0, 10);
    if (!weekMap[key]) weekMap[key] = { total: 0, converted: 0 };
    weekMap[key].total++;
    if (c.converted_at) weekMap[key].converted++;
  }
  const weeklyTrend = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, counts]) => ({
      week,
      label: week.slice(5), // MM-DD
      total: counts.total,
      converted: counts.converted,
      rate: counts.total > 0 ? Math.round((counts.converted / counts.total) * 1000) / 10 : 0,
    }));

  // ── Avg user messages per converted conversation ─────────────────────────
  const msgPerConv: Record<string, number> = {};
  for (const m of msgCounts ?? []) {
    msgPerConv[m.conversation_id] = (msgPerConv[m.conversation_id] ?? 0) + 1;
  }
  const convertedIds = new Set((convertedConvs ?? []).map((c: { id: string }) => c.id));
  const convertedMsgCounts = Object.entries(msgPerConv)
    .filter(([id]) => convertedIds.has(id))
    .map(([, n]) => n);
  const avgMsgsToClose =
    convertedMsgCounts.length > 0
      ? Math.round(convertedMsgCounts.reduce((s, n) => s + n, 0) / convertedMsgCounts.length * 10) / 10
      : 0;

  // ── Best performing persona ──────────────────────────────────────────────
  const bestPersona = byPersona.find((p) => p.persona !== "unknown" && p.total >= 3) ?? null;

  return NextResponse.json({
    summary: {
      total_conversations:  total,
      total_converted:      converted,
      overall_rate_pct:     overallRate,
      avg_msgs_to_close:    avgMsgsToClose,
      best_persona:         bestPersona?.persona ?? null,
      best_persona_rate:    bestPersona?.rate ?? 0,
    },
    by_persona:   byPersona,
    by_type:      byType,
    weekly_trend: weeklyTrend,
    _scope: tenantId ? "tenant" : "platform",
  });
}

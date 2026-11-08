/**
 * GET  /api/admin/crm  — paginated customer list with CRM aggregates + pipeline counts
 * PATCH /api/admin/crm — update customer notes { id, notes }
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchAllRows(baseQuery: any, pageSize = 10): Promise<any[]> {
  const rows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await baseQuery.range(from, from + pageSize - 1);
    if (error || !data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

type Stage = "new" | "lead" | "engaged" | "converted" | "repeat";

function deriveStage(paidBookings: number, totalBookings: number, hasConvWithConversion: boolean): Stage {
  if (paidBookings >= 2) return "repeat";
  if (paidBookings === 1) return "converted";
  if (totalBookings > 0 || hasConvWithConversion) return "engaged";
  return "lead"; // has conversations but zero bookings
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const search    = searchParams.get("search") ?? "";
  const stageFilter = searchParams.get("stage") ?? "all";
  const limit     = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);

  // ── 1. Fetch all relevant conversations ─────────────────────────────────────
  let convQ = db
    .from("conversations")
    .select("id, customer_id, language, message_count, conversion_type, closing_persona, converted_at, created_at, updated_at");
  if (tenantId) convQ = convQ.eq("tenant_id", tenantId);
  const allConvs = await fetchAllRows(convQ);

  // ── 2. Fetch all relevant bookings ───────────────────────────────────────────
  let bookQ = db
    .from("bookings")
    .select("id, customer_id, payment_status, total_sgd, created_at");
  if (tenantId) bookQ = bookQ.eq("tenant_id", tenantId);
  const allBookings = await fetchAllRows(bookQ);

  // Build sets of customer_ids present in this tenant's data
  const tenantCustomerIds = new Set<string>([
    ...allConvs.map((c) => c.customer_id),
    ...allBookings.map((b) => b.customer_id),
  ]);

  // ── 3. Fetch customers ────────────────────────────────────────────────────────
  let custQ = db
    .from("customers")
    .select("id, phone_number, display_name, language_pref, notes, metadata, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (search) {
    custQ = custQ.or(`display_name.ilike.%${search}%,phone_number.ilike.%${search}%`);
  }
  // If tenant-scoped, only fetch customers present in tenant data
  if (tenantId && tenantCustomerIds.size > 0) {
    custQ = custQ.in("id", Array.from(tenantCustomerIds));
  } else if (tenantId && tenantCustomerIds.size === 0) {
    return NextResponse.json({ customers: [], pipeline: { new: 0, lead: 0, engaged: 0, converted: 0, repeat: 0 } });
  }

  const customers = await fetchAllRows(custQ);

  // ── 4. Aggregate per customer ─────────────────────────────────────────────────
  const convByCustomer = new Map<string, typeof allConvs>();
  for (const c of allConvs) {
    if (!convByCustomer.has(c.customer_id)) convByCustomer.set(c.customer_id, []);
    convByCustomer.get(c.customer_id)!.push(c);
  }
  const bookByCustomer = new Map<string, typeof allBookings>();
  for (const b of allBookings) {
    if (!bookByCustomer.has(b.customer_id)) bookByCustomer.set(b.customer_id, []);
    bookByCustomer.get(b.customer_id)!.push(b);
  }

  const PAID = new Set(["paid", "pending_verification"]);

  const enriched = customers.map((cust) => {
    const convs  = convByCustomer.get(cust.id) ?? [];
    const books  = bookByCustomer.get(cust.id) ?? [];
    const paidBooks  = books.filter((b) => PAID.has(b.payment_status)).length;
    const hasConvWithConversion = convs.some((c) => c.conversion_type);
    const stage: Stage = convs.length === 0
      ? "new"
      : deriveStage(paidBooks, books.length, hasConvWithConversion);

    const totalSpend = books
      .filter((b) => PAID.has(b.payment_status))
      .reduce((sum, b) => sum + (parseFloat(b.total_sgd) || 0), 0);

    const latestConv = convs.sort((a, b) => (b.updated_at ?? b.created_at) > (a.updated_at ?? a.created_at) ? 1 : -1)[0];
    const lastActive = latestConv?.updated_at ?? latestConv?.created_at ?? cust.updated_at;

    return {
      id: cust.id,
      phone_number: cust.phone_number,
      display_name: cust.display_name,
      language_pref: cust.language_pref ?? latestConv?.language ?? "auto",
      notes: cust.notes,
      metadata: cust.metadata,
      created_at: cust.created_at,
      stage,
      total_spend: totalSpend,
      booking_count: books.length,
      conv_count: convs.length,
      last_active: lastActive,
      closing_persona: latestConv?.closing_persona ?? null,
    };
  });

  // Apply stage filter after enrichment
  const filtered = stageFilter === "all" ? enriched : enriched.filter((c) => c.stage === stageFilter);

  // Pipeline counts (over all, not filtered)
  const pipeline = { new: 0, lead: 0, engaged: 0, converted: 0, repeat: 0 };
  for (const c of enriched) pipeline[c.stage]++;

  return NextResponse.json({ customers: filtered, pipeline });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;

  const db = supabaseAdmin();
  const { id, notes } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await db
    .from("customers")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

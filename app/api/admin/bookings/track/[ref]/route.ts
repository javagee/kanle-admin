/**
 * GET /api/admin/bookings/track/[ref]  — public booking status lookup (no auth)
 * Used by the /booking/[ref] tracking page.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { ref: string } }) {
  const ref = params.ref.toUpperCase().trim();
  if (!ref) return NextResponse.json({ error: "ref required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("bookings")
    .select(`
      id, status, payment_status, payment_ref, travel_date,
      adults, children, total_sgd, created_at, verified_at, payment_submitted_at,
      context,
      tour_packages ( name, name_zh, destination )
    `)
    .eq("payment_ref", ref)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // Return only safe public fields — no customer PII
  return NextResponse.json({
    payment_ref:           data.payment_ref,
    status:                data.status,
    payment_status:        data.payment_status,
    travel_date:           data.travel_date,
    adults:                data.adults,
    children:              data.children,
    total_sgd:             data.total_sgd,
    created_at:            data.created_at,
    payment_submitted_at:  data.payment_submitted_at,
    verified_at:           data.verified_at,
    package_name:          (data.tour_packages as any)?.name_zh ?? (data.tour_packages as any)?.name ?? null,
    destination:           (data.tour_packages as any)?.destination ?? null,
    ticket_url:            (data.context as any)?.ticket_url ?? null,
  });
}

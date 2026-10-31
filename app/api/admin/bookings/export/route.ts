/**
 * GET /api/admin/bookings/export
 * Returns bookings as a CSV file download.
 * Accepts the same filters as the bookings list: status, payment_status, date_from, date_to.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(cells: unknown[]): string {
  return cells.map(escapeCsv).join(",");
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  const { searchParams } = new URL(req.url);
  const status         = searchParams.get("status");
  const payment_status = searchParams.get("payment_status");
  const date_from      = searchParams.get("date_from");   // YYYY-MM-DD travel_date range
  const date_to        = searchParams.get("date_to");
  const created_from   = searchParams.get("created_from"); // created_at range
  const created_to     = searchParams.get("created_to");

  let query = db
    .from("bookings")
    .select(`
      id, booking_type, status, travel_date, adults, children,
      total_sgd, payment_status, payment_ref, special_requests,
      customer_email, verified_at, created_at,
      customers ( phone_number, display_name ),
      tour_packages ( name, name_zh, destination, price_adult_sgd )
    `)
    .order("travel_date", { ascending: true })
    .limit(2000);

  if (tenantId)                               query = query.eq("tenant_id", tenantId);
  if (status && status !== "all")             query = query.eq("status", status);
  if (payment_status && payment_status !== "all") query = query.eq("payment_status", payment_status);
  if (date_from)                              query = query.gte("travel_date", date_from);
  if (date_to)                                query = query.lte("travel_date", date_to);
  if (created_from)                           query = query.gte("created_at", created_from);
  if (created_to)                             query = query.lte("created_at", created_to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const bookings = data ?? [];

  const headers = [
    "Booking Ref", "Customer Name", "Phone", "Email",
    "Package", "Destination",
    "Travel Date", "Adults", "Children", "Total (SGD)",
    "Status", "Payment Status", "Special Requests",
    "Booked At", "Verified At",
  ];

  const lines: string[] = [row(headers)];

  for (const b of bookings) {
    const cust = b.customers as any;
    const pkg  = b.tour_packages as any;
    lines.push(row([
      b.payment_ref ?? b.id.slice(0, 8).toUpperCase(),
      cust?.display_name ?? "",
      cust?.phone_number ?? "",
      b.customer_email ?? "",
      pkg?.name_zh ?? pkg?.name ?? "",
      pkg?.destination ?? "",
      b.travel_date,
      b.adults,
      b.children ?? 0,
      b.total_sgd != null ? Number(b.total_sgd).toFixed(2) : "",
      b.status,
      b.payment_status,
      b.special_requests ?? "",
      b.created_at ? new Date(b.created_at).toLocaleDateString("en-SG") : "",
      b.verified_at ? new Date(b.verified_at).toLocaleDateString("en-SG") : "",
    ]));
  }

  const csv = lines.join("\r\n");
  const filename = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

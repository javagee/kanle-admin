/**
 * POST /api/admin/bookings/[id]/verify
 * Admin verifies bank payment → confirms booking, writes platform_transaction,
 * sends buyer WhatsApp confirmation with QR tracking link + optional email.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const APP_URL         = process.env.APP_URL         ?? "https://hipyhub.com";
const WA_GRAPH_URL    = "https://graph.facebook.com/v18.0";
const BREVO_API_KEY   = process.env.BREVO_API_KEY   ?? "";
const BREVO_FROM      = process.env.BREVO_SENDER_EMAIL ?? "noreply@hipyhub.com";
const BREVO_NAME      = process.env.BREVO_SENDER_NAME  ?? "HipyHub Tours";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(req);
  if (isAuthError(auth)) return auth;
  const { tenantId } = auth;

  const db = supabaseAdmin();
  const bookingId = params.id;

  // Tenant scope check
  const scopeQuery = db.from("bookings").select("id, tenant_id").eq("id", bookingId);
  const { data: check } = tenantId
    ? await scopeQuery.eq("tenant_id", tenantId).single()
    : await scopeQuery.single();
  if (!check) return NextResponse.json({ error: "Booking not found or forbidden" }, { status: 404 });

  // Mark confirmed + paid
  const now = new Date().toISOString();
  const { data: booking, error } = await db
    .from("bookings")
    .update({ status: "confirmed", payment_status: "paid", verified_at: now })
    .eq("id", bookingId)
    .select(`
      id, tenant_id, package_id, payment_ref, travel_date, adults, children,
      total_sgd, customer_email, customer_id,
      customers ( phone_number, display_name ),
      tour_packages ( name, name_zh, destination )
    `)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Write platform_transaction (fire-and-forget, non-fatal)
  createTransaction(db, booking).catch(e => console.error("[verify] tx failed:", e));

  const ref       = booking.payment_ref ?? bookingId.slice(0, 8).toUpperCase();
  const trackUrl  = `${APP_URL}/booking/${ref}`;
  const qrUrl     = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(trackUrl)}&size=300x300&margin=10`;
  const pkgName   = (booking.tour_packages as any)?.name_zh ?? (booking.tour_packages as any)?.name ?? "Tour";
  const custPhone = (booking.customers as any)?.phone_number as string | undefined;
  const custName  = (booking.customers as any)?.display_name as string | undefined;
  const total     = Number(booking.total_sgd ?? 0).toFixed(2);

  const confirmText =
    `✅ *Booking Confirmed — ${ref}*\n\n` +
    `🏷 ${pkgName}\n` +
    `🗓 Travel Date: ${booking.travel_date}\n` +
    `👥 ${booking.adults} adult${booking.adults !== 1 ? "s" : ""}${booking.children > 0 ? ` + ${booking.children} child${booking.children !== 1 ? "ren" : ""}` : ""}\n` +
    `💰 Total Paid: S$${total}\n\n` +
    `Show your booking QR code at the departure point.\n` +
    `Track: ${trackUrl}`;

  // Send WhatsApp messages (fire-and-forget)
  if (custPhone) {
    const waConfig = await getWaConfig(db, booking.tenant_id);
    sendWhatsAppText(waConfig, custPhone, confirmText).catch(() => {});
    sendWhatsAppImage(waConfig, custPhone, qrUrl, `Booking QR — ${ref}`).catch(() => {});
  }

  // Send buyer email if available
  const buyerEmail = booking.customer_email as string | undefined;
  if (buyerEmail) {
    sendBuyerEmail(buyerEmail, custName ?? "Valued Customer", ref, pkgName, booking.travel_date, total, trackUrl, qrUrl).catch(() => {});
  }

  return NextResponse.json({ ok: true, tracking_url: trackUrl });
}

// ── helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getWaConfig(db: any, bookingTenantId: string | null) {
  if (!bookingTenantId) return { phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "", token: process.env.WHATSAPP_ACCESS_TOKEN ?? "" };
  const { data } = await db.from("tenants").select("whatsapp_number_id, whatsapp_token").eq("id", bookingTenantId).single();
  return {
    phoneId: data?.whatsapp_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    token:   data?.whatsapp_token     || process.env.WHATSAPP_ACCESS_TOKEN    ?? "",
  };
}

async function sendWhatsAppText(cfg: { phoneId: string; token: string }, to: string, body: string) {
  await fetch(`${WA_GRAPH_URL}/${cfg.phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  });
}

async function sendWhatsAppImage(cfg: { phoneId: string; token: string }, to: string, imageUrl: string, caption: string) {
  await fetch(`${WA_GRAPH_URL}/${cfg.phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "image", image: { link: imageUrl, caption } }),
  });
}

async function sendBuyerEmail(email: string, name: string, ref: string, pkg: string, travelDate: string, total: string, trackUrl: string, qrUrl: string) {
  if (!BREVO_API_KEY) return;
  const html = `
<div style="font-family:sans-serif;max-width:560px;margin:auto">
  <h2 style="color:#7c3aed">✅ Booking Confirmed — ${ref}</h2>
  <table style="border-collapse:collapse;width:100%">
    <tr><td style="padding:8px 0;color:#555">Package</td><td><b>${pkg}</b></td></tr>
    <tr><td style="padding:8px 0;color:#555">Travel Date</td><td><b>${travelDate}</b></td></tr>
    <tr><td style="padding:8px 0;color:#555">Total Paid</td><td><b>S$${total}</b></td></tr>
    <tr><td style="padding:8px 0;color:#555">Reference</td><td><b>${ref}</b></td></tr>
  </table>
  <p>Show the QR code below at the departure point:</p>
  <img src="${qrUrl}" alt="Booking QR" style="display:block;margin:16px 0" />
  <p><a href="${trackUrl}">Track your booking online</a></p>
</div>`;
  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: BREVO_NAME, email: BREVO_FROM },
      to: [{ email, name }],
      subject: `Booking Confirmed — ${ref}`,
      htmlContent: html,
    }),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createTransaction(db: any, booking: any) {
  const { data: existing } = await db.from("platform_transactions").select("id").eq("booking_id", booking.id).limit(1);
  if (existing?.length) return;

  const gross = Number(booking.total_sgd ?? 0);
  if (gross <= 0) return;

  let platformFeePct = 15, agentFeePct = 0;
  if (booking.tenant_id) {
    const { data: t } = await db.from("tenants").select("platform_fee_pct, agent_fee_pct").eq("id", booking.tenant_id).single();
    if (t) { platformFeePct = Number(t.platform_fee_pct ?? 15); agentFeePct = Number(t.agent_fee_pct ?? 0); }
  }
  const { data: commission } = await db.from("agent_commissions").select("id, agent_id, commission_sgd").eq("source_id", booking.id).limit(1);
  const comm = commission?.[0];
  const agentFeeSgd    = comm ? Number(comm.commission_sgd ?? 0) : Math.round(gross * agentFeePct) / 100;
  const platformFeeSgd = Math.round(gross * platformFeePct) / 100;
  const vendorPayout   = Math.max(0, gross - platformFeeSgd - agentFeeSgd);

  await db.from("platform_transactions").insert({
    tenant_id: booking.tenant_id, transaction_type: "tour_booking", booking_id: booking.id,
    product_id: booking.package_id, gross_amount_sgd: gross, net_amount_sgd: gross - platformFeeSgd,
    platform_fee_sgd: platformFeeSgd, agent_fee_sgd: agentFeeSgd, vendor_payout_sgd: vendorPayout,
    agent_id: comm?.agent_id ?? null, payment_status: "paid", payment_ref: booking.payment_ref,
    payment_received_at: new Date().toISOString(),
    customer_name: (booking.customers as any)?.display_name ?? null,
    customer_phone: (booking.customers as any)?.phone_number ?? null,
  });
  if (comm?.id) {
    await db.from("agent_commissions").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", comm.id);
  }
}

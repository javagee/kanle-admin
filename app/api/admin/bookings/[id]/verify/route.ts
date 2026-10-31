/**
 * POST /api/admin/bookings/[id]/verify
 * Admin verifies bank payment → confirms booking, generates PDF e-ticket,
 * uploads to Supabase Storage, sends buyer WhatsApp (text + PDF) + email.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAdmin, isAuthError } from "@/lib/api-auth";
import { generateTicketPDF } from "@/lib/ticket-pdf";

export const dynamic = "force-dynamic";

const APP_URL      = process.env.APP_URL              ?? "https://hipyhub.com";
const WA_GRAPH_URL = "https://graph.facebook.com/v18.0";
const BREVO_API_KEY = process.env.BREVO_API_KEY       ?? "";
const BREVO_FROM   = process.env.BREVO_SENDER_EMAIL   ?? "noreply@hipyhub.com";
const BREVO_NAME   = process.env.BREVO_SENDER_NAME    ?? "HipyHub Tours";

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

  // Write platform_transaction (fire-and-forget)
  createTransaction(db, booking).catch(e => console.error("[verify] tx failed:", e));

  const ref       = booking.payment_ref ?? bookingId.slice(0, 8).toUpperCase();
  const trackUrl  = `${APP_URL}/booking/${ref}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pkg       = booking.tour_packages as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cust      = booking.customers as any;
  const pkgName   = pkg?.name_zh ?? pkg?.name ?? "Tour";
  const dest      = pkg?.destination ?? "";
  const custPhone = cust?.phone_number as string | undefined;
  const custName  = cust?.display_name as string | undefined;
  const total     = Number(booking.total_sgd ?? 0);

  // Generate PDF + upload to Supabase Storage
  let ticketUrl: string | undefined;
  try {
    const pdfBuf = await generateTicketPDF({
      ref,
      packageName: pkgName,
      destination: dest,
      travelDate:  booking.travel_date,
      adults:      booking.adults,
      children:    booking.children ?? 0,
      totalSgd:    total,
      trackUrl,
      customerName: custName,
    });

    const storagePath = `${ref}.pdf`;
    const { error: upErr } = await db.storage
      .from("booking-tickets")
      .upload(storagePath, pdfBuf, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (!upErr) {
      const { data: urlData } = db.storage
        .from("booking-tickets")
        .getPublicUrl(storagePath);
      ticketUrl = urlData?.publicUrl;

      // Store ticket URL on booking record
      await db.from("bookings").update({ context: { ticket_url: ticketUrl } }).eq("id", bookingId);
    } else {
      console.error("[verify] storage upload failed:", upErr.message);
    }
  } catch (pdfErr) {
    console.error("[verify] PDF generation failed:", pdfErr);
  }

  const waConfig = custPhone ? await getWaConfig(db, booking.tenant_id) : null;

  const confirmText =
    `✅ *Booking Confirmed — ${ref}*\n\n` +
    `🏷 ${pkgName}\n` +
    `🗓 Travel Date: ${booking.travel_date}\n` +
    `👥 ${booking.adults} adult${booking.adults !== 1 ? "s" : ""}${(booking.children ?? 0) > 0 ? ` + ${booking.children} child${booking.children !== 1 ? "ren" : ""}` : ""}\n` +
    `💰 Total Paid: S$${total.toFixed(2)}\n\n` +
    (ticketUrl
      ? `📄 Your e-ticket: ${ticketUrl}\n\n`
      : "") +
    `Track your booking: ${trackUrl}`;

  if (custPhone && waConfig) {
    sendWhatsAppText(waConfig, custPhone, confirmText).catch(() => {});
    // Send PDF as document if available, else send QR image
    if (ticketUrl) {
      sendWhatsAppDocument(waConfig, custPhone, ticketUrl, `E-Ticket ${ref}.pdf`).catch(() => {});
    } else {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(trackUrl)}&size=300x300&margin=10`;
      sendWhatsAppImage(waConfig, custPhone, qrUrl, `Booking QR — ${ref}`).catch(() => {});
    }
  }

  const buyerEmail = booking.customer_email as string | undefined;
  if (buyerEmail) {
    sendBuyerEmail({
      email: buyerEmail, name: custName ?? "Valued Customer",
      ref, pkgName, travelDate: booking.travel_date,
      total: total.toFixed(2), trackUrl, ticketUrl,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, tracking_url: trackUrl, ticket_url: ticketUrl ?? null });
}

// ── helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getWaConfig(db: any, bookingTenantId: string | null) {
  if (!bookingTenantId) return { phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "", token: process.env.WHATSAPP_ACCESS_TOKEN ?? "" };
  const { data } = await db.from("tenants").select("whatsapp_number_id, whatsapp_token").eq("id", bookingTenantId).single();
  return {
    phoneId: (data?.whatsapp_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID) ?? "",
    token:   (data?.whatsapp_token     || process.env.WHATSAPP_ACCESS_TOKEN)    ?? "",
  };
}

async function sendWhatsAppText(cfg: { phoneId: string; token: string }, to: string, body: string) {
  await fetch(`${WA_GRAPH_URL}/${cfg.phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  });
}

async function sendWhatsAppDocument(cfg: { phoneId: string; token: string }, to: string, docUrl: string, filename: string) {
  await fetch(`${WA_GRAPH_URL}/${cfg.phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "document", document: { link: docUrl, filename } }),
  });
}

async function sendWhatsAppImage(cfg: { phoneId: string; token: string }, to: string, imageUrl: string, caption: string) {
  await fetch(`${WA_GRAPH_URL}/${cfg.phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "image", image: { link: imageUrl, caption } }),
  });
}

async function sendBuyerEmail(opts: {
  email: string; name: string; ref: string; pkgName: string;
  travelDate: string; total: string; trackUrl: string; ticketUrl?: string;
}) {
  if (!BREVO_API_KEY) return;
  const { email, name, ref, pkgName, travelDate, total, trackUrl, ticketUrl } = opts;
  const html = `
<div style="font-family:sans-serif;max-width:560px;margin:auto;color:#0f172a">
  <div style="background:#7c3aed;padding:24px 28px;border-radius:12px 12px 0 0">
    <h1 style="margin:0;color:#fff;font-size:20px">✅ Booking Confirmed</h1>
    <p style="margin:6px 0 0;color:#c4b5fd;font-size:13px">Reference: <b>${ref}</b></p>
  </div>
  <div style="background:#f8fafc;padding:24px 28px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Package</td><td style="font-weight:600">${pkgName}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Travel Date</td><td style="font-weight:600">${travelDate}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b;font-size:13px">Total Paid</td><td style="font-weight:600;color:#059669">S$${total}</td></tr>
    </table>
    ${ticketUrl ? `
    <div style="margin:20px 0;padding:16px;background:#ede9fe;border-radius:8px;text-align:center">
      <p style="margin:0 0 12px;font-weight:600;color:#7c3aed">📄 Your E-Ticket is ready</p>
      <a href="${ticketUrl}" style="background:#7c3aed;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Download E-Ticket PDF</a>
      <p style="margin:10px 0 0;font-size:12px;color:#64748b">Show this at the departure point</p>
    </div>` : ""}
    <p style="margin:16px 0 4px;font-size:13px;color:#64748b">Track your booking status:</p>
    <a href="${trackUrl}" style="color:#7c3aed;font-size:13px">${trackUrl}</a>
  </div>
</div>`;
  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: BREVO_NAME, email: BREVO_FROM },
      to: [{ email, name }],
      subject: `Your e-ticket is ready — ${ref}`,
      htmlContent: html,
      attachment: ticketUrl ? [{ url: ticketUrl, name: `E-Ticket-${ref}.pdf` }] : undefined,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customer_name: (booking.customers as any)?.display_name ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customer_phone: (booking.customers as any)?.phone_number ?? null,
  });
  if (comm?.id) {
    await db.from("agent_commissions").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", comm.id);
  }
}

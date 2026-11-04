/**
 * Email via Brevo (api.brevo.com/v3/smtp/email).
 * Requires BREVO_API_KEY and BREVO_FROM_EMAIL in environment.
 * Silently skips if key is absent or placeholder.
 */

const BREVO_API = "https://api.brevo.com/v3/smtp/email";

function isKeyValid(k: string | undefined): k is string {
  return !!k && !k.includes("REPLACE_ME") && k.length > 10;
}

interface SendArgs {
  to: string;
  subject: string;
  htmlContent: string;
}

async function sendEmail({ to, subject, htmlContent }: SendArgs): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!isKeyValid(apiKey)) return;

  const fromEmail = process.env.BREVO_FROM_EMAIL ?? "gerardespinas@gmail.com";
  const fromName  = process.env.BREVO_FROM_NAME  ?? "LMS";

  await fetch(BREVO_API, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to:     [{ email: to }],
      subject,
      htmlContent,
    }),
  }).catch(() => {});
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function wrap(body: string): string {
  const name = process.env.BREVO_FROM_NAME ?? "LMS";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0a1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:520px;background:#1a1035;border-radius:16px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#c084fc,#7c3aed);padding:28px 32px;">
  <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.3px;">🎓 ${name}</p>
</td></tr>
<tr><td style="padding:32px;">
  ${body}
  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:28px 0;">
  <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);">You received this because you have an account with us. Please do not reply to this email.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#fff;">${text}</h1>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.7);">${text}</p>`;
}

function pill(text: string, color = "#a78bfa"): string {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;background:${color}22;color:${color};border:1px solid ${color}44;">${text}</span>`;
}

function btn(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:linear-gradient(135deg,#c084fc,#7c3aed);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:12px;">${label}</a>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:12px;color:rgba(255,255,255,0.45);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;">${label}</td>
    <td style="padding:8px 12px;font-size:13px;color:rgba(255,255,255,0.8);">${value}</td>
  </tr>`;
}

function infoTable(...rows: string[]): string {
  return `<table style="width:100%;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);border-collapse:collapse;margin:16px 0 24px;">${rows.join("")}</table>`;
}

// ─── Email templates ───────────────────────────────────────────────────────────

export async function emailWelcomeStudent(
  to: string, name: string, schoolName: string, slug: string
): Promise<void> {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/learn/${slug}/login`;
  await sendEmail({
    to,
    subject: `Welcome to ${schoolName}!`,
    htmlContent: wrap(`
      ${h1(`Welcome, ${name}!`)}
      ${p(`You've successfully registered at <strong style="color:#a78bfa;">${schoolName}</strong>. You can now browse and enrol in courses.`)}
      ${infoTable(infoRow("School", schoolName), infoRow("Email", to))}
      ${btn("Go to My Dashboard →", loginUrl)}
    `),
  });
}

export async function emailPaymentProofReceived(
  operatorEmail: string,
  studentName: string,
  courseName: string,
  proofUrl: string,
  adminUrl: string
): Promise<void> {
  await sendEmail({
    to: operatorEmail,
    subject: `Payment proof received — ${studentName}`,
    htmlContent: wrap(`
      ${h1("Payment Proof Received")}
      ${p(`A student has uploaded payment proof for a course. Please review and verify.`)}
      ${infoTable(
        infoRow("Student", studentName),
        infoRow("Course", courseName),
      )}
      ${proofUrl ? `<p style="margin:0 0 16px;"><a href="${proofUrl}" style="color:#a78bfa;font-size:13px;">View proof image →</a></p>` : ""}
      ${btn("Verify Payment in Admin →", adminUrl)}
    `),
  });
}

export async function emailPasswordReset(
  to: string, name: string, resetUrl: string
): Promise<void> {
  await sendEmail({
    to,
    subject: "Reset your password",
    htmlContent: wrap(`
      ${h1("Password Reset")}
      ${p(`Hi <strong style="color:#a78bfa;">${name}</strong>, we received a request to reset your password. Click the button below — this link expires in <strong style="color:#fff;">1 hour</strong>.`)}
      ${btn("Reset My Password →", resetUrl)}
      ${p(`If you didn't request this, you can safely ignore this email. Your password will not change.`)}
    `),
  });
}

export async function emailPaymentVerified(
  to: string,
  name: string,
  courseName: string,
  slug: string,
  courseId: string
): Promise<void> {
  const courseUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/learn/${slug}/courses/${courseId}`;
  await sendEmail({
    to,
    subject: `Payment verified — ${courseName}`,
    htmlContent: wrap(`
      ${h1("Payment Verified! ✓")}
      ${p(`Great news, <strong style="color:#a78bfa;">${name}</strong>! Your payment for the following course has been verified. You now have full access.`)}
      ${infoTable(
        infoRow("Course", courseName),
        infoRow("Status", "Paid &amp; Unlocked"),
      )}
      ${pill("Paid", "#6ee7b7")}
      <br><br>
      ${btn("Continue Learning →", courseUrl)}
    `),
  });
}

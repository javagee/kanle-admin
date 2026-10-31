"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface BookingStatus {
  payment_ref: string;
  status: string;
  payment_status: string;
  travel_date: string;
  adults: number;
  children: number;
  total_sgd: number | null;
  created_at: string;
  payment_submitted_at: string | null;
  verified_at: string | null;
  package_name: string | null;
  destination: string | null;
  ticket_url: string | null;
}

type Step = "pending_payment" | "pending_verification" | "confirmed";

function getStep(b: BookingStatus): Step {
  if (b.status === "confirmed" || b.payment_status === "paid") return "confirmed";
  if (b.payment_status === "pending_verification")              return "pending_verification";
  return "pending_payment";
}

const STEP_CONFIG: Record<Step, { label: string; desc: string; color: string }> = {
  pending_payment:      { label: "Payment Pending",  desc: "Waiting for your PayNow payment",         color: "#fde68a" },
  pending_verification: { label: "Verifying Payment", desc: "We received your payment, verifying with bank", color: "#93c5fd" },
  confirmed:            { label: "Confirmed",          desc: "Payment verified — your booking is confirmed!", color: "#6ee7b7" },
};

const STEPS: Step[] = ["pending_payment", "pending_verification", "confirmed"];

export default function BookingTrackPage() {
  const { ref } = useParams<{ ref: string }>();
  const [booking, setBooking] = useState<BookingStatus | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!ref) return;
    fetch(`/api/admin/bookings/track/${ref.toUpperCase()}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setBooking)
      .catch(() => setNotFound(true));
  }, [ref]);

  const currentStep = booking ? getStep(booking) : null;
  const currentIdx  = currentStep ? STEPS.indexOf(currentStep) : -1;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0a1e 0%,#1e1035 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* Logo / brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#c084fc", letterSpacing: -1 }}>HipyHub</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>Booking Status</div>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 28 }}>

          {notFound ? (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: "32px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{ fontWeight: 600, color: "#fca5a5" }}>Booking not found</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>Check the reference and try again.</div>
            </div>
          ) : !booking ? (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", padding: "32px 0" }}>Loading…</div>
          ) : (
            <>
              {/* Reference */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Booking Reference</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#c084fc", fontFamily: "monospace", marginTop: 4 }}>{booking.payment_ref}</div>
                {booking.package_name && (
                  <div style={{ color: "rgba(255,255,255,0.7)", marginTop: 6, fontWeight: 600 }}>{booking.package_name}</div>
                )}
              </div>

              {/* Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
                {[
                  { label: "Travel Date", value: booking.travel_date ? new Date(booking.travel_date).toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—" },
                  { label: "Passengers", value: `${booking.adults}A${booking.children > 0 ? ` ${booking.children}C` : ""}` },
                  { label: "Total", value: booking.total_sgd ? `S$${Number(booking.total_sgd).toFixed(2)}` : "—" },
                  { label: "Booked", value: new Date(booking.created_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) },
                ].map(item => (
                  <div key={item.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{item.label}</div>
                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Status timeline */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Status</div>
                <div style={{ position: "relative" }}>
                  {/* connector line */}
                  <div style={{ position: "absolute", left: 15, top: 20, bottom: 20, width: 2, background: "rgba(255,255,255,0.1)", zIndex: 0 }} />

                  {STEPS.map((step, idx) => {
                    const cfg     = STEP_CONFIG[step];
                    const isDone  = idx < currentIdx;
                    const isNow   = idx === currentIdx;
                    const dotColor = isDone ? "#6ee7b7" : isNow ? cfg.color : "rgba(255,255,255,0.15)";
                    return (
                      <div key={step} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20, position: "relative", zIndex: 1 }}>
                        {/* dot */}
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                          background: dotColor,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13,
                          boxShadow: isNow ? `0 0 12px ${cfg.color}66` : undefined,
                        }}>
                          {isDone ? "✓" : isNow ? "●" : "○"}
                        </div>
                        <div style={{ paddingTop: 4 }}>
                          <div style={{ fontWeight: 600, color: isNow ? cfg.color : isDone ? "#6ee7b7" : "rgba(255,255,255,0.3)", fontSize: 14 }}>
                            {cfg.label}
                          </div>
                          {isNow && (
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{cfg.desc}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Download e-ticket — shown once confirmed */}
        {booking?.ticket_url && booking.status === "confirmed" && (
          <a
            href={booking.ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block", textAlign: "center", marginTop: 16,
              background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
              color: "#fff", padding: "14px 24px", borderRadius: 12,
              fontWeight: 700, fontSize: 15, textDecoration: "none",
            }}
          >
            📄 Download E-Ticket PDF
          </a>
        )}

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
          Questions? Chat with us on WhatsApp
        </div>
      </div>
    </div>
  );
}

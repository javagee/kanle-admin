import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export interface TicketData {
  ref:         string;
  packageName: string;
  destination: string;
  travelDate:  string;
  adults:      number;
  children:    number;
  totalSgd:    number;
  trackUrl:    string;
  customerName?: string;
}

export async function generateTicketPDF(ticket: TicketData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A5", margin: 40, info: { Title: `Booking ${ticket.ref}` } });
    const chunks: Buffer[] = [];
    doc.on("data", c => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PURPLE = "#7c3aed";
    const DARK   = "#1e1035";
    const GRAY   = "#64748b";
    const W      = doc.page.width - 80; // usable width

    // ── Header band ────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 70).fill(PURPLE);
    doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold")
       .text("HipyHub Tours", 40, 18);
    doc.fontSize(9).font("Helvetica")
       .text("E-TICKET / 电子票", 40, 42, { characterSpacing: 1 });
    doc.fillColor("#c4b5fd").fontSize(9)
       .text(`Ref: ${ticket.ref}`, doc.page.width - 160, 28, { width: 120, align: "right" });

    // ── Package + date block ────────────────────────────────────────────────
    doc.fillColor(DARK).rect(40, 85, W, 60).fill("#f3f0ff");
    doc.fillColor(PURPLE).fontSize(13).font("Helvetica-Bold")
       .text(ticket.packageName, 52, 96, { width: W - 24 });
    doc.fillColor(GRAY).fontSize(9).font("Helvetica")
       .text(ticket.destination.toUpperCase(), 52, 116, { characterSpacing: 0.5 });

    // ── Detail grid ─────────────────────────────────────────────────────────
    const details: [string, string][] = [
      ["Travel Date",  new Date(ticket.travelDate + "T00:00:00").toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })],
      ["Passengers",   `${ticket.adults} adult${ticket.adults !== 1 ? "s" : ""}${ticket.children > 0 ? ` + ${ticket.children} child${ticket.children !== 1 ? "ren" : ""}` : ""}`],
      ["Total Paid",   `S$${ticket.totalSgd.toFixed(2)}`],
      ...(ticket.customerName ? [["Name", ticket.customerName] as [string, string]] : []),
    ];

    let y = 165;
    for (const [label, value] of details) {
      doc.fillColor(GRAY).fontSize(8).font("Helvetica").text(label, 40, y);
      doc.fillColor("#0f172a").fontSize(10).font("Helvetica-Bold").text(value, 40, y + 11);
      y += 36;
    }

    // ── Divider ─────────────────────────────────────────────────────────────
    doc.moveTo(40, y + 4).lineTo(40 + W, y + 4).strokeColor("#e2e8f0").lineWidth(1).stroke();
    y += 16;

    // ── QR code ─────────────────────────────────────────────────────────────
    // Generate QR synchronously via dataURL approach — we'll resolve after
    QRCode.toBuffer(ticket.trackUrl, { width: 120, margin: 1 })
      .then(qrBuf => {
        const qrX = doc.page.width - 40 - 110;
        doc.image(qrBuf, qrX, y, { width: 110 });
        doc.fillColor(GRAY).fontSize(7).font("Helvetica")
           .text("Scan to track booking", qrX, y + 114, { width: 110, align: "center" });

        // ── Instructions ─────────────────────────────────────────────────────
        doc.fillColor("#0f172a").fontSize(9).font("Helvetica-Bold")
           .text("Show this ticket at the departure point", 40, y, { width: qrX - 60 });
        doc.fillColor(GRAY).fontSize(8).font("Helvetica")
           .text(
             "Please arrive 15 minutes before departure. Present this e-ticket on your phone or as a printout.",
             40, y + 18, { width: qrX - 60 }
           );

        // ── Footer ──────────────────────────────────────────────────────────
        const footerY = doc.page.height - 40;
        doc.moveTo(40, footerY - 10).lineTo(40 + W, footerY - 10).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
        doc.fillColor(GRAY).fontSize(7)
           .text(`Booking Reference: ${ticket.ref}  ·  hipyhub.com`, 40, footerY - 4, { width: W, align: "center" });

        doc.end();
      })
      .catch(reject);
  });
}

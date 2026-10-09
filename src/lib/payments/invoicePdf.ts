import "server-only";
import PDFDocument from "pdfkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LEGAL_ADDRESS, LEGAL_ENTITY } from "@/components/legal/legal-config";
import { ORDER_STATUS_LABELS, resolveOrderDisplayStatus } from "./orderDisplay";
import { serializeOrder, type CreditOrderRow } from "./orders";

let fonts: Promise<Buffer[]> | undefined;
function invoiceFonts() {
  if (!fonts) fonts = Promise.all(["manrope-regular.woff", "manrope-bold.woff"].map(file =>
    readFile(path.join(process.cwd(), "public/fonts/invoice", file)))).catch(error => { fonts = undefined; throw error; });
  return fonts;
}

/** Builds PDF bytes directly in Node. Billing values are plain text, never HTML or executable content. */
export async function buildInvoicePdf(order: CreditOrderRow, paymentState?: string): Promise<Uint8Array> {
  const [regular, bold] = await invoiceFonts();
  const data = serializeOrder(order);
  const paid = order.status === "paid";
  const status = paymentState === "fully_refunded" ? "E rimbursuar plotësisht" : paymentState === "partially_refunded"
    ? "E rimbursuar pjesërisht" : ORDER_STATUS_LABELS[resolveOrderDisplayStatus(order.status, order.cancel_reason)];
  const date = new Date(order.paid_at ?? order.created_at).toLocaleString("sq-AL", {
    timeZone: "Europe/Tirane", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const doc = new PDFDocument({ size: "A4", margin: 46, font: path.join(process.cwd(),"public/fonts/invoice/manrope-regular.woff"),
    info: { Title: `Faturë ${order.id.slice(0, 8).toUpperCase()} · maro.al`, Author: LEGAL_ENTITY.name } });
  doc.registerFont("Maro", regular).registerFont("MaroBold", bold);
  const result = new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Buffer[] = []; let size = 0;
    doc.on("data", (chunk: Buffer) => { size += chunk.length; if (size > 2_000_000) { doc.destroy(new Error("invoice_pdf_too_large")); return; } chunks.push(chunk); });
    doc.on("error", () => reject(new Error("invoice_pdf_failed")));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
  try {
    const left = 46; const width = doc.page.width - 92; const col = (width - 16) / 2;
    const text = (value: string, x: number, y: number, size = 10, color = "#111111", strong = false, w = width, align: "left" | "right" = "left") =>
      doc.font(strong ? "MaroBold" : "Maro").fontSize(size).fillColor(color).text(value, x, y, { width: w, align, lineGap: 2 });
    doc.rect(left, 46, width, 4).fill("#00ff72");
    text(paid ? "Faturë" : "Konfirmim porosie", left, 69, 27, "#111111", true, 280);
    text("maro.al", left + 300, 69, 27, "#111111", true, width - 300, "right");
    text(LEGAL_ENTITY.name, left + 280, 109, 9, "#666666", false, width - 280, "right");
    text(`Nr. porosisë: ${order.id}`, left, 116, 8.5, "#666666", false, 280);
    text(`Data: ${date}`, left, 133, 10, "#666666");

    type Line = { value: string; strong?: boolean };
    const seller: Line[] = [{ value: LEGAL_ENTITY.name, strong: true }, { value: `NRB ${LEGAL_ENTITY.nrb}` },
      { value: LEGAL_ADDRESS }, { value: LEGAL_ENTITY.phone }, { value: LEGAL_ENTITY.contactEmail }];
    const billing = order.billing_snapshot;
    const buyer: Line[] = [{ value: billing?.fullName ?? order.user_email ?? "—", strong: true },
      { value: billing?.email ?? order.user_email ?? "" }, { value: [billing?.city, billing?.country].filter(Boolean).join(", ") },
      ...(billing?.businessName ? [{ value: billing.businessName }] : []), ...(billing?.nui ? [{ value: `NUI ${billing.nui}` }] : [])].filter(line => line.value);
    const lineHeight = (line: Line) => doc.font(line.strong ? "MaroBold" : "Maro").fontSize(line.strong ? 11 : 10)
      .heightOfString(line.value, { width: col - 28, lineGap: 2 }) + 4;
    const boxHeight = Math.max(144, 48 + Math.max(seller.reduce((n, line) => n + lineHeight(line), 0), buyer.reduce((n, line) => n + lineHeight(line), 0)));
    const card = (label: string, lines: Line[], x: number) => {
      doc.roundedRect(x, 176, col, boxHeight, 9).lineWidth(0.7).stroke("#e5e5e5");
      text(label, x + 14, 191, 8, "#777777", true, col - 28);
      let y = 214;
      for (const line of lines) { const height = lineHeight(line); text(line.value, x + 14, y, line.strong ? 11 : 10, line.strong ? "#111111" : "#666666", !!line.strong, col - 28); y += height; }
    };
    card("SHITËSI", seller, left); card("BLERËSI", buyer, left + col + 16);
    const statusY = 176 + boxHeight + 23;
    text(`Statusi: ${status}${order.provider ? ` · ${order.provider === "raiaccept" ? "RaiAccept" : order.provider}` : ""}`, left, statusY, 10, "#225b35", true);
    const tableY = statusY + 36;
    text("PËRSHKRIMI", left + 6, tableY, 8, "#777777", true, 280);
    text("KREDITE", left + 306, tableY, 8, "#777777", true, 75);
    text("SHUMA", left + 395, tableY, 8, "#777777", true, width - 401, "right");
    doc.moveTo(left, tableY + 22).lineTo(left + width, tableY + 22).stroke("#e5e5e5");
    text(data.label, left + 6, tableY + 34, 10, "#111111", false, 285);
    text(String(order.credits), left + 306, tableY + 34, 10, "#111111", false, 75);
    text(`${(order.amount_cents / 100).toFixed(2)} ${order.currency}`, left + 395, tableY + 34, 10, "#111111", false, width - 401, "right");
    const rowHeight = Math.max(22, doc.font("Maro").fontSize(10).heightOfString(data.label, { width: 285, lineGap: 2 }) + 12);
    const totalY = tableY + 34 + rowHeight + 15;
    doc.roundedRect(left, totalY, width, 56, 9).fill("#effbf4");
    doc.rect(left, totalY + 9, 3, 38).fill("#00ff72");
    text(`Totali: ${(order.amount_cents / 100).toFixed(2)} ${order.currency}`, left + 16, totalY + 15, 20, "#111111", true, width - 32, "right");
    const footerY = totalY + 92;
    doc.moveTo(left, footerY).lineTo(left + width, footerY).stroke("#e5e5e5");
    text("TVSH sipas ligjit të Kosovës, ku aplikohet. Kreditet e blera nuk skadojnë.", left, footerY + 17, 8, "#666666");
    text(`${LEGAL_ENTITY.product} · ${LEGAL_ENTITY.supportEmail}`, left, footerY + 37, 8, "#666666");
    if (!paid) text("Kjo porosi nuk është paguar ende — dokument informativ.", left, footerY + 57, 8, "#666666");
    doc.end();
  } catch { doc.destroy(new Error("invoice_pdf_failed")); }
  return result;
}

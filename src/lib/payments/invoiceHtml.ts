import "server-only";
import { LEGAL_ADDRESS, LEGAL_ENTITY } from "@/components/legal/legal-config";
import { formatEur } from "@/lib/credits/money";
import {
  formatOrderDate,
  ORDER_STATUS_LABELS,
  resolveOrderDisplayStatus,
} from "@/lib/payments/orderDisplay";
import type { CreditOrderRow } from "@/lib/payments/orders";
import { serializeOrder } from "@/lib/payments/orders";

export function buildInvoiceHtml(order: CreditOrderRow): string {
  const o = serializeOrder(order);
  const displayStatus = resolveOrderDisplayStatus(order.status, order.cancel_reason);
  const statusLabel = ORDER_STATUS_LABELS[displayStatus];
  const billing = order.billing_snapshot;
  const invoiceDate = order.paid_at ?? order.created_at;
  const isPaid = order.status === "paid";

  return `<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="utf-8" />
  <title>Faturë ${o.id.slice(0, 8).toUpperCase()} · ${LEGAL_ENTITY.product}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #111; background: #fff; padding: 40px; line-height: 1.5; }
    .wrap { max-width: 720px; margin: 0 auto; }
    h1 { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; }
    .muted { color: #666; font-size: 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; }
    .box { border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px 18px; }
    .box h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 28px; }
    th, td { text-align: left; padding: 12px 8px; border-bottom: 1px solid #eee; font-size: 14px; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; }
    .total { font-size: 18px; font-weight: 700; text-align: right; margin-top: 16px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #f0f0f0; }
    .badge-paid { background: #e8f5e9; color: #1b5e20; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
      <div>
        <h1>${isPaid ? "Faturë" : "Konfirmim porosie"}</h1>
        <p class="muted" style="margin-top:6px;">Nr. porosisë: <strong>${o.id}</strong></p>
        <p class="muted">Data: ${formatOrderDate(invoiceDate)}</p>
      </div>
      <div style="text-align:right;">
        <div style="font-size:20px;font-weight:700;">${LEGAL_ENTITY.product}</div>
        <p class="muted">${LEGAL_ENTITY.name}</p>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <h2>Shitësi</h2>
        <p><strong>${LEGAL_ENTITY.name}</strong></p>
        <p class="muted">NRB ${LEGAL_ENTITY.nrb}</p>
        <p class="muted">${LEGAL_ADDRESS}</p>
        <p class="muted">${LEGAL_ENTITY.phone}</p>
        <p class="muted">${LEGAL_ENTITY.contactEmail}</p>
      </div>
      <div class="box">
        <h2>Blerësi</h2>
        <p><strong>${billing?.fullName ?? order.user_email ?? "—"}</strong></p>
        <p class="muted">${billing?.email ?? order.user_email ?? ""}</p>
        ${billing?.city || billing?.country ? `<p class="muted">${[billing?.city, billing?.country].filter(Boolean).join(", ")}</p>` : ""}
        ${billing?.businessName ? `<p class="muted">${billing.businessName}${billing.nui ? ` · NUI ${billing.nui}` : ""}</p>` : ""}
      </div>
    </div>

    <p style="margin-top:24px;">
      Statusi:
      <span class="badge ${isPaid ? "badge-paid" : ""}">${statusLabel}</span>
      ${o.provider ? `<span class="muted" style="margin-left:8px;">· ${o.provider}</span>` : ""}
    </p>

    <table>
      <thead>
        <tr>
          <th>Përshkrimi</th>
          <th>Kredite</th>
          <th style="text-align:right;">Shuma</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${o.label}${o.itemId ? ` (${o.itemId})` : ""}</td>
          <td>${o.credits.toLocaleString("de-DE")}</td>
          <td style="text-align:right;">${formatEur(o.priceEur)}</td>
        </tr>
      </tbody>
    </table>

    <div class="total">Totali: ${formatEur(o.priceEur)} ${o.currency}</div>

    <div class="footer">
      <p>TVSH sipas ligjit të Kosovës, ku aplikohet. Kreditet e blera nuk skadojnë.</p>
      <p style="margin-top:8px;">${LEGAL_ENTITY.product} · ${LEGAL_ENTITY.supportEmail}</p>
      ${isPaid ? "" : "<p style='margin-top:8px;'><em>Kjo porosi nuk është paguar ende — dokument informativ.</em></p>"}
    </div>
  </div>
</body>
</html>`;
}

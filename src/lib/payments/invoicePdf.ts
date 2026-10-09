import "server-only";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { buildInvoiceHtml } from "./invoiceHtml";
import type { CreditOrderRow } from "./orders";

// Bound memory on the web process. Each render uses a fresh, offline browser.
let rendering = false;

export async function buildInvoicePdf(order: CreditOrderRow, paymentState?: string): Promise<Uint8Array> {
  if (rendering) throw new Error("invoice_renderer_busy");
  rendering = true;
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch({
      args: [...chromium.args, "--disable-background-networking", "--disable-extensions", "--disable-sync", "--no-first-run"],
      executablePath: await chromium.executablePath(),
      headless: true,
      timeout: 15_000,
      protocolTimeout: 20_000,
    });
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", request => { void request.abort("blockedbyclient").catch(() => undefined); });
    await page.setContent(buildInvoiceHtml(order, paymentState), { waitUntil: "domcontentloaded", timeout: 10_000 });
    const bytes = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, timeout: 15_000 });
    if (Buffer.from(bytes.subarray(0, 5)).toString("ascii") !== "%PDF-" || bytes.byteLength > 2_000_000) {
      throw new Error("invoice_pdf_invalid");
    }
    return bytes;
  } finally {
    try { await browser?.close(); }
    catch { browser?.process()?.kill(); }
    rendering = false;
  }
}

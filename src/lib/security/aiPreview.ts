/**
 * Client-safe helpers for sandboxed AI HTML previews.
 * AI-generated website HTML is untrusted and must not share origin with Maro.
 */

/** Minimal sandbox: scripts only. No same-origin, popups, forms, or top navigation. */
export const AI_HTML_PREVIEW_SANDBOX = "allow-scripts";

const PREVIEW_CSP =
  "default-src 'none'; script-src 'unsafe-inline' https://cdn.tailwindcss.com; " +
  "style-src 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src https://fonts.gstatic.com; img-src https: data: blob:; " +
  "connect-src https:; media-src https: data: blob:; frame-src 'none'; object-src 'none'; base-uri 'none';";

/**
 * Wrap untrusted AI HTML in an isolated document with its own restrictive CSP.
 * The parent iframe uses sandbox without allow-same-origin (opaque origin).
 */
export function wrapAiPreviewDocument(html: string): string {
  const trimmed = html.trim();
  const hasDoc = /<html[\s>]/i.test(trimmed);
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">`;

  if (hasDoc) {
    if (/<head[\s>]/i.test(trimmed)) {
      return trimmed.replace(/<head(\s[^>]*)?>/i, (m) => `${m}${cspMeta}`);
    }
    if (/<html(\s[^>]*)?>/i.test(trimmed)) {
      return trimmed.replace(/<html(\s[^>]*)?>/i, (m) => `${m}<head>${cspMeta}</head>`);
    }
  }

  return `<!DOCTYPE html><html><head>${cspMeta}<meta charset="utf-8"></head><body>${trimmed}</body></html>`;
}

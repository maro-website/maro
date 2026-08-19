import { escapeHtml } from "./variables";
import type { EmailStructuredContent } from "./types";

/** Maro brand colors — inlined for email client compatibility. */
const COLORS = {
  canvas: "#f5f5f5",
  surface: "#ffffff",
  ink: "#111111",
  inkSecondary: "#818181",
  inkTertiary: "#c7c7c7",
  brand: "#253fda",
  line: "rgba(17, 17, 17, 0.08)",
} as const;

const FONT_STACK = '"Manrope", "Segoe UI", Arial, Helvetica, sans-serif';
const LOGO_URL = "https://maro.al/maro-logo.svg";
const CONTACT_EMAIL = "info@maro.al";

export interface EmailLayoutOptions {
  previewText?: string;
  contactEmail?: string;
}

function renderParagraphs(paragraphs: string[]): string {
  return paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:${COLORS.ink};letter-spacing:-0.01em;">${escapeHtml(p)}</p>`
    )
    .join("");
}

function renderCta(cta: { label: string; url: string }): string {
  const label = escapeHtml(cta.label);
  const url = escapeHtml(cta.url);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
      <tr>
        <td align="center" bgcolor="${COLORS.brand}" style="border-radius:10px;">
          <a href="${url}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;padding:14px 24px;font-family:${FONT_STACK};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.03em;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

/**
 * Canonical Maro email shell — code-owned, not admin-editable.
 * Uses inline CSS and email-safe fallbacks; does not rely on remote webfonts.
 */
export function renderEmailLayout(
  content: EmailStructuredContent,
  options: EmailLayoutOptions = {}
): string {
  const preview = options.previewText?.trim() ?? "";
  const contact = options.contactEmail?.trim() || CONTACT_EMAIL;

  const heading = escapeHtml(content.heading);
  const paragraphs = renderParagraphs(content.paragraphs);
  const secondary = content.secondaryText
    ? `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:${COLORS.inkSecondary};">${escapeHtml(content.secondaryText)}</p>`
    : "";
  const cta = content.cta ? renderCta(content.cta) : "";
  const footerNote = content.footerNote
    ? `<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:${COLORS.inkSecondary};">${escapeHtml(content.footerNote)}</p>`
    : "";

  const previewBlock = preview
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preview)}&#847;&zwnj;&nbsp;</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>maro.al</title>
  ${previewBlock}
</head>
<body style="margin:0;padding:0;background-color:${COLORS.canvas};font-family:${FONT_STACK};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.canvas};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 0 20px;text-align:left;">
              <img src="${LOGO_URL}" width="120" height="31" alt="maro.al"
                   style="display:block;border:0;outline:none;text-decoration:none;max-width:120px;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="background-color:${COLORS.surface};border:1px solid ${COLORS.line};border-radius:16px;padding:32px 28px;">
              <h1 style="margin:0 0 20px;font-family:${FONT_STACK};font-size:24px;font-weight:700;line-height:1.15;color:${COLORS.ink};letter-spacing:-0.03em;">
                ${heading}
              </h1>
              ${paragraphs}
              ${secondary}
              ${cta}
              ${footerNote}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 0;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${COLORS.inkSecondary};">
                maro.al · NICE Creative Agency SH.P.K.
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:${COLORS.inkTertiary};">
                Pyetje? Shkruaj te <a href="mailto:${escapeHtml(contact)}" style="color:${COLORS.brand};text-decoration:none;">${escapeHtml(contact)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

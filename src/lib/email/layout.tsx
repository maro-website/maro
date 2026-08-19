import { escapeHtml } from "./variables";
import {
  EMAIL_LOGO_HEIGHT,
  EMAIL_LOGO_WIDTH,
  resolveEmailHomeUrl,
  resolveEmailLogoUrl,
} from "./assets";
import type { EmailStructuredContent } from "./types";

/**
 * Inlined, email-client-safe palette.
 * Avoid low-contrast greys — Gmail dark mode can wash them out further.
 */
const COLORS = {
  canvas: "#f3f4f6",
  surface: "#ffffff",
  ink: "#111111",
  inkSecondary: "#374151",
  inkFooter: "#4b5563",
  brand: "#253fda",
  brandDark: "#1d34b8",
  line: "#e5e7eb",
  ctaText: "#ffffff",
} as const;

const FONT_STACK = '"Manrope", "Segoe UI", Arial, Helvetica, sans-serif';

export interface EmailLayoutOptions {
  previewText?: string;
  contactEmail?: string;
  /** Override for tests — defaults to trusted public HTTPS origin. */
  assetOrigin?: string;
}

function renderParagraphs(paragraphs: string[]): string {
  return paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLORS.ink};letter-spacing:-0.01em;">${escapeHtml(p)}</p>`
    )
    .join("");
}

/** Bulletproof CTA — code-owned colours, not admin-editable. */
function renderCta(cta: { label: string; url: string }): string {
  const label = escapeHtml(cta.label);
  const url = escapeHtml(cta.url);
  const bg = COLORS.brand;
  const fg = COLORS.ctaText;

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 12px;">
      <tr>
        <td align="center">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:office" href="${url}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="17%" strokecolor="${bg}" fillcolor="${bg}">
            <w:anchorlock/>
            <center style="color:${fg};font-family:Segoe UI, Arial, sans-serif;font-size:16px;font-weight:bold;">${label}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" bgcolor="${bg}" style="background-color:${bg};border:2px solid ${bg};border-radius:8px;">
                <a href="${url}" target="_blank" rel="noopener noreferrer"
                   style="display:inline-block;min-width:180px;padding:14px 28px;font-family:${FONT_STACK};font-size:16px;font-weight:700;line-height:1.25;color:${fg};background-color:${bg};border-radius:8px;text-decoration:none;text-align:center;mso-line-height-rule:exactly;-webkit-text-size-adjust:none;">
                  ${label}
                </a>
              </td>
            </tr>
          </table>
          <!--<![endif]-->
        </td>
      </tr>
    </table>`;
}

function renderLogoBlock(homeUrl: string, logoUrl: string): string {
  const home = escapeHtml(homeUrl);

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding:0 0 20px;text-align:left;">
          <a href="${home}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;">
            <img src="${escapeHtml(logoUrl)}" width="${EMAIL_LOGO_WIDTH}" height="${EMAIL_LOGO_HEIGHT}" alt="maro"
                 style="display:block;border:0;outline:none;text-decoration:none;width:${EMAIL_LOGO_WIDTH}px;height:${EMAIL_LOGO_HEIGHT}px;max-width:100%;font-family:${FONT_STACK};font-size:20px;font-weight:800;line-height:${EMAIL_LOGO_HEIGHT}px;color:${COLORS.ink};" />
          </a>
        </td>
      </tr>
    </table>`;
}

/**
 * Canonical Maro email shell — code-owned, not admin-editable.
 * Table-based layout with inline CSS; no CSS variables, flex, grid, or scripts.
 */
export function renderEmailLayout(
  content: EmailStructuredContent,
  options: EmailLayoutOptions = {}
): string {
  const preview = options.previewText?.trim() ?? "";
  const contact = options.contactEmail?.trim() || "info@maro.al";
  const assetOrigin = options.assetOrigin;
  const logoUrl = resolveEmailLogoUrl(assetOrigin);
  const homeUrl = resolveEmailHomeUrl(assetOrigin);

  const heading = escapeHtml(content.heading);
  const paragraphs = renderParagraphs(content.paragraphs);
  const secondary = content.secondaryText
    ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${COLORS.inkSecondary};">${escapeHtml(content.secondaryText)}</p>`
    : "";
  const cta = content.cta ? renderCta(content.cta) : "";
  const footerNote = content.footerNote
    ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:${COLORS.inkSecondary};">${escapeHtml(content.footerNote)}</p>`
    : "";

  const previewBlock = preview
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preview)}&#847;&zwnj;&nbsp;</div>`
    : "";

  const contactMailto = escapeHtml(contact);

  return `<!DOCTYPE html>
<html lang="sq" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>maro.al</title>
  ${previewBlock}
</head>
<body style="margin:0;padding:0;background-color:${COLORS.canvas};font-family:${FONT_STACK};color:${COLORS.ink};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.canvas}" style="background-color:${COLORS.canvas};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td>
              ${renderLogoBlock(homeUrl, logoUrl)}
            </td>
          </tr>
          <tr>
            <td bgcolor="${COLORS.surface}" style="background-color:${COLORS.surface};border:1px solid ${COLORS.line};border-radius:16px;padding:32px 28px;">
              <h1 style="margin:0 0 20px;font-family:${FONT_STACK};font-size:24px;font-weight:700;line-height:1.2;color:${COLORS.ink};letter-spacing:-0.03em;">
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
              <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:${COLORS.inkFooter};font-weight:500;">
                maro.al · NICE Creative Agency SH.P.K.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:${COLORS.inkSecondary};font-weight:500;">
                Pyetje? Shkruaj te <a href="mailto:${contactMailto}" style="color:${COLORS.brandDark};font-weight:700;text-decoration:underline;">${contactMailto}</a>
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

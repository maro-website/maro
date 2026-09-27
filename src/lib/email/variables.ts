import { assertRegisteredTemplateKey, type EmailTemplateVariableName } from "./templateRegistry";
import type { EmailStructuredContent } from "./types";

const VARIABLE_PATTERN = /\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi;

const MAX_TEXT_LENGTH = 4_000;
const MAX_URL_LENGTH = 2_048;

export class EmailVariableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailVariableError";
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function containsRawHtml(value: string): boolean {
  return /<\s*\/?\s*[a-z][^>]*>/i.test(value);
}

export function validateStructuredContent(content: EmailStructuredContent): void {
  if (!content.heading?.trim()) {
    throw new EmailVariableError("invalid_content:heading_required");
  }
  if (content.heading.length > 200) {
    throw new EmailVariableError("invalid_content:heading_too_long");
  }
  if (containsRawHtml(content.heading)) {
    throw new EmailVariableError("invalid_content:heading_html_forbidden");
  }

  if (!Array.isArray(content.paragraphs) || content.paragraphs.length === 0) {
    throw new EmailVariableError("invalid_content:paragraphs_required");
  }
  for (const p of content.paragraphs) {
    if (typeof p !== "string" || !p.trim()) {
      throw new EmailVariableError("invalid_content:paragraph_empty");
    }
    if (p.length > MAX_TEXT_LENGTH) {
      throw new EmailVariableError("invalid_content:paragraph_too_long");
    }
    if (containsRawHtml(p)) {
      throw new EmailVariableError("invalid_content:paragraph_html_forbidden");
    }
  }

  if (content.secondaryText != null) {
    if (containsRawHtml(content.secondaryText)) {
      throw new EmailVariableError("invalid_content:secondary_html_forbidden");
    }
    if (content.secondaryText.length > MAX_TEXT_LENGTH) {
      throw new EmailVariableError("invalid_content:secondary_too_long");
    }
  }

  if (content.footerNote != null) {
    if (containsRawHtml(content.footerNote)) {
      throw new EmailVariableError("invalid_content:footer_html_forbidden");
    }
    if (content.footerNote.length > MAX_TEXT_LENGTH) {
      throw new EmailVariableError("invalid_content:footer_too_long");
    }
  }

  if (content.cta != null) {
    if (!content.cta.label?.trim() || !content.cta.url?.trim()) {
      throw new EmailVariableError("invalid_content:cta_incomplete");
    }
    if (containsRawHtml(content.cta.label)) {
      throw new EmailVariableError("invalid_content:cta_label_html_forbidden");
    }
  }
}

export function collectTemplatePlaceholders(text: string): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(VARIABLE_PATTERN.source, "gi");
  while ((match = re.exec(text)) !== null) {
    found.add(match[1]);
  }
  return [...found];
}

export function collectContentPlaceholders(content: EmailStructuredContent): string[] {
  const parts = [
    content.heading,
    ...content.paragraphs,
    content.secondaryText ?? "",
    content.footerNote ?? "",
    content.cta?.label ?? "",
    content.cta?.url ?? "",
  ];
  const all = new Set<string>();
  for (const part of parts) {
    for (const name of collectTemplatePlaceholders(part)) {
      all.add(name);
    }
  }
  return [...all];
}

export function validateVariablesForTemplate(
  templateKey: string,
  variables: Record<string, string>,
  content?: EmailStructuredContent
): void {
  const entry = assertRegisteredTemplateKey(templateKey);
  const allowed = new Set<string>(entry.allowedVariables);

  for (const key of Object.keys(variables)) {
    if (!allowed.has(key)) {
      throw new EmailVariableError(`unknown_variable:${key}`);
    }
  }

  for (const required of entry.requiredVariables) {
    const value = variables[required];
    if (value == null || String(value).trim() === "") {
      throw new EmailVariableError(`missing_required:${required}`);
    }
  }

  if (content) {
    for (const placeholder of collectContentPlaceholders(content)) {
      if (!allowed.has(placeholder)) {
        throw new EmailVariableError(`unknown_placeholder:${placeholder}`);
      }
    }
  }

  for (const urlVar of entry.urlVariables) {
    const raw = variables[urlVar];
    if (raw != null && String(raw).trim() !== "") {
      validateHttpsUrl(String(raw), urlVar);
    }
  }
}

export function validateHttpsUrl(url: string, field = "url"): void {
  if (url.length > MAX_URL_LENGTH) {
    throw new EmailVariableError(`invalid_url:${field}:too_long`);
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new EmailVariableError(`invalid_url:${field}:malformed`);
  }
  if (parsed.protocol !== "https:") {
    throw new EmailVariableError(`invalid_url:${field}:https_required`);
  }
}

/** Interpolate {{var}} placeholders once — no nesting/recursion. */
export function interpolateTemplateString(
  template: string,
  variables: Record<string, string>,
  urlVariableNames: readonly EmailTemplateVariableName[]
): string {
  const urlSet = new Set<string>(urlVariableNames);
  return template.replace(VARIABLE_PATTERN, (_full, rawName: string) => {
    const name = rawName as EmailTemplateVariableName;
    const value = variables[name];
    if (value == null) return "";
    if (urlSet.has(name)) {
      validateHttpsUrl(value, name);
      return value;
    }
    return escapeHtml(value);
  });
}

export function interpolateStructuredContent(
  content: EmailStructuredContent,
  variables: Record<string, string>,
  urlVariableNames: readonly EmailTemplateVariableName[]
): EmailStructuredContent {
  const interpolate = (text: string) =>
    interpolateTemplateString(text, variables, urlVariableNames);

  const cta =
    content.cta != null
      ? {
          label: interpolate(content.cta.label),
          url: interpolate(content.cta.url),
        }
      : undefined;

  if (cta?.url) {
    validateHttpsUrl(cta.url, "cta.url");
  }

  return {
    heading: interpolate(content.heading),
    paragraphs: content.paragraphs.map((p) => interpolate(p)),
    secondaryText: content.secondaryText ? interpolate(content.secondaryText) : undefined,
    footerNote: content.footerNote ? interpolate(content.footerNote) : undefined,
    cta,
  };
}

export function plainTextFromHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

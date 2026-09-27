import { getTemplateRegistryEntry } from "./templateRegistry";
import { renderEmailLayout } from "./layout";
import {
  interpolateStructuredContent,
  interpolateTemplateString,
  plainTextFromHtml,
  validateStructuredContent,
  validateVariablesForTemplate,
} from "./variables";
import type { EmailStructuredContent, RenderEmailInput, RenderEmailResult } from "./types";

export class EmailRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailRenderError";
  }
}

function resolveContent(input: RenderEmailInput): {
  subject: string;
  previewText: string;
  content: EmailStructuredContent;
} {
  const entry = getTemplateRegistryEntry(input.templateKey);
  if (!entry) {
    throw new EmailRenderError(`unknown_template:${input.templateKey}`);
  }

  const subject = input.subjectOverride ?? entry.fallbackSubject;
  const previewText = input.previewTextOverride ?? entry.fallbackPreviewText;
  const content = input.contentOverride ?? entry.fallbackContent;

  validateStructuredContent(content);
  validateVariablesForTemplate(input.templateKey, input.variables, content);

  return { subject, previewText, content };
}

/** Render a registered template to HTML + plain text. Does not send or touch the database. */
export function renderEmail(input: RenderEmailInput): RenderEmailResult {
  const entry = getTemplateRegistryEntry(input.templateKey);
  if (!entry) {
    throw new EmailRenderError(`unknown_template:${input.templateKey}`);
  }

  const resolved = resolveContent(input);
  const interpolatedContent = interpolateStructuredContent(
    resolved.content,
    input.variables,
    entry.urlVariables
  );

  const subject = interpolateTemplateString(resolved.subject, input.variables, entry.urlVariables);
  const previewText = interpolateTemplateString(
    resolved.previewText,
    input.variables,
    entry.urlVariables
  );

  const html = renderEmailLayout(interpolatedContent, { previewText });
  const text = plainTextFromHtml(html);

  return { subject, previewText, html, text };
}

/** Render using DB-resolved live template content (falls back to registry on invalid DB row). */
export function renderEmailFromResolved(
  input: RenderEmailInput & {
    subject: string;
    previewText: string;
    content: EmailStructuredContent;
  }
): RenderEmailResult {
  return renderEmail({
    templateKey: input.templateKey,
    locale: input.locale,
    variables: input.variables,
    subjectOverride: input.subject,
    previewTextOverride: input.previewText,
    contentOverride: input.content,
  });
}

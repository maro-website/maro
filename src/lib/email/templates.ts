import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  assertRegisteredTemplateKey,
  getTemplateRegistryEntry,
  isAuthTemplateKey,
} from "./templateRegistry";
import { validateStructuredContent } from "./variables";
import type {
  EmailLocale,
  EmailStructuredContent,
  EmailTemplateRow,
  ResolvedEmailTemplate,
} from "./types";

export class EmailTemplateServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailTemplateServiceError";
  }
}

function mapTemplateRow(row: Record<string, unknown>): EmailTemplateRow {
  return {
    id: row.id as string,
    templateKey: row.template_key as string,
    name: row.name as string,
    category: row.category as EmailTemplateRow["category"],
    locale: row.locale as EmailLocale,
    enabled: Boolean(row.enabled),
    isSystem: Boolean(row.is_system),
    liveVersionId: (row.live_version_id as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function parseStructuredContent(raw: unknown): EmailStructuredContent {
  if (!raw || typeof raw !== "object") {
    throw new EmailTemplateServiceError("invalid_content:not_object");
  }
  const obj = raw as Record<string, unknown>;
  return {
    heading: String(obj.heading ?? ""),
    paragraphs: Array.isArray(obj.paragraphs) ? obj.paragraphs.map(String) : [],
    cta:
      obj.cta && typeof obj.cta === "object"
        ? {
            label: String((obj.cta as Record<string, unknown>).label ?? ""),
            url: String((obj.cta as Record<string, unknown>).url ?? ""),
          }
        : undefined,
    secondaryText: obj.secondaryText != null ? String(obj.secondaryText) : undefined,
    footerNote: obj.footerNote != null ? String(obj.footerNote) : undefined,
  };
}

export async function getLiveEmailTemplate(
  templateKey: string,
  locale: EmailLocale = "sq"
): Promise<ResolvedEmailTemplate | null> {
  assertRegisteredTemplateKey(templateKey);

  const admin = getSupabaseAdmin();
  const { data: templateRow } = await admin
    .from("email_templates")
    .select("*")
    .eq("template_key", templateKey)
    .eq("locale", locale)
    .maybeSingle();

  if (!templateRow) return null;

  const template = mapTemplateRow(templateRow as Record<string, unknown>);
  if (!template.enabled && !template.isSystem) return null;

  if (!template.liveVersionId) return null;

  const { data: versionRow } = await admin
    .from("email_template_versions")
    .select("*")
    .eq("id", template.liveVersionId)
    .eq("status", "live")
    .maybeSingle();

  if (!versionRow) return null;

  try {
    const content = parseStructuredContent(versionRow.content);
    validateStructuredContent(content);
    return {
      templateKey: template.templateKey,
      locale: template.locale,
      category: template.category,
      isSystem: template.isSystem,
      subject: String(versionRow.subject),
      previewText: String(versionRow.preview_text ?? ""),
      content,
      versionId: versionRow.id as string,
    };
  } catch {
    return null;
  }
}

export async function resolveEmailTemplateForSend(
  templateKey: string,
  locale: EmailLocale = "sq"
): Promise<ResolvedEmailTemplate> {
  const registry = getTemplateRegistryEntry(templateKey);
  if (!registry) {
    throw new EmailTemplateServiceError(`unknown_template:${templateKey}`);
  }

  const live = await getLiveEmailTemplate(templateKey, locale);
  if (live) return live;

  return {
    templateKey,
    locale,
    category: registry.category,
    isSystem: true,
    subject: registry.fallbackSubject,
    previewText: registry.fallbackPreviewText,
    content: registry.fallbackContent,
    versionId: "registry-fallback",
  };
}

/** Guard: system auth templates cannot be disabled or deleted via service layer. */
export function assertTemplateMutationAllowed(
  template: Pick<EmailTemplateRow, "isSystem" | "templateKey">,
  action: "disable" | "delete"
): void {
  if (template.isSystem && isAuthTemplateKey(template.templateKey)) {
    throw new EmailTemplateServiceError(`system_auth_template_${action}_forbidden`);
  }
}

export async function assertProductEmailEnabled(): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("email_settings").select("product_email_enabled").eq("id", "default").maybeSingle();
  if (data && data.product_email_enabled === false) {
    throw new EmailTemplateServiceError("product_email_disabled");
  }
}

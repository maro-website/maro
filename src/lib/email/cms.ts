import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  getTemplateRegistryEntry,
  assertRegisteredTemplateKey,
} from "./templateRegistry";
import {
  assertTemplateMutationAllowed,
  EmailTemplateServiceError,
} from "./templates";
import {
  validateStructuredContent,
  collectContentPlaceholders,
} from "./variables";
import type {
  EmailStructuredContent,
  EmailTemplateCategory,
  EmailVersionStatus,
} from "./types";

export interface EmailTemplateListItem {
  id: string;
  templateKey: string;
  name: string;
  category: EmailTemplateCategory;
  locale: string;
  isSystem: boolean;
  enabled: boolean;
  liveVersionId: string | null;
  liveVersionLabel: string | null;
  updatedAt: string;
  canDisable: boolean;
  canDelete: boolean;
}

export interface EmailTemplateVersionRow {
  id: string;
  templateId: string;
  versionLabel: string;
  status: EmailVersionStatus;
  subject: string;
  previewText: string;
  content: EmailStructuredContent;
  allowedVariables: string[];
  changeNote: string;
  createdBy: string | null;
  publishedBy: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface EmailTemplateDetail extends EmailTemplateListItem {
  draftVersionId: string | null;
  versions: EmailTemplateVersionRow[];
  registry: {
    allowedVariables: string[];
    requiredVariables: string[];
    optionalVariables: string[];
    urlVariables: string[];
    canDisable: boolean;
  } | null;
}

function mapContent(raw: unknown): EmailStructuredContent {
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

function mapVersionRow(row: Record<string, unknown>): EmailTemplateVersionRow {
  return {
    id: row.id as string,
    templateId: row.template_id as string,
    versionLabel: row.version_label as string,
    status: row.status as EmailVersionStatus,
    subject: row.subject as string,
    previewText: (row.preview_text as string) ?? "",
    content: mapContent(row.content),
    allowedVariables: (row.allowed_variables as string[]) ?? [],
    changeNote: (row.change_note as string) ?? "",
    createdBy: (row.created_by as string) ?? null,
    publishedBy: (row.published_by as string) ?? null,
    createdAt: row.created_at as string,
    publishedAt: (row.published_at as string) ?? null,
  };
}

function templateCapabilities(templateKey: string, isSystem: boolean) {
  const registry = getTemplateRegistryEntry(templateKey);
  const canDisable = registry ? Boolean(registry.canDisable) : !isSystem;
  const canDelete = isSystem && templateKey.startsWith("auth.") ? false : !isSystem;
  return { canDisable, canDelete };
}

function mapListItem(
  row: Record<string, unknown>,
  liveVersion: Record<string, unknown> | null
): EmailTemplateListItem {
  const templateKey = row.template_key as string;
  const isSystem = Boolean(row.is_system);
  const caps = templateCapabilities(templateKey, isSystem);
  return {
    id: row.id as string,
    templateKey,
    name: row.name as string,
    category: row.category as EmailTemplateCategory,
    locale: row.locale as string,
    isSystem,
    enabled: Boolean(row.enabled),
    liveVersionId: (row.live_version_id as string) ?? null,
    liveVersionLabel: liveVersion ? (liveVersion.version_label as string) : null,
    updatedAt: row.updated_at as string,
    canDisable: caps.canDisable,
    canDelete: caps.canDelete,
  };
}

export function validateTemplateVersionContent(
  templateKey: string,
  input: {
    subject: string;
    previewText: string;
    content: EmailStructuredContent;
  }
): void {
  assertRegisteredTemplateKey(templateKey);
  if (!input.subject.trim()) {
    throw new EmailTemplateServiceError("subject_required");
  }
  validateStructuredContent(input.content);

  const entry = assertRegisteredTemplateKey(templateKey);
  for (const placeholder of collectContentPlaceholders(input.content)) {
    if (!entry.allowedVariables.includes(placeholder as (typeof entry.allowedVariables)[number])) {
      throw new EmailTemplateServiceError(`unknown_placeholder:${placeholder}`);
    }
  }

  if (input.content.cta?.url) {
    const registry = getTemplateRegistryEntry(templateKey);
    if (registry) {
      for (const ph of collectContentPlaceholders(input.content)) {
        if (
          input.content.cta.url.includes(`{{${ph}}}`) &&
          !registry.urlVariables.includes(ph as (typeof registry.urlVariables)[number])
        ) {
          throw new EmailTemplateServiceError(`cta_url_invalid_variable:${ph}`);
        }
      }
    }
  }
}

export async function listEmailTemplates(): Promise<EmailTemplateListItem[]> {
  const admin = getSupabaseAdmin();
  const { data: templates } = await admin
    .from("email_templates")
    .select("*")
    .order("category")
    .order("template_key");

  const liveIds = (templates ?? [])
    .map((t) => t.live_version_id as string | null)
    .filter(Boolean) as string[];

  const liveMap = new Map<string, Record<string, unknown>>();
  if (liveIds.length > 0) {
    const { data: versions } = await admin.from("email_template_versions").select("*").in("id", liveIds);
    for (const v of versions ?? []) {
      liveMap.set(v.id as string, v as Record<string, unknown>);
    }
  }

  return (templates ?? []).map((t) =>
    mapListItem(
      t as Record<string, unknown>,
      t.live_version_id ? liveMap.get(t.live_version_id as string) ?? null : null
    )
  );
}

export async function getEmailTemplateDetail(templateId: string): Promise<EmailTemplateDetail | null> {
  const admin = getSupabaseAdmin();
  const { data: template } = await admin.from("email_templates").select("*").eq("id", templateId).maybeSingle();
  if (!template) return null;

  const { data: versions } = await admin
    .from("email_template_versions")
    .select("*")
    .eq("template_id", templateId)
    .order("created_at", { ascending: false });

  const liveVersion = (versions ?? []).find((v) => v.id === template.live_version_id) ?? null;
  const draftVersion = (versions ?? []).find((v) => v.status === "draft") ?? null;
  const registry = getTemplateRegistryEntry(template.template_key as string);

  return {
    ...mapListItem(template as Record<string, unknown>, liveVersion as Record<string, unknown> | null),
    draftVersionId: (draftVersion?.id as string) ?? null,
    versions: (versions ?? []).map((v) => mapVersionRow(v as Record<string, unknown>)),
    registry: registry
      ? {
          allowedVariables: [...registry.allowedVariables],
          requiredVariables: [...registry.requiredVariables],
          optionalVariables: [...registry.optionalVariables],
          urlVariables: [...registry.urlVariables],
          canDisable: Boolean(registry.canDisable),
        }
      : null,
  };
}

export async function getEmailTemplateVersion(versionId: string): Promise<EmailTemplateVersionRow | null> {
  const { data } = await getSupabaseAdmin()
    .from("email_template_versions")
    .select("*")
    .eq("id", versionId)
    .maybeSingle();
  if (!data) return null;
  return mapVersionRow(data as Record<string, unknown>);
}

async function nextVersionLabel(templateId: string): Promise<string> {
  const { data } = await getSupabaseAdmin()
    .from("email_template_versions")
    .select("version_label")
    .eq("template_id", templateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const current = data?.version_label as string | undefined;
  if (!current) return "v1";
  const match = /^v(\d+)$/.exec(current);
  if (match) return `v${Number(match[1]) + 1}`;
  return `v${Date.now()}`;
}

export async function ensureEditableDraft(
  templateId: string,
  actorId: string
): Promise<EmailTemplateVersionRow> {
  const admin = getSupabaseAdmin();
  const detail = await getEmailTemplateDetail(templateId);
  if (!detail) throw new EmailTemplateServiceError("template_not_found");

  const existingDraft = detail.versions.find((v) => v.status === "draft");
  if (existingDraft) return existingDraft;

  const live = detail.versions.find((v) => v.status === "live" && v.id === detail.liveVersionId);
  if (!live) throw new EmailTemplateServiceError("live_version_not_found");

  const versionLabel = await nextVersionLabel(templateId);
  const registry = getTemplateRegistryEntry(detail.templateKey);

  const { data, error } = await admin
    .from("email_template_versions")
    .insert({
      template_id: templateId,
      version_label: versionLabel,
      status: "draft",
      subject: live.subject,
      preview_text: live.previewText,
      content: live.content,
      allowed_variables: registry ? [...registry.allowedVariables] : live.allowedVariables,
      change_note: `Draft created from ${live.versionLabel}`,
      created_by: actorId,
    })
    .select("*")
    .single();

  if (error) throw new EmailTemplateServiceError(error.message);
  return mapVersionRow(data as Record<string, unknown>);
}

export async function updateDraftVersion(
  versionId: string,
  input: {
    subject: string;
    previewText: string;
    content: EmailStructuredContent;
    changeNote?: string;
  },
  templateKey: string
): Promise<EmailTemplateVersionRow> {
  const admin = getSupabaseAdmin();
  const { data: current } = await admin.from("email_template_versions").select("*").eq("id", versionId).maybeSingle();
  if (!current) throw new EmailTemplateServiceError("version_not_found");
  if (current.status !== "draft") throw new EmailTemplateServiceError("cannot_edit_non_draft");

  validateTemplateVersionContent(templateKey, input);

  const registry = getTemplateRegistryEntry(templateKey);
  const { data, error } = await admin
    .from("email_template_versions")
    .update({
      subject: input.subject.trim(),
      preview_text: input.previewText.trim(),
      content: input.content,
      allowed_variables: registry ? [...registry.allowedVariables] : current.allowed_variables,
      change_note: input.changeNote?.trim() ?? current.change_note,
    })
    .eq("id", versionId)
    .select("*")
    .single();

  if (error) throw new EmailTemplateServiceError(error.message);

  await admin
    .from("email_templates")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", current.template_id as string);

  return mapVersionRow(data as Record<string, unknown>);
}

export async function publishDraftVersion(
  templateId: string,
  versionId: string,
  actorId: string
): Promise<EmailTemplateVersionRow> {
  const admin = getSupabaseAdmin();
  const detail = await getEmailTemplateDetail(templateId);
  if (!detail) throw new EmailTemplateServiceError("template_not_found");

  const target = detail.versions.find((v) => v.id === versionId);
  if (!target) throw new EmailTemplateServiceError("version_not_found");
  if (target.status !== "draft") throw new EmailTemplateServiceError("only_draft_publishable");

  validateTemplateVersionContent(detail.templateKey, {
    subject: target.subject,
    previewText: target.previewText,
    content: target.content,
  });

  const now = new Date().toISOString();

  const { data: archivedLive } = await admin
    .from("email_template_versions")
    .update({ status: "archived" })
    .eq("template_id", templateId)
    .eq("status", "live")
    .select("id");

  if (archivedLive && archivedLive.length > 1) {
    throw new EmailTemplateServiceError("multiple_live_versions");
  }

  const { data: published, error: pubErr } = await admin
    .from("email_template_versions")
    .update({
      status: "live",
      published_by: actorId,
      published_at: now,
    })
    .eq("id", versionId)
    .select("*")
    .single();

  if (pubErr) throw new EmailTemplateServiceError(pubErr.message);

  const { error: tplErr } = await admin
    .from("email_templates")
    .update({ live_version_id: versionId, updated_at: now })
    .eq("id", templateId);

  if (tplErr) throw new EmailTemplateServiceError(tplErr.message);

  return mapVersionRow(published as Record<string, unknown>);
}

export async function restoreVersionToDraft(
  templateId: string,
  versionId: string,
  actorId: string
): Promise<EmailTemplateVersionRow> {
  const admin = getSupabaseAdmin();
  const detail = await getEmailTemplateDetail(templateId);
  if (!detail) throw new EmailTemplateServiceError("template_not_found");

  const source = detail.versions.find((v) => v.id === versionId);
  if (!source) throw new EmailTemplateServiceError("version_not_found");
  if (source.status === "draft") throw new EmailTemplateServiceError("cannot_restore_draft");

  const existingDraft = detail.versions.find((v) => v.status === "draft");
  if (existingDraft) {
    return updateDraftVersion(
      existingDraft.id,
      {
        subject: source.subject,
        previewText: source.previewText,
        content: source.content,
        changeNote: `Restored from ${source.versionLabel}`,
      },
      detail.templateKey
    );
  }

  const versionLabel = await nextVersionLabel(templateId);
  const registry = getTemplateRegistryEntry(detail.templateKey);

  const { data, error } = await admin
    .from("email_template_versions")
    .insert({
      template_id: templateId,
      version_label: versionLabel,
      status: "draft",
      subject: source.subject,
      preview_text: source.previewText,
      content: source.content,
      allowed_variables: registry ? [...registry.allowedVariables] : source.allowedVariables,
      change_note: `Restored from ${source.versionLabel}`,
      created_by: actorId,
    })
    .select("*")
    .single();

  if (error) throw new EmailTemplateServiceError(error.message);
  return mapVersionRow(data as Record<string, unknown>);
}

export async function setTemplateEnabled(templateId: string, enabled: boolean): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data: template } = await admin.from("email_templates").select("*").eq("id", templateId).maybeSingle();
  if (!template) throw new EmailTemplateServiceError("template_not_found");

  if (!enabled) {
    assertTemplateMutationAllowed(
      { isSystem: Boolean(template.is_system), templateKey: template.template_key as string },
      "disable"
    );
  }

  const { error } = await admin
    .from("email_templates")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", templateId);
  if (error) throw new EmailTemplateServiceError(error.message);
}

export interface EmailLogListItem {
  id: string;
  templateKey: string;
  recipientDomain: string | null;
  provider: string;
  providerMessageId: string | null;
  status: string;
  errorCategory: string | null;
  createdAt: string;
}

export async function listEmailLogs(input: {
  status?: string;
  templateKey?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: EmailLogListItem[]; total: number }> {
  const admin = getSupabaseAdmin();
  const limit = Math.min(input.limit ?? 50, 100);
  const offset = input.offset ?? 0;

  let query = admin.from("email_logs").select("*", { count: "exact" });
  if (input.status) query = query.eq("status", input.status);
  if (input.templateKey) query = query.eq("template_key", input.templateKey);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new EmailTemplateServiceError(error.message);

  return {
    logs: (data ?? []).map((row) => ({
      id: row.id as string,
      templateKey: row.template_key as string,
      recipientDomain: (row.recipient_domain as string) ?? null,
      provider: row.provider as string,
      providerMessageId: (row.provider_message_id as string) ?? null,
      status: row.status as string,
      errorCategory: (row.error_category as string) ?? null,
      createdAt: row.created_at as string,
    })),
    total: count ?? 0,
  };
}

export interface EmailOverviewStats {
  sentToday: number;
  failedToday: number;
  queuedProduct: number;
  failedQueue: number;
  lastSentAt: string | null;
  lastFailureAt: string | null;
}

export async function getEmailOverviewStats(): Promise<EmailOverviewStats> {
  const admin = getSupabaseAdmin();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const since = startOfDay.toISOString();

  const [{ count: sentToday }, { count: failedToday }, { data: lastSent }, { data: lastFailed }] =
    await Promise.all([
      admin.from("email_logs").select("*", { count: "exact", head: true }).eq("status", "sent").gte("created_at", since),
      admin.from("email_logs").select("*", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since),
      admin.from("email_logs").select("created_at").eq("status", "sent").order("created_at", { ascending: false }).limit(1),
      admin.from("email_logs").select("created_at").eq("status", "failed").order("created_at", { ascending: false }).limit(1),
    ]);

  const [{ count: queuedProduct }, { count: failedQueue }] = await Promise.all([
    admin.from("email_outbox").select("*", { count: "exact", head: true }).eq("status", "queued"),
    admin.from("email_outbox").select("*", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  return {
    sentToday: sentToday ?? 0,
    failedToday: failedToday ?? 0,
    queuedProduct: queuedProduct ?? 0,
    failedQueue: failedQueue ?? 0,
    lastSentAt: (lastSent?.[0]?.created_at as string) ?? null,
    lastFailureAt: (lastFailed?.[0]?.created_at as string) ?? null,
  };
}

export async function updateEmailSettingsRow(input: {
  fromName: string;
  fromEmail: string;
  replyTo: string;
  productEmailEnabled: boolean;
}): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("email_settings")
    .update({
      from_name: input.fromName.trim(),
      from_email: input.fromEmail.trim().toLowerCase(),
      reply_to: input.replyTo.trim().toLowerCase(),
      product_email_enabled: input.productEmailEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default");

  if (error) throw new EmailTemplateServiceError(error.message);
}

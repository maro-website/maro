"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import type { EmailStructuredContent } from "@/lib/email/types";
import { cn } from "@/lib/utils/cn";
import { ChevronDown, ChevronUp, Eye, History, Mail, Pencil, Send, X } from "lucide-react";

type WorkspaceTab = "overview" | "templates" | "logs" | "settings";

interface OverviewData {
  provider: string;
  providerConfiguration: "configured" | "missing";
  from: string;
  replyTo: string;
  productEmailSending: "enabled" | "disabled";
  auth: string;
  hookConfiguration: "configured" | "missing";
  stats: {
    sentToday: number;
    failedToday: number;
    queuedProduct: number;
    failedQueue: number;
    lastSentAt: string | null;
    lastFailureAt: string | null;
  };
}

interface TemplateListItem {
  id: string;
  templateKey: string;
  name: string;
  category: string;
  locale: string;
  isSystem: boolean;
  enabled: boolean;
  liveVersionId: string | null;
  liveVersionLabel: string | null;
  updatedAt: string;
  canDisable: boolean;
  canDelete: boolean;
}

interface TemplateVersion {
  id: string;
  versionLabel: string;
  status: "draft" | "live" | "archived";
  subject: string;
  previewText: string;
  content: EmailStructuredContent;
  changeNote: string;
  createdAt: string;
  publishedAt: string | null;
}

interface TemplateDetail extends TemplateListItem {
  draftVersionId: string | null;
  versions: TemplateVersion[];
  registry: {
    allowedVariables: string[];
    requiredVariables: string[];
    optionalVariables: string[];
    urlVariables: string[];
    canDisable: boolean;
  } | null;
}

interface LogRow {
  id: string;
  templateKey: string;
  recipientDomain: string | null;
  provider: string;
  providerMessageId: string | null;
  status: string;
  errorCategory: string | null;
  createdAt: string;
}

interface SettingsData {
  fromName: string;
  fromEmail: string;
  replyTo: string;
  provider: string;
  productEmailEnabled: boolean;
}

function StatusPill({ ok, labelOk, labelBad }: { ok: boolean; labelOk: string; labelBad: string }) {
  return (
    <Badge tone={ok ? "success" : "neutral"} className={ok ? "text-success" : "text-warning"}>
      {ok ? labelOk : labelBad}
    </Badge>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("sq-AL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function categoryLabel(category: string): string {
  if (category === "auth") return "Auth";
  if (category === "account") return "Account";
  if (category === "commerce") return "Commerce";
  if (category === "workspace") return "Workspace";
  return category;
}

export function EmailsWorkspace({ tab }: { tab: WorkspaceTab }) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [overview, setOverview] = React.useState<OverviewData | null>(null);
  const [templates, setTemplates] = React.useState<TemplateListItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState<TemplateDetail | null>(null);
  const [editorVersionId, setEditorVersionId] = React.useState<string | null>(null);
  const [editorSubject, setEditorSubject] = React.useState("");
  const [editorPreviewText, setEditorPreviewText] = React.useState("");
  const [editorContent, setEditorContent] = React.useState<EmailStructuredContent | null>(null);
  const [editorChangeNote, setEditorChangeNote] = React.useState("");
  const [previewHtml, setPreviewHtml] = React.useState<string | null>(null);
  const [previewMode, setPreviewMode] = React.useState<"desktop" | "mobile">("desktop");
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [testEmail, setTestEmail] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const [logs, setLogs] = React.useState<LogRow[]>([]);
  const [logsTotal, setLogsTotal] = React.useState(0);
  const [logStatus, setLogStatus] = React.useState("");
  const [logTemplateKey, setLogTemplateKey] = React.useState("");
  const [logOffset, setLogOffset] = React.useState(0);
  const logLimit = 50;

  const [settings, setSettings] = React.useState<SettingsData | null>(null);

  const loadOverview = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await adminAuthHeaders();
      const res = await fetch("/api/admin/emails/overview", { headers });
      if (!res.ok) throw new Error((await res.json()).error ?? "load_failed");
      setOverview((await res.json()) as OverviewData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplates = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await adminAuthHeaders();
      const res = await fetch("/api/admin/emails/templates", { headers });
      if (!res.ok) throw new Error((await res.json()).error ?? "load_failed");
      const data = (await res.json()) as { templates: TemplateListItem[] };
      setTemplates(data.templates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplateDetail = React.useCallback(async (id: string) => {
    const headers = await adminAuthHeaders();
    const res = await fetch(`/api/admin/emails/templates/${id}`, { headers });
    if (!res.ok) throw new Error((await res.json()).error ?? "load_failed");
    const data = (await res.json()) as { template: TemplateDetail };
    setSelectedTemplate(data.template);
    return data.template;
  }, []);

  const loadLogs = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await adminAuthHeaders();
      const qs = new URLSearchParams({
        limit: String(logLimit),
        offset: String(logOffset),
      });
      if (logStatus) qs.set("status", logStatus);
      if (logTemplateKey) qs.set("templateKey", logTemplateKey);
      const res = await fetch(`/api/admin/emails/logs?${qs}`, { headers });
      if (!res.ok) throw new Error((await res.json()).error ?? "load_failed");
      const data = (await res.json()) as { logs: LogRow[]; total: number };
      setLogs(data.logs ?? []);
      setLogsTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, [logOffset, logStatus, logTemplateKey]);

  const loadSettings = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await adminAuthHeaders();
      const res = await fetch("/api/admin/emails/settings", { headers });
      if (!res.ok) throw new Error((await res.json()).error ?? "load_failed");
      setSettings((await res.json()) as SettingsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (tab === "overview") void loadOverview();
    if (tab === "templates") void loadTemplates();
    if (tab === "logs") void loadLogs();
    if (tab === "settings") void loadSettings();
  }, [tab, loadOverview, loadTemplates, loadLogs, loadSettings]);

  async function openEditor(templateId: string) {
    try {
      setSaving(true);
      const headers = await adminAuthHeaders(true);
      await fetch(`/api/admin/emails/templates/${templateId}/draft`, { method: "POST", headers });
      const detail = await loadTemplateDetail(templateId);
      const draft = detail.versions.find((v) => v.status === "draft") ?? detail.versions.find((v) => v.status === "live");
      if (!draft) {
        toast("Nuk u gjet version për editim.");
        return;
      }
      setEditorVersionId(draft.id);
      setEditorSubject(draft.subject);
      setEditorPreviewText(draft.previewText);
      setEditorContent(structuredClone(draft.content));
      setEditorChangeNote(draft.changeNote ?? "");
    } catch (e) {
      toast(e instanceof Error ? e.message : "edit_failed");
    } finally {
      setSaving(false);
    }
  }

  function closeEditor() {
    setSelectedTemplate(null);
    setEditorVersionId(null);
    setEditorContent(null);
  }

  async function saveDraft() {
    if (!selectedTemplate || !editorVersionId || !editorContent) return;
    setSaving(true);
    try {
      const headers = await adminAuthHeaders(true);
      const res = await fetch(
        `/api/admin/emails/templates/${selectedTemplate.id}/versions/${editorVersionId}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            subject: editorSubject,
            previewText: editorPreviewText,
            content: editorContent,
            changeNote: editorChangeNote,
          }),
        }
      );
      if (!res.ok) throw new Error((await res.json()).error ?? "save_failed");
      toast("Draft u ruajt.");
      await loadTemplateDetail(selectedTemplate.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : "save_failed");
    } finally {
      setSaving(false);
    }
  }

  async function publishDraft() {
    if (!selectedTemplate || !editorVersionId) return;
    setSaving(true);
    try {
      const headers = await adminAuthHeaders(true);
      const res = await fetch(
        `/api/admin/emails/templates/${selectedTemplate.id}/versions/${editorVersionId}/publish`,
        { method: "POST", headers }
      );
      if (!res.ok) throw new Error((await res.json()).error ?? "publish_failed");
      toast("Shablloni u publikua.");
      closeEditor();
      await loadTemplates();
    } catch (e) {
      toast(e instanceof Error ? e.message : "publish_failed");
    } finally {
      setSaving(false);
    }
  }

  async function openPreview(templateId: string, versionId: string) {
    try {
      const headers = await adminAuthHeaders(true);
      const res = await fetch("/api/admin/emails/preview", {
        method: "POST",
        headers,
        body: JSON.stringify({ templateId, versionId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "preview_failed");
      const data = (await res.json()) as { html: string };
      setPreviewHtml(data.html);
      setPreviewOpen(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "preview_failed");
    }
  }

  async function sendTest(templateId: string, versionId: string) {
    try {
      const headers = await adminAuthHeaders(true);
      const res = await fetch("/api/admin/emails/test-send", {
        method: "POST",
        headers,
        body: JSON.stringify({ templateId, versionId, to: testEmail.trim() || undefined }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string; to?: string };
      if (!res.ok) {
        toast(data.message ?? data.error ?? "test_send_failed");
        return;
      }
      toast(`Email test u dërgua te ${data.to ?? "marrësi"}.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "test_send_failed");
    }
  }

  async function restoreVersion(versionId: string) {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      const headers = await adminAuthHeaders(true);
      const res = await fetch(
        `/api/admin/emails/templates/${selectedTemplate.id}/versions/${versionId}/restore`,
        { method: "POST", headers }
      );
      if (!res.ok) throw new Error((await res.json()).error ?? "restore_failed");
      const data = (await res.json()) as { draft: TemplateVersion };
      toast("Versioni u rikthye si draft.");
      const detail = await loadTemplateDetail(selectedTemplate.id);
      const draft = detail.versions.find((v) => v.id === data.draft.id) ?? data.draft;
      setEditorVersionId(draft.id);
      setEditorSubject(draft.subject);
      setEditorPreviewText(draft.previewText);
      setEditorContent(structuredClone(draft.content));
      setEditorChangeNote(draft.changeNote ?? "");
      setHistoryOpen(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "restore_failed");
    } finally {
      setSaving(false);
    }
  }

  function insertVariable(field: "subject" | "previewText" | "heading" | "paragraph" | "ctaLabel" | "ctaUrl" | "secondary" | "footer", variable: string, paragraphIndex?: number) {
    const token = `{{${variable}}}`;
    if (field === "subject") setEditorSubject((s) => s + token);
    else if (field === "previewText") setEditorPreviewText((s) => s + token);
    else if (!editorContent) return;
    else if (field === "heading") setEditorContent({ ...editorContent, heading: editorContent.heading + token });
    else if (field === "paragraph" && paragraphIndex != null) {
      const paragraphs = [...editorContent.paragraphs];
      paragraphs[paragraphIndex] = (paragraphs[paragraphIndex] ?? "") + token;
      setEditorContent({ ...editorContent, paragraphs });
    } else if (field === "ctaLabel" && editorContent.cta) {
      setEditorContent({ ...editorContent, cta: { ...editorContent.cta, label: editorContent.cta.label + token } });
    } else if (field === "ctaUrl" && editorContent.cta) {
      setEditorContent({ ...editorContent, cta: { ...editorContent.cta, url: editorContent.cta.url + token } });
    } else if (field === "secondary") {
      setEditorContent({ ...editorContent, secondaryText: (editorContent.secondaryText ?? "") + token });
    } else if (field === "footer") {
      setEditorContent({ ...editorContent, footerNote: (editorContent.footerNote ?? "") + token });
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      const headers = await adminAuthHeaders(true);
      const res = await fetch("/api/admin/emails/settings", {
        method: "PATCH",
        headers,
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "save_failed");
      setSettings((await res.json()) as SettingsData);
      toast("Cilësimet u ruajtën.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "save_failed");
    } finally {
      setSaving(false);
    }
  }

  if (error && !overview && !templates.length && !settings) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-[13px] text-warning">
        {error === "forbidden" || error === "insufficient_permission"
          ? "Nuk ke leje për të menaxhuar emailat."
          : `Gabim: ${error}`}
      </div>
    );
  }

  if (tab === "overview") {
    return (
      <div className="space-y-4">
        {loading && !overview ? <p className="text-[13px] text-ink-3">Duke ngarkuar…</p> : null}
        {overview ? (
          <>
            <section className="rounded-xl border border-line bg-surface p-4">
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-brand text-ink-2">Email System</h2>
              <dl className="grid gap-3 text-[13px] md:grid-cols-2">
                <div>
                  <dt className="text-ink-3">Provider</dt>
                  <dd className="font-semibold text-ink">{overview.provider}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Provider Configuration</dt>
                  <dd>
                    <StatusPill
                      ok={overview.providerConfiguration === "configured"}
                      labelOk="Configured"
                      labelBad="Missing"
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-3">From</dt>
                  <dd className="font-semibold text-ink">{overview.from}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Reply-To</dt>
                  <dd className="font-semibold text-ink">{overview.replyTo}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Product Email Status</dt>
                  <dd>
                    <StatusPill
                      ok={overview.productEmailSending === "enabled"}
                      labelOk="Enabled"
                      labelBad="Disabled"
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-3">Auth</dt>
                  <dd className="text-ink-2">{overview.auth}</dd>
                </div>
                <div>
                  <dt className="text-ink-3">Auth Hook Secret</dt>
                  <dd>
                    <StatusPill
                      ok={overview.hookConfiguration === "configured"}
                      labelOk="Configured"
                      labelBad="Missing"
                    />
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-line bg-surface p-4">
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-brand text-ink-2">Statistika</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Sent today", value: overview.stats.sentToday },
                  { label: "Failed today", value: overview.stats.failedToday },
                  { label: "Queued product emails", value: overview.stats.queuedProduct },
                  { label: "Failed queue", value: overview.stats.failedQueue },
                  { label: "Last sent", value: formatDate(overview.stats.lastSentAt) },
                  { label: "Last provider failure", value: formatDate(overview.stats.lastFailureAt) },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-surface-2 px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase text-ink-3">{item.label}</div>
                    <div className="text-[15px] font-semibold text-ink">{item.value}</div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    );
  }

  if (tab === "templates") {
    if (selectedTemplate && editorContent && editorVersionId) {
      const registry = selectedTemplate.registry;
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-ink">{selectedTemplate.name}</div>
              <div className="text-[12px] text-ink-3">
                {selectedTemplate.templateKey} · {categoryLabel(selectedTemplate.category)} · {selectedTemplate.locale.toUpperCase()}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={closeEditor}>
                <X className="h-3.5 w-3.5" /> Mbyll
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setHistoryOpen(true)}>
                <History className="h-3.5 w-3.5" /> Historiku
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void openPreview(selectedTemplate.id, editorVersionId)}>
                <Eye className="h-3.5 w-3.5" /> Preview
              </Button>
              <Button size="sm" variant="secondary" disabled={saving} onClick={() => void saveDraft()}>
                Ruaj draft
              </Button>
              <Button size="sm" disabled={saving} onClick={() => void publishDraft()}>
                Publiko
              </Button>
            </div>
          </div>

          {registry ? (
            <section className="rounded-xl border border-line bg-surface p-4">
              <h3 className="mb-2 text-[12px] font-semibold uppercase text-ink-3">Available variables</h3>
              <div className="flex flex-wrap gap-2">
                {registry.allowedVariables.map((v) => {
                  const required = registry.requiredVariables.includes(v);
                  const urlVar = registry.urlVariables.includes(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        required ? "bg-brand/10 text-brand" : "bg-surface-2 text-ink-2",
                        urlVar && "ring-1 ring-brand/30"
                      )}
                      title={urlVar ? "URL variable" : required ? "Required" : "Optional"}
                      onClick={() => insertVariable("subject", v)}
                    >
                      {`{{${v}}}`}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
              <h3 className="text-[12px] font-semibold uppercase text-ink-3">Email meta</h3>
              <Input value={editorSubject} onChange={(e) => setEditorSubject(e.target.value)} placeholder="Subject" />
              <Input value={editorPreviewText} onChange={(e) => setEditorPreviewText(e.target.value)} placeholder="Preview text" />
              <Input value={editorChangeNote} onChange={(e) => setEditorChangeNote(e.target.value)} placeholder="Change note" />
            </section>

            <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
              <h3 className="text-[12px] font-semibold uppercase text-ink-3">Content</h3>
              <Input
                value={editorContent.heading}
                onChange={(e) => setEditorContent({ ...editorContent, heading: e.target.value })}
                placeholder="Heading"
              />
              {editorContent.paragraphs.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={p}
                    onChange={(e) => {
                      const paragraphs = [...editorContent.paragraphs];
                      paragraphs[i] = e.target.value;
                      setEditorContent({ ...editorContent, paragraphs });
                    }}
                    placeholder={`Paragraph ${i + 1}`}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={editorContent.paragraphs.length <= 1}
                    onClick={() => {
                      const paragraphs = editorContent.paragraphs.filter((_, idx) => idx !== i);
                      setEditorContent({ ...editorContent, paragraphs });
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={i === 0}
                    onClick={() => {
                      const paragraphs = [...editorContent.paragraphs];
                      [paragraphs[i - 1], paragraphs[i]] = [paragraphs[i], paragraphs[i - 1]];
                      setEditorContent({ ...editorContent, paragraphs });
                    }}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={i === editorContent.paragraphs.length - 1}
                    onClick={() => {
                      const paragraphs = [...editorContent.paragraphs];
                      [paragraphs[i], paragraphs[i + 1]] = [paragraphs[i + 1], paragraphs[i]];
                      setEditorContent({ ...editorContent, paragraphs });
                    }}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setEditorContent({ ...editorContent, paragraphs: [...editorContent.paragraphs, ""] })
                }
              >
                + Paragraph
              </Button>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={editorContent.cta?.label ?? ""}
                  onChange={(e) =>
                    setEditorContent({
                      ...editorContent,
                      cta: { label: e.target.value, url: editorContent.cta?.url ?? "" },
                    })
                  }
                  placeholder="CTA label"
                />
                <Input
                  value={editorContent.cta?.url ?? ""}
                  onChange={(e) =>
                    setEditorContent({
                      ...editorContent,
                      cta: { label: editorContent.cta?.label ?? "", url: e.target.value },
                    })
                  }
                  placeholder="CTA URL template"
                />
              </div>
              <Input
                value={editorContent.secondaryText ?? ""}
                onChange={(e) => setEditorContent({ ...editorContent, secondaryText: e.target.value })}
                placeholder="Secondary text"
              />
              <Input
                value={editorContent.footerNote ?? ""}
                onChange={(e) => setEditorContent({ ...editorContent, footerNote: e.target.value })}
                placeholder="Footer note"
              />
            </section>
          </div>

          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4">
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Test recipient (default: admin email)"
              className="max-w-sm"
            />
            <Button size="sm" variant="secondary" onClick={() => void sendTest(selectedTemplate.id, editorVersionId)}>
              <Send className="h-3.5 w-3.5" /> Send Test Draft
            </Button>
          </div>

          <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} size="lg">
            <div className="p-4">
              <h3 className="mb-3 font-semibold text-ink">Version History</h3>
              <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                {selectedTemplate.versions.map((v) => (
                  <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                    <div>
                      <div className="font-semibold text-ink">
                        {v.versionLabel} · {v.status}
                      </div>
                      <div className="text-[11px] text-ink-3">
                        {formatDate(v.createdAt)}
                        {v.publishedAt ? ` · published ${formatDate(v.publishedAt)}` : ""}
                      </div>
                      {v.changeNote ? <div className="text-[12px] text-ink-2">{v.changeNote}</div> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => void openPreview(selectedTemplate.id, v.id)}>
                        Preview
                      </Button>
                      {v.status !== "draft" ? (
                        <Button size="sm" variant="secondary" disabled={saving} onClick={() => void restoreVersion(v.id)}>
                          Restore
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Modal>

          <PreviewModal
            open={previewOpen}
            onClose={() => setPreviewOpen(false)}
            html={previewHtml}
            mode={previewMode}
            onModeChange={setPreviewMode}
          />
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {loading && templates.length === 0 ? <p className="text-[13px] text-ink-3">Duke ngarkuar…</p> : null}
        {templates.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{t.name}</span>
                {t.isSystem ? <Badge tone="neutral">System</Badge> : null}
                <Badge tone={t.enabled ? "success" : "neutral"}>{t.enabled ? "Enabled" : "Disabled"}</Badge>
              </div>
              <div className="text-[12px] text-ink-3">
                {t.templateKey} · {categoryLabel(t.category)} · {t.locale.toUpperCase()} · Live {t.liveVersionLabel ?? "—"} ·
                Updated {formatDate(t.updatedAt)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => void openEditor(t.id)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              {t.liveVersionId ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const detail = await loadTemplateDetail(t.id);
                      const live = detail.versions.find((v) => v.status === "live");
                      if (live) void openPreview(t.id, live.id);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const detail = await loadTemplateDetail(t.id);
                      setSelectedTemplate(detail);
                      setHistoryOpen(true);
                    }}
                  >
                    <History className="h-3.5 w-3.5" /> History
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      const detail = await loadTemplateDetail(t.id);
                      const live = detail.versions.find((v) => v.status === "live");
                      if (live) void sendTest(t.id, live.id);
                    }}
                  >
                    <Mail className="h-3.5 w-3.5" /> Test
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ))}

        <Modal open={historyOpen && !!selectedTemplate && !editorContent} onClose={() => { setHistoryOpen(false); setSelectedTemplate(null); }} size="lg">
          {selectedTemplate ? (
            <div className="p-4">
              <h3 className="mb-3 font-semibold text-ink">Version History — {selectedTemplate.name}</h3>
              <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                {selectedTemplate.versions.map((v) => (
                  <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                    <div>
                      <div className="font-semibold text-ink">{v.versionLabel} · {v.status}</div>
                      <div className="text-[11px] text-ink-3">{formatDate(v.createdAt)}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => void openPreview(selectedTemplate.id, v.id)}>Preview</Button>
                      {v.status !== "draft" ? (
                        <Button size="sm" variant="secondary" onClick={async () => {
                          await restoreVersion(v.id);
                          setHistoryOpen(false);
                          void openEditor(selectedTemplate.id);
                        }}>Restore</Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Modal>

        <PreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          html={previewHtml}
          mode={previewMode}
          onModeChange={setPreviewMode}
        />
      </div>
    );
  }

  if (tab === "logs") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input value={logStatus} onChange={(e) => setLogStatus(e.target.value)} placeholder="Status (sent/failed)" className="max-w-[160px]" />
          <Input value={logTemplateKey} onChange={(e) => setLogTemplateKey(e.target.value)} placeholder="Template key" className="max-w-[220px]" />
          <Button size="sm" variant="secondary" onClick={() => { setLogOffset(0); void loadLogs(); }}>
            Filter
          </Button>
        </div>
        {logs.length === 0 && !loading ? (
          <div className="rounded-xl border border-line bg-surface p-6 text-[13px] text-ink-3">Nuk ka logs.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="min-w-full text-left text-[12px]">
              <thead className="border-b border-line text-ink-3">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Template</th>
                  <th className="px-3 py-2">Domain</th>
                  <th className="px-3 py-2">Provider</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Message ID</th>
                  <th className="px-3 py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-line/60">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-3 py-2">{log.templateKey}</td>
                    <td className="px-3 py-2">{log.recipientDomain ?? "—"}</td>
                    <td className="px-3 py-2">{log.provider}</td>
                    <td className="px-3 py-2">{log.status}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{log.providerMessageId ?? "—"}</td>
                    <td className="px-3 py-2">{log.errorCategory ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-ink-3">{logsTotal} total</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={logOffset <= 0} onClick={() => setLogOffset((o) => Math.max(0, o - logLimit))}>
              Previous
            </Button>
            <Button size="sm" variant="ghost" disabled={logOffset + logLimit >= logsTotal} onClick={() => setLogOffset((o) => o + logLimit)}>
              Next
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (tab === "settings" && settings) {
    return (
      <div className="max-w-xl space-y-4 rounded-xl border border-line bg-surface p-4">
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-ink-3">From name</label>
          <Input value={settings.fromName} onChange={(e) => setSettings({ ...settings, fromName: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-ink-3">From email</label>
          <Input value={settings.fromEmail} onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-ink-3">Reply-To</label>
          <Input value={settings.replyTo} onChange={(e) => setSettings({ ...settings, replyTo: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-[12px] font-semibold text-ink-3">Provider</label>
          <Input value={settings.provider} readOnly disabled />
        </div>
        <div className="flex items-start justify-between gap-4 rounded-lg bg-surface-2 p-3">
          <div>
            <div className="text-[13px] font-semibold text-ink">Product transactional email enabled</div>
            <p className="mt-1 text-[12px] text-ink-3">
              Ky kontroll ndikon vetëm në emailat e produktit. Emailat e autentikimit menaxhohen veçmas.
            </p>
          </div>
          <Switch
            checked={settings.productEmailEnabled}
            onChange={(next) => setSettings({ ...settings, productEmailEnabled: next })}
            aria-label="Product transactional email enabled"
          />
        </div>
        <Button disabled={saving} onClick={() => void saveSettings()}>
          Ruaj cilësimet
        </Button>
      </div>
    );
  }

  return loading ? <p className="text-[13px] text-ink-3">Duke ngarkuar…</p> : null;
}

function PreviewModal({
  open,
  onClose,
  html,
  mode,
  onModeChange,
}: {
  open: boolean;
  onClose: () => void;
  html: string | null;
  mode: "desktop" | "mobile";
  onModeChange: (m: "desktop" | "mobile") => void;
}) {
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-ink">Preview</h3>
          <div className="flex gap-1">
            <Button size="sm" variant={mode === "desktop" ? "primary" : "ghost"} onClick={() => onModeChange("desktop")}>
              Desktop
            </Button>
            <Button size="sm" variant={mode === "mobile" ? "primary" : "ghost"} onClick={() => onModeChange("mobile")}>
              Mobile
            </Button>
          </div>
        </div>
        <div className="flex justify-center rounded-lg bg-surface-2 p-4">
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={html ?? ""}
            className={cn(
              "h-[520px] border border-line bg-white",
              mode === "desktop" ? "w-full max-w-[640px]" : "w-[320px]"
            )}
          />
        </div>
      </div>
    </Modal>
  );
}

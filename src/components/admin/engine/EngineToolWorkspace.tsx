"use client";

import * as React from "react";
import Link from "next/link";
import { getAccessToken } from "@/lib/supabase/client";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin/AdminPageHeader";
import { EngineDryRunPanel } from "@/components/admin/engine/EngineDryRunPanel";
import { EngineInputsEditor } from "@/components/admin/engine/EngineInputsEditor";
import { EngineShadowPanel } from "@/components/admin/engine/EngineShadowPanel";
import { cn } from "@/lib/utils/cn";

const TABS = [
  "Overview",
  "Models",
  "Prompt System",
  "Prompt Layers",
  "Inputs",
  "maroFort",
  "maroBrain",
  "Pricing",
  "Dry Run",
  "Shadow",
] as const;

type Tab = (typeof TABS)[number];

function tabVisible(tab: Tab, tool: Record<string, unknown>): boolean {
  if (tab === "maroFort" && !tool.usesFort) return false;
  if (tab === "maroBrain" && !tool.usesBrain) return false;
  if (tab === "Prompt Layers" && !tool.usesFort && Number(tool.layerCount) === 0) return false;
  return true;
}

export function EngineToolWorkspace({ toolId }: { toolId: string }) {
  const [tab, setTab] = React.useState<Tab>("Overview");
  const [detail, setDetail] = React.useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [draftContent, setDraftContent] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [pipelineMsg, setPipelineMsg] = React.useState<string | null>(null);

  const authHeaders = React.useCallback(async (): Promise<Record<string, string>> => {
    const token = await getAccessToken();
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    const headers = await authHeaders();
    const res = await fetch(`/api/admin/engine/tools/${toolId}`, { headers });
    const data = (await res.json()) as Record<string, unknown>;
    setDetail(res.ok ? data : null);
    const prompts = (data.prompts as Array<{ status: string; content: string }>) ?? [];
    const draft = prompts.find((p) => p.status === "draft");
    setDraftContent(draft?.content ?? prompts.find((p) => p.status === "live")?.content ?? "");
    setLoading(false);
  }, [authHeaders, toolId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const tool = (detail?.tool as Record<string, unknown>) ?? {};
  const warnings = (detail?.warnings as string[]) ?? [];
  const prompts = (detail?.prompts as Array<Record<string, unknown>>) ?? [];
  const layers = (detail?.layers as Array<Record<string, unknown>>) ?? [];
  const models = (detail?.models as Array<Record<string, unknown>>) ?? [];

  const configHealth = detail?.configHealth as { status?: string; issues?: Array<{ message: string }> } | undefined;

  const setPipeline = async (productionPipeline: string) => {
    setBusy(true);
    setPipelineMsg(null);
    const headers = await authHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/admin/engine/tools/${toolId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ productionPipeline }),
    });
    const data = (await res.json()) as { error?: string };
    setBusy(false);
    setPipelineMsg(res.ok ? `Pipeline set to ${productionPipeline}` : data.error ?? "failed");
    void load();
  };

  const createDraft = async () => {
    setBusy(true);
    const headers = await authHeaders();
    headers["Content-Type"] = "application/json";
    await fetch(`/api/admin/engine/tools/${toolId}/system-prompts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "create_draft" }),
    });
    setBusy(false);
    void load();
  };

  const saveDraft = async () => {
    const draft = prompts.find((p) => p.status === "draft");
    if (!draft?.id) return;
    setBusy(true);
    const headers = await authHeaders();
    headers["Content-Type"] = "application/json";
    await fetch(`/api/admin/engine/system-prompts/${draft.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ content: draftContent }),
    });
    setBusy(false);
    void load();
  };

  const publishDraft = async () => {
    const draft = prompts.find((p) => p.status === "draft" || p.status === "review");
    if (!draft?.id) return;
    setBusy(true);
    const headers = await authHeaders();
    await fetch(`/api/admin/engine/system-prompts/${draft.id}/publish`, {
      method: "POST",
      headers,
    });
    setBusy(false);
    void load();
  };

  if (loading) return <div className="text-[13px] text-ink-3">Duke ngarkuar workspace…</div>;
  if (!detail) return <div className="text-[13px] text-red-700">Tool nuk u gjet.</div>;

  const visibleTabs = TABS.filter((t) => tabVisible(t, { ...tool, layerCount: layers.length }));

  return (
    <div>
      <AdminPageHeader
        title={String(tool.displayName ?? toolId)}
        description={`Engine workspace · ${toolId} · registry ${String(tool.registryToolId)}`}
        actions={
          <Link href="/admin/engine" className="text-[13px] font-semibold text-brand hover:underline">
            ← Të gjitha tools
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
        {visibleTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-[12px] font-semibold",
              tab === t ? "bg-ink text-ink-inv" : "text-ink-2 hover:bg-surface-2"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid gap-3 md:grid-cols-2">
          <Panel title="Configuration">
            <Meta label="Status" value={String(tool.status)} />
            <Meta label="Route" value={String(tool.route)} />
            <Meta label="Registry ID" value={String(tool.registryToolId)} />
            <Meta label="Engine ID" value={toolId} />
            <Meta label="Production pipeline" value={String(tool.productionPipeline ?? "legacy")} />
            <Meta label="Config health" value={String(configHealth?.status ?? "—").toUpperCase()} />
            <Meta label="Default model" value={String(tool.defaultModelId ?? "—")} />
            <Meta label="prompt_compiler_v2" value={detail.promptCompilerV2 ? "true" : "false"} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Action onClick={() => void setPipeline("legacy")} disabled={busy}>legacy</Action>
              {toolId === "maro_web" ? (
                <Action
                  onClick={() => void setPipeline("shadow")}
                  disabled={busy || configHealth?.status === "blocked"}
                  primary
                >
                  shadow
                </Action>
              ) : (
                <button type="button" disabled className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-ink-3" title="Phase 2B.1: shadow limited to maroWeb">
                  shadow (maroWeb only)
                </button>
              )}
              <button type="button" disabled className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-ink-3" title="Phase 2B authorization required">
                engine (not authorized)
              </button>
            </div>
            {pipelineMsg ? <div className="mt-2 text-[12px] text-ink-2">{pipelineMsg}</div> : null}
          </Panel>
          <Panel title="Configuration health">
            {(configHealth?.issues ?? []).length ? (
              configHealth!.issues!.map((i) => (
                <div key={i.message} className="mb-1 rounded-md bg-amber-50 px-2 py-1 text-[12px] text-amber-900">
                  {i.message}
                </div>
              ))
            ) : (
              <div className="text-[12px] text-emerald-800">READY — no blocking issues.</div>
            )}
            {warnings.map((w) => (
              <div key={w} className="mb-1 mt-1 rounded-md bg-surface-2 px-2 py-1 text-[12px] text-ink-2">
                {w}
              </div>
            ))}
          </Panel>
        </div>
      )}

      {tab === "Models" && (
        <Panel title="Model configuration">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-ink-3">
                <th className="py-1 text-left">Model</th>
                <th className="py-1 text-left">Provider</th>
                <th className="py-1 text-left">Enabled</th>
                <th className="py-1 text-left">Default</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={String(m.model_id ?? m.modelId)} className="border-t border-line">
                  <td className="py-1.5">{String(m.display_name ?? m.displayName)}</td>
                  <td className="py-1.5">{String(m.provider)}</td>
                  <td className="py-1.5">{m.enabled ? "yes" : "no"}</td>
                  <td className="py-1.5">{m.is_default || m.isDefault ? "★" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {tab === "Prompt System" && (
        <div className="grid gap-3">
          <Panel title="Versions">
            {prompts.map((p) => (
              <div key={String(p.id)} className="mb-2 flex items-center justify-between rounded-lg border border-line px-2 py-1.5">
                <div>
                  <span className="font-semibold">{String(p.version_label ?? p.versionLabel)}</span>
                  <StatusPill status={String(p.status)} />
                </div>
                <span className="text-[11px] text-ink-3">{String(p.change_note ?? p.changeNote ?? "")}</span>
              </div>
            ))}
          </Panel>
          <Panel title="Draft editor">
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[12px]"
            />
            <div className="mt-2 flex gap-2">
              <Action onClick={() => void createDraft()} disabled={busy}>Create draft from live</Action>
              <Action onClick={() => void saveDraft()} disabled={busy}>Save draft</Action>
              <Action onClick={() => void publishDraft()} disabled={busy} primary>Publish</Action>
            </div>
          </Panel>
        </div>
      )}

      {tab === "Prompt Layers" && (
        <Panel title="Live / draft layers">
          {layers.length ? (
            layers.map((l) => (
              <div key={String(l.id)} className="mb-2 rounded-lg border border-line px-2 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{String(l.name)}</span>
                  <StatusPill status={String(l.status)} />
                  <span className="text-[11px] text-ink-3">priority {String(l.priority)}</span>
                </div>
                <pre className="mt-1 whitespace-pre-wrap text-[11px] text-ink-2">{String(l.instructions).slice(0, 240)}</pre>
              </div>
            ))
          ) : (
            <div className="text-[12px] text-ink-3">No layers seeded yet.</div>
          )}
        </Panel>
      )}

      {tab === "Inputs" && <EngineInputsEditor toolId={toolId} />}

      {tab === "maroFort" && (
        <Panel title="maroFort CMS representation">
          <p className="text-[12px] text-ink-2">
            Fort schema merges <code className="text-[11px]">src/lib/fort/schema.ts</code> with DB{' '}
            <code className="text-[11px]">tool_input_fields</code>. Legacy{' '}
            <Link href="/admin?tab=fort" className="text-brand">maroFort admin</Link> remains active.
          </p>
        </Panel>
      )}

      {tab === "maroBrain" && (
        <Panel title="maroBrain mapping">
          <pre className="whitespace-pre-wrap rounded-lg bg-surface-2 p-2 text-[11px]">
            {JSON.stringify((tool.brainMapping as Record<string, unknown>) ?? {}, null, 2)}
          </pre>
        </Panel>
      )}

      {tab === "Pricing" && (
        <Panel title="Pricing inspection">
          <p className="text-[12px] text-ink-2">
            Credits derive from registry + <code className="text-[11px]">app_settings.pricing.options</code>.
            Use Dry Run for per-request estimates.
          </p>
        </Panel>
      )}

      {tab === "Dry Run" && (
        <EngineDryRunPanel toolId={toolId} defaultModel={tool.defaultModelId as string | null | undefined} />
      )}

      {tab === "Shadow" && (
        <EngineShadowPanel toolId={toolId} productionPipeline={String(tool.productionPipeline ?? "legacy")} />
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="mb-3 text-[14px] font-bold tracking-[-0.03em] text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-1 flex justify-between gap-3 text-[12px]">
      <span className="text-ink-3">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "live" ? "bg-emerald-50 text-emerald-800" : status === "draft" ? "bg-blue-50 text-blue-800" : "bg-surface-2 text-ink-2";
  return <span className={cn("ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", tone)}>{status}</span>;
}

function Action({
  children,
  onClick,
  disabled,
  primary,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50",
        primary ? "bg-brand text-white" : "border border-line bg-surface-2 text-ink",
        className
      )}
    >
      {children}
    </button>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { getAccessToken } from "@/lib/supabase/client";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin/AdminPageHeader";

interface EngineToolRow {
  toolId: string;
  displayName: string;
  registryToolId: string;
  route: string;
  status: string;
  productionPipeline: string;
  defaultModelId?: string | null;
  usesBrain: boolean;
  usesFort: boolean;
  presetSupport: boolean;
  functional: boolean;
  livePromptVersion?: string | null;
  enabledModelCount: number;
  layerCount: number;
  draftCount: number;
}

interface SeedStatus {
  seeded: boolean;
  toolCount: number;
  livePromptCount: number;
  duplicateLiveTools: string[];
  canReseedSafely: boolean;
}

export function EngineToolsList() {
  const [tools, setTools] = React.useState<EngineToolRow[]>([]);
  const [promptCompilerV2, setPromptCompilerV2] = React.useState(false);
  const [seedStatus, setSeedStatus] = React.useState<SeedStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [seeding, setSeeding] = React.useState(false);
  const [showAdvancedSeed, setShowAdvancedSeed] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch("/api/admin/engine/tools", {
      headers,
    });
    const data = (await res.json()) as {
      tools?: EngineToolRow[];
      promptCompilerV2?: boolean;
      seedStatus?: SeedStatus;
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "load_failed");
      setLoading(false);
      return;
    }
    setTools(data.tools ?? []);
    setPromptCompilerV2(Boolean(data.promptCompilerV2));
    setSeedStatus(data.seedStatus ?? null);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const seed = async () => {
    if (!window.confirm("Seed nga legacy është idempotent por duhet përdorur vetëm për migrim. Vazhdo?")) return;
    setSeeding(true);
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    await fetch("/api/admin/engine/seed", {
      method: "POST",
      headers,
    });
    setSeeding(false);
    void load();
  };

  return (
    <div>
      <AdminPageHeader
        title="Maro Engine"
        description="Menaxho tools, system prompts, layers, inputs, modele dhe dry run — pa prekur gjenerimin legacy."
      />

      {seedStatus?.seeded ? (
        <div className="mb-4 rounded-xl border border-line bg-surface px-4 py-3 text-[13px] text-ink-2">
          <span className="font-semibold text-ink">Konfigurimi legacy u importua.</span>{" "}
          {seedStatus.livePromptCount} live prompts · {seedStatus.toolCount} tools
          {seedStatus.duplicateLiveTools.length > 0 ? (
            <span className="text-danger"> · duplicate live prompts: {seedStatus.duplicateLiveTools.join(", ")}</span>
          ) : null}
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-[13px] text-ink-2">
          Engine nuk është seed-uar ende. Migrimi fillestar mund të bëhet nga legacy (Advanced).
        </div>
      )}

      <details
        className="mb-4 rounded-xl border border-line bg-surface px-4 py-3"
        open={showAdvancedSeed}
        onToggle={(e) => setShowAdvancedSeed((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-[13px] font-semibold text-ink-2">
          Advanced / Migration Tools
        </summary>
        <p className="mt-2 text-[12px] text-ink-3">
          Seed nga legacy importon system prompts, modele dhe prompt layers nga app_settings. Operacioni është
          idempotent — nuk krijon live prompt të dublikuar nëse ekzistojnë.
        </p>
        <button
          type="button"
          onClick={() => void seed()}
          disabled={seeding}
          className="mt-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[12px] font-semibold text-ink hover:bg-surface disabled:opacity-50"
        >
          {seeding ? "Duke seed-uar…" : "Seed nga legacy (migration only)"}
        </button>
      </details>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-[12px]">
        <span className="font-semibold text-ink">prompt_compiler_v2</span>
        <AdminStatusBadge status={promptCompilerV2 ? "warning" : "healthy"} />
        <span className="text-ink-3">
          {promptCompilerV2 ? "ENABLED — Engine LIVE permitted" : "FALSE — Engine LIVE blocked; shadow uses per-tool pipeline"}
        </span>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-[13px] text-ink-3">Duke ngarkuar…</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-3 py-2">Tool</th>
                <th className="px-3 py-2">Engine ID</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Pipeline</th>
                <th className="px-3 py-2">Live prompt</th>
                <th className="px-3 py-2">Models</th>
                <th className="px-3 py-2">Brain</th>
                <th className="px-3 py-2">Fort</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.toolId} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/engine/tools/${tool.toolId}`} className="font-semibold text-brand hover:underline">
                      {tool.displayName}
                    </Link>
                    <div className="text-[11px] text-ink-3">registry: {tool.registryToolId}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px]">{tool.toolId}</td>
                  <td className="px-3 py-2.5">{tool.status}</td>
                  <td className="px-3 py-2.5">
                    <AdminStatusBadge status={tool.productionPipeline === "legacy" ? "neutral" : "warning"} />
                    <span className="ml-1">{tool.productionPipeline}</span>
                  </td>
                  <td className="px-3 py-2.5">{tool.livePromptVersion ?? "—"}</td>
                  <td className="px-3 py-2.5">{tool.enabledModelCount}</td>
                  <td className="px-3 py-2.5">{tool.usesBrain ? "yes" : "no"}</td>
                  <td className="px-3 py-2.5">{tool.usesFort ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

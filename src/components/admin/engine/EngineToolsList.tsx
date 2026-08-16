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

export function EngineToolsList() {
  const [tools, setTools] = React.useState<EngineToolRow[]>([]);
  const [promptCompilerV2, setPromptCompilerV2] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [seeding, setSeeding] = React.useState(false);
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
    const data = (await res.json()) as { tools?: EngineToolRow[]; promptCompilerV2?: boolean; error?: string };
    if (!res.ok) {
      setError(data.error ?? "load_failed");
      setLoading(false);
      return;
    }
    setTools(data.tools ?? []);
    setPromptCompilerV2(Boolean(data.promptCompilerV2));
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const seed = async () => {
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
        actions={
          <button
            type="button"
            onClick={() => void seed()}
            disabled={seeding}
            className="rounded-lg bg-brand px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {seeding ? "Duke seed-uar…" : "Seed nga legacy"}
          </button>
        }
      />

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

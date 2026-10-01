"use client";

import * as React from "react";
import { getAccessToken } from "@/lib/supabase/client";

export function EngineDryRunPanel({
  toolId,
  defaultModel,
}: {
  toolId: string;
  defaultModel?: string | null;
}) {
  const [dryPrompt, setDryPrompt] = React.useState("Create a premium product photo on white background");
  const [ownerUserId, setOwnerUserId] = React.useState("");
  const [workspaceId, setWorkspaceId] = React.useState("");
  const [model, setModel] = React.useState(defaultModel ?? "");
  const [selectionsJson, setSelectionsJson] = React.useState("{}");
  const [fortJson, setFortJson] = React.useState('{"enabled":false,"values":{}}');
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (defaultModel) setModel(defaultModel);
  }, [defaultModel]);

  const run = async () => {
    setBusy(true);
    const token = await getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    let selections: Record<string, string> = {};
    let fort: { enabled: boolean; values: Record<string, unknown> } = { enabled: false, values: {} };
    try {
      selections = JSON.parse(selectionsJson) as Record<string, string>;
      fort = JSON.parse(fortJson) as typeof fort;
    } catch {
      setResult({ error: "invalid_json" });
      setBusy(false);
      return;
    }

    const res = await fetch("/api/admin/engine/compile", {
      method: "POST",
      headers,
      body: JSON.stringify({
        toolId,
        userPrompt: dryPrompt,
        model: model || undefined,
        ownerUserId: ownerUserId || undefined,
        workspaceId: workspaceId || undefined,
        useBrain: Boolean(workspaceId && ownerUserId),
        selections,
        fort,
      }),
    });
    setResult((await res.json()) as Record<string, unknown>);
    setBusy(false);
  };

  const brief = result?.brief as Record<string, unknown> | undefined;
  const provider = result?.providerMessages as Record<string, unknown> | undefined;

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <section className="rounded-xl border border-line bg-surface p-4 space-y-2">
        <h2 className="text-[14px] font-bold text-ink">Dry Run (no AI / no credits)</h2>
        <label className="block text-[12px]">
          <span className="text-ink-3">User prompt</span>
          <textarea value={dryPrompt} onChange={(e) => setDryPrompt(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-[12px]" />
        </label>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="block text-[12px]"><span className="text-ink-3">Model</span><input value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-[12px]" /></label>
          <label className="block text-[12px]"><span className="text-ink-3">Owner user ID</span><input value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-[12px]" /></label>
          <label className="block text-[12px] md:col-span-2"><span className="text-ink-3">Workspace ID</span><input value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-[12px]" /></label>
        </div>
        <label className="block text-[12px]"><span className="text-ink-3">Selections JSON</span><textarea value={selectionsJson} onChange={(e) => setSelectionsJson(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 font-mono text-[11px]" /></label>
        <label className="block text-[12px]"><span className="text-ink-3">maroFort JSON</span><textarea value={fortJson} onChange={(e) => setFortJson(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 font-mono text-[11px]" /></label>
        <button type="button" onClick={() => void run()} disabled={busy} className="rounded-lg bg-brand px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50">
          Compile
        </button>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-2 text-[14px] font-bold text-ink">Result</h2>
        {!result ? (
          <div className="text-[12px] text-ink-3">Run compile to inspect structured brief.</div>
        ) : (
          <div className="space-y-3 text-[12px]">
            <Row label="Config health" value={String((result.configHealth as { status?: string })?.status ?? "—").toUpperCase()} />
            <Row label="Brain" value={(result.brain as { loaded?: boolean })?.loaded ? `used (${((result.brain as { sections?: string[] }).sections ?? []).join(", ")})` : "not used"} />
            <Row label="System version" value={String((brief?.systemPromptVersion as { versionLabel?: string })?.versionLabel ?? "—")} />
            <Row label="Credits" value={String((result.estimatedCredits as { total?: number })?.total ?? "—")} />
            {provider ? (
              <>
                <div className="font-semibold text-ink">Provider preview</div>
                <pre className="max-h-40 overflow-auto rounded-lg bg-surface-2 p-2 text-[11px] whitespace-pre-wrap">{String(provider.systemInstructions ?? "").slice(0, 1200)}</pre>
                <pre className="max-h-40 overflow-auto rounded-lg bg-surface-2 p-2 text-[11px] whitespace-pre-wrap">{String(provider.userContent ?? "").slice(0, 1200)}</pre>
              </>
            ) : null}
            <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap text-[10px]">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line pb-1">
      <span className="text-ink-3">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

"use client";

import * as React from "react";
import { getAccessToken } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

interface DiffSection {
  key: string;
  label: string;
  legacy?: string;
  engine?: string;
  status: string;
  classification?: string;
  critical?: boolean;
}

interface ShadowSummary {
  toolId: string;
  total: number;
  successful: number;
  failed: number;
  critical: number;
  compileSuccessRate: number | null;
  criticalMismatchRate: number | null;
  latestComparisonAt: string | null;
  latestCriticalMismatch: boolean;
  legacyGenerationSuccessUnaffected: boolean;
}

const REVIEW_OPTIONS = [
  { id: "unreviewed", label: "Unreviewed" },
  { id: "looks_good", label: "Looks Good" },
  { id: "needs_fix", label: "Needs Fix" },
  { id: "expected_difference", label: "Expected Difference" },
] as const;

export function EngineShadowPanel({
  toolId,
  productionPipeline,
}: {
  toolId: string;
  productionPipeline?: string;
}) {
  const [rows, setRows] = React.useState<Array<Record<string, unknown>>>([]);
  const [selected, setSelected] = React.useState<Record<string, unknown> | null>(null);
  const [summary, setSummary] = React.useState<ShadowSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [reviewNote, setReviewNote] = React.useState("");
  const [filters, setFilters] = React.useState({
    model: "",
    fort: "",
    brain: "",
    compileStatus: "",
    critical: "",
    reviewStatus: "",
    generationId: "",
  });

  const authHeaders = React.useCallback(async () => {
    const token = await getAccessToken();
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    const headers = await authHeaders();
    const params = new URLSearchParams({ toolId, limit: "100" });
    if (filters.model) params.set("model", filters.model);
    if (filters.fort) params.set("fort", filters.fort);
    if (filters.brain) params.set("brain", filters.brain);
    if (filters.compileStatus) params.set("compileStatus", filters.compileStatus);
    if (filters.critical) params.set("critical", filters.critical);
    if (filters.reviewStatus) params.set("reviewStatus", filters.reviewStatus);
    if (filters.generationId) params.set("generationId", filters.generationId);

    const [listRes, summaryRes] = await Promise.all([
      fetch(`/api/admin/engine/shadow-comparisons?${params}`, { headers }),
      fetch(`/api/admin/engine/shadow-comparisons?toolId=${toolId}&summary=1`, { headers }),
    ]);

    const listData = (await listRes.json()) as { comparisons?: Array<Record<string, unknown>> };
    const summaryData = (await summaryRes.json()) as { summary?: ShadowSummary };
    setRows(listData.comparisons ?? []);
    setSummary(summaryData.summary ?? null);
    setLoading(false);
  }, [authHeaders, filters, toolId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setReviewNote(String(selected?.review_note ?? ""));
  }, [selected]);

  const saveReview = async (reviewStatus: string) => {
    if (!selected?.id) return;
    const headers = await authHeaders();
    headers["Content-Type"] = "application/json";
    await fetch("/api/admin/engine/shadow-comparisons", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        id: selected.id,
        reviewStatus,
        reviewNote: reviewNote || undefined,
      }),
    });
    void load();
  };

  const diff = (selected?.structural_diff as { sections?: DiffSection[] })?.sections ?? [];
  const legacy = selected?.legacy_snapshot as Record<string, unknown> | undefined;
  const engine = selected?.engine_snapshot as Record<string, unknown> | undefined;
  const context = selected?.context_metadata as Record<string, unknown> | undefined;
  const criticalFlags = (selected?.critical_flags as string[]) ?? [];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Shadow status" value={(productionPipeline ?? "legacy").toUpperCase()} />
        <Stat label="Comparisons" value={String(summary?.total ?? 0)} />
        <Stat label="Compile success" value={summary?.compileSuccessRate != null ? `${summary.compileSuccessRate}%` : "—"} />
        <Stat label="Critical mismatch" value={summary?.criticalMismatchRate != null ? `${summary.criticalMismatchRate}%` : "—"} />
      </div>

      <div className="rounded-xl border border-line bg-surface p-3 text-[12px] text-ink-2">
        Legacy generation success unaffected:{" "}
        <strong>{summary?.legacyGenerationSuccessUnaffected ? "yes" : "unknown"}</strong>
        {summary?.latestComparisonAt ? (
          <> · Latest: {String(summary.latestComparisonAt).slice(0, 19)}</>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterInput placeholder="Model" value={filters.model} onChange={(v) => setFilters((f) => ({ ...f, model: v }))} />
        <FilterSelect
          label="Fort"
          value={filters.fort}
          onChange={(v) => setFilters((f) => ({ ...f, fort: v }))}
          options={[
            ["", "Any"],
            ["true", "On"],
            ["false", "Off"],
          ]}
        />
        <FilterSelect
          label="Brain"
          value={filters.brain}
          onChange={(v) => setFilters((f) => ({ ...f, brain: v }))}
          options={[
            ["", "Any"],
            ["true", "Used"],
            ["false", "Not used"],
          ]}
        />
        <FilterSelect
          label="Compile"
          value={filters.compileStatus}
          onChange={(v) => setFilters((f) => ({ ...f, compileStatus: v }))}
          options={[
            ["", "Any"],
            ["success", "Success"],
            ["failed", "Failed"],
          ]}
        />
        <FilterSelect
          label="Critical"
          value={filters.critical}
          onChange={(v) => setFilters((f) => ({ ...f, critical: v }))}
          options={[
            ["", "Any"],
            ["true", "Yes"],
            ["false", "No"],
          ]}
        />
        <FilterInput
          placeholder="Generation ID"
          value={filters.generationId}
          onChange={(v) => setFilters((f) => ({ ...f, generationId: v }))}
        />
        <button type="button" onClick={() => void load()} className="rounded-lg bg-ink px-3 py-1.5 text-[12px] font-semibold text-ink-inv">
          Apply
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
        <div className="rounded-xl border border-line bg-surface p-3">
          <div className="mb-2 text-[12px] font-semibold text-ink">Comparisons</div>
          {loading ? (
            <div className="text-[12px] text-ink-3">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-[12px] text-ink-3">
              {productionPipeline === "shadow"
                ? "Shadow active — awaiting real maroWeb generations."
                : "Set pipeline to shadow to collect comparisons."}
            </div>
          ) : (
            <div className="max-h-[560px] space-y-1 overflow-auto">
              {rows.map((r) => (
                <button
                  key={String(r.id)}
                  type="button"
                  onClick={() => setSelected(r)}
                  className={cn(
                    "w-full rounded-lg px-2 py-1.5 text-left text-[11px]",
                    selected?.id === r.id ? "bg-ink text-ink-inv" : "hover:bg-surface-2"
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>{String(r.created_at).slice(0, 19)}</span>
                    {r.critical_mismatch ? <span className="text-red-400">CRIT</span> : null}
                  </div>
                  <div className="opacity-70">
                    {String(r.model_id)} · {String(r.review_status ?? "unreviewed")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-line bg-surface p-4">
          {!selected ? (
            <div className="text-[12px] text-ink-3">Select a comparison to inspect LEGACY vs ENGINE V2.</div>
          ) : (
            <div className="space-y-3">
              {selected.compile_error ? (
                <div className="rounded-lg bg-red-50 px-2 py-1 text-[12px] text-red-800">
                  Shadow compile error (legacy unaffected): {String(selected.compile_error)}
                </div>
              ) : null}

              {criticalFlags.length ? (
                <div className="rounded-lg bg-amber-50 px-2 py-1 text-[12px] text-amber-900">
                  Critical flags: {criticalFlags.join(", ")}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {REVIEW_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => void saveReview(o.id)}
                    className={cn(
                      "rounded-lg border border-line px-2 py-1 text-[11px] font-semibold",
                      selected.review_status === o.id ? "bg-brand text-white" : "hover:bg-surface-2"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Internal review note"
                className="w-full rounded-lg border border-line bg-surface-2 p-2 text-[11px]"
                rows={2}
              />

              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-ink-3">
                    <th className="py-1 text-left">Section</th>
                    <th className="py-1 text-left">Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {diff.map((s) => (
                    <tr key={s.key} className="border-t border-line align-top">
                      <td className="py-1.5 font-semibold">
                        {s.label}
                        {s.critical ? " ⚠" : ""}
                      </td>
                      <td className="py-1.5">{s.classification ?? s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid gap-3 md:grid-cols-2">
                <RoleBlock
                  title="LEGACY — System"
                  body={String(context?.legacySystemMessage ?? legacy?.systemInstructions ?? "")}
                />
                <RoleBlock
                  title="ENGINE V2 — System instructions"
                  body={String(context?.engineSystemInstructions ?? engine?.systemInstructions ?? "")}
                />
                <RoleBlock
                  title="LEGACY — User"
                  body={String(context?.legacyUserMessage ?? legacy?.userContent ?? "")}
                />
                <RoleBlock
                  title="ENGINE V2 — User content"
                  body={String(context?.engineUserContent ?? engine?.userContent ?? "")}
                />
              </div>

              <details className="text-[11px]">
                <summary className="cursor-pointer font-semibold text-ink-2">Raw technical preview</summary>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <pre className="max-h-[240px] overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-2 text-[10px]">
                    {String(legacy?.renderedPreview ?? "").slice(0, 4000)}
                  </pre>
                  <pre className="max-h-[240px] overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-2 text-[10px]">
                    {String(engine?.renderedPreview ?? "").slice(0, 4000)}
                  </pre>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-[11px] text-ink-3">{label}</div>
      <div className="text-[18px] font-semibold text-ink">{value}</div>
    </div>
  );
}

function FilterInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[12px]"
    />
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[12px]"
      aria-label={label}
    >
      {options.map(([v, t]) => (
        <option key={v || "any"} value={v}>
          {label}: {t}
        </option>
      ))}
    </select>
  );
}

function RoleBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase text-ink-3">{title}</div>
      <pre className="max-h-[280px] overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-2 text-[10px]">{body.slice(0, 4000)}</pre>
    </div>
  );
}

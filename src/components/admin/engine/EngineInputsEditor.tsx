"use client";

import * as React from "react";
import { getAccessToken } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

interface ResolvedField {
  fieldKey: string;
  label: string;
  description: string;
  fieldType: string;
  source: string;
  enabled: boolean;
  standardVisible: boolean;
  fortVisible: boolean;
  options: Array<{ id: string; label: string }>;
  defaultValue?: unknown;
  required: boolean;
  sortOrder: number;
  placeholder?: string | null;
}

export function EngineInputsEditor({ toolId }: { toolId: string }) {
  const [resolved, setResolved] = React.useState<ResolvedField[]>([]);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<Partial<ResolvedField>>({});
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const authHeaders = React.useCallback(async (): Promise<Record<string, string>> => {
    const token = await getAccessToken();
    const h: Record<string, string> = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, []);

  const load = React.useCallback(async () => {
    const headers = await authHeaders();
    const res = await fetch(`/api/admin/engine/tools/${toolId}/input-fields`, { headers });
    const data = (await res.json()) as { resolved?: ResolvedField[] };
    setResolved(data.resolved ?? []);
  }, [authHeaders, toolId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const selected = resolved.find((f) => f.fieldKey === selectedKey);

  React.useEffect(() => {
    if (selected) setForm({ ...selected });
  }, [selected]);

  const save = async () => {
    if (!selectedKey) return;
    setBusy(true);
    setMessage(null);
    const headers = await authHeaders();
    headers["Content-Type"] = "application/json";
    const res = await fetch(`/api/admin/engine/tools/${toolId}/input-fields`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fieldKey: selectedKey,
        label: form.label,
        description: form.description,
        fieldType: form.fieldType,
        placeholder: form.placeholder,
        options: form.options,
        defaultValue: form.defaultValue,
        required: form.required,
        enabled: form.enabled,
        sortOrder: form.sortOrder,
        standardVisible: form.standardVisible,
        fortVisible: form.fortVisible,
      }),
    });
    const data = (await res.json()) as { error?: string; resolved?: ResolvedField[] };
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "save_failed");
      return;
    }
    setResolved(data.resolved ?? resolved);
    setMessage("Saved");
    void load();
  };

  const move = async (fieldKey: string, delta: number) => {
    const next = [...resolved];
    const idx = next.findIndex((f) => f.fieldKey === fieldKey);
    const swap = idx + delta;
    if (idx < 0 || swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    const order = next.map((f, i) => ({ fieldKey: f.fieldKey, sortOrder: i * 10 }));
    setResolved(next.map((f, i) => ({ ...f, sortOrder: i * 10 })));
    const headers = await authHeaders();
    headers["Content-Type"] = "application/json";
    await fetch(`/api/admin/engine/tools/${toolId}/input-fields`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "reorder", order }),
    });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
      <div className="rounded-xl border border-line bg-surface p-3">
        <div className="mb-2 text-[11px] text-ink-3">DB override &gt; code fallback</div>
        <div className="flex max-h-[520px] flex-col gap-1 overflow-auto">
          {resolved.map((f) => (
            <button
              key={f.fieldKey}
              type="button"
              onClick={() => setSelectedKey(f.fieldKey)}
              className={cn(
                "rounded-lg px-2 py-1.5 text-left text-[12px]",
                selectedKey === f.fieldKey ? "bg-ink text-ink-inv" : "hover:bg-surface-2"
              )}
            >
              <div className="font-semibold">{f.label}</div>
              <div className="text-[10px] opacity-70">{f.fieldKey} · {f.source}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {selected ? (
          <>
            <div className="rounded-xl border border-line bg-surface p-4">
              <h3 className="mb-3 text-[14px] font-bold text-ink">Edit field</h3>
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="Label" value={form.label ?? ""} onChange={(v) => setForm((s) => ({ ...s, label: v }))} />
                <Field label="Type" value={form.fieldType ?? ""} onChange={(v) => setForm((s) => ({ ...s, fieldType: v }))} />
                <Field label="Placeholder" value={form.placeholder ?? ""} onChange={(v) => setForm((s) => ({ ...s, placeholder: v }))} />
                <Field label="Default" value={String(form.defaultValue ?? "")} onChange={(v) => setForm((s) => ({ ...s, defaultValue: v }))} />
              </div>
              <label className="mt-2 block text-[12px]">
                <span className="text-ink-3">Description</span>
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-[12px]"
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
                <Toggle label="Enabled" checked={form.enabled !== false} onChange={(v) => setForm((s) => ({ ...s, enabled: v }))} />
                <Toggle label="Required" checked={Boolean(form.required)} onChange={(v) => setForm((s) => ({ ...s, required: v }))} />
                <Toggle label="Standard visible" checked={Boolean(form.standardVisible)} onChange={(v) => setForm((s) => ({ ...s, standardVisible: v }))} />
                <Toggle label="Fort visible" checked={form.fortVisible !== false} onChange={(v) => setForm((s) => ({ ...s, fortVisible: v }))} />
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => void move(selected.fieldKey, -1)} className="rounded-lg border border-line px-2 py-1 text-[12px]">↑</button>
                <button type="button" onClick={() => void move(selected.fieldKey, 1)} className="rounded-lg border border-line px-2 py-1 text-[12px]">↓</button>
                <button type="button" onClick={() => void save()} disabled={busy} className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">
                  Save override
                </button>
              </div>
              {message ? <div className="mt-2 text-[12px] text-ink-2">{message}</div> : null}
            </div>

            <div className="rounded-xl border border-line bg-surface p-4">
              <h3 className="mb-2 text-[14px] font-bold text-ink">CMS preview</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <PreviewCard mode="Standard" visible={Boolean(form.standardVisible)} field={form} />
                <PreviewCard mode="maroFort" visible={form.fortVisible !== false} field={form} />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-line bg-surface p-6 text-[13px] text-ink-3">
            Select a field to edit its Engine CMS override.
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-[12px]">
      <span className="text-ink-3">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-[12px]" />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function PreviewCard({ mode, visible, field }: { mode: string; visible: boolean; field: Partial<ResolvedField> }) {
  if (!visible) {
    return (
      <div className="rounded-lg border border-dashed border-line p-3 text-[12px] text-ink-3">
        {mode}: hidden
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="text-[11px] font-semibold uppercase text-ink-3">{mode}</div>
      <div className="mt-1 text-[13px] font-semibold text-ink">{field.label}</div>
      {field.description ? <div className="text-[11px] text-ink-3">{field.description}</div> : null}
      <div className="mt-2 rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-[12px] text-ink-2">
        {field.fieldType === "select"
          ? (field.options?.[0]?.label ?? "Select…")
          : field.placeholder || `(${field.fieldType})`}
      </div>
    </div>
  );
}

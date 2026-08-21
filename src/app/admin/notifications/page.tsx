"use client";

import * as React from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";

const MODULES = [
  { id: "all", label: "all" },
  { id: "maroImazh", label: "maroImazh" },
  { id: "maroLogo", label: "maroLogo" },
  { id: "maroWeb", label: "maroWeb" },
  { id: "maroFilma", label: "maroFilma" },
  { id: "maroZo", label: "maroAudio" },
] as const;

interface CampaignRow {
  id: string;
  kind: "global_banner" | "tool_banner" | "in_app";
  title: string;
  body: string;
  active: boolean;
  dismissible: boolean;
  targetModules: string[];
  startsAt: string | null;
  endsAt: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  priority: number;
}

type Draft = Omit<CampaignRow, "id"> & { id?: string };
const EMPTY: Draft = {
  kind: "tool_banner", title: "", body: "", active: false, dismissible: true,
  targetModules: ["all"], startsAt: null, endsAt: null, ctaLabel: null, ctaUrl: null, priority: 0,
};

function datetimeInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function AdminNotificationsPage() {
  const [campaigns, setCampaigns] = React.useState<CampaignRow[]>([]);
  const [draft, setDraft] = React.useState<Draft>(EMPTY);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const response = await fetch("/api/admin/notifications/campaigns", { headers, cache: "no-store" });
    const data = (await response.json()) as { campaigns?: CampaignRow[] };
    setCampaigns(data.campaigns ?? []);
  }, []);
  React.useEffect(() => void load(), [load]);

  async function save(next = draft) {
    if (!next.title.trim() || next.kind === "in_app") return;
    setSaving(true);
    try {
      const headers = await adminAuthHeaders(true);
      await fetch("/api/admin/notifications/campaigns", {
        method: "POST", headers,
        body: JSON.stringify({
          ...next,
          startsAt: next.startsAt ? new Date(next.startsAt).toISOString() : null,
          endsAt: next.endsAt ? new Date(next.endsAt).toISOString() : null,
        }),
      });
      setDraft(EMPTY);
      await load();
    } finally { setSaving(false); }
  }

  async function archive(id: string) {
    const headers = await adminAuthHeaders();
    await fetch(`/api/admin/notifications/campaigns?id=${encodeURIComponent(id)}`, { method: "DELETE", headers });
    if (draft.id === id) setDraft(EMPTY);
    await load();
  }

  function edit(c: CampaignRow) {
    setDraft({ ...c, startsAt: datetimeInput(c.startsAt), endsAt: datetimeInput(c.endsAt) });
  }

  function toggleModule(moduleId: string) {
    setDraft((current) => {
      if (moduleId === "all") return { ...current, targetModules: ["all"] };
      const selected = current.targetModules.filter((id) => id !== "all");
      const next = selected.includes(moduleId) ? selected.filter((id) => id !== moduleId) : [...selected, moduleId];
      return { ...current, targetModules: next.length ? next : ["all"] };
    });
  }

  return (
    <div>
      <AdminPageHeader title="Notifications" description="Global platform notices and module-targeted promptbox notices" />
      <section className="mb-5 rounded-maro16 bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-ink">{draft.id ? "Edit notice" : "New notice"}</h2>
          {draft.id && <Button variant="ghost" size="sm" onClick={() => setDraft(EMPTY)}>Cancel</Button>}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-[12px] text-ink-3">Placement
            <select className="h-11 rounded-maro12 bg-surface-2 px-3 text-[14px] text-ink" value={draft.kind} onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as Draft["kind"] }))}>
              <option value="tool_banner">Above promptbox</option><option value="global_banner">Above main navigation</option>
            </select>
          </label>
          <Field label="Priority"><Input type="number" value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: Number(e.target.value) }))} /></Field>
          <Field label="Title" wide><Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} /></Field>
          <Field label="Short text" wide><Input value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} /></Field>
          <Field label="CTA label"><Input value={draft.ctaLabel ?? ""} onChange={(e) => setDraft((d) => ({ ...d, ctaLabel: e.target.value || null }))} /></Field>
          <Field label="CTA URL"><Input value={draft.ctaUrl ?? ""} onChange={(e) => setDraft((d) => ({ ...d, ctaUrl: e.target.value || null }))} /></Field>
          <Field label="Starts (optional)"><Input type="datetime-local" value={draft.startsAt ?? ""} onChange={(e) => setDraft((d) => ({ ...d, startsAt: e.target.value || null }))} /></Field>
          <Field label="Ends (optional)"><Input type="datetime-local" value={draft.endsAt ?? ""} onChange={(e) => setDraft((d) => ({ ...d, endsAt: e.target.value || null }))} /></Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {MODULES.map((module) => <button key={module.id} type="button" onClick={() => toggleModule(module.id)} className={`rounded-full px-3 py-2 text-[12px] font-semibold ${draft.targetModules.includes(module.id) ? "bg-brand text-brand-fg" : "bg-surface-2 text-ink-2"}`}>{module.label}</button>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-5 text-[13px] text-ink-2">
          <label className="flex items-center gap-2"><Switch checked={draft.active} onChange={(active) => setDraft((d) => ({ ...d, active }))} /> Enabled</label>
          <label className="flex items-center gap-2"><Switch checked={draft.dismissible} onChange={(dismissible) => setDraft((d) => ({ ...d, dismissible }))} /> Dismissible (24h)</label>
        </div>
        <Button className="mt-4" disabled={saving || !draft.title.trim()} onClick={() => void save()}>{saving ? "Saving…" : "Save notice"}</Button>
      </section>

      <div className="space-y-2">
        {campaigns.map((c) => <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-maro16 bg-surface px-4 py-3">
          <button type="button" onClick={() => edit(c)} className="min-w-0 flex-1 text-left">
            <div className="font-semibold text-ink">{c.title}</div>
            <div className="mt-0.5 text-[12px] text-ink-3">{c.kind === "global_banner" ? "Global" : "Promptbox"} · {c.targetModules.join(", ")} · priority {c.priority}</div>
          </button>
          <div className="flex items-center gap-2"><Switch checked={c.active} onChange={() => void save({ ...c, active: !c.active })} /><Button variant="ghost" size="sm" onClick={() => edit(c)}>Edit</Button><Button variant="ghost" size="sm" onClick={() => void archive(c.id)}>Archive</Button></div>
        </div>)}
        {campaigns.length === 0 && <div className="text-[13px] text-ink-3">No notices yet.</div>}
      </div>
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`grid gap-1 text-[12px] text-ink-3 ${wide ? "md:col-span-2" : ""}`}>{label}{children}</label>;
}

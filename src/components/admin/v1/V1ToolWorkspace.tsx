"use client";
import * as React from "react";
import { adminRequest, Action, Section, Labeled, inputClass } from "./shared";
import type { SystemPromptVersion } from "@/lib/engine/types";
import type { publicV1ImageModel } from "@/lib/engine/v1ImageModels";
import { DEFAULT_WIZARD_STATE } from "@/lib/marologo/defaults";
import { LOGO_FIELD_GROUPS, OPTIONAL_LOGO_TEXT, type LogoContent, type LogoFieldKey } from "@/lib/marologo/content";
type Model = ReturnType<typeof publicV1ImageModel>;
type Layer = { id: string; layer_key: string; name: string; status: string; enabled: boolean; instructions: string; conditions: Array<{ field: string; equals: string[] }> };
export function V1ToolWorkspace({ toolId }: { toolId: "maro_imazh" | "maro_logo" }) {
  const [versions, setVersions] = React.useState<SystemPromptVersion[]>([]);
  const [selected, setSelected] = React.useState("");
  const [copy, setCopy] = React.useState("");
  const [models, setModels] = React.useState<Model[]>([]);
  const [layers, setLayers] = React.useState<Layer[]>([]);
  const [content, setContent] = React.useState<LogoContent | null>(null);
  const [fieldKey, setFieldKey] = React.useState<LogoFieldKey>("brand.name");
  const [sample, setSample] = React.useState("A reusable water bottle on a clean studio background");
  const [preview, setPreview] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const base = `/api/admin/engine/tools/${toolId}`;
  const current = versions.find((v) => v.id === selected);
  const editable = current?.status === "draft" || current?.status === "review";
  const dirty = current && copy !== current.content;
  const choose = (v?: SystemPromptVersion) => { setSelected(v?.id ?? ""); setCopy(v?.content ?? ""); setPreview(""); };
  const refreshVersions = async (id?: string) => { const data = await adminRequest<{ versions: SystemPromptVersion[] }>(`${base}/system-prompts`); setVersions(data.versions); choose(data.versions.find((v) => v.id === id) ?? data.versions.find((v) => v.status === "live")); };
  const act = async (work: () => Promise<void>, success = "Saved.") => { setBusy(true); setMessage(""); try { await work(); setMessage(success); } catch (e) { setMessage(e instanceof Error ? e.message : "Request failed"); } finally { setBusy(false); } };
  React.useEffect(() => { void act(async () => {
    const [config, prompts, ls] = await Promise.all([
      adminRequest<{ modules: Array<{ module: string; models: Model[] }> }>("/api/admin/v1/configuration"),
      adminRequest<{ versions: SystemPromptVersion[] }>(`${base}/system-prompts`), adminRequest<{ layers: Layer[] }>(`${base}/prompt-layers`),
    ]);
    setModels(config.modules.find((m) => m.module === toolId)?.models ?? []);
    setVersions(prompts.versions); choose(prompts.versions.find((v) => v.status === "live"));
    setLayers(ls.layers.filter((l) => l.enabled && l.status === "live" && /^v1\.production\./.test(l.layer_key) && !/(^|[._-])(fort|brain|web|future|legacy|migration|obsolete)([._-]|$)/i.test(l.layer_key)));
    setContent(toolId === "maro_logo" ? (await adminRequest<{ content: LogoContent }>("/api/admin/v1/logo-content")).content : null);
  }, ""); }, [toolId]); // eslint-disable-line react-hooks/exhaustive-deps
  const patchModel = (key: string, patch: Partial<Model>) => setModels((rows) => rows.map((m) => m.key === key ? { ...m, ...patch } : patch.isDefault ? { ...m, isDefault: false } : m));
  const field = content?.[fieldKey];
  const patchField = (patch: Partial<NonNullable<typeof field>>) => setContent((c) => c ? { ...c, [fieldKey]: { ...c[fieldKey], ...patch } } : c);
  return <div className="space-y-6 p-6 text-ink">
    <h1 className="text-2xl font-bold">{toolId === "maro_logo" ? "maroLogo" : "maroImazh"}</h1>
    <p className="text-sm text-ink-3">{toolId === "maro_logo" ? "Flare only. Workspace Brain is excluded." : "Workspace Brain is used only when the user explicitly enables it."}</p>
    <p role="status" aria-live="polite" className="text-sm">{busy ? "Working…" : message}</p>
    <Section title="Models & credits">
      {!models.length && <p>Model configuration unavailable.</p>}
      {models.map((m) => <fieldset key={m.key} disabled={busy} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="px-2 font-semibold">{m.key === "flare" ? "Flare" : "Sunburst"} · OpenAI</legend>
        <Labeled label="Display name"><input className={inputClass} maxLength={80} value={m.label} onChange={(e) => patchModel(m.key, { label: e.target.value })} /></Labeled>
        <Labeled label="Descriptor"><input className={inputClass} maxLength={240} value={m.descriptor} onChange={(e) => patchModel(m.key, { descriptor: e.target.value })} /></Labeled>
        <Labeled label="Customer credits"><input type="number" min={1} step={1} className={inputClass} value={m.customerCredits} onChange={(e) => patchModel(m.key, { customerCredits: Number(e.target.value) })} /></Labeled>
        <Labeled label="Order"><input type="number" min={0} step={1} className={inputClass} value={m.order} onChange={(e) => patchModel(m.key, { order: Number(e.target.value) })} /></Labeled>
        <label className="flex items-center gap-2"><input type="checkbox" disabled={toolId === "maro_logo"} checked={m.enabled} onChange={(e) => patchModel(m.key, { enabled: e.target.checked })} />Enabled</label>
        <label className="flex items-center gap-2"><input type="radio" name="default-model" disabled={!m.enabled || toolId === "maro_logo"} checked={m.isDefault} onChange={() => patchModel(m.key, { isDefault: true })} />Default</label>
      </fieldset>)}
      <Action disabled={busy || !models.length} onClick={() => void act(async () => { const result = await adminRequest<{ models: Model[] }>(`${base}/models`, "POST", { models }); setModels(result.models); }, "Production model configuration saved. New requests use these prices and defaults.")}>Save production models</Action>
      <p className="text-xs text-ink-3">Exactly one enabled default is required. Provider identities are fixed. Changes apply to new requests; existing jobs keep their saved price.</p>
    </Section>
    <Section title="Production prompt">
      <p className="text-sm">Published: <strong>{versions.find((v) => v.status === "live")?.versionLabel ?? "Unavailable"}</strong></p>
      <Labeled label="Version history"><select className={inputClass} value={selected} onChange={(e) => choose(versions.find((v) => v.id === e.target.value))}>{versions.map((v) => <option value={v.id} key={v.id}>{v.versionLabel} · {v.status} · {v.publishedAt ?? v.createdAt}</option>)}</select></Labeled>
      <textarea aria-label="System prompt" rows={14} className={inputClass} readOnly={!editable} value={copy} onChange={(e) => { setCopy(e.target.value); setPreview(""); }} />
      <div className="flex flex-wrap gap-2">
        <Action disabled={busy} onClick={() => void act(async () => { const d = await adminRequest<{ version: SystemPromptVersion }>(`${base}/system-prompts`, "POST", { action: "create_draft" }); await refreshVersions(d.version.id); }, "Draft created. Production is unchanged.")}>Create draft from published</Action>
        <Action disabled={busy || !editable || !copy.trim()} onClick={() => void act(async () => { await adminRequest(`/api/admin/engine/system-prompts/${selected}`, "PATCH", { content: copy }); await refreshVersions(selected); }, "Draft saved. Ready to preview.")}>Save draft</Action>
        <Action disabled={busy || !editable || Boolean(dirty) || !copy.trim()} onClick={() => { if (window.confirm("Publish this saved version to production?")) void act(async () => { await adminRequest(`/api/admin/engine/system-prompts/${selected}/publish`, "POST"); await refreshVersions(selected); }, "Published. New generations use this version."); }}>Publish saved draft</Action>
      </div>
      <Labeled label={toolId === "maro_logo" ? "Preview business description (synthetic brand: Preview Studio)" : "Preview request"}><textarea className={inputClass} value={sample} onChange={(e) => setSample(e.target.value)} /></Labeled>
      <Action disabled={busy || Boolean(dirty) || !current || current.status === "archived"} onClick={() => void act(async () => {
        const wizard = structuredClone(DEFAULT_WIZARD_STATE); wizard.brand.name = "Preview Studio"; wizard.brand.description = sample;
        if (content) for (const key of OPTIONAL_LOGO_TEXT) if (content[key].required) { const [group, name] = key.split("."); (wizard[group as keyof typeof wizard] as unknown as Record<string, string>)[name] = "Synthetic preview answer"; }
        const result = await adminRequest<{ canonical: { prompt: string; provenance: { promptHash: string } }; estimatedCredits: { total: number } }>("/api/admin/engine/compile", "POST", { toolId, userPrompt: sample, useBrain: false, ...(toolId === "maro_logo" ? { logoWizard: wizard } : {}), ...(editable ? { draftId: selected } : {}) });
        setPreview(`${editable ? "DRAFT PREVIEW" : "PUBLISHED PREVIEW"} · ${result.estimatedCredits.total} credits\nSHA256 ${result.canonical.provenance.promptHash}\n\n${result.canonical.prompt}`);
      }, "Canonical preview ready. No generation or charge.")}>Preview saved version</Action>
      {preview && <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap rounded-xl bg-canvas p-4 text-xs">{preview}</pre>}
    </Section>
    <Section title="Production instructions">
      <p className="text-sm text-ink-3">Save explicitly to change production. Matching conditions and ordering are fixed to the approved V1 rules.</p>
      {layers.map((l) => <details key={l.id} className="rounded-xl border border-line p-3"><summary className="cursor-pointer font-semibold">{l.name || l.layer_key}</summary>
        <p className="my-3 text-xs text-ink-3">{l.conditions.map((c) => `${c.field}: ${c.equals.join(", ")}`).join(" · ") || "Always"}</p>
        <textarea aria-label={l.name || l.layer_key} rows={5} className={inputClass} value={l.instructions} onChange={(e) => setLayers((rows) => rows.map((r) => r.id === l.id ? { ...r, instructions: e.target.value } : r))} />
        <Action disabled={busy || !l.instructions.trim()} onClick={() => void act(async () => { await adminRequest(`${base}/prompt-layers`, "POST", { id: l.id, instructions: l.instructions }); setPreview(""); }, "Production instructions saved.")}>Save production instructions</Action>
      </details>)}
    </Section>
    {content && field && <Section title="Logo Wizard content">
      <p className="text-sm text-ink-3">Existing fields only. Order applies within each existing section. Technical values, field types and the “Other industry” condition remain fixed.</p>
      <Labeled label="Question"><select className={inputClass} value={fieldKey} onChange={(e) => setFieldKey(e.target.value as LogoFieldKey)}>{Object.keys(content).map((k) => <option key={k} value={k}>{content[k as LogoFieldKey].label}</option>)}</select></Labeled>
      <Labeled label="Question label"><input className={inputClass} value={field.label} onChange={(e) => patchField({ label: e.target.value })} /></Labeled>
      {fieldKey !== "brand.industryOther" && <Labeled label="Help text"><textarea className={inputClass} value={field.help} onChange={(e) => patchField({ help: e.target.value })} /></Labeled>}
      {!field.options.length && fieldKey !== "brand.industryOther" && <Labeled label="Placeholder"><input className={inputClass} value={field.placeholder} onChange={(e) => patchField({ placeholder: e.target.value })} /></Labeled>}
      {LOGO_FIELD_GROUPS.some((g) => g.includes(fieldKey)) && <Labeled label="Order in section"><input type="number" min={0} max={1000} className={inputClass} value={field.order} onChange={(e) => patchField({ order: Number(e.target.value) })} /></Labeled>}
      {OPTIONAL_LOGO_TEXT.includes(fieldKey) && <div className="flex gap-4"><label><input type="checkbox" checked={field.enabled} onChange={(e) => patchField({ enabled: e.target.checked, required: e.target.checked && field.required })} /> Enabled</label><label><input type="checkbox" disabled={!field.enabled} checked={field.required} onChange={(e) => patchField({ required: e.target.checked })} /> Required</label></div>}
      {field.defaultValue && <Labeled label="Default"><select className={inputClass} value={field.defaultValue} onChange={(e) => patchField({ defaultValue: e.target.value })}>{field.options.map((o) => <option value={o.value} key={o.value}>{o.label}</option>)}</select></Labeled>}
      {field.options.map((o, index) => <fieldset key={o.value} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-3"><legend className="px-2 text-xs text-ink-3">{o.value}</legend>{(["label", ...(["logo.conceptIntent", "presentation.mode"].includes(fieldKey) ? ["description"] : []), "order"] as Array<"label" | "description" | "order">).map((key) => <Labeled key={key} label={key}><input className={inputClass} type={key === "order" ? "number" : "text"} value={o[key]} onChange={(e) => patchField({ options: field.options.map((v, i) => i === index ? { ...v, [key]: key === "order" ? Number(e.target.value) : e.target.value } : v) })} /></Labeled>)}</fieldset>)}
      <Action disabled={busy} onClick={() => void act(async () => { const result = await adminRequest<{ content: LogoContent }>("/api/admin/v1/logo-content", "PUT", { content }); setContent(result.content); }, "Logo content saved. New Wizard sessions use this content.")}>Save Wizard content</Action>
    </Section>}
  </div>;
}

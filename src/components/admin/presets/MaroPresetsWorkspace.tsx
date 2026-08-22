"use client";

import * as React from "react";
import { BarChart3, ImageIcon, LayoutTemplate, Pencil, Plus, Save, Search, Shapes, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Spinner } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import {
  adminCreatePrompt, adminDeletePrompt, adminListPrompts, adminUpdatePrompt, adminUploadPromptImage,
  type PromptDraft,
} from "@/lib/services/promptsService";
import type { AdminPromptItem, PresetCategoryItem, PromptAnalytics } from "@/lib/prompts/types";
import {
  PRESET_TOOL_META, PRESET_TOOLS, sanitizePresetConfig, type ImazhPresetConfig,
  type LogoPresetConfig, type PresetConfig, type PresetTool, type WebPresetConfig,
} from "@/lib/presets/model";
import { cn } from "@/lib/utils/cn";

export type MaroPresetsTab = "stats" | "add" | "list" | "categories";

const TOOL_ICONS = { imazh: ImageIcon, logo: Shapes, web: LayoutTemplate } satisfies Record<PresetTool, React.ElementType>;

function initialCategory(tool: PresetTool): string {
  return tool === "logo" ? "Minimal" : tool === "web" ? "Landing Page" : "Restaurant";
}

function emptyDraft(tool: PresetTool): PromptDraft {
  return {
    tool, title: "", description: "", category: initialCategory(tool), featured_url: null,
    full_prompt: "", keywords: [], target_tool: PRESET_TOOL_META[tool].targetTool,
    active: true, status: "published", config: { version: 1 }, featured: false,
    sort_order: 0, access_level: "free",
  };
}

export function MaroPresetsWorkspace({ tab, onTabChange }: { tab: MaroPresetsTab; onTabChange: (tab: MaroPresetsTab) => void }) {
  const { toast } = useToast();
  const [tool, setTool] = React.useState<PresetTool>("imazh");
  const [items, setItems] = React.useState<AdminPromptItem[]>([]);
  const [analytics, setAnalytics] = React.useState<PromptAnalytics | null>(null);
  const [categories, setCategories] = React.useState<PresetCategoryItem[]>([]);
  const [draft, setDraft] = React.useState<PromptDraft>(() => emptyDraft("imazh"));
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const loadCategories = React.useCallback(async (selected: PresetTool) => {
    const headers = await adminAuthHeaders();
    const res = await fetch(`/api/admin/presets/categories?tool=${selected}`, { headers });
    const body = await res.json() as { categories?: PresetCategoryItem[] };
    setCategories(body.categories ?? []);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    const result = await adminListPrompts();
    setItems(result.items);
    setAnalytics(result.analytics);
    await loadCategories(tool);
    setLoading(false);
  }, [loadCategories, tool]);

  React.useEffect(() => { void load(); }, [load]);

  const chooseTool = (next: PresetTool) => {
    setTool(next);
    setEditingId(null);
    setDraft(emptyDraft(next));
    setQuery("");
  };

  const visible = items.filter((item) => {
    if (item.tool !== tool) return false;
    const hay = [item.title, item.category, item.description, ...item.keywords].join(" ").toLowerCase();
    return !query.trim() || hay.includes(query.trim().toLowerCase());
  });

  const edit = (item: AdminPromptItem) => {
    setTool(item.tool);
    setEditingId(item.id);
    setDraft({
      tool: item.tool, title: item.title, slug: item.slug, description: item.description,
      category: item.category, featured_url: item.featured_url, full_prompt: item.full_prompt,
      keywords: item.keywords, target_tool: item.target_tool, active: item.active, status: item.status,
      config: item.config, featured: item.featured, sort_order: item.sort_order,
      access_level: item.access_level,
    });
    onTabChange("add");
  };

  const save = async () => {
    if (!draft.title.trim() || !draft.category.trim() || !draft.full_prompt.trim()) {
      toast("Titulli, kategoria dhe master prompt-i janë të detyrueshme.", "error");
      return;
    }
    setSaving(true);
    try {
      const clean = { ...draft, config: sanitizePresetConfig(draft.tool, draft.config) };
      if (editingId) await adminUpdatePrompt(editingId, clean); else await adminCreatePrompt(clean);
      toast(editingId ? "Preseti u përditësua." : "Preseti u krijua.", "success");
      setEditingId(null);
      setDraft(emptyDraft(tool));
      await load();
      onTabChange("list");
    } catch {
      toast("Preseti nuk u ruajt.", "error");
    } finally { setSaving(false); }
  };

  const remove = async (item: AdminPromptItem) => {
    if (!window.confirm(`Fshi presetin “${item.title}”?`)) return;
    try { await adminDeletePrompt(item.id); await load(); toast("Preseti u fshi.", "success"); }
    catch { toast("Preseti nuk u fshi.", "error"); }
  };

  const toggle = async (item: AdminPromptItem) => {
    try { await adminUpdatePrompt(item.id, { active: !item.active, status: item.active ? "disabled" : "published" }); await load(); }
    catch { toast("Statusi nuk u ndryshua.", "error"); }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      const url = await adminUploadPromptImage(dataUrl);
      setDraft((current) => ({ ...current, featured_url: url }));
    } catch { toast("Preview nuk u ngarkua.", "error"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const createCategory = async () => {
    const label = categoryName.trim();
    if (!label) return;
    const headers = await adminAuthHeaders();
    const res = await fetch("/api/admin/presets/categories", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ tool, label, slug: label }) });
    if (!res.ok) { toast("Kategoria nuk u krijua.", "error"); return; }
    setCategoryName("");
    await loadCategories(tool);
  };

  return <div>
    <ToolSelector value={tool} onChange={chooseTool} />
    {loading ? <div className="grid place-items-center py-24"><Spinner className="h-6 w-6" /></div> : tab === "stats" ? <Stats items={items.filter((item) => item.tool === tool)} analytics={analytics} /> : tab === "list" ? <PresetList items={visible} query={query} onQuery={setQuery} onAdd={() => { setEditingId(null); setDraft(emptyDraft(tool)); onTabChange("add"); }} onEdit={edit} onDelete={remove} onToggle={toggle} /> : tab === "categories" ? <Categories categories={categories} name={categoryName} onName={setCategoryName} onCreate={() => void createCategory()} /> : <PresetForm draft={draft} setDraft={setDraft} categories={categories} editing={Boolean(editingId)} saving={saving} uploading={uploading} fileRef={fileRef} onUpload={upload} onSave={() => void save()} />}
  </div>;
}

function ToolSelector({ value, onChange }: { value: PresetTool; onChange: (tool: PresetTool) => void }) {
  return <div className="mb-5 grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface p-2">{PRESET_TOOLS.map((tool) => { const Icon = TOOL_ICONS[tool]; return <button key={tool} type="button" onClick={() => onChange(tool)} className={cn("flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-[13px] font-bold transition", value === tool ? "bg-ink text-ink-inv" : "text-ink-2 hover:bg-surface-2")}><Icon className="h-4 w-4" />{PRESET_TOOL_META[tool].label}</button>; })}</div>;
}

function Stats({ items, analytics }: { items: AdminPromptItem[]; analytics: PromptAnalytics | null }) {
  const cards = [
    ["Gjithsej", items.length], ["Publikuar", items.filter((item) => item.active).length],
    ["Featured", items.filter((item) => item.featured).length], ["Përdorime", items.reduce((sum, item) => sum + item.use_count, 0)],
  ];
  return <div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-surface p-5"><div className="flex items-center gap-2 text-[12px] font-semibold text-ink-3"><BarChart3 className="h-4 w-4" />{label}</div><div className="mt-2 text-[28px] font-extrabold text-ink">{Number(value).toLocaleString()}</div></div>)}</div>{analytics && <p className="mt-4 text-[12px] text-ink-3">Analitika ruan numërimet ekzistuese të përdorimit dhe të preferuarave për të gjitha mjetet.</p>}</div>;
}

function PresetList({ items, query, onQuery, onAdd, onEdit, onDelete, onToggle }: { items: AdminPromptItem[]; query: string; onQuery: (v: string) => void; onAdd: () => void; onEdit: (item: AdminPromptItem) => void; onDelete: (item: AdminPromptItem) => void; onToggle: (item: AdminPromptItem) => void }) {
  return <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-64 flex-1 items-center gap-2 rounded-xl bg-surface px-3"><Search className="h-4 w-4 text-ink-3" /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Kërko presetet…" className="h-11 min-w-0 flex-1 bg-transparent text-[14px] outline-none" /></div><Button icon={<Plus className="h-4 w-4" />} onClick={onAdd}>Shto preset</Button></div><div className="overflow-hidden rounded-2xl border border-line bg-surface">{items.length === 0 ? <div className="py-16 text-center text-[13px] text-ink-3">Nuk ka presete për këtë mjet.</div> : items.map((item, index) => <div key={item.id} className={cn("flex items-center gap-3 p-3", index > 0 && "border-t border-line")}><div className={cn("w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2", item.tool === "web" ? "aspect-video" : "aspect-square")}>{item.featured_url && <img src={item.featured_url} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-[14px] text-ink">{item.title}</strong><span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-ink-3">{item.category}</span>{item.featured && <span className="text-[10.5px] font-bold text-brand">Featured</span>}</div><p className="mt-1 truncate text-[12px] text-ink-3">{item.description || item.code} · {item.use_count} përdorime</p></div><Switch checked={item.active} onChange={() => onToggle(item)} size="sm" /><button type="button" onClick={() => onEdit(item)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface-2" aria-label="Ndrysho"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => onDelete(item)} className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-danger/10" aria-label="Fshi"><Trash2 className="h-4 w-4" /></button></div>)}</div></div>;
}

function PresetForm({ draft, setDraft, categories, editing, saving, uploading, fileRef, onUpload, onSave }: { draft: PromptDraft; setDraft: React.Dispatch<React.SetStateAction<PromptDraft>>; categories: PresetCategoryItem[]; editing: boolean; saving: boolean; uploading: boolean; fileRef: React.RefObject<HTMLInputElement | null>; onUpload: (file?: File) => void; onSave: () => void }) {
  const set = <K extends keyof PromptDraft>(key: K, value: PromptDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-5 rounded-2xl bg-surface p-5"><div><h2 className="text-[18px] font-extrabold text-ink">{editing ? "Ndrysho presetin" : "Preset i ri"}</h2><p className="mt-1 text-[12.5px] text-ink-3">Fushat ndryshojnë sipas mjetit të zgjedhur.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Titulli"><Input value={draft.title} onChange={(e) => set("title", e.target.value)} /></Field><Field label="Kategoria"><Select value={draft.category} onChange={(e) => set("category", e.target.value)}>{categories.length === 0 && <option value={draft.category}>{draft.category}</option>}{categories.map((item) => <option key={item.id} value={item.label}>{item.label}</option>)}</Select></Field></div><Field label="Përshkrimi"><Textarea rows={3} value={draft.description} onChange={(e) => set("description", e.target.value)} /></Field><Field label="Fjalëkyçe" hint="Ndaji me presje"><Input value={draft.keywords.join(", ")} onChange={(e) => set("keywords", e.target.value.split(",").map((word) => word.trim()).filter(Boolean))} /></Field><ToolConfigFields tool={draft.tool} config={draft.config} onChange={(config) => set("config", config)} /><Field label="Master prompt i brendshëm" hint="Nuk shfaqet në katalog. Udhëzimet e përdoruesit kanë përparësi."><Textarea rows={7} value={draft.full_prompt} onChange={(e) => set("full_prompt", e.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-3"><Field label="Statusi"><Select value={draft.status} onChange={(e) => { const status = e.target.value as PromptDraft["status"]; setDraft((current) => ({ ...current, status, active: status === "published" })); }}><option value="published">Publikuar</option><option value="draft">Draft</option><option value="disabled">Çaktivizuar</option><option value="archived">Arkivuar</option></Select></Field><Field label="Aksesi"><Select value={draft.access_level} onChange={(e) => set("access_level", e.target.value as "free" | "premium")}><option value="free">Free</option><option value="premium">Premium</option></Select></Field><Field label="Renditja"><Input type="number" min={0} value={draft.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} /></Field></div><Switch checked={draft.featured} onChange={(value) => set("featured", value)} label="Featured" /><div className="flex justify-end"><Button loading={saving} icon={<Save className="h-4 w-4" />} onClick={onSave}>{editing ? "Ruaj ndryshimet" : "Krijo presetin"}</Button></div></div><aside className="space-y-4"><div className="rounded-2xl bg-surface p-4"><h3 className="text-[13px] font-bold text-ink">Preview i kartës</h3><div className={cn("mt-3 overflow-hidden rounded-xl bg-surface-2", draft.tool === "web" ? "aspect-video" : draft.tool === "logo" ? "aspect-square" : "aspect-[4/5]")}>{draft.featured_url ? <img src={draft.featured_url} alt="Preview" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-ink-3"><UploadCloud className="h-7 w-7" /></div>}</div><div className="mt-3"><strong className="text-[14px] text-ink">{draft.title || "Titulli i presetit"}</strong><p className="mt-1 line-clamp-2 text-[12px] text-ink-3">{draft.description || "Përshkrimi do të shfaqet këtu."}</p></div><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} /><Button variant="secondary" className="mt-3 w-full" loading={uploading} icon={<UploadCloud className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>Ngarko preview</Button></div></aside></div>;
}

function ToolConfigFields({ tool, config, onChange }: { tool: PresetTool; config: PresetConfig; onChange: (config: PresetConfig) => void }) {
  if (tool === "imazh") { const value = config as ImazhPresetConfig; return <div className="rounded-xl border border-line p-4"><h3 className="mb-3 text-[13px] font-bold">Konfigurimi Imazh</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Formati"><Select value={value.format ?? ""} onChange={(e) => onChange({ ...value, version: 1, format: e.target.value as ImazhPresetConfig["format"] })}><option value="">Maro vendos</option><option value="ig-post">Instagram Post</option><option value="ig-story">Story</option><option value="fb-post">Square</option><option value="yt-thumb">16:9</option></Select></Field><Field label="Teksti"><Select value={value.text ?? ""} onChange={(e) => onChange({ ...value, version: 1, text: e.target.value as ImazhPresetConfig["text"] })}><option value="">Maro vendos</option><option value="off">Pa tekst</option><option value="on">Me tekst</option></Select></Field></div><Field label="Prompt fillestar" optional><Textarea rows={2} value={value.initialPrompt ?? ""} onChange={(e) => onChange({ ...value, version: 1, initialPrompt: e.target.value })} /></Field></div>; }
  if (tool === "logo") { const value = config as LogoPresetConfig; return <div className="rounded-xl border border-line p-4"><h3 className="mb-3 text-[13px] font-bold">Konfigurimi Logo</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Lloji"><Select value={value.logoType ?? ""} onChange={(e) => onChange({ ...value, version: 1, logoType: e.target.value as LogoPresetConfig["logoType"] })}><option value="">Maro vendos</option><option value="wordmark">Wordmark</option><option value="symbol">Symbol</option><option value="symbol_wordmark">Symbol + Wordmark</option></Select></Field><Field label="Stili"><Select value={value.visualStyle ?? ""} onChange={(e) => onChange({ ...value, version: 1, visualStyle: e.target.value as LogoPresetConfig["visualStyle"] })}><option value="">Maro vendos</option><option value="minimal_intelligent">Minimal</option><option value="bold_distinctive">Bold</option><option value="elegant_refined">Elegant</option><option value="organic_human">Organic</option><option value="editorial_expressive">Editorial</option></Select></Field><Field label="Koncepti"><Select value={value.conceptIntent ?? ""} onChange={(e) => onChange({ ...value, version: 1, conceptIntent: e.target.value as LogoPresetConfig["conceptIntent"] })}><option value="">Maro vendos</option><option value="meaning">Meaning first</option><option value="typography">Typography first</option><option value="symbol">Symbol first</option></Select></Field><Field label="Prezantimi"><Select value={value.presentationMode ?? ""} onChange={(e) => onChange({ ...value, version: 1, presentationMode: e.target.value as LogoPresetConfig["presentationMode"] })}><option value="">Maro vendos</option><option value="bento">Bento</option><option value="color">Color</option><option value="bw">Black & White</option><option value="mockup">Mockup</option></Select></Field></div><Field label="Drejtimi kreativ"><Textarea rows={2} value={value.creativeDirection ?? ""} onChange={(e) => onChange({ ...value, version: 1, creativeDirection: e.target.value })} /></Field><Field label="Tiparet" hint="Maksimumi 3, ndaji me presje"><Input value={(value.traits ?? []).join(", ")} onChange={(e) => onChange({ ...value, version: 1, traits: e.target.value.split(",").map((word) => word.trim()).filter(Boolean).slice(0, 3) })} /></Field></div>; }
  const value = config as WebPresetConfig; return <div className="rounded-xl border border-line p-4"><h3 className="mb-3 text-[13px] font-bold">Konfigurimi Web</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Lloji i website-it"><Select value={value.websiteType ?? ""} onChange={(e) => onChange({ ...value, version: 1, websiteType: e.target.value as WebPresetConfig["websiteType"] })}><option value="">Maro vendos</option><option value="landing">Landing Page</option><option value="standard">Standard</option><option value="pro">Pro</option><option value="expert">Expert</option></Select></Field><Field label="Stili"><Input value={value.siteStyle ?? ""} onChange={(e) => onChange({ ...value, version: 1, siteStyle: e.target.value })} /></Field><Field label="Layout"><Input value={value.layout ?? ""} onChange={(e) => onChange({ ...value, version: 1, layout: e.target.value })} /></Field><Field label="Use case"><Input value={value.useCase ?? ""} onChange={(e) => onChange({ ...value, version: 1, useCase: e.target.value })} /></Field></div><Field label="Prompt fillestar" optional><Textarea rows={2} value={value.initialPrompt ?? ""} onChange={(e) => onChange({ ...value, version: 1, initialPrompt: e.target.value })} /></Field></div>;
}

function Categories({ categories, name, onName, onCreate }: { categories: PresetCategoryItem[]; name: string; onName: (value: string) => void; onCreate: () => void }) {
  return <div><div className="mb-4 flex gap-2 rounded-xl border border-line bg-surface p-4"><Input value={name} onChange={(e) => onName(e.target.value)} placeholder="Emri i kategorisë" /><Button icon={<Plus className="h-4 w-4" />} onClick={onCreate}>Shto</Button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{categories.map((item) => <div key={item.id} className="rounded-xl border border-line bg-surface p-4"><strong className="text-[14px] text-ink">{item.label}</strong><p className="mt-1 text-[12px] text-ink-3">{item.slug}</p></div>)}{categories.length === 0 && <div className="rounded-xl border border-dashed border-line p-8 text-[13px] text-ink-3">Krijo kategorinë e parë për këtë mjet.</div>}</div></div>;
}

"use client";

import * as React from "react";
import { formatCredits } from "@/lib/credits/format";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Field } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Spinner } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import {
  adminListPrompts,
  adminCreatePrompt,
  adminUpdatePrompt,
  adminDeletePrompt,
  adminUploadPromptImage,
  type PromptDraft,
} from "@/lib/services/promptsService";
import {
  PROMPT_CATEGORIES,
  PROMPT_TARGET_TOOLS,
  DEFAULT_PROMPT_REVEAL_COST,
  type AdminPromptItem,
  type PromptAnalytics,
} from "@/lib/prompts/types";
import { timeAgo } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  UploadCloud,
  Trash2,
  Plus,
  X,
  Save,
  Search,
  Pencil,
  BarChart3,
  Eye,
  Wand2,
  Coins,
  Check,
  LayoutGrid,
  List,
} from "lucide-react";

export type MaroPresetsTab = "stats" | "add" | "list" | "categories";

interface PresetCategoryRow {
  id: string;
  slug: string;
  label: string;
  description: string;
  sortOrder: number;
  active: boolean;
}

export function MaroPresetsWorkspace({
  tab,
  onTabChange,
}: {
  tab: MaroPresetsTab;
  onTabChange: (tab: MaroPresetsTab) => void;
}) {
  return <AdminPromptsInner tab={tab} onTabChange={onTabChange} />;
}

const emptyDraft = (): PromptDraft => ({
  category: PROMPT_CATEGORIES[0],
  featured_url: null,
  full_prompt: "",
  keywords: [],
  target_tool: PROMPT_TARGET_TOOLS[0].id,
  active: true,
});

function AdminPromptsInner({
  tab,
  onTabChange,
}: {
  tab: MaroPresetsTab;
  onTabChange: (tab: MaroPresetsTab) => void;
}) {
  const { toast } = useToast();

  const [items, setItems] = React.useState<AdminPromptItem[]>([]);
  const [analytics, setAnalytics] = React.useState<PromptAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<PromptDraft>(emptyDraft());
  const [kwInput, setKwInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const [fCat, setFCat] = React.useState<string>("");
  const [fTool, setFTool] = React.useState<string>("");
  const [query, setQuery] = React.useState("");

  const [revealCost, setRevealCost] = React.useState<number>(DEFAULT_PROMPT_REVEAL_COST);
  const [dbCategories, setDbCategories] = React.useState<PresetCategoryRow[]>([]);
  const [catSlug, setCatSlug] = React.useState("");
  const [catLabel, setCatLabel] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const loadCategories = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const res = await fetch("/api/admin/presets/categories", { headers });
    const data = (await res.json()) as { categories?: PresetCategoryRow[] };
    setDbCategories(data.categories ?? []);
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { items, analytics } = await adminListPrompts();
    setItems(items);
    setAnalytics(analytics);
    await loadCategories();
    setLoading(false);
  }, [loadCategories]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!supabaseConfigured) return;
    void getSupabaseBrowser()
      .from("app_settings")
      .select("pricing")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        const pc = (data?.pricing as { promptRevealCost?: number }) ?? {};
        if (typeof pc.promptRevealCost === "number") setRevealCost(pc.promptRevealCost);
      });
  }, []);

  const saveRevealCost = async () => {
    if (!supabaseConfigured) return;
    const { data } = await getSupabaseBrowser()
      .from("app_settings")
      .select("pricing")
      .eq("id", 1)
      .single();
    const pricing = { ...(data?.pricing as Record<string, unknown>), promptRevealCost: revealCost };
    const { error } = await getSupabaseBrowser()
      .from("app_settings")
      .update({ pricing, updated_at: new Date().toISOString() })
      .eq("id", 1);
    toast(error ? "Gabim: " + error.message : "Kosto u ruajt.");
  };

  const resetForm = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setKwInput("");
  };

  const startEdit = (p: AdminPromptItem) => {
    setEditingId(p.id);
    setDraft({
      category: p.category,
      featured_url: p.featured_url,
      full_prompt: p.full_prompt,
      keywords: p.keywords ?? [],
      target_tool: p.target_tool,
      active: p.active,
    });
    setKwInput("");
    onTabChange("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const commitKeywords = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setDraft((d) => {
      const set = new Set([...d.keywords, ...parts]);
      return { ...d, keywords: Array.from(set).slice(0, 60) };
    });
  };

  const onKwKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      commitKeywords(kwInput);
      setKwInput("");
    } else if (e.key === "Backspace" && !kwInput && draft.keywords.length) {
      setDraft((d) => ({ ...d, keywords: d.keywords.slice(0, -1) }));
    }
  };

  const onKwChange = (v: string) => {
    if (v.includes(",")) {
      commitKeywords(v);
      setKwInput("");
    } else {
      setKwInput(v);
    }
  };

  const removeKeyword = (k: string) =>
    setDraft((d) => ({ ...d, keywords: d.keywords.filter((x) => x !== k) }));

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Zgjidh nj├½ imazh.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast("Imazhi ├½sht├½ shum├½ i madh (max 8MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      try {
        const url = await adminUploadPromptImage(reader.result as string);
        setDraft((d) => ({ ...d, featured_url: url }));
      } catch {
        toast("Ngarkimi d├½shtoi.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    const pending = kwInput.trim();
    const draftToSave: PromptDraft = pending
      ? { ...draft, keywords: Array.from(new Set([...draft.keywords, pending])) }
      : draft;
    if (!draftToSave.category || !draftToSave.full_prompt.trim()) {
      toast("Plot├½so kategorin├½ dhe promptin.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await adminUpdatePrompt(editingId, draftToSave);
        toast("Prompti u p├½rdit├½sua.");
      } else {
        await adminCreatePrompt(draftToSave);
        toast("Prompti u shtua.");
      }
      resetForm();
      await load();
      onTabChange("list");
    } catch {
      toast("Ruajtja d├½shtoi.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: AdminPromptItem) => {
    if (!confirm(`Fshi promptin ${p.code}?`)) return;
    try {
      await adminDeletePrompt(p.id);
      if (editingId === p.id) resetForm();
      await load();
      toast("Prompti u fshi.");
    } catch {
      toast("Fshirja d├½shtoi.");
    }
  };

  const toggleActive = async (p: AdminPromptItem) => {
    try {
      await adminUpdatePrompt(p.id, { active: !p.active });
      setItems((list) => list.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)));
    } catch {
      toast("P├½rdit├½simi d├½shtoi.");
    }
  };

  const openCategory = (category: string) => {
    setFCat(category);
    setFTool("");
    setQuery("");
    onTabChange("list");
  };

  const filtered = React.useMemo(() => {
    const kw = query.trim().toLowerCase();
    return items.filter((p) => {
      if (fCat && p.category !== fCat) return false;
      if (fTool && p.target_tool !== fTool) return false;
      if (kw) {
        const hay = [p.code, p.category, ...(p.keywords ?? [])].join(" ").toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [items, fCat, fTool, query]);

  const categoryLabels = React.useMemo(() => {
    const fromDb = dbCategories.filter((c) => c.active).map((c) => c.label);
    const merged = new Set<string>([...PROMPT_CATEGORIES, ...fromDb]);
    return Array.from(merged);
  }, [dbCategories]);

  const categoryCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categoryLabels) map.set(c, 0);
    for (const p of items) {
      map.set(p.category, (map.get(p.category) ?? 0) + 1);
    }
    return categoryLabels.map((c) => ({ category: c, count: map.get(c) ?? 0 }));
  }, [items, categoryLabels]);

  async function createCategory() {
    if (!catSlug.trim() || !catLabel.trim()) return;
    const headers = await adminAuthHeaders(true);
    await fetch("/api/admin/presets/categories", {
      method: "POST",
      headers,
      body: JSON.stringify({ slug: catSlug, label: catLabel }),
    });
    setCatSlug("");
    setCatLabel("");
    await loadCategories();
    toast("Kategoria u shtua.");
  }

  return (
    <div>
      {!supabaseConfigured && (
        <div className="mb-4 rounded-xl bg-surface-2 px-4 py-3 text-[13.5px] text-ink-2">
          Supabase nuk është konfiguruar.
        </div>
      )}

      {loading && tab !== "categories" ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <>
          {tab === "stats" && (
            <StatsTab
              analytics={analytics}
              revealCost={revealCost}
              setRevealCost={setRevealCost}
              onSaveRevealCost={saveRevealCost}
            />
          )}
          {tab === "add" && (
            <AddPromptTab
              editingId={editingId}
              draft={draft}
              setDraft={setDraft}
              kwInput={kwInput}
              onKwChange={onKwChange}
              onKwKeyDown={onKwKeyDown}
              commitKeywords={commitKeywords}
              setKwInput={setKwInput}
              removeKeyword={removeKeyword}
              uploading={uploading}
              saving={saving}
              fileRef={fileRef}
              onFile={handleFile}
              onSave={save}
              onReset={resetForm}
              categoryOptions={categoryLabels}
            />
          )}
          {tab === "list" && (
            <ListTab
              loading={loading}
              filtered={filtered}
              query={query}
              setQuery={setQuery}
              fCat={fCat}
              setFCat={setFCat}
              fTool={fTool}
              setFTool={setFTool}
              onEdit={startEdit}
              onRemove={remove}
              onToggleActive={toggleActive}
              onAdd={() => {
                resetForm();
                onTabChange("add");
              }}
              categoryOptions={categoryLabels}
            />
          )}
          {tab === "categories" && (
            <CategoriesTab
              categories={categoryCounts}
              dbCategories={dbCategories}
              items={items}
              onOpenCategory={openCategory}
              catSlug={catSlug}
              catLabel={catLabel}
              setCatSlug={setCatSlug}
              setCatLabel={setCatLabel}
              onCreateCategory={() => void createCategory()}
            />
          )}
        </>
      )}
    </div>
  );
}

function StatsTab({
  analytics,
  revealCost,
  setRevealCost,
  onSaveRevealCost,
}: {
  analytics: PromptAnalytics | null;
  revealCost: number;
  setRevealCost: (n: number) => void;
  onSaveRevealCost: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[18px] font-bold text-ink">Statistika</h2>
        <p className="mt-1 text-[13.5px] text-ink-2">Përmbledhje e preset-eve dhe përdorimit.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Presetet gjithsej" value={analytics?.total ?? 0} icon={List} />
        <StatCard label="Aktive" value={analytics?.activeCount ?? 0} icon={Check} />
        <StatCard label="P├½rdorime (+maro)" value={analytics?.totalUses ?? 0} icon={Wand2} />
        <StatCard label="Zbulime" value={analytics?.totalReveals ?? 0} icon={Eye} />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <RankCard
          title="M├½ t├½ p├½rdorurat"
          rows={(analytics?.mostUsed ?? []).map((r) => ({
            code: r.code,
            category: r.category,
            value: r.use_count,
          }))}
        />
        <RankCard
          title="M├½ t├½ zbuluarat"
          rows={(analytics?.mostRevealed ?? []).map((r) => ({
            code: r.code,
            category: r.category,
            value: r.reveal_count,
          }))}
        />
        <div className="rounded-2xl bg-surface p-4">
          <div className="text-[13px] font-bold text-ink">T├½ ardhura nga zbulimet</div>
          <div className="mt-2 flex items-center gap-1.5 text-[26px] font-extrabold text-ink">
            <Coins className="h-5 w-5 text-brand" />
            {formatCredits(analytics?.creditsFromReveals ?? 0)}
          </div>
          <div className="mt-3 pt-3">
            <Field label="Kosto e zbulimit (kredite)">
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={String(revealCost)}
                  onChange={(e) => setRevealCost(Math.max(0, Number(e.target.value) || 0))}
                />
                <Button variant="outline" onClick={onSaveRevealCost}>
                  Ruaj
                </Button>
              </div>
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddPromptTab({
  editingId,
  draft,
  setDraft,
  kwInput,
  onKwChange,
  onKwKeyDown,
  commitKeywords,
  setKwInput,
  removeKeyword,
  uploading,
  saving,
  fileRef,
  onFile,
  onSave,
  onReset,
  categoryOptions,
}: {
  editingId: string | null;
  draft: PromptDraft;
  setDraft: React.Dispatch<React.SetStateAction<PromptDraft>>;
  kwInput: string;
  onKwChange: (v: string) => void;
  onKwKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  commitKeywords: (raw: string) => void;
  setKwInput: (v: string) => void;
  removeKeyword: (k: string) => void;
  uploading: boolean;
  saving: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | undefined) => void;
  onSave: () => void;
  onReset: () => void;
  categoryOptions: string[];
}) {
  return (
    <div className="rounded-2xl bg-surface p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-ink">
            {editingId ? "Ndrysho presetin" : "Shto preset të ri"}
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">
            {editingId ? "Përditëso detajet e preset-it ekzistues." : "Krijo një preset të ri për katalogun maroPresets."}
          </p>
        </div>
        {editingId && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Anulo
          </Button>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
        <div>
          <Field label="Imazhi Featured">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFile(e.dataTransfer.files?.[0]);
              }}
              className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-surface-2"
            >
              {draft.featured_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={draft.featured_url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setDraft((d) => ({ ...d, featured_url: null }))}
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-scrim text-on-scrim"
                    aria-label="Hiq"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-2 px-4 py-8 text-center text-ink-3"
                >
                  {uploading ? <Spinner className="h-6 w-6" /> : <UploadCloud className="h-7 w-7" />}
                  <span className="text-[13px] font-semibold">
                    {uploading ? "Duke ngarkuarÔÇª" : "Kliko ose t├½rhiq imazhin"}
                  </span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  onFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </Field>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategoria">
              <select
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                className="w-full rounded-xl bg-surface-2 px-3 py-2.5 text-[14px] text-ink outline-none focus:bg-surface focus:ring-2 focus:ring-ink/10"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tooli">
              <select
                value={draft.target_tool}
                onChange={(e) => setDraft((d) => ({ ...d, target_tool: e.target.value }))}
                className="w-full rounded-xl bg-surface-2 px-3 py-2.5 text-[14px] text-ink outline-none focus:bg-surface focus:ring-2 focus:ring-ink/10"
              >
                {PROMPT_TARGET_TOOLS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Prompti i plot├½ (i fshehur nga useri)">
            <Textarea
              rows={5}
              value={draft.full_prompt}
              onChange={(e) => setDraft((d) => ({ ...d, full_prompt: e.target.value }))}
              placeholder="Shkruaj promptin e plot├½ profesionalÔÇª"
            />
          </Field>

          <Field label="Fjal├½ky├ºe (ndaj me presje)">
            <div className="rounded-xl bg-surface-2 px-2.5 py-2">
              {draft.keywords.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {draft.keywords.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[12px] text-ink"
                    >
                      {k}
                      <button type="button" onClick={() => removeKeyword(k)} aria-label="Hiq">
                        <X className="h-3 w-3 text-ink-3 hover:text-ink" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                value={kwInput}
                onChange={(e) => onKwChange(e.target.value)}
                onKeyDown={onKwKeyDown}
                onBlur={() => {
                  if (kwInput.trim()) {
                    commitKeywords(kwInput);
                    setKwInput("");
                  }
                }}
                placeholder="burger, pizza, studio, outsideÔÇª"
                className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
              />
            </div>
          </Field>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 text-[14px] font-semibold text-ink">
              <Switch checked={draft.active} onChange={(v) => setDraft((d) => ({ ...d, active: v }))} />
              Aktiv
            </label>
            <Button icon={<Save className="h-4 w-4" />} onClick={onSave} disabled={saving}>
              {saving ? "Duke ruajturÔÇª" : editingId ? "Ruaj ndryshimet" : "Shto prompt"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListTab({
  loading,
  filtered,
  query,
  setQuery,
  fCat,
  setFCat,
  fTool,
  setFTool,
  onEdit,
  onRemove,
  onToggleActive,
  onAdd,
  categoryOptions,
}: {
  loading: boolean;
  filtered: AdminPromptItem[];
  query: string;
  setQuery: (v: string) => void;
  fCat: string;
  setFCat: (v: string) => void;
  fTool: string;
  setFTool: (v: string) => void;
  onEdit: (p: AdminPromptItem) => void;
  onRemove: (p: AdminPromptItem) => void;
  onToggleActive: (p: AdminPromptItem) => void;
  onAdd: () => void;
  categoryOptions: string[];
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-ink">Presetet</h2>
          <p className="mt-1 text-[13px] text-ink-3">{filtered.length} preset</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={onAdd}>
          Shto preset
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface px-3 py-2">
          <Search className="h-4 w-4 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="K├½rko me kod, kategori, fjal├½ky├ºÔÇª"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
          />
        </div>
        <select
          value={fCat}
          onChange={(e) => setFCat(e.target.value)}
          className="rounded-xl bg-surface px-3 py-2 text-[14px] text-ink outline-none"
        >
          <option value="">T├½ gjitha kategorit├½</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={fTool}
          onChange={(e) => setFTool(e.target.value)}
          className="rounded-xl bg-surface px-3 py-2 text-[14px] text-ink outline-none"
        >
          <option value="">T├½ gjitha toolet</option>
          {PROMPT_TARGET_TOOLS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-surface py-16 text-center text-[14px] text-ink-3">
          Asnj├½ prompt.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-surface">
          {filtered.map((p, i) => {
            const toolName =
              PROMPT_TARGET_TOOLS.find((t) => t.id === p.target_tool)?.label ?? p.target_tool;
            return (
              <div
                key={p.id}
                className={cn("flex items-center gap-3 px-3 py-3", i > 0 && "border-t border-line")}
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {p.featured_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.featured_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-ink-3">
                      <Wand2 className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12.5px] font-bold text-ink">{p.code}</span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                      {p.category}
                    </span>
                    <span className="text-[11.5px] text-ink-3">{toolName}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-ink-3">
                    {(p.keywords ?? []).slice(0, 8).join(", ") || "pa fjal├½ky├ºe"}
                  </div>
                </div>
                <div className="hidden shrink-0 items-center gap-4 text-[12px] text-ink-3 sm:flex">
                  <span title="P├½rdorime" className="inline-flex items-center gap-1">
                    <Wand2 className="h-3.5 w-3.5" /> {p.use_count}
                  </span>
                  <span title="Zbulime" className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> {p.reveal_count}
                  </span>
                  <span className="w-16 text-right">{timeAgo(p.created_at)}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Switch checked={p.active} onChange={() => onToggleActive(p)} size="sm" />
                  <button
                    type="button"
                    onClick={() => onEdit(p)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                    aria-label="Ndrysho"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(p)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label="Fshi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoriesTab({
  categories,
  dbCategories,
  items,
  onOpenCategory,
  catSlug,
  catLabel,
  setCatSlug,
  setCatLabel,
  onCreateCategory,
}: {
  categories: { category: string; count: number }[];
  dbCategories: PresetCategoryRow[];
  items: AdminPromptItem[];
  onOpenCategory: (category: string) => void;
  catSlug: string;
  catLabel: string;
  setCatSlug: (v: string) => void;
  setCatLabel: (v: string) => void;
  onCreateCategory: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-ink">Kategoritë</h2>
          <p className="mt-1 text-[13px] text-ink-3">
            Burimi kanonik: <code className="text-[11px]">preset_categories</code>. Kliko një kategori për preset-et.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4">
        <div>
          <label className="text-[11px] font-semibold text-ink-3">Slug</label>
          <Input value={catSlug} onChange={(e) => setCatSlug(e.target.value)} placeholder="marketing" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-ink-3">Emri</label>
          <Input value={catLabel} onChange={(e) => setCatLabel(e.target.value)} placeholder="Marketing" />
        </div>
        <Button onClick={onCreateCategory}>Shto kategori</Button>
      </div>

      {dbCategories.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-2 text-[11px] uppercase text-ink-3">
              <tr>
                <th className="px-3 py-2">Emri</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Presetet</th>
                <th className="px-3 py-2">Aktive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {dbCategories.map((c) => {
                const count = items.filter((p) => p.category === c.label).length;
                const active = items.filter((p) => p.category === c.label && p.active).length;
                return (
                  <tr key={c.id}>
                    <td className="px-3 py-2 font-semibold">{c.label}</td>
                    <td className="px-3 py-2 text-ink-3">{c.slug}</td>
                    <td className="px-3 py-2">{count}</td>
                    <td className="px-3 py-2">{active}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map(({ category, count }) => {
          const active = items.filter((p) => p.category === category && p.active).length;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onOpenCategory(category)}
              className="rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:bg-surface-2"
            >
              <div className="text-[15px] font-bold text-ink">{category}</div>
              <div className="mt-2 flex items-center gap-3 text-[12.5px] text-ink-3">
                <span>{count} gjithsej</span>
                <span>{active} aktive</span>
              </div>
            </button>
          );
        })}
        {categories.length === 0 && (
          <div className="rounded-xl border border-dashed border-line px-4 py-8 text-[13px] text-ink-3">
            Nuk ka kategori — shto një kategori ose ekzekuto migrimin 0025.
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-ink-3">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-1.5 text-[26px] font-extrabold tracking-[-0.03em] text-ink">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function RankCard({
  title,
  rows,
}: {
  title: string;
  rows: { code: string; category: string; value: number }[];
}) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="text-[13px] font-bold text-ink">{title}</div>
      {rows.length === 0 ? (
        <div className="mt-3 text-[12.5px] text-ink-3">Ende asgj├½.</div>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          {rows.map((r) => (
            <div key={r.code} className="flex items-center justify-between text-[12.5px]">
              <span className="flex items-center gap-2">
                <span className="font-mono font-semibold text-ink">{r.code}</span>
                <span className="text-ink-3">{r.category}</span>
              </span>
              <span className="font-bold text-ink">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

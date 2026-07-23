"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Field } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Spinner } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";
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
  ArrowLeft,
  Lightbulb,
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
} from "lucide-react";

export default function AdminPromptsPage() {
  const router = useRouter();
  const { ready, user, isAdmin } = useMaro();

  React.useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/sign-in");
    else if (!isAdmin) router.replace("/");
  }, [ready, user, isAdmin, router]);

  if (!ready || !user || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return <AdminPromptsInner />;
}

const emptyDraft = (): PromptDraft => ({
  category: PROMPT_CATEGORIES[0],
  featured_url: null,
  full_prompt: "",
  keywords: [],
  target_tool: PROMPT_TARGET_TOOLS[0].id,
  active: true,
});

function AdminPromptsInner() {
  const router = useRouter();
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
  const fileRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { items, analytics } = await adminListPrompts();
    setItems(items);
    setAnalytics(analytics);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Load the editable reveal cost from app_settings.
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Keyword chips: auto-split on comma / Enter.
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
      toast("Zgjidh një imazh.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast("Imazhi është shumë i madh (max 8MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      try {
        const url = await adminUploadPromptImage(reader.result as string);
        setDraft((d) => ({ ...d, featured_url: url }));
      } catch {
        toast("Ngarkimi dështoi.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    // Fold any pending keyword text before saving.
    const pending = kwInput.trim();
    const draftToSave: PromptDraft = pending
      ? { ...draft, keywords: Array.from(new Set([...draft.keywords, pending])) }
      : draft;
    if (!draftToSave.category || !draftToSave.full_prompt.trim()) {
      toast("Plotëso kategorinë dhe promptin.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await adminUpdatePrompt(editingId, draftToSave);
        toast("Prompti u përditësua.");
      } else {
        await adminCreatePrompt(draftToSave);
        toast("Prompti u shtua.");
      }
      resetForm();
      await load();
    } catch {
      toast("Ruajtja dështoi.");
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
      toast("Fshirja dështoi.");
    }
  };

  const toggleActive = async (p: AdminPromptItem) => {
    try {
      await adminUpdatePrompt(p.id, { active: !p.active });
      setItems((list) => list.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x)));
    } catch {
      toast("Përditësimi dështoi.");
    }
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

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex w-fit items-center gap-1.5 text-[13.5px] font-semibold text-ink-2 transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Kthehu në admin
          </button>
          <div className="flex items-center gap-3.5">
            <span
              className="grid h-12 w-12 place-items-center rounded-2xl"
              style={{ background: "rgba(0,253,186,0.14)", color: "#0b8f6e" }}
            >
              <Lightbulb className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-[32px] font-extrabold tracking-[-0.035em] text-ink">Prompts Admin</h1>
              <p className="text-[14px] text-ink-2">
                Kurato prompte, kategori, fjalëkyçe dhe shiko statistikat.
              </p>
            </div>
          </div>
        </div>

        {!supabaseConfigured && (
          <div className="mt-6 rounded-xl border border-line-strong bg-surface-2 px-4 py-3 text-[13.5px] text-ink-2">
            Supabase nuk është konfiguruar.
          </div>
        )}

        {/* Analytics */}
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-ink-3">
            <BarChart3 className="h-4 w-4" /> Statistika
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Prompte gjithsej" value={analytics?.total ?? 0} icon={Lightbulb} />
            <StatCard label="Aktive" value={analytics?.activeCount ?? 0} icon={Check} />
            <StatCard label="Përdorime (+maro)" value={analytics?.totalUses ?? 0} icon={Wand2} />
            <StatCard label="Zbulime" value={analytics?.totalReveals ?? 0} icon={Eye} />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <RankCard
              title="Më të përdorurat"
              rows={(analytics?.mostUsed ?? []).map((r) => ({
                code: r.code,
                category: r.category,
                value: r.use_count,
              }))}
            />
            <RankCard
              title="Më të zbuluarat"
              rows={(analytics?.mostRevealed ?? []).map((r) => ({
                code: r.code,
                category: r.category,
                value: r.reveal_count,
              }))}
            />
            <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="text-[13px] font-bold text-ink">Të ardhura nga zbulimet</div>
              <div className="mt-2 flex items-center gap-1.5 text-[26px] font-extrabold text-ink">
                <Coins className="h-5 w-5 text-brand" />
                {(analytics?.creditsFromReveals ?? 0).toLocaleString()}
              </div>
              <div className="mt-3 border-t border-line pt-3">
                <Field label="Kosto e zbulimit (kredite)">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={String(revealCost)}
                      onChange={(e) => setRevealCost(Math.max(0, Number(e.target.value) || 0))}
                    />
                    <Button variant="outline" onClick={saveRevealCost}>
                      Ruaj
                    </Button>
                  </div>
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* Add / edit form */}
        <div className="mt-8 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-ink">
              {editingId ? "Ndrysho promptin" : "Shto prompt të ri"}
            </h2>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={resetForm}>
                Anulo
              </Button>
            )}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
            {/* Featured image */}
            <div>
              <Field label="Imazhi Featured">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFile(e.dataTransfer.files?.[0]);
                  }}
                  className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl border border-dashed border-line-strong bg-surface-2"
                >
                  {draft.featured_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.featured_url} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => setDraft((d) => ({ ...d, featured_url: null }))}
                        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink/70 text-white"
                        aria-label="Hiq"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex flex-col items-center gap-2 px-4 py-8 text-center text-ink-3"
                    >
                      {uploading ? (
                        <Spinner className="h-6 w-6" />
                      ) : (
                        <UploadCloud className="h-7 w-7" />
                      )}
                      <span className="text-[13px] font-semibold">
                        {uploading ? "Duke ngarkuar…" : "Kliko ose tërhiq imazhin"}
                      </span>
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
              </Field>
            </div>

            {/* Fields */}
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kategoria">
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                    className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-brand"
                  >
                    {PROMPT_CATEGORIES.map((c) => (
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
                    className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-[14px] text-ink outline-none focus:border-brand"
                  >
                    {PROMPT_TARGET_TOOLS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Prompti i plotë (i fshehur nga useri)">
                <Textarea
                  rows={5}
                  value={draft.full_prompt}
                  onChange={(e) => setDraft((d) => ({ ...d, full_prompt: e.target.value }))}
                  placeholder="Shkruaj promptin e plotë profesional…"
                />
              </Field>

              <Field label="Fjalëkyçe (ndaj me presje)">
                <div className="rounded-xl border border-line-strong bg-surface px-2.5 py-2">
                  {draft.keywords.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {draft.keywords.map((k) => (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[12px] text-ink"
                        >
                          {k}
                          <button onClick={() => removeKeyword(k)} aria-label="Hiq">
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
                    placeholder="burger, pizza, studio, outside…"
                    className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
                  />
                </div>
              </Field>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 text-[14px] font-semibold text-ink">
                  <Switch checked={draft.active} onChange={(v) => setDraft((d) => ({ ...d, active: v }))} />
                  Aktiv
                </label>
                <Button icon={<Save className="h-4 w-4" />} onClick={save} disabled={saving}>
                  {saving ? "Duke ruajtur…" : editingId ? "Ruaj ndryshimet" : "Shto prompt"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* List + filters */}
        <div className="mt-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2">
              <Search className="h-4 w-4 text-ink-3" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Kërko me kod, kategori, fjalëkyç…"
                className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
              />
            </div>
            <select
              value={fCat}
              onChange={(e) => setFCat(e.target.value)}
              className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink outline-none"
            >
              <option value="">Të gjitha kategoritë</option>
              {PROMPT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={fTool}
              onChange={(e) => setFTool(e.target.value)}
              className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink outline-none"
            >
              <option value="">Të gjitha toolet</option>
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
            <div className="rounded-2xl border border-line bg-surface py-16 text-center text-[14px] text-ink-3">
              Asnjë prompt.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              {filtered.map((p, i) => {
                const toolName =
                  PROMPT_TARGET_TOOLS.find((t) => t.id === p.target_tool)?.label ?? p.target_tool;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3",
                      i > 0 && "border-t border-line"
                    )}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                      {p.featured_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.featured_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-ink-3">
                          <Lightbulb className="h-5 w-5" />
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
                        {(p.keywords ?? []).slice(0, 8).join(", ") || "pa fjalëkyçe"}
                      </div>
                    </div>
                    <div className="hidden shrink-0 items-center gap-4 text-[12px] text-ink-3 sm:flex">
                      <span title="Përdorime" className="inline-flex items-center gap-1">
                        <Wand2 className="h-3.5 w-3.5" /> {p.use_count}
                      </span>
                      <span title="Zbulime" className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> {p.reveal_count}
                      </span>
                      <span className="w-16 text-right">{timeAgo(p.created_at)}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Switch checked={p.active} onChange={() => toggleActive(p)} size="sm" />
                      <button
                        onClick={() => startEdit(p)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                        aria-label="Ndrysho"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(p)}
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
      </main>
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
    <div className="rounded-2xl border border-line bg-surface p-4">
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
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[13px] font-bold text-ink">{title}</div>
      {rows.length === 0 ? (
        <div className="mt-3 text-[12.5px] text-ink-3">Ende asgjë.</div>
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

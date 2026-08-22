"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Crown, Heart, Image as ImageIcon, LayoutTemplate, Lightbulb, Loader2, Search, Shapes, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { PresetCard } from "@/components/presets/PresetCard";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import { fetchPromptDetail, fetchPrompts, toggleLike } from "@/lib/services/promptsService";
import { PROMPT_ATTACH_KEY, type PresetCategoryItem, type PromptItem } from "@/lib/prompts/types";
import { isPresetTool, PRESET_TOOL_META, PRESET_TOOLS, type PresetTool } from "@/lib/presets/model";
import { cn } from "@/lib/utils/cn";

const TOOL_ICONS = { imazh: ImageIcon, logo: Shapes, web: LayoutTemplate } satisfies Record<PresetTool, React.ElementType>;

function PromptsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useMaro();
  const rawTool = searchParams.get("tool");
  const tool: PresetTool = isPresetTool(rawTool) ? rawTool : "imazh";
  const category = searchParams.get("category") ?? "";
  const queryFromUrl = searchParams.get("q") ?? "";

  const [query, setQuery] = React.useState(queryFromUrl);
  const [items, setItems] = React.useState<PromptItem[]>([]);
  const [categories, setCategories] = React.useState<PresetCategoryItem[]>([]);
  const [liked, setLiked] = React.useState<Set<string>>(new Set());
  const [onlyLiked, setOnlyLiked] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [usingId, setUsingId] = React.useState<string | null>(null);
  const [active, setActive] = React.useState<PromptItem | null>(null);

  React.useEffect(() => setQuery(queryFromUrl), [queryFromUrl]);

  React.useEffect(() => {
    if (isPresetTool(rawTool)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tool", "imazh");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, rawTool, router, searchParams]);

  React.useEffect(() => {
    if (query.trim() === queryFromUrl) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) params.set("q", query.trim()); else params.delete("q");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, queryFromUrl, pathname, router, searchParams]);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    void fetchPrompts({ tool, category, query: queryFromUrl, limit: 60 }).then((result) => {
      if (!alive) return;
      setItems(result.items);
      setCategories(result.categories);
      setLiked(new Set(result.liked));
      setPage(0);
      setHasMore(result.hasMore);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [tool, category, queryFromUrl, user]);

  const filtered = onlyLiked ? items.filter((item) => liked.has(item.id)) : items;

  const selectTool = (next: PresetTool) => {
    const params = new URLSearchParams();
    params.set("tool", next);
    setQuery("");
    setOnlyLiked(false);
    setActive(null);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const selectCategory = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tool", tool);
    if (next) params.set("category", next); else params.delete("category");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const applyPreset = async (item: PromptItem) => {
    setUsingId(item.id);
    try {
      const detail = await fetchPromptDetail(item.id);
      if (detail.tool !== tool || detail.target_tool !== PRESET_TOOL_META[tool].targetTool) throw new Error("tool-mismatch");
      sessionStorage.setItem(PROMPT_ATTACH_KEY, JSON.stringify({
        id: detail.id, code: detail.code, title: detail.title, tool: detail.tool,
        targetTool: detail.target_tool, thumbnailUrl: detail.featured_url, config: detail.config,
      }));
      router.push(PRESET_TOOL_META[tool].route);
    } catch {
      toast("Preseti nuk mund të hapet tani. Provo përsëri.", "error");
      setUsingId(null);
    }
  };

  const onToggleLike = (item: PromptItem) => {
    if (!user) { toast("Hyr për të ruajtur të preferuarat."); return; }
    const next = new Set(liked);
    const isLiked = next.has(item.id);
    if (isLiked) next.delete(item.id); else next.add(item.id);
    setLiked(next);
    void toggleLike(item.id, !isLiked);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const result = await fetchPrompts({ tool, category, query: queryFromUrl, page: nextPage, limit: 60 });
    setItems((current) => [...current, ...result.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
    setLiked((current) => new Set([...current, ...result.liked]));
    setPage(nextPage);
    setHasMore(result.hasMore);
    setLoadingMore(false);
  };

  return (
    <AppShell>
      <main className="scroll-thin relative flex h-full min-w-0 flex-col overflow-y-auto overflow-x-clip max-lg:h-auto">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-aurora" />
        <div className="mx-auto w-full max-w-[1320px] px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
          <header className="mx-auto max-w-3xl text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand"><Lightbulb className="h-6 w-6" /></span>
            <h1 className="mt-4 text-[clamp(30px,5vw,48px)] font-light tracking-brand text-ink">maroPresets</h1>
            <p className="mt-2 text-[15px] font-medium text-ink-2 sm:text-[18px]">Një pikënisje e zgjuar për çdo mjet kreativ.</p>
          </header>

          <section className="mt-8" aria-label="Zgjidh mjetin">
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-line bg-surface/80 p-2 shadow-sm backdrop-blur sm:gap-3 sm:p-3">
              {PRESET_TOOLS.map((value) => {
                const Icon = TOOL_ICONS[value];
                const selected = value === tool;
                return <button key={value} type="button" onClick={() => selectTool(value)} aria-pressed={selected} className={cn("flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl px-2 py-3 text-center transition sm:min-h-24 sm:flex-row sm:justify-start sm:px-5", selected ? "bg-ink text-canvas shadow-md" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}>
                  <span className={cn("grid h-9 w-9 place-items-center rounded-xl", selected ? "bg-white/10" : "bg-surface-2")}><Icon className="h-5 w-5" /></span>
                  <span><span className="block text-[14px] font-extrabold sm:text-[16px]">{PRESET_TOOL_META[value].label}</span><span className={cn("hidden text-[11.5px] sm:block", selected ? "text-white/60" : "text-ink-3")}>Presetet për {PRESET_TOOL_META[value].shortLabel}</span></span>
                </button>;
              })}
            </div>
          </section>

          <section className="mt-5">
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2.5 shadow-sm">
              <Search className="h-5 w-5 shrink-0 text-ink-3" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Kërko te ${PRESET_TOOL_META[tool].label}…`} className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3" />
              <button type="button" onClick={() => setOnlyLiked((value) => !value)} aria-pressed={onlyLiked} aria-label="Të preferuarat" className={cn("grid h-10 w-10 place-items-center rounded-xl transition", onlyLiked ? "bg-[#ff5a7a]/12 text-[#e83f64]" : "text-ink-3 hover:bg-surface-2 hover:text-ink")}><Heart className={cn("h-4 w-4", onlyLiked && "fill-current")} /></button>
            </div>
            <div className="scroll-thin mt-3 flex gap-2 overflow-x-auto pb-1">
              <CategoryChip active={!category} onClick={() => selectCategory("")}>Të gjitha</CategoryChip>
              {categories.map((item) => <CategoryChip key={item.id} active={category === item.label} onClick={() => selectCategory(item.label)}>{item.label}</CategoryChip>)}
            </div>
          </section>

          <section className="mt-7" aria-live="polite">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">{PRESET_TOOL_META[tool].label}</p><h2 className="mt-1 text-[22px] font-extrabold text-ink">{category || "Të gjitha presetet"}</h2></div>
              {!loading && <span className="text-[12.5px] text-ink-3">{filtered.length} rezultate</span>}
            </div>
            {loading ? <div className="grid min-h-64 place-items-center text-ink-3"><Loader2 className="h-6 w-6 animate-spin" /></div> : filtered.length === 0 ? <EmptyState tool={tool} /> : (
              <div className={cn("grid gap-4", tool === "web" ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5")}>
                {filtered.map((item) => <PresetCard key={item.id} item={item} liked={liked.has(item.id)} onOpen={() => setActive(item)} onLike={() => onToggleLike(item)} onUse={() => void applyPreset(item)} />)}
              </div>
            )}
            {!loading && hasMore && !onlyLiked && <div className="mt-7 flex justify-center"><button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-5 text-[13px] font-bold text-ink hover:bg-surface-2 disabled:opacity-60">{loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} Shfaq më shumë</button></div>}
          </section>
        </div>
      </main>

      {active && <PresetQuickView item={active} liked={liked.has(active.id)} using={usingId === active.id} onClose={() => setActive(null)} onLike={() => onToggleLike(active)} onUse={() => void applyPreset(active)} />}
    </AppShell>
  );
}

export default function PromptsPage() {
  return <React.Suspense fallback={<div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-ink-3" /></div>}><PromptsPageInner /></React.Suspense>;
}

function CategoryChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition", active ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface text-ink-2 hover:bg-surface-2")}>{children}</button>;
}

function EmptyState({ tool }: { tool: PresetTool }) {
  return <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-line bg-surface/60 px-5 text-center"><div><Sparkles className="mx-auto h-8 w-8 text-ink-3" /><p className="mt-3 text-[15px] font-bold text-ink">Nuk u gjet asnjë preset</p><p className="mt-1 text-[13px] text-ink-3">Provo një kërkim tjetër te {PRESET_TOOL_META[tool].label}.</p></div></div>;
}

function PresetQuickView({ item, liked, using, onClose, onLike, onUse }: { item: PromptItem; liked: boolean; using: boolean; onClose: () => void; onLike: () => void; onUse: () => void }) {
  const aspect = item.tool === "web" ? "aspect-video" : item.tool === "logo" ? "aspect-square" : "aspect-[4/5]";
  return <Modal open onClose={onClose} size="lg" className="max-w-4xl overflow-hidden p-0">
    <div className={cn("grid", item.tool === "web" ? "lg:grid-rows-[auto_1fr]" : "sm:grid-cols-[1.15fr_1fr]")}>
      <div className={cn("relative overflow-hidden bg-surface-2", aspect)}>{item.featured_url ? <img src={item.featured_url} alt={`${item.title} preview`} className="h-full w-full object-cover" /> : <div className="grid h-full min-h-64 place-items-center"><Lightbulb className="h-9 w-9 text-ink-3" /></div>}</div>
      <div className="flex flex-col p-5 sm:p-6">
        <div className="flex flex-wrap gap-2"><span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-bold text-ink-2">{item.category}</span>{item.featured && <span className="rounded-full bg-brand/12 px-2.5 py-1 text-[11.5px] font-bold text-brand">Featured</span>}{item.access_level === "premium" && <span className="inline-flex items-center gap-1 rounded-full bg-[#fff3cc] px-2.5 py-1 text-[11.5px] font-bold text-[#765300]"><Crown className="h-3 w-3" /> Premium</span>}</div>
        <h2 className="mt-4 text-[26px] font-extrabold tracking-tight text-ink">{item.title}</h2>
        <p className="mt-2 text-[14px] leading-6 text-ink-2">{item.description || `Një drejtim kreativ i kuruar për ${PRESET_TOOL_META[item.tool].label}.`}</p>
        {item.keywords.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{item.keywords.slice(0, 10).map((word) => <span key={word} className="rounded-full bg-surface-2 px-2 py-1 text-[11.5px] text-ink-3">{word}</span>)}</div>}
        <p className="mt-4 text-[12px] leading-5 text-ink-3">Preseti vendos vetëm drejtimin fillestar. Mund ta ndryshosh para gjenerimit; zgjedhjet e tua kanë përparësi.</p>
        <div className="mt-auto flex gap-2 pt-6"><button type="button" onClick={onLike} className="grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-ink-3"><Heart className={cn("h-4 w-4", liked && "fill-current text-[#e83f64]")} /></button><button type="button" onClick={onUse} disabled={using} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-[14px] font-bold text-canvas disabled:opacity-60">{using && <Loader2 className="h-4 w-4 animate-spin" />} Përdor presetin</button></div>
      </div>
    </div>
  </Modal>;
}

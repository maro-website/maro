"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUpRight, Check, ChevronLeft, ChevronRight, Heart, LayoutGrid, Loader2, Search, Sparkles, X } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { ToolIcon } from "@/components/app/OptionIcon";
import { PreviewFallback } from "@/components/app/PreviewFallback";
import { StableImage } from "@/components/app/StableImage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PresetsHeroCarousel } from "@/components/presets/PresetsHeroCarousel";
import { PresetCard } from "@/components/presets/PresetCard";
import { PresetQuickView } from "@/components/presets/PresetQuickView";
import { ModuleComingSoon } from "@/components/modules/ModuleComingSoon";
import { useToast } from "@/components/ui/Toast";
import { useMaro } from "@/context/store";
import { getProductBrand } from "@/lib/design/maro-system";
import { getModuleAvailability, isModuleLive } from "@/lib/modules/availability";
import { fetchPromptDetail, fetchPrompts, toggleLike } from "@/lib/services/promptsService";
import { PROMPT_ATTACH_KEY, type PresetCategoryItem, type PromptItem } from "@/lib/prompts/types";
import { isPresetTool, PRESET_TOOL_META, PRESET_TOOLS, type PresetTool } from "@/lib/presets/model";
import { GUEST_PRESET_LIMIT } from "@/lib/presets/policy";
import { cn } from "@/lib/utils/cn";
import "@/components/presets/presets.css";

const newestFirst = (items: PromptItem[]) => [...items].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id));

function PresetsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useMaro();
  const rawTool = searchParams.get("tool");
  const tool: PresetTool = isPresetTool(rawTool) ? rawTool : "imazh";
  const category = searchParams.get("category") ?? "";
  const queryFromUrl = searchParams.get("q") ?? "";
  const userId = user?.id;
  const [query, setQuery] = React.useState(queryFromUrl);
  const [items, setItems] = React.useState<PromptItem[]>([]);
  const [catalog, setCatalog] = React.useState<PromptItem[]>([]);
  const [categories, setCategories] = React.useState<PresetCategoryItem[]>([]);
  const [liked, setLiked] = React.useState<Set<string>>(new Set());
  const [onlyLiked, setOnlyLiked] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [catalogLoading, setCatalogLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [usingId, setUsingId] = React.useState<string | null>(null);
  const [active, setActive] = React.useState<PromptItem | null>(null);
  const [heroPaused, setHeroPaused] = React.useState(false);
  const categoryRail = React.useRef<HTMLDivElement>(null);
  const requestVersion = React.useRef(0);
  const likePending = React.useRef(new Set<string>());

  React.useEffect(() => setQuery(queryFromUrl), [queryFromUrl]);
  React.useEffect(() => { setLiked(new Set()); setOnlyLiked(false); }, [userId]);
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

  // Discovery is independent of filters. Read the permitted catalog pages so each
  // category and the hero use the latest preset, instead of the first featured one.
  React.useEffect(() => {
    let alive = true;
    setCatalog([]); setCategories([]); setCatalogLoading(true); setActive(null); setUsingId(null);
    if (!isModuleLive(tool)) { setCatalogLoading(false); return; }
    void (async () => {
      try {
        let nextPage = 0;
        let more = true;
        let all: PromptItem[] = [];
        while (alive && more) {
          const result = await fetchPrompts({ tool, page: nextPage, limit: 60 });
          if (!alive) return;
          all = [...all, ...result.items.filter((item) => !all.some((existing) => existing.id === item.id))];
          setCatalog(newestFirst(all));
          if (nextPage === 0) setCategories(result.categories);
          setLiked((current) => new Set([...current, ...result.liked]));
          setCatalogLoading(false);
          more = result.hasMore && result.items.length > 0;
          nextPage += 1;
        }
      } catch { if (alive) setCatalogLoading(false); }
    })();
    return () => { alive = false; };
  }, [tool, userId]);

  React.useEffect(() => {
    let alive = true;
    requestVersion.current += 1;
    setLoading(true); setLoadingMore(false); setItems([]); setPage(0); setHasMore(false);
    if (!isModuleLive(tool)) { setLoading(false); return; }
    void fetchPrompts({ tool, category, query: queryFromUrl, limit: 60 }).then((result) => {
      if (!alive) return;
      setItems(result.items); setLiked((current) => new Set([...current, ...result.liked]));
      setHasMore(result.hasMore); setLoading(false);
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tool, category, queryFromUrl, userId]);

  const latest = React.useMemo(() => catalog.filter((item) => item.featured_url).slice(0, 12), [catalog]);
  const carouselItems = React.useMemo(() => latest.map((item) => ({ src: item.featured_url!, alt: item.title, title: item.title, subtitle: item.category, id: item.id })), [latest]);
  const categoryPreviews = React.useMemo(() => {
    const previews = new Map<string, PromptItem>();
    for (const item of catalog) if (item.featured_url && !previews.has(item.category)) previews.set(item.category, item);
    return previews;
  }, [catalog]);
  const filtered = onlyLiked ? catalog.filter((item) => liked.has(item.id) && (!category || item.category === category) && (!queryFromUrl || `${item.title} ${item.description} ${item.category} ${item.keywords.join(" ")}`.toLocaleLowerCase().includes(queryFromUrl.toLocaleLowerCase()))) : items;
  const selectTool = (next: PresetTool) => {
    if (next === tool) return;
    setQuery(""); setOnlyLiked(false); setActive(null); setHeroPaused(false);
    const params = new URLSearchParams();
    params.set("tool", next);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const selectCategory = (next: string) => {
    const params = new URLSearchParams(searchParams.toString()); params.set("tool", tool);
    if (next) params.set("category", next); else params.delete("category");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const resetFilters = () => { setQuery(""); setOnlyLiked(false); router.replace(`${pathname}?tool=${tool}`, { scroll: false }); };
  const applyPreset = async (item: PromptItem) => {
    if (!isModuleLive(item.tool) || usingId) return;
    setUsingId(item.id);
    try {
      const detail = await fetchPromptDetail(item.id);
      if (detail.tool !== tool || detail.target_tool !== PRESET_TOOL_META[tool].targetTool) throw new Error("tool-mismatch");
      sessionStorage.setItem(PROMPT_ATTACH_KEY, JSON.stringify({ id: detail.id, code: detail.code, title: detail.title, tool: detail.tool, targetTool: detail.target_tool, thumbnailUrl: detail.featured_url, config: detail.config }));
      router.push(PRESET_TOOL_META[tool].route);
    } catch { toast("Preseti nuk mund të hapet tani. Provo përsëri.", "error"); setUsingId(null); }
  };
  const onToggleLike = (item: PromptItem) => {
    if (!user) { toast("Hyr për të ruajtur të preferuarat."); return; }
    if (likePending.current.has(item.id)) return;
    likePending.current.add(item.id);
    const wasLiked = liked.has(item.id);
    setLiked((current) => { const next = new Set(current); if (wasLiked) next.delete(item.id); else next.add(item.id); return next; });
    void toggleLike(item.id, !wasLiked).finally(() => likePending.current.delete(item.id));
  };
  const loadMore = async () => {
    if (!user || loadingMore || !hasMore) return;
    const version = requestVersion.current;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await fetchPrompts({ tool, category, query: queryFromUrl, page: nextPage, limit: 60 });
      if (version !== requestVersion.current) return;
      setItems((current) => [...current, ...result.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setLiked((current) => new Set([...current, ...result.liked])); setPage(nextPage); setHasMore(result.hasMore);
    } catch { toast("Presetet nuk u ngarkuan. Provo përsëri.", "error"); }
    finally { if (version === requestVersion.current) setLoadingMore(false); }
  };

  if (!isModuleLive(tool)) return <AppShell><ModuleComingSoon moduleId="web" /></AppShell>;
  return <AppShell>
    <main className="presets-page scroll-thin relative flex h-full min-w-0 flex-col overflow-y-auto overflow-x-clip max-lg:h-auto" style={{ "--preset-accent": getProductBrand(tool)?.color } as React.CSSProperties}>
      <div className="presets-container">
        <header className="presets-hero">
          <div className="presets-hero-copy"><p className="presets-eyebrow"><ToolIcon toolId="presets" className="h-5 w-5" /> maroPresets</p><h1>Mos maro prej <span>zeros.</span></h1><p>Zgjedhe një ide. Jepi stilin tënd. Maroje.</p></div>
          <div className="presets-hero-stage">
            {catalogLoading ? <div className="presets-hero-loading" aria-label="Duke ngarkuar presetet e fundit">{Array.from({ length: 5 }, (_, index) => <PreviewFallback key={index} state="loading" className={cn("w-full rounded-3xl", tool === "logo" ? "aspect-square" : "aspect-[3/4]")} />)}</div> : carouselItems.length > 0 ? <PresetsHeroCarousel key={tool} items={carouselItems} tool={tool} paused={heroPaused || Boolean(active)} onSelect={(item) => { const preset = catalog.find((entry) => entry.id === item.id); if (preset) setActive(preset); }} /> : <div className="presets-hero-empty"><ToolIcon toolId={tool} className="h-16 w-16" /><p>Idetë e reja po vijnë.</p></div>}
          </div>
          <div className="presets-hero-footer"><a href="#preset-library" className="presets-browse-link">Gjeje pikënisjen tënde <ArrowDown className="h-4 w-4" /></a>{carouselItems.length > 1 && <Button size="sm" variant="ghost" className="presets-motion-control" onClick={() => setHeroPaused((value) => !value)} aria-pressed={heroPaused}>{heroPaused ? "Lëvizi presetet" : "Ndale lëvizjen"}</Button>}</div>
        </header>
        <section id="preset-library" className="presets-library" aria-label="Biblioteka e preseteve">
          <div className="presets-tool-switcher" aria-label="Zgjidh mjetin">
            {PRESET_TOOLS.map((value) => {
              const selected = value === tool;
              const live = isModuleLive(value);
              return <button key={value} type="button" disabled={!live} onClick={() => selectTool(value)} aria-pressed={selected} className="presets-tool" style={{ "--tool-accent": getProductBrand(value)?.color } as React.CSSProperties}><span className="presets-tool-icon"><ToolIcon toolId={value} className="h-6 w-6" /></span><span className="presets-tool-label"><strong>{PRESET_TOOL_META[value].label}</strong><span>{live ? `Presetet për ${PRESET_TOOL_META[value].shortLabel}` : `Së shpejti · ${getModuleAvailability(value)?.version}`}</span></span><span className="presets-tool-indicator" aria-hidden="true">{selected ? <Check className="h-4 w-4" /> : live ? <ArrowUpRight className="h-4 w-4" /> : null}</span></button>;
            })}
          </div>
          <div className="presets-search-row">
            <div className="presets-search">
              <span className="presets-search-icon"><Search className="h-5 w-5" /></span>
              <Input type="search" aria-label={`Kërko presetet e ${PRESET_TOOL_META[tool].label}`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Çka po don me maru?" className="presets-search-input" />
              {query && <Button size="icon" variant="ghost" onClick={() => setQuery("")} aria-label="Pastro kërkimin"><X className="h-4 w-4" /></Button>}
            </div>
            <Button variant="secondary" className="presets-favorites" aria-label="Të preferuarat" onClick={() => { if (!user) { toast("Hyr për të parë të preferuarat."); return; } setOnlyLiked((value) => !value); }} aria-pressed={onlyLiked} icon={<Heart className={cn("h-5 w-5", onlyLiked && "fill-current")} />}><span>Të preferuarat</span></Button>
          </div>
          <div className="presets-category-heading"><span>Eksploro kategoritë</span><div><Button size="icon" variant="ghost" aria-label="Kategoritë e mëparshme" onClick={() => categoryRail.current?.scrollBy({ left: -320, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Kategoritë e tjera" onClick={() => categoryRail.current?.scrollBy({ left: 320, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}><ChevronRight className="h-4 w-4" /></Button></div></div>
          <div ref={categoryRail} className="presets-categories scroll-thin" aria-label="Kategoritë"><CategoryButton label="Të gjitha" active={!category} onClick={() => selectCategory("")} />{categories.map((item) => <CategoryButton key={item.id} label={item.label} preview={categoryPreviews.get(item.label)} active={category === item.label} onClick={() => selectCategory(item.label)} />)}</div>
          <section className="presets-results" aria-label="Rezultatet" aria-busy={loading}>
            <div className="presets-results-heading"><div><p>{PRESET_TOOL_META[tool].label}</p><h2>{onlyLiked ? "Idetë që i ke ruajtur" : queryFromUrl ? `Rezultatet për “${queryFromUrl}”` : category || (user ? "Gjeje presetin tënd." : "Presetet më të fundit.")}</h2></div><span aria-live="polite">{!loading && `${filtered.length}${hasMore && !onlyLiked ? "+" : ""} ${filtered.length === 1 ? "preset" : "presete"}`}</span></div>
            {(category || queryFromUrl || onlyLiked) && <div className="presets-filter-summary"><span>{[category, queryFromUrl && `“${queryFromUrl}”`, onlyLiked && "Të preferuarat"].filter(Boolean).join(" · ")}</span><Button size="sm" variant="ghost" onClick={resetFilters} iconRight={<X className="h-4 w-4" />}>Pastro filtrat</Button></div>}
            {loading ? <div className="presets-grid" data-tool={tool}>{Array.from({ length: 8 }, (_, index) => <PreviewFallback key={index} state="loading" className={cn("h-auto rounded-3xl", tool === "logo" ? "aspect-square" : "aspect-[3/4]")} />)}</div> : filtered.length === 0 ? <div className="presets-empty"><Sparkles className="h-8 w-8" /><h3>{onlyLiked ? "Ruaje një ide për më vonë." : "S’u gjet asnjë preset."}</h3><p>{onlyLiked ? "Kliko zemrën te presetet që të pëlqejnë." : "Provo një fjalë tjetër ose shiko të gjitha kategoritë."}</p><Button variant="secondary" onClick={resetFilters}>Shiko të gjitha</Button></div> : <div className="presets-grid" data-tool={tool}>{filtered.map((item) => <PresetCard key={item.id} item={item} liked={liked.has(item.id)} onOpen={() => setActive(item)} onLike={() => onToggleLike(item)} onUse={() => setActive(item)} />)}</div>}
            {!loading && user && hasMore && !onlyLiked && <div className="mt-8 flex justify-center"><Button variant="secondary" loading={loadingMore} onClick={() => void loadMore()}>Shfaq më shumë</Button></div>}
            {!user && <div className="presets-guest"><div><h3>Don me pa më shumë?</h3><p>{GUEST_PRESET_LIMIT} presetet e fundit i sheh pa llogari. Hyr ose regjistrohu për krejt koleksionin.</p></div><div><Link href={`/sign-in?next=${encodeURIComponent(`/presets?tool=${tool}`)}`} className="maro-button" data-variant="secondary">Hyr</Link><Link href={`/sign-up?next=${encodeURIComponent(`/presets?tool=${tool}`)}`} className="maro-button" data-variant="brand">Regjistrohu <ArrowUpRight className="h-4 w-4" /></Link></div></div>}
          </section>
        </section>
      </div>
    </main>
    {active && <PresetQuickView item={active} liked={liked.has(active.id)} using={usingId === active.id} onClose={() => setActive(null)} onLike={() => onToggleLike(active)} onUse={() => void applyPreset(active)} />}
  </AppShell>;
}

function CategoryButton({ label, preview, active, onClick }: { label: string; preview?: PromptItem; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className="presets-category"><span className="presets-category-preview">{preview ? <StableImage src={preview.featured_url} module={preview.tool} alt="" className="h-full w-full object-cover" /> : <LayoutGrid className="h-6 w-6" />}{active && <span className="presets-category-check"><Check className="h-3 w-3" /></span>}</span><span>{label}</span></button>;
}

export default function PresetsPage() { return <React.Suspense fallback={<div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-ink-3" aria-label="Duke ngarkuar presetet" /></div>}><PresetsPageInner /></React.Suspense>; }

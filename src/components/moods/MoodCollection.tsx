"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Bookmark, LayoutGrid, Moon, Search, Sparkles, X } from "lucide-react";
import { useMaro } from "@/context/store";
import { Button } from "@/components/ui/Button";
import { PreviewFallback } from "@/components/app/PreviewFallback";
import { useToast } from "@/components/ui/Toast";
import { canUseMoods, type Mood } from "@/lib/moods/model";
import { moodRequest, MOODS_CHANGED, notifyMoodsChanged } from "@/lib/moods/client";
import { cn } from "@/lib/utils/cn";
import { MoodCard } from "./MoodCard";
import { MoodHero } from "./MoodHero";
import { MoodQuickView } from "./MoodQuickView";
import "./moods.css";

export { MoodCover } from "./MoodCover";

export function MoodCollection({ savedOnly = false, onSelect, selectedId, compact = false, discovery = false }: {
  savedOnly?: boolean; onSelect?: (mood: Mood) => void; selectedId?: string; compact?: boolean; discovery?: boolean;
}) {
  const { user, ready } = useMaro();
  const { toast } = useToast();
  const router = useRouter();
  const libraryId = React.useId();
  const eligible = canUseMoods(user?.email);
  const userId = user?.id;
  const [result, setResult] = React.useState<{ owner: string; items: Mood[] }>({ owner: "", items: [] });
  const [query, setQuery] = React.useState("");
  const [onlySaved, setOnlySaved] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [refresh, setRefresh] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState<{ use: boolean } | null>(null);
  const actionPending = React.useRef(false);
  React.useEffect(() => {
    const update = () => setRefresh(value => value + 1);
    window.addEventListener(MOODS_CHANGED, update);
    window.addEventListener("focus", update);
    return () => { window.removeEventListener(MOODS_CHANGED, update); window.removeEventListener("focus", update); };
  }, []);
  React.useEffect(() => {
    setQuery(""); setOnlySaved(false); setActiveId(null);
  }, [userId]);
  React.useEffect(() => {
    if (!eligible || !userId) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    void moodRequest<{ items: Mood[] }>("/api/moods", { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setResult({ owner: userId, items: data.items });
    }).catch(err => { if (!controller.signal.aborted) setError((err as Error).message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [eligible, userId, refresh]);
  const items = result.owner === userId && eligible ? result.items : [];
  const savedCount = items.filter(mood => mood.saved).length;
  const showSaved = savedOnly || onlySaved;
  const filtered = items.filter(mood => (!showSaved || mood.saved) && `${mood.title} ${mood.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const active = items.find(mood => mood.id === activeId);
  const initialLoading = loading && result.owner !== userId;
  async function save(mood: Mood, saved: boolean) {
    await moodRequest("/api/moods/save", { method: "POST", body: { moodId: mood.id, saved } });
    setResult(current => ({ ...current, items: current.items.map(item => item.id === mood.id ? { ...item, saved } : item) }));
    notifyMoodsChanged();
  }
  async function act(mood: Mood, use: boolean) {
    if (actionPending.current) return;
    actionPending.current = true;
    setBusy({ use });
    try {
      if (use) {
        if (!mood.saved) await save(mood, true);
        if (onSelect) onSelect({ ...mood, saved: true });
        else router.push(`/imazh?mood=${mood.id}`);
      } else { await save(mood, !mood.saved); toast(mood.saved ? "Mood-i u largua nga asetet." : "Mood-i u ruajt te asetet."); }
    } catch (err) { toast((err as Error).message, "error"); }
    finally { actionPending.current = false; setBusy(null); }
  }
  const resetFilters = () => { setQuery(""); setOnlySaved(false); };
  if (!ready) return <p role="status" className="py-10 text-center text-ink-3">Duke ngarkuar…</p>;
  if (!eligible) return <div className="py-16 text-center"><Moon className="mx-auto h-8 w-8 text-ink-3" /><p className="mt-4 text-ink-2">maroMood nuk është i disponueshëm për këtë llogari.</p><Link href="/imazh" className="mt-4 inline-block text-brand">Kthehu te maroImazh</Link></div>;
  return <div className={cn("moods-collection", compact && "moods-collection--compact")}>
    {discovery && <MoodHero items={items} loading={initialLoading} paused={Boolean(active)} libraryId={libraryId} onOpen={setActiveId} />}
    <section id={libraryId} className="moods-library" aria-label="Biblioteka e moods">
      {!savedOnly && <div className="moods-tabs" role="group" aria-label="Katalogu i moods">
        <button type="button" aria-pressed={!onlySaved} onClick={() => setOnlySaved(false)}><LayoutGrid className="h-4 w-4" /><span>Gjej moods</span><span className="moods-tab-count">{items.length}</span></button>
        <button type="button" aria-pressed={onlySaved} onClick={() => setOnlySaved(true)}><Bookmark className={cn("h-4 w-4", onlySaved && "fill-current")} /><span>Të ruajtura</span><span className="moods-tab-count">{savedCount}</span></button>
      </div>}
      <div className="moods-search-row">
        <label className="moods-search"><span className="moods-search-icon"><Search className="h-5 w-5" /></span><input type="search" aria-label="Kërko moods" placeholder="Çfarë atmosfere po kërkon?" value={query} onChange={event => setQuery(event.target.value)} className="moods-search-input" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Pastro kërkimin" className="moods-search-clear"><X className="h-4 w-4" /></button>}</label>
        {discovery && <Link href="/krijimet?category=moods" aria-label="Moods te asetet e mia" className="moods-assets-link"><Bookmark className="h-5 w-5" /><span>Te asetet e mia</span><ArrowUpRight className="h-4 w-4" /></Link>}
      </div>
      <div className="moods-results-heading"><div>{!compact && <p>maroMoods</p>}<h2>{query.trim() ? `Rezultatet për “${query.trim()}”` : showSaved ? "Atmosferat që i ke ruajtur." : "Zgjedhe atmosferën."}</h2></div><span aria-live="polite">{!initialLoading && `${filtered.length} ${filtered.length === 1 ? "mood" : "moods"}`}</span></div>
      {error ? <div role="alert" className="moods-empty"><Moon className="h-8 w-8" /><h3>Moods nuk u ngarkuan.</h3><p>{error}</p><Button variant="secondary" onClick={() => setRefresh(value => value + 1)}>Provo përsëri</Button></div>
        : initialLoading ? <div className="moods-grid" aria-label="Duke ngarkuar moods">{Array.from({ length: compact ? 3 : 4 }, (_, index) => <PreviewFallback key={index} state="loading" className="aspect-[4/5] h-auto rounded-3xl" />)}</div>
        : !filtered.length ? <div className="moods-empty"><span className="moods-empty-icon">{showSaved ? <Bookmark className="h-7 w-7" /> : <Sparkles className="h-7 w-7" />}</span><h3>{query.trim() ? "S’u gjet ky mood." : showSaved ? "Ruaje një atmosferë për më vonë." : "Atmosferat e reja po vijnë."}</h3><p>{query.trim() ? "Provo një fjalë tjetër ose shiko krejt moods." : showSaved ? "Kliko shenjën e ruajtjes te moods që të pëlqejnë. I gjen edhe te asetet e tua." : "Kthehu së shpejti për ide të reja."}</p>{savedOnly && !query.trim() ? <Link href="/moods" className="maro-button" data-variant="brand">Gjej moods <ArrowUpRight className="h-4 w-4" /></Link> : (query.trim() || onlySaved) && <Button variant="secondary" onClick={resetFilters}>{savedOnly ? "Pastro kërkimin" : "Shiko krejt moods"}</Button>}</div>
        : <div className="moods-grid">{filtered.map(mood => <MoodCard key={mood.id} mood={mood} selected={selectedId === mood.id} busy={busy !== null} onOpen={() => setActiveId(mood.id)} onSave={() => void act(mood, false)} />)}</div>}
    </section>
    {active && <MoodQuickView mood={active} selected={selectedId === active.id} busy={busy !== null} using={Boolean(busy?.use)} inComposer={Boolean(onSelect)} onClose={() => setActiveId(null)} onSave={() => void act(active, false)} onUse={() => void act(active, true)} />}
  </div>;
}

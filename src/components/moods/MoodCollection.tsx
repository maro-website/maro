"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Check, Moon, Search, Sparkles } from "lucide-react";
import { useMaro } from "@/context/store";
import { Button } from "@/components/ui/Button";
import { StableImage } from "@/components/app/StableImage";
import { useToast } from "@/components/ui/Toast";
import { canUseMoods, type Mood } from "@/lib/moods/model";
import { moodRequest, MOODS_CHANGED, notifyMoodsChanged } from "@/lib/moods/client";
import { cn } from "@/lib/utils/cn";

export function MoodCover({ mood, className }: { mood?: Pick<Mood, "title" | "cover_url"> | null; className?: string }) {
  return mood?.cover_url
    ? <StableImage src={mood.cover_url} alt="" className={cn("aspect-square w-full object-cover", className)} />
    : <div className={cn("grid aspect-square place-items-center bg-surface-2 text-brand", className)}><Moon className="h-9 w-9" /></div>;
}

export function MoodCollection({ savedOnly = false, onSelect, selectedId, compact = false }: {
  savedOnly?: boolean; onSelect?: (mood: Mood) => void; selectedId?: string; compact?: boolean;
}) {
  const { user, ready } = useMaro();
  const { toast } = useToast();
  const router = useRouter();
  const eligible = canUseMoods(user?.email);
  const userId = user?.id;
  const [result, setResult] = React.useState<{ owner: string; items: Mood[] }>({ owner: "", items: [] });
  const [query, setQuery] = React.useState("");
  const [refresh, setRefresh] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  React.useEffect(() => {
    const update = () => setRefresh(value => value + 1);
    window.addEventListener(MOODS_CHANGED, update);
    window.addEventListener("focus", update);
    return () => { window.removeEventListener(MOODS_CHANGED, update); window.removeEventListener("focus", update); };
  }, []);
  React.useEffect(() => {
    if (!eligible || !userId) return;
    const controller = new AbortController();
    setLoading(true); setError("");
    void moodRequest<{ items: Mood[] }>("/api/moods", { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setResult({ owner: userId, items: data.items });
    }).catch(err => { if (!controller.signal.aborted) setError((err as Error).message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [eligible, userId, refresh]);
  const items = result.owner === user?.id && eligible ? result.items : [];
  const filtered = items.filter(mood => (!savedOnly || mood.saved) && `${mood.title} ${mood.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  async function save(mood: Mood, saved: boolean) {
    await moodRequest("/api/moods/save", { method: "POST", body: { moodId: mood.id, saved } });
    setResult(current => ({ ...current, items: current.items.map(item => item.id === mood.id ? { ...item, saved } : item) }));
    notifyMoodsChanged();
  }
  async function act(mood: Mood, use: boolean) {
    setBusy(mood.id);
    try {
      if (use) {
        if (!mood.saved) await save(mood, true);
        if (onSelect) onSelect({ ...mood, saved: true });
        else router.push(`/imazh?mood=${mood.id}`);
      } else { await save(mood, !mood.saved); toast(mood.saved ? "Mood-i u largua nga asetet." : "Mood-i u ruajt te asetet."); }
    } catch (err) { toast((err as Error).message, "error"); }
    finally { setBusy(null); }
  }
  if (!ready) return <p role="status" className="py-10 text-center text-ink-3">Duke ngarkuar…</p>;
  if (!eligible) return <div className="py-16 text-center"><Moon className="mx-auto h-8 w-8 text-ink-3" /><p className="mt-4 text-ink-2">maroMood nuk është i disponueshëm për këtë llogari.</p><Link href="/imazh" className="mt-4 inline-block text-brand">Kthehu te maroImazh</Link></div>;
  return <div className="min-w-0">
    <label className="mb-5 flex min-h-11 items-center gap-3 rounded-maro16 bg-surface-2 px-4"><Search className="h-4 w-4 shrink-0 text-ink-3" /><input aria-label="Kërko moods" placeholder="Kërko një mood…" value={query} onChange={event => setQuery(event.target.value)} className="w-full min-w-0 bg-transparent py-3 text-sm text-ink outline-none placeholder:text-ink-3" /></label>
    {error ? <div role="alert" className="py-8 text-center text-ink-2"><p>{error}</p><Button variant="secondary" className="mt-3" onClick={() => setRefresh(value => value + 1)}>Provo përsëri</Button></div>
      : loading ? <p role="status" className="py-10 text-center text-ink-3">Duke ngarkuar moods…</p>
      : !filtered.length ? <div className="rounded-maro20 bg-surface py-12 text-center"><Bookmark className="mx-auto h-7 w-7 text-ink-3" /><p className="mt-3 font-semibold text-ink">{query ? "Nuk u gjet asnjë mood" : savedOnly ? "Ende s’ke moods të ruajtura" : "Moods po vijnë"}</p><p className="mt-2 px-4 text-sm text-ink-3">{savedOnly && !query ? "Gjej një mood dhe ruaje për ta përdorur me idetë e tua." : "Provo përsëri më vonë ose ndrysho kërkimin."}</p>{savedOnly && !onSelect && <Link href="/moods" className="mt-5 inline-block font-semibold text-brand">Gjej moods</Link>}</div>
      : <div className={cn("grid grid-cols-2 gap-3", compact ? "sm:grid-cols-3" : "sm:grid-cols-3 xl:grid-cols-4")}>
        {filtered.map(mood => <article key={mood.id} className={cn("overflow-hidden rounded-maro20 border bg-surface", selectedId === mood.id ? "border-brand" : "border-line")}>
          <button type="button" onClick={() => void act(mood, true)} disabled={busy !== null} aria-label={`Përdore ${mood.title}`} className="relative block w-full overflow-hidden text-left transition-opacity hover:opacity-90 disabled:opacity-60"><MoodCover mood={mood} />{selectedId === mood.id && <span className="absolute right-3 top-3 rounded-full bg-brand p-2 text-brand-fg"><Check className="h-4 w-4" /></span>}</button>
          <div className="p-3 sm:p-4"><h3 className="text-sm font-bold text-ink">{mood.title}</h3><p className="mt-1 min-h-10 text-xs leading-relaxed text-ink-3">{mood.description}</p><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => void act(mood, true)} icon={<Sparkles className="h-3.5 w-3.5" />}>Përdore</Button><button type="button" disabled={busy !== null} onClick={() => void act(mood, false)} aria-pressed={mood.saved} aria-label={mood.saved ? `Largo ${mood.title} nga të ruajturat` : `Ruaj ${mood.title}`} className={cn("grid min-h-11 min-w-11 place-items-center rounded-maro12 hover:bg-surface-2 disabled:opacity-50", mood.saved ? "text-brand" : "text-ink-3")}><Bookmark className={cn("h-4 w-4", mood.saved && "fill-current")} /></button></div></div>
        </article>)}
      </div>}
  </div>;
}

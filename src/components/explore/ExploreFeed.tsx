"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Bookmark, Eye, Repeat2, User } from "lucide-react";
import { useMaro } from "@/context/store";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { StableImage } from "@/components/app/StableImage";
import { cn } from "@/lib/utils/cn";
import { getTool, findOption } from "@/lib/tools/registry";
import { EXPLORE_SORTS, type ExploreItemExtended, type ExploreSort } from "@/lib/explore/types";
import { fetchExploreFeed, toggleCreationLike, toggleCreationSave, recordCreationView, remixCreation } from "@/lib/services/exploreFeedService";

export function CreatorLink({ item }: { item: ExploreItemExtended }) {
  return <Link href={`/u/${encodeURIComponent(item.username || item.user_id || "")}`} className="inline-flex min-w-0 items-center gap-2 text-[13px] font-semibold text-ink hover:underline">
    {item.author_avatar ? <StableImage src={item.author_avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2"><User className="h-4 w-4" /></span>}
    <span className="truncate">{item.author || "Krijues"}{item.username && <span className="block truncate text-[11px] font-normal text-ink-3">@{item.username}</span>}</span>
  </Link>;
}

export function ExploreEngagement({ item }: { item: ExploreItemExtended }) {
  const { user } = useMaro();
  const { toast } = useToast();
  const [liked, setLiked] = React.useState(Boolean(item.liked));
  const [saved, setSaved] = React.useState(Boolean(item.saved));
  const [likes, setLikes] = React.useState(item.like_count ?? 0);
  const [saves, setSaves] = React.useState(item.save_count ?? 0);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { setLiked(Boolean(item.liked)); setSaved(Boolean(item.saved)); setLikes(item.like_count ?? 0); setSaves(item.save_count ?? 0); }, [item.id, item.liked, item.saved, item.like_count, item.save_count]);
  const act = async (kind: "like" | "save") => {
    if (!user) { toast("Hyr për të pëlqyer ose ruajtur."); return; }
    if (busy) return;
    setBusy(true);
    try {
      if (kind === "like") { const count = await toggleCreationLike(item.id, !liked); setLiked(!liked); setLikes(count); }
      else { const count = await toggleCreationSave(item.id, !saved); setSaved(!saved); setSaves(count); window.dispatchEvent(new Event("maro:explore-saved")); }
    } catch { toast("Ndryshimi nuk u ruajt. Provo përsëri."); }
    finally { setBusy(false); }
  };
  return <div className="flex flex-wrap items-center gap-3 text-[12px] text-ink-3">
    <button type="button" disabled={busy} aria-label="Pëlqe" aria-pressed={liked} onClick={() => void act("like")} className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 hover:text-ink", liked && "text-danger")}><Heart className={cn("h-4 w-4", liked && "fill-current")} />{likes}</button>
    <button type="button" disabled={busy} aria-label="Ruaj" aria-pressed={saved} onClick={() => void act("save")} className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 hover:text-ink", saved && "text-ink")}><Bookmark className={cn("h-4 w-4", saved && "fill-current")} />{saves}</button>
    <span aria-label={`${item.view_count ?? 0} shikime`} className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4" />{item.view_count ?? 0}</span>
  </div>;
}

export function ExploreDetails({ item }: { item: ExploreItemExtended }) {
  const [views, setViews] = React.useState(item.view_count ?? 0);
  const { user, ready } = useMaro();
  React.useEffect(() => {
    if (!ready) return;
    let active = true;
    void recordCreationView(item.id).then(count => { if (active) setViews(count); }).catch(() => undefined);
    return () => { active = false; };
  }, [item.id, user?.id, ready]);
  const tool = getTool(item.tool_id);
  return <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
    <div className="grid min-w-0 place-items-center overflow-hidden rounded-maro16 bg-surface-2"><StableImage src={item.url} alt="Krijim në Explore" className="max-h-[75dvh] w-full object-contain" /></div>
    <aside className="flex min-w-0 flex-col gap-5">
      <CreatorLink item={item} />
      {item.show_prompt !== false && item.prompt ? <div><p className="text-xs font-semibold text-ink-3">Prompt</p><p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-ink">{item.prompt}</p></div> : <p className="text-sm text-ink-3">Publikuar për inspirim. Prompti është privat.</p>}
      {item.show_settings !== false && item.selections && Object.keys(item.selections).length > 0 && <div className="flex flex-wrap gap-2">{Object.entries(item.selections).map(([key, value]) => {
        const setting = tool?.settings.find(entry => entry.id === key);
        return <span key={key} className="rounded-lg bg-surface-2 px-2 py-1 text-xs text-ink-2">{setting?.label ?? key}: {setting ? findOption(setting, value)?.label ?? value : value}</span>;
      })}</div>}
      <ExploreEngagement item={{ ...item, view_count: views }} />
      <Button variant="secondary" onClick={() => void remixCreation(item)} icon={<Repeat2 className="h-4 w-4" />}>Remix</Button>
    </aside>
  </div>;
}

export function ExploreFeed({ author, savedOnly = false, hideAuthorFilter = false }: { author?: string; savedOnly?: boolean; hideAuthorFilter?: boolean }) {
  const { user, ready } = useMaro();
  const userId = user?.id;
  const [sort, setSort] = React.useState<ExploreSort>("recent");
  const [authorInput, setAuthorInput] = React.useState("");
  const [authorFilter, setAuthorFilter] = React.useState("");
  const [items, setItems] = React.useState<ExploreItemExtended[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [more, setMore] = React.useState(false);
  const [refresh, setRefresh] = React.useState(0);
  React.useEffect(() => { const timer = setTimeout(() => setAuthorFilter(authorInput.trim()), 350); return () => clearTimeout(timer); }, [authorInput]);
  React.useEffect(() => { if (!savedOnly) return; const changed = () => setRefresh(value => value + 1); window.addEventListener("maro:explore-saved", changed); return () => window.removeEventListener("maro:explore-saved", changed); }, [savedOnly]);
  React.useEffect(() => {
    if (!ready) return;
    let active = true;
    setLoading(true); setError(false); setItems([]);
    if (savedOnly && !userId) { setLoading(false); return; }
    void fetchExploreFeed(sort, { author: author ?? authorFilter, saved: savedOnly }).then(feed => {
      if (active) { setItems(feed); setMore(feed.length === 60); }
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sort, author, authorFilter, savedOnly, userId, ready, refresh]);
  const loadMore = async () => {
    if (loading) return;
    setLoading(true);
    try { const next = await fetchExploreFeed(sort, { author: author ?? authorFilter, saved: savedOnly, offset: items.length }); setItems(current => [...current, ...next]); setMore(next.length === 60); }
    catch { setError(true); } finally { setLoading(false); }
  };
  return <div>
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {!hideAuthorFilter && !author && <input aria-label="Filtro sipas username" placeholder="Autori · @username" value={authorInput} onChange={event => setAuthorInput(event.target.value)} className="maro-search-input maro-input h-10 min-w-0 max-w-64 text-sm" />}
      <select aria-label="Rendit krijimet" value={sort} onChange={event => setSort(event.target.value as ExploreSort)} className="maro-input h-10 w-auto min-w-0 text-sm">{EXPLORE_SORTS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
    </div>
    {error && <p role="alert" className="mb-5 text-sm text-ink-2">Krijimet nuk u ngarkuan. <button className="underline" onClick={() => setRefresh(value => value + 1)}>Provo përsëri</button></p>}
    {!loading && !error && !items.length && <p className="rounded-maro16 bg-surface px-6 py-12 text-center text-sm text-ink-3">{savedOnly ? "Ende pa krijime të ruajtura nga Explore." : "Ende pa krijime publike për këtë filtër."}</p>}
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
      {items.map(item => <article key={item.id} className="mb-3 break-inside-avoid overflow-hidden rounded-maro16 bg-surface">
        <Link href={`/c/${item.slug}`} className="block"><StableImage src={item.url} alt="Krijim në Explore" loading="lazy" className="w-full object-cover" /></Link>
        <div className="p-3"><CreatorLink item={item} />{item.show_prompt !== false && item.prompt && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-2">{item.prompt}</p>}<ExploreEngagement item={item} /></div>
      </article>)}
    </div>
    {loading && <p role="status" className="py-6 text-center text-sm text-ink-3">Duke ngarkuar…</p>}
    {more && <Button variant="secondary" loading={loading} onClick={() => void loadMore()} className="mt-5">Shfaq më shumë</Button>}
  </div>;
}

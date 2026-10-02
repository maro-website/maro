"use client";
import * as React from "react";
import Link from "next/link";
import { useMaro } from "@/context/store";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { StableImage } from "@/components/app/StableImage";
import { ExploreEngagement } from "@/components/explore/ExploreFeed";
import { fetchExploreFeed, exploreWrite } from "@/lib/services/exploreFeedService";
import type { ExploreItemExtended } from "@/lib/explore/types";

export function MyPublications() {
  const { user, ready } = useMaro();
  const userId = user?.id;
  const { toast } = useToast();
  const [items, setItems] = React.useState<ExploreItemExtended[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [editing, setEditing] = React.useState<ExploreItemExtended | null>(null);
  const [prompt, setPrompt] = React.useState("");
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [refresh, setRefresh] = React.useState(0);
  const [more, setMore] = React.useState(false);
  React.useEffect(() => {
    if (!ready) return;
    setItems([]); setFailed(false);
    if (!userId) { setLoading(false); return; }
    let active = true; setLoading(true);
    void fetchExploreFeed("recent", { mine: true }).then(feed => { if (active) { setItems(feed); setMore(feed.length === 60); } }).catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ready, userId, refresh]);
  const change = async (item: ExploreItemExtended, method: "PATCH" | "DELETE", patch: Record<string, unknown> = {}) => {
    if (busy) return; setBusy(true);
    try { await exploreWrite("/api/explore", method, { id: item.id, ...patch }); setEditing(null); setRefresh(value => value + 1); toast(method === "DELETE" ? "Publikimi u hoq nga Explore. Mund ta rikthesh këtu." : "Ndryshimet u ruajtën."); }
    catch { toast("Ndryshimi nuk u ruajt. Provo përsëri."); } finally { setBusy(false); }
  };
  const edit = (item: ExploreItemExtended) => { setEditing(item); setPrompt(item.prompt); setShowPrompt(item.show_prompt !== false); setShowSettings(item.show_settings !== false); };
  return <div>
    <h1 className="maro-page-title">Publikimet në Explore</h1>
    <p className="mb-6 mt-2 text-sm text-ink-3">Menaxho çka ke publikuar. Gjenerimet origjinale mbeten private te Asetet.</p>
    {!user && ready && <Link href="/sign-in" className="text-sm text-ink hover:underline">Hyr për të parë publikimet e tua.</Link>}
    {failed && <p role="alert" className="mb-4 text-sm text-ink-3">Publikimet nuk u ngarkuan. <button onClick={() => setRefresh(value => value + 1)} className="underline">Provo përsëri</button></p>}
    {loading && <p role="status" className="py-8 text-sm text-ink-3">Duke ngarkuar…</p>}
    {!loading && user && !failed && !items.length && <p className="rounded-maro16 bg-surface p-8 text-center text-sm text-ink-3">Ende nuk ke publikuar në Explore.</p>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(item => <article key={item.id} className="overflow-hidden rounded-maro16 bg-surface p-3">
      {item.deleted_at ? <StableImage src={item.url} alt="Publikim i hequr" className="aspect-square w-full rounded-xl object-cover opacity-40" /> : <Link href={`/c/${item.slug}`}><StableImage src={item.url} alt="Publikimi yt" className="aspect-square w-full rounded-xl object-cover" /></Link>}
      <p className="mt-3 line-clamp-2 text-sm text-ink-2">{item.prompt || "Publikim për inspirim"}</p>
      <p className="mt-2 text-xs text-ink-3">{item.deleted_at ? "I hequr nga Explore" : `Prompti ${item.show_prompt ? "publik" : "privat"} · Settings ${item.show_settings ? "publike" : "private"}`}</p>
      {!item.deleted_at && <ExploreEngagement item={item} />}
      <div className="mt-3 flex flex-wrap gap-2">{item.deleted_at ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => void change(item, "PATCH", { restore: true })}>Rikthe</Button> : <><Button size="sm" variant="secondary" disabled={busy} onClick={() => edit(item)}>Edito</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => void change(item, "DELETE")}>Hiq nga Explore</Button></>}</div>
    </article>)}</div>
    {more && <Button variant="secondary" loading={loading} className="mt-6" onClick={() => {
      setLoading(true); void fetchExploreFeed("recent", { mine: true, offset: items.length }).then(next => { setItems(current => [...current, ...next]); setMore(next.length === 60); }).catch(() => setFailed(true)).finally(() => setLoading(false));
    }}>Shfaq më shumë</Button>}
    <Modal open={Boolean(editing)} onClose={() => { if (!busy) setEditing(null); }} size="md">
      <ModalHeader title="Edito publikimin" />
      <label className="text-sm font-semibold text-ink">Prompti<textarea aria-label="Prompti i publikimit" value={prompt} maxLength={64000} onChange={event => setPrompt(event.target.value)} className="maro-input mt-2 min-h-32 w-full resize-y" /></label>
      <div className="my-5 flex flex-col gap-4"><div className="flex items-center justify-between gap-4"><span className="text-sm text-ink">Shfaq promptin</span><Switch checked={showPrompt} onChange={setShowPrompt} aria-label="Shfaq promptin" /></div><div className="flex items-center justify-between gap-4"><span className="text-sm text-ink">Shfaq settings</span><Switch checked={showSettings} onChange={setShowSettings} aria-label="Shfaq settings" /></div></div>
      <Button loading={busy} onClick={() => { if (editing) void change(editing, "PATCH", { prompt, showPrompt, showSettings }); }} className="w-full">Ruaj ndryshimet</Button>
    </Modal>
  </div>;
}

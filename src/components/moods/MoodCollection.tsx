"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Folder, LayoutGrid, Moon, Plus, Search, Sparkles, Users, X } from "lucide-react";
import { useMaro } from "@/context/store";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { canUseMoods, type Mood } from "@/lib/moods/model";
import { moodRequest, MOODS_CHANGED, notifyMoodsChanged } from "@/lib/moods/client";
import { cn } from "@/lib/utils/cn";
import { PreviewFallback } from "@/components/app/PreviewFallback";
import { StyleCard } from "./StyleCard";
import { MoodQuickView } from "./MoodQuickView";
import { StyleForm } from "./StyleForm";
import "./moods.css";
export { MoodCover } from "./MoodCover";
const tabs = [{ id: "all", label: "Të gjitha", Icon: LayoutGrid }, { id: "platform", label: "Nga Maro", Icon: Moon }, { id: "community", label: "Komuniteti", Icon: Users }, { id: "saved", label: "Të ruajtura", Icon: Bookmark }, { id: "mine", label: "Të miat", Icon: Folder }];
export function MoodCollection({ savedOnly = false, onSelect, selectedId, compact = false, discovery = false }: {
  savedOnly?: boolean; onSelect?: (mood: Mood) => void; selectedId?: string; compact?: boolean; discovery?: boolean;
}) {
  const { user, ready } = useMaro(), { toast } = useToast(), router = useRouter();
  const eligible = canUseMoods(user?.email), userId = user?.id;
  const [result, setResult] = React.useState<{ owner: string; key: string; items: Mood[]; hasMore: boolean }>({ owner: "", key: "", items: [], hasMore: false });
  const [query, setQuery] = React.useState(""), [search, setSearch] = React.useState("");
  const [tab, setTab] = React.useState("all"), [page, setPage] = React.useState(0);
  const [refresh, setRefresh] = React.useState(0), [loading, setLoading] = React.useState(true), [error, setError] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [editor, setEditor] = React.useState<Mood | "new" | null>(null), [deleting, setDeleting] = React.useState<Mood | null>(null);
  const [busy, setBusy] = React.useState(false), pending = React.useRef(false);
  const scope = savedOnly ? "saved" : tab, key = `${scope}:${search}`;
  React.useEffect(() => { const timer = setTimeout(() => { setSearch(query); setPage(0); }, 250); return () => clearTimeout(timer); }, [query]);
  React.useEffect(() => {
    const update = () => setRefresh(value => value + 1);
    window.addEventListener(MOODS_CHANGED, update); window.addEventListener("focus", update);
    const timer = setInterval(update, 90_000);
    return () => { clearInterval(timer); window.removeEventListener(MOODS_CHANGED, update); window.removeEventListener("focus", update); };
  }, []);
  React.useEffect(() => { setQuery(""); setSearch(""); setTab("all"); setPage(0); setActiveId(null); setEditor(null); setDeleting(null); }, [userId]);
  React.useEffect(() => {
    if (!eligible || !userId) return;
    const controller = new AbortController(); setLoading(true); setError("");
    // A refresh reloads the full currently displayed page window, keeping expired cover URLs fresh.
    void Promise.all(Array.from({ length: page + 1 }, (_, index) => moodRequest<{ items: Mood[]; hasMore: boolean }>(`/api/moods?scope=${scope}&q=${encodeURIComponent(search)}&page=${index}`, { signal: controller.signal }))).then(pages => {
      if (!controller.signal.aborted) setResult({ owner: userId, key, items: [...new Map(pages.flatMap(p => p.items).map(item => [item.id, item])).values()], hasMore: pages.at(-1)?.hasMore ?? false });
    }).catch(err => { if (!controller.signal.aborted) setError((err as Error).message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [eligible, userId, scope, search, page, refresh, key]);
  const items = result.owner === userId && result.key === key && eligible ? result.items : [];
  const active = items.find(item => item.id === activeId);
  async function act(mood: Mood, use: boolean) {
    if (pending.current) return; pending.current = true; setBusy(true);
    try {
      if (use) { if (onSelect) onSelect(mood); else router.push(`/imazh?mood=${mood.id}`); setActiveId(null); }
      else {
        await moodRequest("/api/moods/save", { method: "POST", body: { moodId: mood.id, saved: !mood.saved } });
        setResult(current => ({ ...current, items: current.items.map(item => item.id === mood.id ? { ...item, saved: !item.saved } : item) }));
        notifyMoodsChanged(); toast(mood.saved ? "Stili u largua nga të ruajturat." : "Stili u ruajt.");
      }
    } catch (err) { toast((err as Error).message, "error"); }
    finally { pending.current = false; setBusy(false); }
  }
  async function remove() {
    if (!deleting || pending.current) return; pending.current = true; setBusy(true);
    try { await moodRequest("/api/moods", { method: "DELETE", body: { id: deleting.id, updated_at: deleting.updated_at } }); setDeleting(null); setActiveId(null); notifyMoodsChanged(); toast("Stili u fshi."); }
    catch (err) { toast((err as Error).message, "error"); }
    finally { pending.current = false; setBusy(false); }
  }
  if (!ready) return <p role="status" className="py-10 text-center text-ink-3">Duke ngarkuar…</p>;
  if (!eligible) return <div className="py-16 text-center"><Sparkles className="mx-auto h-8 w-8 text-ink-3" /><p className="mt-4 text-ink-2">maroStyles është në pilot privat.</p><Link href="/imazh" className="mt-4 inline-block text-brand">Kthehu te maroImazh</Link></div>;
  return <div className={cn("moods-collection styles-library", compact && "moods-collection--compact")}>
    {discovery && <header className="styles-heading"><p className="styles-wordmark"><Moon className="h-6 w-6" aria-hidden="true" /> maroStyles</p><h1>Ideja jote.<br className="sm:hidden" /> <span>Një tjetër atmosferë.</span></h1><p>Zgjedh një stil nga Maro ose komuniteti. Ose krijoje tëndin.</p></header>}
    <div className="styles-toolbar"><label className="styles-search"><Search className="h-5 w-5 shrink-0" aria-hidden="true" /><input type="search" maxLength={80} aria-label="Kërko stile" placeholder="Çfarë atmosfere po kërkon?" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" onClick={() => setQuery("")} aria-label="Pastro kërkimin"><X className="h-4 w-4" /></button>}</label>{!savedOnly && <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setEditor("new")}><span>{discovery ? "Krijo stilin tënd" : "Krijo stil"}</span></Button>}</div>
    {!savedOnly && <div className="styles-tabs" role="group" aria-label="Filtro stilet">{tabs.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => { setTab(id); setPage(0); setActiveId(null); }}><Icon className="h-4 w-4" aria-hidden="true" /><span>{label}</span></button>)}</div>}
    <div className="styles-list-heading"><h2>{search ? `Rezultatet për “${search}”` : scope === "mine" ? "Stilet që ke krijuar" : scope === "saved" ? "Stilet e ruajtura" : scope === "platform" ? "Të krijuara nga Maro" : scope === "community" ? "Nga komuniteti" : "Zbulo stilet"}</h2><span aria-live="polite">{loading ? "Duke ngarkuar…" : `${items.length}${result.hasMore ? "+" : ""} stile`}</span></div>
    {error ? <div role="alert" className="moods-empty"><p>{error}</p><Button variant="secondary" onClick={() => setRefresh(n => n + 1)}>Provo përsëri</Button></div>
      : !items.length && loading ? <div className="styles-grid" role="status" aria-label="Duke ngarkuar stilet">{Array.from({ length: 4 }, (_, index) => <div key={index} className="style-card style-card--loading" aria-hidden="true"><PreviewFallback state="loading" className="style-card-loading-artwork" /><div className="style-card-info"><div className="style-card-skeleton" /><div className="style-card-skeleton" /><div className="style-card-skeleton" /></div></div>)}</div>
      : !items.length ? <div className="moods-empty"><Sparkles className="h-8 w-8" /><h3>{search ? "Nuk u gjet asnjë stil." : "Këtu fillon një atmosferë e re."}</h3><p>{scope === "mine" ? "Krijo stilin tënd dhe ndiqe aprovimin këtu." : "Provo një kërkim tjetër ose krijo stilin tënd."}</p><Button variant="secondary" onClick={() => setEditor("new")}>Krijo stil</Button></div>
      : <div className="styles-grid">{items.map(mood => <StyleCard key={mood.id} mood={mood} own={mood.created_by === userId} selected={selectedId === mood.id} busy={busy} onOpen={() => setActiveId(mood.id)} onSave={() => void act(mood, false)} onUse={() => void act(mood, true)} onEdit={() => setEditor(mood)} onDelete={() => setDeleting(mood)} />)}</div>}
    {result.hasMore && !error && <div className="mt-6 text-center"><Button variant="secondary" loading={loading} disabled={loading} onClick={() => setPage(n => n + 1)}>Shfaq më shumë</Button></div>}
    {active && <MoodQuickView mood={active} selected={selectedId === active.id} busy={busy} using={false} inComposer={Boolean(onSelect)} onClose={() => setActiveId(null)} onSave={() => void act(active, false)} onUse={() => void act(active, true)} />}
    {editor && <StyleForm key={editor === "new" ? "new" : editor.id} item={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setTab("mine"); setPage(0); setRefresh(n => n + 1); }} />}
    <Modal open={Boolean(deleting)} onClose={() => { if (!busy) setDeleting(null); }} size="sm"><ModalHeader title="Fshi stilin" description={`“${deleting?.title ?? ""}” do të hiqet edhe nga stilet e ruajtura.`} /><div className="flex justify-end gap-3 px-6 pb-6"><Button variant="secondary" disabled={busy} onClick={() => setDeleting(null)}>Anulo</Button><Button variant="danger" loading={busy} onClick={() => void remove()}>Fshi</Button></div></Modal>
  </div>;
}

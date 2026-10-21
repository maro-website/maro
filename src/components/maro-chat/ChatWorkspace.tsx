"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, ArrowUp, Plus, ArrowUpRight, RefreshCw, Brain } from "lucide-react";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { MaroSymbol } from "@/components/ui/Logo";
import { canUseMaroChat, CHAT_HANDOFF_KEY, type ChatTurn, type ChatUsage, type ChatImage } from "@/lib/maro-chat/model";
import { chatRequest } from "@/lib/maro-chat/client";
import type { Workspace } from "@/lib/workspaces/types";

type State = { turns: ChatTurn[]; conversationId: string | null; sessions: { id: string; title: string }[]; usage: ChatUsage; configured: boolean; model: string; context: { displayName: string; brainName: string; workspaceName: string; brainAccess: boolean; credits: number } };
const tools: Record<string, string> = { "/brain": "Hap maroBrain", "/krijimet": "Hap asetet", "/presets": "Hap maroPresets", "/marologo": "Hap maroLogo", "/feed": "Hap maroFeed", "/apps": "Hap maroApps" };
const formats: Record<string, string> = { "ig-post": "Instagram Post", "ig-story": "Story", "fb-post": "Square", landscape: "Landscape" };
export function ChatWorkspace() {
  const { user, ready } = useMaro(); const ws = useWorkspace();
  if (!ready || !ws.ready) return <div role="status" className="maro-content-shell py-10 text-ink-2">Po hapet maroChat…</div>;
  if (!user || !canUseMaroChat(user.email)) return <div className="maro-content-shell py-10"><h1 className="text-2xl font-semibold text-ink">maroChat · Pilot privat</h1><p className="mt-3 text-ink-2">Ky pilot është vetëm për erzen@nice.al.</p><Link href="/" className="mt-6 inline-flex min-h-11 items-center underline">Kthehu në Hub</Link></div>;
  if (!ws.activeWorkspace) return <div className="maro-content-shell py-10"><p>Zgjidh një workspace për me fillu.</p><Link href="/account/workspaces" className="inline-flex min-h-11 items-center underline">Workspace-et e mia</Link></div>;
  return <Chat key={`${user.id}:${ws.activeWorkspace.id}`} ownerId={user.id} workspace={ws.activeWorkspace} workspaces={ws.workspaces} changeWorkspace={ws.setActiveWorkspace} />;
}
export function Chat({ ownerId, workspace, workspaces, changeWorkspace }: { ownerId: string; workspace: Workspace; workspaces: Workspace[]; changeWorkspace: (id: string) => Promise<void> }) {
  const router = useRouter(); const [data, setData] = React.useState<State | null>(null);
  const [conversationId, setConversationId] = React.useState(""); const [text, setText] = React.useState(""); const [useBrain, setUseBrain] = React.useState(true);
  const [loading, setLoading] = React.useState(true); const [busy, setBusy] = React.useState(false); const [applying, setApplying] = React.useState<string | null>(null); const [error, setError] = React.useState("");
  const mounted = React.useRef(true); const end = React.useRef<HTMLDivElement>(null); const pending = React.useRef<{ requestId: string; conversationId: string; workspaceId: string; message: string; useBrain: boolean } | null>(null);
  const storageKey = `maro:chat:${ownerId}:${workspace.id}`;
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const load = React.useCallback(async (id?: string) => {
    const params = new URLSearchParams({ workspaceId: workspace.id }); if (id) params.set("conversationId", id);
    const next = await chatRequest<State>(`/api/maro-chat?${params}`);
    if (!mounted.current) return;
    const resolved = id || next.conversationId || crypto.randomUUID();
    setData(next); setConversationId(resolved); setUseBrain(next.context.brainAccess && (next.turns.at(-1)?.use_brain ?? true));
    try { localStorage.setItem(storageKey, resolved); } catch { /* In-memory use remains available. */ }
    if (pending.current && next.turns.some(t => t.id === pending.current?.requestId && t.status !== "running")) { pending.current = null; try { sessionStorage.removeItem(`${storageKey}:pending`); } catch { /* Ignore unavailable storage. */ } }
  }, [workspace.id, storageKey]);
  React.useEffect(() => {
    let id: string | undefined;
    try { id = localStorage.getItem(storageKey) || undefined; const saved = JSON.parse(sessionStorage.getItem(`${storageKey}:pending`) || "null"); if (saved?.workspaceId === workspace.id) pending.current = saved; } catch { /* Ignore unavailable storage. */ }
    void load(id).catch(e => { if (mounted.current) setError((e as Error).message); }).finally(() => { if (mounted.current) setLoading(false); });
  }, [load, storageKey, workspace.id]);
  React.useEffect(() => { end.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" }); }, [data?.turns.length, busy]);
  const running = data?.turns.some(t => t.status === "running" && Date.now() - new Date(t.created_at).getTime() < 125_000);
  React.useEffect(() => {
    if (!running || busy) return;
    const timer = setInterval(() => { void load(conversationId).catch(() => {}); }, 4000); return () => clearInterval(timer);
  }, [running, busy, load, conversationId]);
  async function send(value = text) {
    if (busy || !value.trim() || !conversationId) return;
    setError(""); setBusy(true);
    const selectedBrain = /^pa brain$/i.test(value.trim()) ? false : /përdore (këtë )?brain/i.test(value) ? Boolean(data?.context.brainAccess) : useBrain;
    setUseBrain(selectedBrain);
    const args = pending.current?.message === value.trim() && pending.current.conversationId === conversationId && pending.current.useBrain === selectedBrain ? pending.current : { requestId: crypto.randomUUID(), conversationId, workspaceId: workspace.id, message: value.trim(), useBrain: selectedBrain };
    pending.current = args;
    try {
      sessionStorage.setItem(`${storageKey}:pending`, JSON.stringify(args));
    } catch { /* Request identity remains in memory. */ }
    try {
      const result = await chatRequest<{ turn: ChatTurn; usage: ChatUsage }>("/api/maro-chat", { method: "POST", body: JSON.stringify(args) });
      if (!mounted.current) return;
      setData(old => old ? { ...old, usage: result.usage, turns: [...old.turns.filter(t => t.id !== result.turn.id), result.turn], sessions: old.sessions.some(s => s.id === conversationId) ? old.sessions : [{ id: conversationId, title: value.slice(0, 80) }, ...old.sessions] } : old);
      if (result.turn.status !== "running") { pending.current = null; try { sessionStorage.removeItem(`${storageKey}:pending`); } catch { /* Ignore unavailable storage. */ } }
      if (result.turn.status === "failed") setError("Kjo kërkesë nuk u përfundua. Dërgo një mesazh të ri për me vazhdu.");
      setText("");
    } catch (e) { if (mounted.current) { setError((e as Error).message); void load(conversationId).catch(() => {}); } }
    finally { if (mounted.current) setBusy(false); }
  }
  async function apply(turn: ChatTurn) {
    setApplying(turn.id); setError("");
    try { await chatRequest("/api/maro-chat/brain", { method: "POST", body: JSON.stringify({ turnId: turn.id }) }); if (mounted.current) setData(old => old ? { ...old, turns: old.turns.map(t => t.id === turn.id ? { ...t, brain_applied: true } : t) } : old); }
    catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { if (mounted.current) setApplying(null); }
  }
  function openImage(image: ChatImage) {
    const id = crypto.randomUUID();
    try { sessionStorage.setItem(CHAT_HANDOFF_KEY, JSON.stringify({ ownerId, workspaceId: workspace.id, conversationId: id, image, createdAt: Date.now() })); router.push(`/imazh?chat=${id}&from=marochat`); }
    catch { setError("Shfletuesi nuk e ruajti setup-in. Lejo storage dhe provo përsëri."); }
  }
  const latest = data?.turns.at(-1); const quota = data ? Math.min(100, Math.round(100 * data.usage.month / data.usage.monthlyLimit)) : 0;
  return <section aria-label="maroChat" className="maro-content-shell mx-auto flex w-full min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
    <header className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><MaroSymbol className="h-9 w-9" /><div><h1 className="text-2xl font-semibold text-ink">maroChat <span className="text-xs font-medium text-ink-3">Pilot</span></h1><p className="text-sm text-ink-2">Prej idesë te krijimi, bashkë.</p></div></div><Button variant="secondary" icon={<Plus className="h-5 w-5" />} disabled={busy || running || loading} onClick={() => { const id = crypto.randomUUID(); setConversationId(id); setData(old => old ? { ...old, turns: [] } : old); setText(""); setError(""); try { localStorage.setItem(storageKey, id); } catch { /* Ignore unavailable storage. */ } }}>Bisedë e re</Button></header>
    <div className="my-6 grid gap-4 sm:grid-cols-2"><Field label="Brain / workspace"><Select value={workspace.id} disabled={busy || running || Boolean(applying)} onChange={e => { setError(""); void changeWorkspace(e.target.value).catch(err => setError((err as Error).message)); }}>{workspaces.map(w => <option key={w.id} value={w.id}>{w.brand?.name || w.name}</option>)}</Select></Field><Field label="Bisedat e këtij Brain-i"><Select value={conversationId} disabled={busy || running || loading} onChange={e => { setLoading(true); setError(""); void load(e.target.value).catch(err => setError((err as Error).message)).finally(() => setLoading(false)); }}><option value={conversationId}>{data?.sessions.find(s => s.id === conversationId)?.title || "Bisedë e re"}</option>{data?.sessions.filter(s => s.id !== conversationId).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</Select></Field></div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-2"><label className="flex min-h-11 cursor-pointer items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand" checked={useBrain} disabled={busy || running || !data?.context.brainAccess} onChange={e => setUseBrain(e.target.checked)} /><Brain className="h-4 w-4" />{useBrain ? `Me Brain: ${data?.context.brainName || workspace.name}` : "Pa Brain"}</label><span title="Kuota llogarit tokenët e chat-it. Imazhet përdorin çmimin e tyre normal.">{quota}% e kuotës mujore · imazhet veçmas</span></div>
    {error && <div role="alert" className="maro-alert mb-4"><p>{error}</p><Button variant="ghost" icon={<RefreshCw className="h-4 w-4" />} disabled={busy} onClick={() => { setError(""); void load(conversationId || undefined).catch(e => setError((e as Error).message)); }}>Rifresko bisedën</Button></div>}
    {loading && <p role="status" className="py-6 text-ink-2">Po e njohim workspace-in…</p>}
    {!loading && data && !data.turns.length && <section className="py-8"><h2 className="text-xl font-semibold text-ink">Hej {data.context.displayName.split(" ")[0]}, çka po marojmë sot?</h2><p className="mt-3 max-w-xl text-base text-ink-2">E zhvillojmë idenë, e gjejmë produktin dhe ta bëjmë gati setup-in në maroImazh. Ose e plotësojmë Brain-in bashkë.</p><div className="mt-6 flex flex-wrap gap-3">{["Du me bo ni reklamë që e ndal scroll-in", "Plotësoma maroBrain", "Çka kam kriju kohëve të fundit?"].map(s => <Button key={s} variant="secondary" disabled={busy || !data.configured} onClick={() => void send(s)}>{s}</Button>)}</div></section>}
    <div role="log" aria-label="Biseda me maroChat" aria-live="polite" className="flex min-w-0 flex-col gap-6">
      {data?.turns.map(turn => <article key={turn.id} className="min-w-0"><div className="mb-4 ml-auto max-w-[90%] whitespace-pre-wrap break-words rounded-maro20 bg-surface-2 px-5 py-4 text-base text-ink"><span className="sr-only">Ti: </span>{turn.message}</div>
        {turn.reply && <div className="space-y-3"><div className="flex items-center gap-2 text-sm font-semibold text-ink-2"><MessageCircle className="h-4 w-4" />maroChat</div>{turn.reply.messages.map((m, i) => <p key={i} className="whitespace-pre-wrap break-words text-base leading-relaxed text-ink">{m}</p>)}
          {turn.reply.image && <div className="maro-panel space-y-4 p-5"><h3 className="text-lg font-semibold">{turn.reply.image.title}</h3><p className="text-sm text-ink-2">{formats[turn.reply.image.format]} · {turn.reply.image.text ? "Me tekst" : "Pa tekst"} · {turn.reply.image.useBrain ? "Me Brain" : "Pa Brain"}</p><p className="break-words text-sm text-ink-2">{turn.reply.image.assetName ? `Referenca: ${turn.reply.image.assetName}` : "Fotoja e produktit: ngarkoje në maroImazh."}</p><details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Shiko promptin</summary><p className="whitespace-pre-wrap break-words text-sm text-ink-2">{turn.reply.image.prompt}</p></details><Button variant="brand" iconRight={<ArrowUpRight className="h-5 w-5" />} disabled={busy || running} onClick={() => openImage(turn.reply!.image!)}>Hape gati në maroImazh</Button><p className="text-sm text-ink-3">E kontrollon setup-in dhe çmimin aty, pastaj klikon Maro.</p></div>}
          {turn.reply.brainUpdates.length > 0 && <div className="maro-panel space-y-4 p-5"><h3 className="text-lg font-semibold">Propozim për maroBrain</h3><dl className="space-y-3">{turn.reply.brainUpdates.map((u, i) => <div key={i}><dt className="text-sm font-semibold text-ink-2">{u.section} / {u.field}</dt><dd className="whitespace-pre-wrap break-words text-base text-ink">{u.value}</dd></div>)}</dl><Button variant="brand" disabled={turn.brain_applied || Boolean(applying) || busy} loading={applying === turn.id} onClick={() => void apply(turn)}>{turn.brain_applied ? "U ruajt në Brain" : "Ruaji këto në Brain"}</Button></div>}
          {turn.reply.tool && <Link className="inline-flex min-h-11 items-center gap-2 font-semibold underline" href={turn.reply.tool}>{tools[turn.reply.tool]}<ArrowUpRight className="h-4 w-4" /></Link>}
          <details className="text-xs text-ink-3"><summary className="min-h-11 cursor-pointer py-3">Përdorimi i kësaj kërkese</summary><p>{turn.input_tokens.toLocaleString()} input · {turn.cached_tokens.toLocaleString()} cached · {turn.output_tokens.toLocaleString()} output</p><p>{turn.model} · {turn.estimated_usd == null ? "Kosto e pakonfirmuar" : `rreth $${Number(turn.estimated_usd).toFixed(5)}`} · task {turn.id}</p></details>
        </div>}
        {turn.status === "running" && <p role="status" className="text-ink-2">Po e përgatis…</p>}{turn.status === "failed" && <p className="text-sm text-ink-2">Kjo kërkesë nuk u përfundua. Mund të vazhdosh me një mesazh të ri.</p>}
      </article>)}
      {busy && <p role="status" className="text-sm text-ink-2">Po e mendoj…</p>}
      <div ref={end} />
    </div>
    {latest?.status === "completed" && latest.reply?.choices.length ? <div className="mt-4 flex flex-wrap gap-3">{latest.reply.choices.map(choice => <Button key={choice} variant="secondary" disabled={busy || running} onClick={() => { if (/^pa brain$/i.test(choice)) setUseBrain(false); void send(choice); }}>{choice}</Button>)}</div> : null}
    <form className="mt-6 space-y-3 bg-canvas pb-[max(1rem,env(safe-area-inset-bottom))] pt-4" onSubmit={e => { e.preventDefault(); void send(); }}><Field label="Mesazhi yt"><Textarea value={text} maxLength={3000} disabled={busy || loading || !data?.configured} onChange={e => setText(e.target.value)} placeholder="P.sh. zgjedhe ti produktin dhe ma përgatit një reklamë…" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} /></Field><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink-3">{data && !data.configured ? "Po lidhet OpenAI për pilotin." : "Enter për me dërgu · Shift + Enter për rresht të ri"}</p><Button type="submit" variant="brand" icon={<ArrowUp className="h-5 w-5" />} disabled={busy || running || loading || !data?.configured || !text.trim()} loading={busy}>Dërgo</Button></div></form>
  </section>;
}

"use client";
/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import Link from "next/link";
import { CalendarDays, Image as ImageIcon, Radio, Wallet, Plus, ArrowUpRight, RefreshCw, LayoutGrid, List, Copy, Check, Sparkles } from "lucide-react";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Field } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { ProductLogo } from "@/components/ui/ProductLogo";
import { UpcomingProductPage } from "@/components/modules/UpcomingProductPage";
import { FeedWorkspace } from "@/components/feed/FeedWorkspace";
import { canUseMarketing, platforms, platformNames, localDate, campaignBriefSchema, type CampaignBrief, type MarketingCampaign, type MarketingPost } from "@/lib/marketing/model";
import { marketingJson, marketingMessage } from "@/lib/marketing/client";
import { MarketingSocials, PublishDialog, SocialCostGuide } from "./MarketingSocials";
import b from "@/components/modules/BrainStudio.module.css";
import s from "./MarketingWorkspace.module.css";

type HistoryItem = Pick<MarketingCampaign, "id" | "brand" | "brief" | "status" | "created_at" | "estimated_usd">;
export type MarketingOverview = { configured: boolean; socialsConfigured: boolean; model: string; campaigns: HistoryItem[]; brain: { name: string; description: string; audience: string; ready: boolean; access: boolean }; usage: { month: number; day: number; workspace: number; estimated: number; uncertain: number; inputTokens: number; outputTokens: number; searches: number; campaigns: number; dailyLimit: number; monthlyLimit: number; monthKey: string; images: { count: number; usd: number; unknown: number; credits: number } } };
const tabs = [{ id: "plan", title: "Fushatat", icon: CalendarDays }, { id: "images", title: "Imazhet", icon: ImageIcon }, { id: "socials", title: "Socials", icon: Radio }, { id: "costs", title: "Përdorimi", icon: Wallet }] as const;
type Tab = typeof tabs[number]["id"];
export const money = (usd: number) => `$${usd.toFixed(4)}`;
const dateLabel = (date: string) => new Intl.DateTimeFormat("sq-AL", { day: "numeric", month: "short", timeZone: "Europe/Berlin" }).format(new Date(date.length === 10 ? date + "T12:00:00Z" : date));
const initialBrief = (): CampaignBrief => ({ title: "", focus: "", offer: "", goal: "sales", language: "sq", startDate: localDate(), days: 30, channels: ["instagram", "facebook"], liveResearch: true });
export function MarketingWorkspace() {
  const { user, ready } = useMaro(), workspace = useWorkspace();
  if (!ready) return <div className={s.notice} role="status">Duke hapur maroMarketing…</div>;
  if (!canUseMarketing(user?.email)) return <UpcomingProductPage moduleId="marketing" />;
  if (!workspace.activeWorkspace) return <div className={s.notice} role="status">Duke hapur Brain-in…</div>;
  return <MarketingStudio key={`${user!.id}:${workspace.activeWorkspace.id}`} workspaceId={workspace.activeWorkspace.id} />;
}
function MarketingStudio({ workspaceId }: { workspaceId: string }) {
  const { workspaces, setActiveWorkspace } = useWorkspace();
  const [tab, setTab] = React.useState<Tab>("plan"), [data, setData] = React.useState<MarketingOverview | null>(null);
  const [campaign, setCampaign] = React.useState<MarketingCampaign | null>(null), [creating, setCreating] = React.useState(false);
  const [brief, setBrief] = React.useState(initialBrief), [busy, setBusy] = React.useState(false), [error, setError] = React.useState("");
  const [editor, setEditor] = React.useState<{ post: MarketingPost; revision: number } | null>(null), [publishing, setPublishing] = React.useState<MarketingPost | null>(null);
  const [view, setView] = React.useState<"calendar" | "list">("calendar"), [studio, setStudio] = React.useState<"feed" | "apps">("feed");
  const alive = React.useRef(true), lock = React.useRef(false), requestId = React.useRef("");
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const overview = React.useCallback(async () => {
    const result = await marketingJson<MarketingOverview>(`/api/marketing?workspaceId=${encodeURIComponent(workspaceId)}`);
    if (alive.current) setData(result); return result;
  }, [workspaceId]);
  const open = React.useCallback(async (id: string) => {
    const result = await marketingJson<{ campaign: MarketingCampaign }>(`/api/marketing?workspaceId=${encodeURIComponent(workspaceId)}&campaignId=${id}`);
    if (alive.current) { setCampaign(result.campaign); setCreating(false); const url = new URL(window.location.href); url.searchParams.set("campaign", id); window.history.replaceState(null, "", url); }
  }, [workspaceId]);
  React.useEffect(() => {
    void (async () => { try { const d = await overview(); const params = new URL(window.location.href).searchParams; const desired = params.get("tab"); if (alive.current && tabs.some(t => t.id === desired)) setTab(desired as Tab); const id = params.get("campaign"); if (id && d.campaigns.some(c => c.id === id)) await open(id); } catch (e) { if (alive.current) setError(marketingMessage((e as Error).message)); } })();
  }, [overview, open]);
  React.useEffect(() => {
    if (campaign?.status !== "generating") return;
    const timer = setInterval(() => { void open(campaign.id).catch(() => undefined); }, 6000); return () => clearInterval(timer);
  }, [campaign?.id, campaign?.status, open]);
  async function run(action: () => Promise<void>) {
    if (lock.current) return; lock.current = true; setBusy(true); setError("");
    try { await action(); } catch (e) { if (alive.current) setError(marketingMessage((e as Error).message)); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  function newCampaign() { setCampaign(null); setCreating(true); setBrief(initialBrief()); requestId.current = ""; setTab("plan"); setError(""); const url = new URL(window.location.href); url.searchParams.delete("campaign"); window.history.replaceState(null, "", url); }
  async function create() {
    await run(async () => {
      const id = requestId.current ||= crypto.randomUUID();
      try { const result = await marketingJson<{ campaign: MarketingCampaign }>("/api/marketing", { workspaceId, requestId: id, brief }); if (alive.current) { setCampaign(result.campaign); setCreating(false); } requestId.current = ""; await open(result.campaign.id); }
      catch (e) { try { await open(id); requestId.current = ""; } catch { /* Same request id retained after a lost response. */ } throw e; }
      finally { await overview(); }
    });
  }
  async function save(post: MarketingPost, revision: number, approved: boolean) {
    await run(async () => {
      if (!campaign) return;
      const { title, hook, caption, cta, visual, date, time, channel } = post;
      const result = await marketingJson<{ campaign: MarketingCampaign }>("/api/marketing/action", { action: "edit", workspaceId, campaignId: campaign.id, revision, postId: post.id, post: { title, hook, caption, cta, visual, date, time, channel, status: approved ? "approved" : "draft" } });
      if (alive.current) { setCampaign(result.campaign); setEditor(null); }
    });
  }
  async function importImages(feedId: string, imageStudio: "feed" | "apps") {
    if (!campaign) return;
    const result = await marketingJson<{ campaign: MarketingCampaign }>("/api/marketing/action", { action: "import", workspaceId, campaignId: campaign.id, revision: campaign.revision, feedId, studio: imageStudio });
    if (alive.current) { setCampaign(result.campaign); setTab("plan"); } await overview();
  }
  const posts = campaign?.plan?.posts ?? [], done = posts.filter(p => p.assetRef).length;
  return <div className={`${b.studio} ${s.studio}`} data-marketing-studio="true">
    <header className={s.heading}><div className={s.brand}><ProductLogo product="marketing" naturalWidth /><span className={s.badge}>Pilot</span></div><div className={s.actions}><Button variant="ghost" disabled={busy} aria-label="Rifresko maroMarketing" onClick={() => void run(async () => { await overview(); if (campaign) await open(campaign.id); })}><RefreshCw size={16} /></Button><Button variant="brand" disabled={busy} onClick={newCampaign}><Plus size={18} />Fushatë e re</Button></div></header>
    <div className={tab === "images" && campaign?.plan ? s.fullLayout : b.layout}>
      <aside className={b.sidebar}><label className={b.workspace}><span>Brain aktiv</span><select className="maro-input" value={workspaceId} disabled={busy} onChange={e => void run(async () => { await setActiveWorkspace(e.target.value); })}>{workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label><nav className={b.sectionNav} aria-label="Seksionet e maroMarketing">{tabs.map(t => <button type="button" key={t.id} disabled={busy} aria-current={tab === t.id ? "page" : undefined} onClick={() => { setTab(t.id); setError(""); }}><t.icon size={18} /><span>{t.title}</span>{t.id === "images" && campaign?.plan && <small>{done}/9</small>}</button>)}</nav><Link className={s.hintLink} href="/brain">Hap maroBrain <ArrowUpRight size={14} /></Link><p className={s.muted}>Fushatat e këtij Brain-i</p><div className={s.history}>{data?.campaigns.slice(0, 12).map(c => <button key={c.id} type="button" disabled={busy} aria-current={campaign?.id === c.id} onClick={() => void run(async () => { await open(c.id); setTab("plan"); })}><strong>{c.brief.title}</strong><small>{dateLabel(c.created_at)} · {c.status === "completed" ? "9 poste" : c.status === "generating" ? "Në përgatitje" : "Nuk u përfundua"}</small></button>)}</div></aside>
      <main className={b.main}><div className={s.stack}>
        {error && <div className={s.inlineError} role="alert">{error}</div>}
        {!data ? <div className={s.empty} role="status"><Sparkles size={24} /><h2>Duke hapur studion…</h2>{error && <Button variant="secondary" onClick={() => void run(async () => { await overview(); })}>Provo përsëri</Button>}</div> : <>
          {tab === "plan" && <>
            {creating ? <CreateCampaign brief={brief} onChange={v => { setBrief(v); requestId.current = ""; }} busy={busy} data={data} onCreate={create} onClose={() => setCreating(false)} /> : campaign ? <>
              <section className={s.panel}><div className={s.row}><div><p className={s.muted}>{campaign.brand} · {campaign.brief.days} ditë · Europe/Berlin</p><h1 className={s.title}>{campaign.brief.title}</h1></div><span className={s.badge}>{campaign.status === "completed" ? "Draft për rishikim" : campaign.status === "generating" ? "Po përgatitet…" : "Nuk u përfundua"}</span></div>
                {campaign.plan ? <><p className={s.strategy}>{campaign.plan.strategy}</p><div className={s.metrics}><div><span>Postime</span><strong>9</strong></div><div><span>Imazhe gati</span><strong>{done}/9</strong></div><div><span>Tekst + hulumtim</span><strong>{campaign.estimated_usd === null ? "Në verifikim" : money(campaign.estimated_usd)}</strong></div></div><div className={s.actions}><Button variant="brand" onClick={() => setTab("images")}><ImageIcon size={16} />Përgatit imazhet</Button><Button variant="secondary" onClick={() => setTab("socials")}><Radio size={16} />Lidh socials</Button></div><div className={s.sources}><p className={s.muted}>{campaign.plan.researchedAt ? `Hulumtuar më ${dateLabel(campaign.plan.researchedAt)}. ` : "Pa hulumtim live. "}{campaign.plan.researchNote}</p>{campaign.plan.sources.length > 0 && <ul>{campaign.plan.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul>}</div></> : <p className={s.strategy}>{campaign.status === "generating" ? "Po lexohet Brain-i dhe po përgatiten 9 poste. Mund ta hapësh përsëri nga historiku." : marketingMessage(campaign.error_code || "generation_incomplete")}</p>}
              </section>
              {campaign.plan && <><div className={s.row}><p className={s.muted}>Rishiko tekstin, imazhin dhe orarin. Miratimi nuk publikon automatikisht.</p><div className={s.actions}><Button variant={view === "calendar" ? "secondary" : "ghost"} aria-label="Pamja kalendar" aria-pressed={view === "calendar"} onClick={() => setView("calendar")}><LayoutGrid size={16} /></Button><Button variant={view === "list" ? "secondary" : "ghost"} aria-label="Pamja listë" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={16} /></Button><Button variant="ghost" onClick={() => exportCampaign(campaign)}>Eksporto CSV</Button></div></div><div className={view === "calendar" ? s.postGrid : s.postList}>{posts.map(p => <article className={s.post} key={p.id}>{p.assetUrl && <img src={p.assetUrl} className={s.postImage} alt={p.title} />}<div className={s.postBody}><div className={s.postMeta}><span>{dateLabel(p.date)} · {p.time}</span><span>{platformNames[p.channel]}</span></div><h3>{p.title}</h3><p className={s.clamp}>{p.hook}</p><span className={s.status} data-approved={p.status === "approved"}>{p.status === "approved" ? "Miratuar" : "Për rishikim"}</span><div className={s.actions}><Button variant="secondary" disabled={busy} onClick={() => setEditor({ post: p, revision: campaign.revision })}>Rishiko</Button><Button variant="ghost" disabled={busy || p.status !== "approved" || !p.assetRef} onClick={() => setPublishing(p)}>Publiko <ArrowUpRight size={14} /></Button></div></div></article>)}</div></>}
            </> : <div className={s.empty}><CalendarDays size={28} /><h1 className={s.title}>{data.brain.name}. Me drejtim.</h1><p>Një qëllim, 9 poste dhe imazhet përkatëse. Brain-i sjell brendin; ti rishikon përmbajtjen dhe vendos kur publikohet.</p><Button variant="brand" onClick={newCampaign}>Krijo fushatën e parë <Plus size={18} /></Button><div className={s.actions}><Link className={s.links} href="/feed">maroFeed · pilot</Link><Link className={s.links} href="/apps">maroApps · pilot</Link></div></div>}
          </>}
          {tab === "images" && (campaign?.plan ? <><div className={s.row}><div><h1 className={s.title}>Imazhet për {campaign.brief.title}</h1><p className={s.muted}>9 imazhe · 50 credits. 3 rigjenerime falas, pastaj 5 credits. Gjenerimi fillon vetëm kur e kërkon.</p></div><div className={s.actions}><Button variant={studio === "feed" ? "brand" : "secondary"} onClick={() => setStudio("feed")}>Produkte & shërbime</Button><Button variant={studio === "apps" ? "brand" : "secondary"} onClick={() => setStudio("apps")}>App-e</Button></div></div><div className={s.imageStudio}><FeedWorkspace studio={studio} marketingCampaignId={campaign.id} onMarketingImport={importImages} /></div></> : <div className={s.empty}><ImageIcon size={28} /><h2>Hape ose krijoje një fushatë.</h2><p>Plani i jep drejtim secilit imazh. Studio-t janë të hapura edhe veçmas për pilotin tënd.</p><div className={s.actions}><Link className={s.links} href="/feed">Hap maroFeed</Link><Link className={s.links} href="/apps">Hap maroApps</Link></div><Button variant="brand" onClick={newCampaign}>Fushatë e re</Button></div>)}
          {tab === "socials" && <MarketingSocials workspaceId={workspaceId} brainName={data.brain.name} />}
          {tab === "costs" && <UsagePanel data={data} />}
        </>}
      </div></main>
    </div>
    {editor && <PostEditor key={editor.post.id} post={editor.post} busy={busy} error={error} onClose={() => { if (!busy) setEditor(null); }} onSave={(p, approved) => void save(p, editor.revision, approved)} />}
    {publishing && campaign && <PublishDialog workspaceId={workspaceId} campaign={campaign} post={publishing} onClose={() => setPublishing(null)} onDone={() => { setPublishing(null); setTab("socials"); }} />}
  </div>;
}
function CreateCampaign({ brief, onChange, busy, data, onCreate, onClose }: { brief: CampaignBrief; onChange: (v: CampaignBrief) => void; busy: boolean; data: MarketingOverview; onCreate: () => Promise<void>; onClose: () => void }) {
  const change = <K extends keyof CampaignBrief>(key: K, value: CampaignBrief[K]) => onChange({ ...brief, [key]: value });
  const valid = campaignBriefSchema.safeParse(brief).success && data.configured && data.brain.ready && data.brain.access;
  return <section className={s.panel}><div className={s.intro}><p className={s.muted}>Brain: {data.brain.name}</p><h1 className={s.title}>Çka do me arrit këtë muaj?</h1><p>Ti jep fokusin. Maro e lidh me zërin, audiencën dhe identitetin e brendit.</p></div><form className={s.form} onSubmit={e => { e.preventDefault(); if (valid && !busy) void onCreate(); }}>
    {!data.brain.ready || !data.brain.access ? <p className={s.inlineError}>Plotëso emrin dhe përshkrimin në <Link href="/brain" className={s.links}>maroBrain</Link>. Brain kërkon plan aktiv.</p> : null}
    {!data.configured && <p className={s.inlineError}>API i marketingut ende nuk është aktiv.</p>}
    <Field label="Emri i fushatës"><Input value={brief.title} maxLength={120} required disabled={busy} placeholder="P.sh. Lansimi i koleksionit të ri" onChange={e => change("title", e.target.value)} /></Field>
    <Field label="Fokusi" hint="Produkti, shërbimi, app-i ose mesazhi që do ta promovosh."><Textarea value={brief.focus} minLength={8} maxLength={1600} required disabled={busy} placeholder="Çka ofron dhe pse i duhet audiencës tënde?" onChange={e => change("focus", e.target.value)} /></Field>
    <div className={s.columns}><Field label="Qëllimi"><Select value={brief.goal} disabled={busy} onChange={e => change("goal", e.target.value as CampaignBrief["goal"])}><option value="sales">Shitje / kërkesa</option><option value="awareness">Njohje e brendit</option><option value="engagement">Biseda & komunitet</option><option value="launch">Lansim</option></Select></Field><Field label="Gjuha e postimeve"><Select value={brief.language} disabled={busy} onChange={e => change("language", e.target.value as "sq" | "en")}><option value="sq">Shqip</option><option value="en">English</option></Select></Field></div>
    <fieldset><legend>Ku do të postosh?</legend><div className={s.chips}>{platforms.filter(p => !["reddit", "snapchat"].includes(p)).map(p => <Button key={p} disabled={busy} variant={brief.channels.includes(p) ? "brand" : "secondary"} aria-pressed={brief.channels.includes(p)} onClick={() => change("channels", brief.channels.includes(p) ? brief.channels.filter(c => c !== p) : [...brief.channels, p])}>{platformNames[p]}</Button>)}</div></fieldset>
    <details className={s.details}><summary>Oferta & orari</summary><div className={s.form}><Field label="Ofertë reale" optional><Input value={brief.offer} maxLength={600} disabled={busy} placeholder="Vetëm nëse ke një ofertë aktive" onChange={e => change("offer", e.target.value)} /></Field><div className={s.columns}><Field label="Data e fillimit"><Input type="date" value={brief.startDate} min={localDate()} required disabled={busy} onChange={e => change("startDate", e.target.value)} /></Field><Field label="Shtrirja e planit"><Select value={brief.days} disabled={busy} onChange={e => change("days", Number(e.target.value) as 14 | 30)}><option value={30}>30 ditë · 9 poste</option><option value={14}>14 ditë · 9 poste</option></Select></Field></div></div></details>
    <div className={s.research}><div><strong>Hulumtim aktual</strong><p className={s.muted}>Një kërkim në web për fushatën, me burime dhe datë kontrolli. Rreth $0.01 shtesë plus tokenat. Pa këtë opsion, plani bazohet në Brain dhe brief.</p></div><Switch checked={brief.liveResearch} disabled={busy} onChange={v => change("liveResearch", v)} aria-label="Hulumtim aktual në web" /></div>
    <p className={s.muted}>Kostoja e tekstit regjistrohet në Përdorimi. Imazhet gjenerohen veçmas, kur ti vendos.</p><div className={s.actions}><Button variant="brand" type="submit" disabled={!valid} loading={busy}><Sparkles size={18} />{busy ? "Po përgatitet plani…" : "Krijo 9 postimet"}</Button><Button variant="ghost" disabled={busy} onClick={onClose}>Anulo</Button></div>
  </form></section>;
}
function PostEditor({ post, busy, error, onClose, onSave }: { post: MarketingPost; busy: boolean; error: string; onClose: () => void; onSave: (post: MarketingPost, approved: boolean) => void }) {
  const [draft, setDraft] = React.useState(post), [copied, setCopied] = React.useState(false);
  const change = <K extends keyof MarketingPost>(key: K, value: MarketingPost[K]) => setDraft(p => ({ ...p, [key]: value }));
  return <Modal open onClose={onClose} size="lg" aria-label="Rishiko postimin"><div className={s.modal}><h2>Rishiko postimin {post.slot + 1}</h2>{post.assetUrl && <img src={post.assetUrl} alt={post.title} />}{error && <p className={s.inlineError} role="alert">{error}</p>}<Field label="Titulli"><Input disabled={busy} value={draft.title} maxLength={100} onChange={e => change("title", e.target.value)} /></Field><Field label="Hook"><Textarea disabled={busy} value={draft.hook} maxLength={240} onChange={e => change("hook", e.target.value)} /></Field><Field label="Përshkrimi"><Textarea disabled={busy} value={draft.caption} maxLength={2000} onChange={e => change("caption", e.target.value)} /></Field><Field label="CTA"><Input disabled={busy} value={draft.cta} maxLength={180} onChange={e => change("cta", e.target.value)} /></Field><details className={s.details}><summary>Drejtimi vizual & qëllimi</summary><div className={s.form}><Field label="Drejtimi për imazhin"><Textarea disabled={busy} value={draft.visual} maxLength={1600} onChange={e => change("visual", e.target.value)} /></Field><p className={s.muted}>{draft.purpose} · Matja: {draft.metric}</p><p className={s.muted}>Ndryshimi i drejtimit vlen për gjenerimin e ardhshëm. Imazhi aktual mbetet deri sa ta zëvendësosh në studio.</p></div></details><div className={s.columns}><Field label="Data"><Input type="date" disabled={busy} value={draft.date} onChange={e => change("date", e.target.value)} /></Field><Field label="Ora · Europe/Berlin"><Input type="time" disabled={busy} value={draft.time} onChange={e => change("time", e.target.value)} /></Field></div><Field label="Rrjeti"><Select disabled={busy} value={draft.channel} onChange={e => change("channel", e.target.value as MarketingPost["channel"])}>{platforms.map(p => <option key={p} value={p}>{platformNames[p]}</option>)}</Select></Field><div className={s.actions}><Button variant="brand" loading={busy} disabled={!draft.title.trim() || !draft.hook.trim() || !draft.caption.trim()} onClick={() => onSave(draft, true)}><Check size={16} />Mirato</Button><Button variant="secondary" disabled={busy} onClick={() => onSave(draft, false)}>Ruaj draft</Button><Button variant="ghost" disabled={busy} onClick={async () => { try { await navigator.clipboard.writeText([draft.hook, draft.caption, draft.cta].filter(Boolean).join("\n\n")); setCopied(true); } catch { setCopied(false); } }}><Copy size={16} />{copied ? "U kopjua" : "Kopjo tekstin"}</Button></div><p className={s.muted}>Miratimi ruan këtë version. Publikimin ose orarin e zgjedh në hapin tjetër.</p></div></Modal>;
}
function UsagePanel({ data }: { data: MarketingOverview }) {
  const u = data.usage;
  return <><section className={s.panel}><h1 className={s.title}>Përdorimi i {data.brain.name}</h1><p className={s.muted}>{u.monthKey} · Kosto në USD, sipas përdorimit të regjistruar. Vlerësimet krahasohen me faturën e ofruesit.</p><div className={s.metrics}><div><span>Tekst + hulumtim</span><strong>{money(u.estimated)}</strong></div><div><span>Imazhet e Marketingut</span><strong>{money(u.images.usd)}</strong></div><div><span>Gjithsej të regjistruara</span><strong>{money(u.estimated + u.images.usd)}</strong></div></div><div className={s.tableWrap}><table className={s.table}><tbody><tr><th>Fushata këtë muaj</th><td>{u.campaigns}</td></tr><tr><th>Tokena input / output</th><td>{u.inputTokens.toLocaleString()} / {u.outputTokens.toLocaleString()}</td></tr><tr><th>Kërkime web</th><td>{u.searches}</td></tr><tr><th>Imazhe të përfunduara</th><td>{u.images.count}</td></tr><tr><th>Kufi i tekstit për llogarinë</th><td>{money(u.day)} / ${u.dailyLimit} sot · {money(u.month)} / ${u.monthlyLimit} këtë muaj</td></tr><tr><th>Rezervime pa konfirmim</th><td>{u.uncertain} fushata · {u.images.unknown} gjenerime imazhesh</td></tr></tbody></table></div><p className={s.muted}>Kufijtë $2/ditë dhe $10/muaj mbulojnë tekstin dhe hulumtimin në të gjithë Brain-at e pilotit. Kërkesat pa konfirmim mbajnë rezervimin $0.10 derisa të verifikohen; nuk paraqiten si falas. Imazhet ndjekin credits dhe kufijtë ekzistues të gjenerimit.</p></section><section className={s.panel}><h2>Sa kushton një fushatë?</h2><p className={s.strategy}>Teksti: GPT-6 Luna · $0.10 / 1M input, $0.01 / 1M input i ruajtur në cache dhe $0.50 / 1M output. Shembull: 10,000 input + 4,000 output ≈ $0.003, ose rreth $0.013 me një kërkim web. Përmbajtja reale dhe imazhet ndryshojnë sipas përdorimit.</p><p className={s.muted}>Imazhet: studio-t përdorin Flare dhe koston sipas tokenave të imazhit. Paketa aktuale mbetet 50 credits për 9 imazhe; ky është çmimi në platformë. Nuk është kostoja e API-së. Historia e fushatave tregon veçmas koston e çdo plani.</p><p className={s.muted}><a href="https://developers.openai.com/api/docs/models/gpt-6-luna" target="_blank" rel="noopener noreferrer" className={s.links}>Modeli</a> · <a href="https://developers.openai.com/api/docs/pricing" target="_blank" rel="noopener noreferrer" className={s.links}>Çmimet OpenAI</a> · Verifikuar më 26 tetor 2026.</p></section><SocialCostGuide /></>;
}
function exportCampaign(campaign: MarketingCampaign) {
  const quote = (value: string) => '"' + (/^[=+@\-\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""') + '"';
  const rows = [["Data", "Ora Europe/Berlin", "Rrjeti", "Titulli", "Hook", "Përshkrimi", "CTA", "Drejtimi vizual", "Statusi"], ...(campaign.plan?.posts ?? []).map(p => [p.date, p.time, platformNames[p.channel], p.title, p.hook, p.caption, p.cta, p.visual, p.status])];
  const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(r => r.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `maroMarketing-${campaign.id}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}

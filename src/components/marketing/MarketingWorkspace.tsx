"use client";
/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import Link from "next/link";
import { CalendarDays, Image as ImageIcon, Plus, ArrowUpRight, Copy, Check, Sparkles, ArrowLeft } from "lucide-react";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Field } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { ProductLogo } from "@/components/ui/ProductLogo";
import { UpcomingProductPage } from "@/components/modules/UpcomingProductPage";
import { MarketingImages } from "./MarketingImages";
import { canUseMarketing, platforms, platformNames, localDate, campaignBriefSchema, type CampaignBrief, type MarketingCampaign, type MarketingPost } from "@/lib/marketing/model";
import { marketingJson, marketingMessage } from "@/lib/marketing/client";
import { MarketingSocials, PublishDialog, SocialCostGuide } from "./MarketingSocials";
import b from "@/components/modules/BrainStudio.module.css";
import s from "./MarketingWorkspace.module.css";

type HistoryItem = Pick<MarketingCampaign, "id" | "brand" | "brief" | "status" | "created_at" | "estimated_usd">;
export type MarketingOverview = { configured: boolean; socialsConfigured: boolean; model: string; campaigns: HistoryItem[]; brain: { name: string; description: string; audience: string; ready: boolean; access: boolean }; usage: { month: number; day: number; workspace: number; estimated: number; uncertain: number; inputTokens: number; outputTokens: number; searches: number; campaigns: number; dailyLimit: number; monthlyLimit: number; monthKey: string; images: { count: number; usd: number; unknown: number; credits: number } } };
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
  const [page, setPage] = React.useState<"posts" | "socials" | "costs">("posts");
  const [data, setData] = React.useState<MarketingOverview | null>(null), [campaign, setCampaign] = React.useState<MarketingCampaign | null>(null);
  const [creating, setCreating] = React.useState(false), [brief, setBrief] = React.useState(initialBrief), [busy, setBusy] = React.useState(false), [imagesBusy, setImagesBusy] = React.useState(false), [error, setError] = React.useState("");
  const [editor, setEditor] = React.useState<{ post: MarketingPost; revision: number } | null>(null), [publishing, setPublishing] = React.useState<MarketingPost | null>(null);
  const alive = React.useRef(true), lock = React.useRef(false), requestId = React.useRef(""), current = React.useRef(campaign);
  current.current = campaign;
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const overview = React.useCallback(async () => {
    const result = await marketingJson<MarketingOverview>(`/api/marketing?workspaceId=${encodeURIComponent(workspaceId)}`);
    if (alive.current) setData(result); return result;
  }, [workspaceId]);
  const open = React.useCallback(async (id: string) => {
    const result = await marketingJson<{ campaign: MarketingCampaign }>(`/api/marketing?workspaceId=${encodeURIComponent(workspaceId)}&campaignId=${id}`);
    if (alive.current) { current.current = result.campaign; setCampaign(result.campaign); setCreating(false); const url = new URL(window.location.href); url.searchParams.set("campaign", id); window.history.replaceState(null, "", url); }
    return result.campaign;
  }, [workspaceId]);
  React.useEffect(() => {
    void (async () => { try { const d = await overview(); const requested = new URL(window.location.href).searchParams.get("campaign"); const id = d.campaigns.find(c => c.id === requested)?.id ?? d.campaigns[0]?.id; if (id && alive.current) await open(id); } catch (e) { if (alive.current) setError(marketingMessage((e as Error).message)); } })();
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
  function newCampaign() { setCreating(true); setBrief(initialBrief()); requestId.current = ""; setPage("posts"); setError(""); }
  async function create() {
    await run(async () => {
      const id = requestId.current ||= crypto.randomUUID();
      const submitted = { ...brief, title: brief.title.trim() || brief.focus.trim().split("\n")[0].slice(0, 100) };
      try { const result = await marketingJson<{ campaign: MarketingCampaign }>("/api/marketing", { workspaceId, requestId: id, brief: submitted }); if (alive.current) { current.current = result.campaign; setCampaign(result.campaign); setCreating(false); } requestId.current = ""; await open(result.campaign.id); }
      catch (e) { try { await open(id); requestId.current = ""; } catch { /* Retain the same id for a lost response. */ } throw e; }
      finally { await overview(); }
    });
  }
  async function save(post: MarketingPost, revision: number, approved: boolean) {
    await run(async () => {
      if (!campaign) return;
      const { title, hook, caption, cta, visual, date, time, channel } = post;
      const result = await marketingJson<{ campaign: MarketingCampaign }>("/api/marketing/action", { action: "edit", workspaceId, campaignId: campaign.id, revision, postId: post.id, post: { title, hook, caption, cta, visual, date, time, channel, status: approved ? "approved" : "draft" } });
      if (alive.current) { current.current = result.campaign; setCampaign(result.campaign); setEditor(null); }
    });
  }
  const importImages = React.useCallback(async (feedId: string, studio: "feed" | "apps") => {
    let selected = current.current; if (!selected) return;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await marketingJson<{ campaign: MarketingCampaign }>("/api/marketing/action", { action: "import", workspaceId, campaignId: selected.id, revision: selected.revision, feedId, studio });
        if (alive.current) { current.current = result.campaign; setCampaign(result.campaign); } return;
      } catch (e) { if ((e as Error).message !== "campaign_conflict" || attempt) throw e; selected = await open(selected.id); }
    }
  }, [workspaceId, open]);
  const posts = campaign?.plan?.posts ?? [], done = posts.filter(p => p.assetRef).length, blocked = busy || imagesBusy;
  return <div className={`${b.studio} ${s.studio} ${s.simpleStudio}`} data-marketing-studio="true">
    <header className={s.heading}><div className={s.brand}><ProductLogo product="marketing" naturalWidth /><span className={s.badge}>Pilot</span></div><div className={s.actions}><label className={s.brainPicker}><span className={s.srOnly}>Brain aktiv</span><select className="maro-input" aria-label="Brain aktiv" value={workspaceId} disabled={blocked} onChange={e => void run(async () => { await setActiveWorkspace(e.target.value); })}>{workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label><Button variant="secondary" disabled={blocked} onClick={newCampaign}><Plus size={16} />Fushatë e re</Button></div></header>
    <main className={s.stack}>
      {error && <div className={s.inlineError} role="alert">{error}</div>}
      {!data ? <div className={s.empty} role="status"><h2>Duke hapur postimet…</h2>{error && <Button variant="secondary" onClick={() => void run(async () => { await overview(); })}>Provo përsëri</Button>}</div> : page !== "posts" ? <><div><Button variant="ghost" onClick={() => setPage("posts")}><ArrowLeft size={16} />Te postimet</Button></div>{page === "socials" ? <MarketingSocials workspaceId={workspaceId} brainName={data.brain.name} /> : <UsagePanel data={data} />}</> : creating ? <CreateCampaign brief={brief} onChange={v => { setBrief(v); requestId.current = ""; }} busy={busy} data={data} onCreate={create} onClose={() => setCreating(false)} /> : campaign ? <>
        <div className={s.campaignHeading}><div><p className={s.muted}>{campaign.brand} · {dateLabel(campaign.brief.startDate)} · {campaign.brief.days} ditë</p><h1 className={s.title}>{campaign.brief.title}</h1></div>{campaign.plan && <MarketingImages key={campaign.id} workspaceId={workspaceId} campaignId={campaign.id} count={done} onImport={importImages} onBusyChange={setImagesBusy} />}</div>
        {campaign.plan ? <>
          <div className={s.postGrid}>{posts.map(p => <article className={s.post} key={p.id}><button type="button" className={s.postOpen} aria-label={`Hap postimin ${p.slot + 1}: ${p.title}`} disabled={blocked} onClick={() => setEditor({ post: p, revision: campaign.revision })}>{p.assetUrl ? <img src={p.assetUrl} className={s.postImage} alt={p.title} /> : <div className={s.imagePlaceholder}><ImageIcon size={24} /><span>Imazhi {p.slot + 1}</span></div>}<div className={s.postBody}><div className={s.postMeta}><span>{dateLabel(p.date)} · {p.time}</span><span>{platformNames[p.channel]}</span></div><h2>{p.title}</h2><p className={s.clamp}>{p.hook}</p><span className={s.postFooter}>{p.status === "approved" ? "✓ Miratuar" : "Hap & ndrysho"}<ArrowUpRight size={14} /></span></div></button>{p.status === "approved" && p.assetRef && <div className={s.publishAction}><Button variant="secondary" disabled={blocked} onClick={() => setPublishing(p)}>Publiko / planifiko <ArrowUpRight size={14} /></Button></div>}</article>)}</div>
          <details className={`${s.details} ${s.planDetails}`}><summary>Detajet e planit & burimet</summary><p className={s.strategy}>{campaign.plan.strategy}</p><p className={s.muted}>{campaign.plan.researchNote.replace(/\[([^\]]+)\]\(https?:[^)]+\)/g, "$1")}</p><div className={s.sources}><ul>{campaign.plan.sources.filter((source, i, all) => all.findIndex(v => new URL(v.url).hostname === new URL(source.url).hostname) === i).map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{new URL(source.url).hostname.replace(/^www\./, "")}</a></li>)}</ul></div></details>
        </> : <div className={s.empty}><h2>{campaign.status === "generating" ? "Po përgatiten 9 postimet…" : "Plani nuk u përfundua"}</h2><p>{campaign.status === "generating" ? "Mund ta lësh këtë faqe hapur. Postimet shfaqen sapo të jenë gati." : marketingMessage(campaign.error_code || "generation_incomplete")}</p></div>}
      </> : <div className={s.empty}><CalendarDays size={28} /><h1 className={s.title}>Çka do të promovosh?</h1><p>Zgjedh fokusin. Maro e përdor Brain-in për t’i përgatitur 9 postime.</p><Button variant="brand" onClick={newCampaign}>Krijo postimet <Plus size={18} /></Button></div>}
      {data && <footer className={s.utilityBar}>{data.campaigns.length > 0 && <label className={s.historyPicker}><span className={s.srOnly}>Fushatat e ruajtura</span><select className="maro-input" aria-label="Fushatat e ruajtura" value={campaign?.id || ""} disabled={blocked} onChange={e => void run(async () => { await open(e.target.value); setPage("posts"); })}><option value="" disabled>Fushatat e ruajtura</option>{data.campaigns.map(c => <option key={c.id} value={c.id}>{c.brief.title}</option>)}</select></label>}<div className={s.actions}><Button variant="ghost" disabled={blocked} onClick={() => setPage("socials")}>Socials</Button><details className={s.more}><summary>Më shumë</summary><div className={s.moreMenu}><Button variant="ghost" disabled={blocked} onClick={() => void run(async () => { await overview(); setPage("costs"); })}>Përdorimi & kostot</Button>{campaign?.plan && <Button variant="ghost" onClick={() => exportCampaign(campaign)}>Eksporto tekstet CSV</Button>}<Link className={s.links} href="/brain">Hap maroBrain</Link><Link className={s.links} href="/feed">Hap maroFeed · pilot</Link><Link className={s.links} href="/apps">Hap maroApps · pilot</Link></div></details></div></footer>}
    </main>
    {editor && <PostEditor key={editor.post.id} post={editor.post} busy={busy} error={error} onClose={() => { if (!busy) setEditor(null); }} onSave={(p, approved) => void save(p, editor.revision, approved)} />}
    {publishing && campaign && <PublishDialog workspaceId={workspaceId} campaign={campaign} post={publishing} onClose={() => setPublishing(null)} onDone={() => { setPublishing(null); setPage("socials"); }} />}
  </div>;
}
function CreateCampaign({ brief, onChange, busy, data, onCreate, onClose }: { brief: CampaignBrief; onChange: (v: CampaignBrief) => void; busy: boolean; data: MarketingOverview; onCreate: () => Promise<void>; onClose: () => void }) {
  const change = <K extends keyof CampaignBrief>(key: K, value: CampaignBrief[K]) => onChange({ ...brief, [key]: value });
  const valid = campaignBriefSchema.safeParse({ ...brief, title: brief.title.trim() || brief.focus.trim().slice(0, 100) }).success && data.configured && data.brain.ready && data.brain.access;
  return <section className={`${s.panel} ${s.createPanel}`}><div className={s.intro}><p className={s.muted}>Brain: {data.brain.name}</p><h1 className={s.title}>Çka do të promovosh?</h1></div><form className={s.form} onSubmit={e => { e.preventDefault(); if (valid && !busy) void onCreate(); }}>
    {(!data.brain.ready || !data.brain.access) && <p className={s.inlineError}>Plotëso emrin dhe përshkrimin në <Link href="/brain" className={s.links}>maroBrain</Link>. Brain kërkon plan aktiv.</p>}
    {!data.configured && <p className={s.inlineError}>API i marketingut ende nuk është aktiv.</p>}
    <Field label="Fokusi ose oferta"><Textarea value={brief.focus} minLength={8} maxLength={1600} required disabled={busy} placeholder="P.sh. 20% zbritje për Halloween. Promovo shijet tona të reja." onChange={e => change("focus", e.target.value)} /></Field>
    <Field label="Gjuha e postimeve"><Select value={brief.language} disabled={busy} onChange={e => change("language", e.target.value as "sq" | "en")}><option value="sq">Shqip</option><option value="en">English</option></Select></Field>
    <p className={s.muted}>9 postime për {brief.days} ditë · {brief.channels.map(p => platformNames[p]).join(", ")} · {brief.liveResearch ? "me hulumtim aktual" : "nga Brain-i"}</p>
    <details className={s.details}><summary>Ndrysho rrjetet, datat ose qëllimin</summary><div className={s.form}>
      <Field label="Emri i fushatës" optional><Input value={brief.title} maxLength={120} disabled={busy} placeholder="Merret nga fokusi nëse e lë bosh" onChange={e => change("title", e.target.value)} /></Field>
      <Field label="Qëllimi"><Select value={brief.goal} disabled={busy} onChange={e => change("goal", e.target.value as CampaignBrief["goal"])}><option value="sales">Shitje / kërkesa</option><option value="awareness">Njohje e brendit</option><option value="engagement">Biseda & komunitet</option><option value="launch">Lansim</option></Select></Field>
      <fieldset><legend>Rrjetet</legend><div className={s.chips}>{platforms.filter(p => !["reddit", "snapchat"].includes(p)).map(p => <Button key={p} disabled={busy} variant={brief.channels.includes(p) ? "brand" : "secondary"} aria-pressed={brief.channels.includes(p)} onClick={() => change("channels", brief.channels.includes(p) ? brief.channels.filter(c => c !== p) : [...brief.channels, p])}>{platformNames[p]}</Button>)}</div></fieldset>
      <div className={s.columns}><Field label="Fillimi"><Input type="date" value={brief.startDate} min={localDate()} required disabled={busy} onChange={e => change("startDate", e.target.value)} /></Field><Field label="Kohëzgjatja"><Select value={brief.days} disabled={busy} onChange={e => change("days", Number(e.target.value) as 14 | 30)}><option value={30}>30 ditë</option><option value={14}>14 ditë</option></Select></Field></div>
      <Field label="Kushte shtesë të ofertës" optional><Input value={brief.offer} maxLength={600} disabled={busy} onChange={e => change("offer", e.target.value)} /></Field>
      <div className={s.research}><strong>Hulumtim aktual në web</strong><Switch checked={brief.liveResearch} disabled={busy} onChange={v => change("liveResearch", v)} aria-label="Hulumtim aktual në web" /></div>
    </div></details>
    <div className={s.actions}><Button variant="brand" type="submit" disabled={!valid} loading={busy}><Sparkles size={18} />{busy ? "Po përgatiten postimet…" : "Krijo 9 postimet"}</Button><Button variant="ghost" disabled={busy} onClick={onClose}>Anulo</Button></div>
  </form></section>;
}
function PostEditor({ post, busy, error, onClose, onSave }: { post: MarketingPost; busy: boolean; error: string; onClose: () => void; onSave: (post: MarketingPost, approved: boolean) => void }) {
  const [draft, setDraft] = React.useState(post), [copied, setCopied] = React.useState(false);
  const change = <K extends keyof MarketingPost>(key: K, value: MarketingPost[K]) => setDraft(p => ({ ...p, [key]: value }));
  return <Modal open onClose={onClose} size="lg" aria-label="Rishiko postimin"><div className={s.modal}>
    <div><p className={s.muted}>{platformNames[post.channel]} · {dateLabel(post.date)} · {post.time}</p><h2>{post.title}</h2></div>
    {post.assetUrl && <img src={post.assetUrl} alt={post.title} />}
    {error && <p className={s.inlineError} role="alert">{error}</p>}
    <Field label="Hyrja"><Textarea disabled={busy} value={draft.hook} maxLength={240} onChange={e => change("hook", e.target.value)} /></Field>
    <Field label="Përshkrimi"><Textarea disabled={busy} value={draft.caption} maxLength={2000} onChange={e => change("caption", e.target.value)} /></Field>
    <details className={s.details}><summary>CTA, orari & drejtimi i imazhit</summary><div className={s.form}>
      <Field label="Titulli"><Input disabled={busy} value={draft.title} maxLength={100} onChange={e => change("title", e.target.value)} /></Field>
      <Field label="CTA"><Input disabled={busy} value={draft.cta} maxLength={180} onChange={e => change("cta", e.target.value)} /></Field>
      <Field label="Drejtimi për imazhin"><Textarea disabled={busy} value={draft.visual} maxLength={1600} onChange={e => change("visual", e.target.value)} /></Field>
      <div className={s.columns}><Field label="Data"><Input type="date" disabled={busy} value={draft.date} onChange={e => change("date", e.target.value)} /></Field><Field label="Ora · Europe/Berlin"><Input type="time" disabled={busy} value={draft.time} onChange={e => change("time", e.target.value)} /></Field></div>
      <Field label="Rrjeti"><Select disabled={busy} value={draft.channel} onChange={e => change("channel", e.target.value as MarketingPost["channel"])}>{platforms.map(p => <option key={p} value={p}>{platformNames[p]}</option>)}</Select></Field>
      <p className={s.muted}>{draft.purpose} · {draft.metric}</p>
    </div></details>
    <div className={s.actions}><Button variant="brand" loading={busy} disabled={!draft.title.trim() || !draft.hook.trim() || !draft.caption.trim()} onClick={() => onSave(draft, true)}><Check size={16} />Mirato</Button><Button variant="secondary" disabled={busy} onClick={() => onSave(draft, false)}>Ruaj draft</Button><Button variant="ghost" disabled={busy} onClick={async () => { try { await navigator.clipboard.writeText([draft.hook, draft.caption, draft.cta].filter(Boolean).join("\n\n")); setCopied(true); } catch { setCopied(false); } }}><Copy size={16} />{copied ? "U kopjua" : "Kopjo tekstin"}</Button></div>
    <p className={s.muted}>Miratimi ruan versionin. Publikimin e zgjedh veçmas.</p>
  </div></Modal>;
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

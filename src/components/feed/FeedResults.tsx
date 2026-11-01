"use client";
/* eslint-disable @next/next/no-img-element */
import { ArrowDownToLine, Check, Image as ImageIcon, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { feedFormats } from "@/lib/feed/campaign";
import type { FeedHistoryItem, FeedView } from "@/lib/feed/model";
import { FeedElapsed } from "./FeedPreparation";
import b from "@/components/modules/BrainStudio.module.css";
import s from "./FeedWorkspace.module.css";

export function FeedResults({ feed, history, working, activeSlot, downloading, cancelling, open, download, resume, cancel, choose, library, prepare }: {
  feed: FeedView | null; history: FeedHistoryItem[]; working: boolean; activeSlot: number | null; downloading: boolean; cancelling: boolean;
  open: (slot: number) => void; download: (slot?: number) => void; resume: () => void; cancel: () => void; choose: (id: string) => void; library: () => void; prepare: () => void;
}) {
  if (!feed) return <section className={b.editor}><div className={b.empty}><ImageIcon size={24} /><h3>Zgjedh ose krijo një feed.</h3><Button variant="brand" onClick={prepare}>Përgatite feed-in</Button></div></section>;
  const done = feed.tiles.filter(tile => tile.url).length, complete = done === 9, free = Math.max(0, 3 - feed.freeUsed);
  const stopped = feed.refunded || feed.cancelled || feed.cancelRequested;
  const active = activeSlot ?? feed.active?.slot;
  const regenerating = active !== undefined && Boolean(feed.tiles[active]?.url);
  const title = feed.cancelled || feed.refunded ? "Feed-i u ndal" : feed.cancelRequested ? "Po përfundon imazhi aktual" : working ? regenerating ? `Po rigjenerohet postimi ${active! + 1}` : `Po krijohet postimi ${(active ?? done) + 1} nga 9` : complete ? "Feed-i është gati" : "Vazhdo aty ku mbete";
  const detail = feed.cancelled ? `${50 - feed.refundCredits} credits u përdorën. ${feed.refundCredits} u kthyen.` : feed.refunded ? "Kreditet e feed-it u kthyen." : feed.cancelRequested ? "Postime të tjera nuk nisen. Pjesa e papërdorur kthehet pas përfundimit." : working ? "Çdo imazh ruhet sapo të jetë gati. Mund t’i hapësh dhe shkarkosh ato që kanë përfunduar." : complete ? free ? `${free} rigjenerime falas të mbetura; pastaj 5 credits secili.` : "Rigjenerimi kushton 5 credits për imazh." : `${done} imazhe janë ruajtur. Vazhdo pjesën e mbetur pa pagesë shtesë.`;
  return <section className={b.editor} aria-label="Feed-i me nëntë postime">
    <div className={s.feedPicker}><Button variant="ghost" size="sm" disabled={working} onClick={library}>← Feed-at e tu</Button><label className={b.field}><span>Feed-i i zgjedhur</span><select className="maro-input" value={feed.id} disabled={working} onChange={event => choose(event.target.value)}>{history.map(item => <option key={item.id} value={item.id}>{item.name || item.brand} · {new Intl.DateTimeFormat("sq", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))}</option>)}</select></label></div>
    <div className={b.sectionHeading}><div><h2>{feed.design?.name || feed.brand}</h2><p>{feed.brand} · {feedFormats[feed.design?.format ?? "1:1"]} · {feed.textMode ? "Me tekst" : "Pa tekst"}</p></div><Button size="sm" variant="secondary" disabled={working} onClick={prepare}>Feed i ri</Button></div>
    <div className={s.resultStatus} role="status"><div><strong>{title}</strong><p>{detail}</p></div><span>{done}<small>/9</small></span></div>
    {!complete && <div className={`${b.progress} ${s.feedProgress}`} role="progressbar" aria-label="Postimet e përfunduara" aria-valuenow={done} aria-valuemin={0} aria-valuemax={9}><span style={{ width: `${done / 9 * 100}%` }} /></div>}
    <div className={s.grid}>{feed.tiles.map(tile => <article key={tile.slot} className={`${b.sourceCard} ${s.tile}`} data-working={active === tile.slot && working}>
      <button type="button" className={s.openTile} onClick={() => open(tile.slot)} disabled={!tile.url} aria-label={`${tile.slot + 1}. ${tile.title}${tile.url ? ", hape imazhin" : ", ende pa u krijuar"}`}>
        <span className={s.tileImage} style={{ aspectRatio: (feed.design?.format ?? "1:1").replace(":", "/") }}>{tile.url ? <img src={tile.url} alt={`${feed.brand} · ${tile.title}`} /> : <ImageIcon size={28} strokeWidth={1.5} aria-hidden="true" />}{active === tile.slot && working && <span className={s.tileOverlay}><LoaderCircle className={s.spin} size={24} /><strong>{regenerating ? "Po rigjenerohet…" : "Po gjenerohet…"}</strong><FeedElapsed startedAt={feed.active ? new Date(feed.active.startedAt).getTime() : undefined} /></span>}</span>
        <span className={s.tileInfo}><strong>{String(tile.slot + 1).padStart(2, "0")} · {tile.title}</strong><span>{tile.url ? <><Check size={12} />{tile.version > 1 ? `v${tile.version}` : "Gati"}</> : active === tile.slot && working ? "Në punë" : "Në pritje"}</span></span>
      </button>
      {tile.url && <div className={s.tileActions}><Button type="button" variant="ghost" size="sm" disabled={downloading} onClick={() => download(tile.slot)} aria-label={`Shkarko postimin ${tile.slot + 1}`} icon={<ArrowDownToLine size={14} />}><span className={s.tileActionLabel}>PNG</span></Button>{complete && !stopped && <Button type="button" variant="ghost" size="sm" disabled={working} onClick={() => open(tile.slot)} aria-label={`Ndrysho postimin ${tile.slot + 1}`} icon={<RefreshCw size={14} />}><span className={s.tileActionLabel}>Ndrysho</span></Button>}</div>}
    </article>)}</div>
    <div className={s.feedActions}>{done > 0 && <Button variant="primary" disabled={downloading} onClick={() => download()} icon={<ArrowDownToLine size={16} />}>{downloading ? "Po përgatitet…" : `Shkarko ${done} imazhet · ZIP`}</Button>}{!complete && !stopped && <Button variant="brand" disabled={working} onClick={resume} icon={<Sparkles size={16} />}>Vazhdo feed-in · pa pagesë shtesë</Button>}</div>
    {!complete && !stopped && <div className={s.cancelRow}><p className={b.hint}>Në ndalim përdoren 5 credits për nisjen + 5 për çdo imazh të përfunduar.</p><Button variant="secondary" disabled={cancelling} loading={cancelling} onClick={cancel}>{working ? "Ndalo pas imazhit aktual" : "Ndalo feed-in"}</Button></div>}
  </section>;
}

export function FeedLibrary({ items, selected, loading, working, open, prepare }: { items: FeedHistoryItem[]; selected?: string; loading: boolean; working: boolean; open: (id: string) => void; prepare: () => void }) {
  return <section className={b.editor} aria-label="Historiku i feed-ave"><div className={b.sectionHeading}><div><h2>Feed-at e tu</h2><p>Zgjedh fushatën që dëshiron me vazhdu ose shkarku.</p></div><Button variant="secondary" size="sm" disabled={working} onClick={prepare}>Feed i ri</Button></div>
    {loading ? <p className={b.hint} role="status">Duke hapur feed-at…</p> : items.length ? <div className={s.feedLibrary}>{items.map(item => <button type="button" key={item.id} disabled={working} aria-pressed={item.id === selected} onClick={() => open(item.id)}>{item.cover ? <img className={s.libraryCover} src={item.cover} alt="" loading="lazy" /> : <span className={s.libraryPlaceholder}><ImageIcon size={24} /></span>}<div><strong>{item.name || item.brand}</strong><p>{item.brand} · {item.format ?? "1:1"}</p><span>{new Intl.DateTimeFormat("sq", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))}</span><small>{item.cancelled || item.refunded ? "U ndal" : item.running ? "Po gjenerohet" : item.done === 9 ? "Gati" : item.done !== undefined ? "Mund të vazhdosh" : "Hape feed-in"}{item.done !== undefined ? ` · ${item.done}/9` : ""}</small></div></button>)}</div> : <div className={b.empty}><ImageIcon size={28} /><h3>Ende nuk ke krijuar feed.</h3><p>Feed-at dhe progresin do t’i gjesh këtu.</p><Button variant="brand" onClick={prepare}>Përgatite feed-in e parë</Button></div>}
  </section>;
}

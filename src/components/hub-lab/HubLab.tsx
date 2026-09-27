"use client";

import { MARO_FORT_ENABLED } from "@/lib/shadow/maroFort";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MotionConfig } from "framer-motion";
import { AppUserMenu } from "@/components/app/AppUserMenu";
import { MaroSymbol } from "@/components/ui/Logo";
import { HUB_TOOLS } from "@/components/hub/hubTools";
import { toolIconSrc } from "@/lib/tools/iconMap";
import { formatCredits } from "@/lib/credits/format";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { BrandMark, CoffeeArtwork, WebsiteArtwork } from "./BrandArtwork";
import { BrandStory, BrainStory, FortStory } from "./ProductStory";
import s from "./HubLab.module.css";

const descriptions: Record<string, { title: string; copy: string; verb: string }> = {
  imazh: { title: "Imazhe që ndalin shikimin.", copy: "Nga ideja te vizuali i radhës.", verb: "Krijo imazh" },
  logo: { title: "Një shenjë. Krejt karakteri.", copy: "Logo dhe identitet, hap pas hapi.", verb: "Krijo identitet" },
  web: { title: "Vendi yt në internet.", copy: "Përshkruaje. Ndërtoje. Bëje tënden.", verb: "Krijo website" },
};
const liveTools = HUB_TOOLS.filter(t => !("locked" in t && t.locked));

function QuickLauncher({ dialogRef }: { dialogRef: React.RefObject<HTMLDialogElement | null> }) {
  const [query, setQuery] = useState("");
  const results = liveTools.filter(t => `${t.label} ${descriptions[t.id].verb}`.toLowerCase().includes(query.toLowerCase()));
  return <dialog ref={dialogRef} className={s.command} aria-label="Kërko mjetet e Maro" onClick={e => { if (e.target === e.currentTarget) dialogRef.current?.close(); }} onClose={() => setQuery("")}>
    <div className={s.commandHead}><label htmlFor="hub-search">Çka po don me kriju?</label><button onClick={() => dialogRef.current?.close()} aria-label="Mbyll kërkimin">Esc</button></div>
    <input id="hub-search" autoFocus placeholder="Kërko një mjet…" value={query} onChange={e => setQuery(e.target.value)} />
    <nav aria-label="Rezultatet e kërkimit">{results.map(t => <Link key={t.id} href={t.href} prefetch={false}>{t.label}<span>{descriptions[t.id].verb} ↗</span></Link>)}</nav>
    {!results.length && <p>Asnjë mjet. Provo “web”, “logo” ose “imazh”.</p>}
    <small>Tab për të zgjedhë · Enter për të hapë</small>
  </dialog>;
}

export function HubLab() {
  const { user, ready, credits, projects } = useMaro();
  const { activeWorkspace } = useWorkspace();
  const [selected, setSelected] = useState("imazh");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const recent = ready ? [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] : undefined;

  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialogRef.current?.open) dialogRef.current.close();
        else dialogRef.current?.showModal();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  return <MotionConfig reducedMotion="user"><div className={s.lab}>
    <a href="#krijo" className={s.skip}>Kalo te mjetet</a>
    <header className={s.header}>
      <a href="#krijo" className={s.wordmark} aria-label="Maro HUB"><MaroSymbol /><strong>maro</strong><span>HUB</span></a>
      <nav className={s.nav} aria-label="Navigimi i HUB"><a href="#krijo" aria-current="page">Krijo</a><a href="#nje-ide">Zbulo Maro</a><Link href="/krijimet" prefetch={false}>Krijimet e mia</Link></nav>
      <div className={s.account}>{ready && user && <Link className={s.credits} href="/pricing" prefetch={false} aria-label={`${formatCredits(credits)} kredite`}>{formatCredits(credits)} <span>kredite</span></Link>}<AppUserMenu /></div>
    </header>

    <main>
      <section id="krijo" className={s.launcher} aria-labelledby="launcher-title">
        <div className={s.eyebrow}><span><i /> HAPËSIRA JOTE KREATIVE{ready && user ? ` / ${user.name.split(" ")[0]}` : ""}</span><Link href="/" prefetch={false}>HUB origjinal ↗</Link></div>
        <div className={s.intro}><div><h1 id="launcher-title">Çka po krijojmë sot<span>?</span></h1><p>Nis me një ide. Zgjidhe mjetin. Maroje.</p></div><button className={s.searchButton} onClick={() => dialogRef.current?.showModal()} aria-label="Hap kërkimin e mjeteve"><span>Kërko një mjet</span><kbd>Ctrl K</kbd></button></div>
        <div className={s.toolDeck} data-selected={selected}>
          {liveTools.map((tool, index) => <Link className={`${s.tool} ${s[tool.id]}`} href={tool.href} prefetch={false} key={tool.id} onPointerEnter={() => setSelected(tool.id)} onFocus={() => setSelected(tool.id)} aria-label={`${tool.label}: ${descriptions[tool.id].verb}`}>
            <div className={s.toolTop}><span><img src={toolIconSrc(tool.toolId)} alt="" />{tool.label}</span><span className={s.toolIndex}>0{index + 1} / ↗</span></div>
            <div className={s.toolArtwork}>{tool.id === "imazh" ? <CoffeeArtwork /> : tool.id === "logo" ? <div className={s.logoArt}><span>STUDIM IDENTITETI / 01</span><BrandMark /><strong>ditë.</strong><span>PAK SHKRONJA. SHUMË KARAKTER.</span></div> : <WebsiteArtwork />}</div>
            <div className={s.toolBottom}><h2>{descriptions[tool.id].title}</h2><p>{descriptions[tool.id].copy}</p><span className={s.toolAction}>{descriptions[tool.id].verb}<span>↗</span></span></div>
          </Link>)}
        </div>
        <div className={s.utilityRow}><div className={s.upcoming}>{HUB_TOOLS.filter(t => "locked" in t && t.locked).map(t => <span key={t.id}><img src={toolIconSrc(t.toolId)} alt="" />{t.label}<small>Së shpejti</small></span>)}</div><Link href="/prompts" prefetch={false}>S’ke ide? Provo maroPresets <span>↗</span></Link></div>
        <div className={s.contextRow}>{recent ? <Link href={`/projects/${recent.id}`} prefetch={false}><span>VAZHDO KU E LE</span><strong>{recent.name}</strong><span>↗</span></Link> : <p><span>HAPËSIRA</span> {activeWorkspace?.name ?? "Ideja jote e radhës nis këtu."}</p>}<a href="#nje-ide">Një ide mundet me shku ma larg <span>↓</span></a></div>
      </section>
      <BrandStory />
      <BrainStory />
      {MARO_FORT_ENABLED && <FortStory />}
      <section className={s.finale} aria-labelledby="finale-title"><div className={s.eyebrow}><span>RADHA JOTE</span><span>PREJ IDESË TE REZULTATI</span></div><h2 id="finale-title">Mirë. Tash<br /><span>maroje tënden.</span></h2><a href="#krijo" className={s.finalCta}>Kthehu te mjetet <span>↗</span></a><div className={s.finalRule}><MaroSymbol /><span>Një vend për krejt çka po vjen.</span></div></section>
    </main>
    <footer className={s.footer}><span>maro / laboratori kreativ</span><span>Prototip lokal · Pamjet “ditë.” janë demonstrim.</span><Link href="/" prefetch={false}>Krahaso me HUB-in origjinal ↗</Link></footer>
    <QuickLauncher dialogRef={dialogRef} />
  </div></MotionConfig>;
}

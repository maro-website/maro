"use client";
/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight, Grid3X3 } from "lucide-react";
import type { PrivateImageAttachment } from "@/lib/services/privateImageAttachment";
import type { FeedDesign } from "@/lib/feed/campaign";
import s from "./FeedWorkspace.module.css";

export function FeedHero({ attachments, design }: { attachments: PrivateImageAttachment[]; design: FeedDesign }) {
  return <header className={s.feedHero}>
    <div className={s.heroCopy}><p className={s.heroEyebrow}><Grid3X3 size={16} /> maroFeed <span>Social studio</span></p><h1>Një brend.<br /><span>Nëntë ide që lidhen.</span></h1><p>Produkte të ndryshme. Një identitet i qartë. Jepi feed-it tënd ritmin që e meriton.</p><div className={s.heroTags}><span>9 postime</span><span>Stil i përbashkët</span><span>Produkte në fokus <ArrowUpRight size={12} /></span></div></div>
    <div className={s.heroBoard} aria-label="Ilustrim i planit të kampanjës, jo imazhe të gjeneruara">{Array.from({ length: 9 }, (_, i) => {
      const images = (design.assignments[i] ?? []).map(index => attachments[index]).filter(image => image?.previewUrl);
      return <div key={i} data-tone={i % 3}><small>{String(i + 1).padStart(2, "0")}</small>{images.length ? <span className={s.heroProducts}>{images.map(image => <img key={image.id} src={image.previewUrl!} alt="" style={{ width: `${100 / images.length}%` }} />)}</span> : i % 3 === 1 ? <strong>Aa.</strong> : i % 3 === 0 ? <Grid3X3 size={28} strokeWidth={1} /> : <span className={s.heroShape} />}<span className={s.boardCaption}>{images.length > 1 ? "Koleksioni" : ["Produkti", "Perspektiva", "Detajet"][i % 3]}</span></div>;
    })}</div>
  </header>;
}

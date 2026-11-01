"use client";
/* eslint-disable @next/next/no-img-element */
import { Grid3X3 } from "lucide-react";
import type { PrivateImageAttachment } from "@/lib/services/privateImageAttachment";
import type { FeedDesign } from "@/lib/feed/campaign";
import s from "./FeedWorkspace.module.css";

export function FeedHero({ attachments, design }: { attachments: PrivateImageAttachment[]; design: FeedDesign }) {
  const products = design.assets.filter(asset => asset.role === "product").map(asset => attachments[asset.index]).filter(item => item?.previewUrl).slice(0, 3);
  return <header className={s.studioHeader}>
    <div><p className={s.headerEyebrow}><Grid3X3 size={16} /> maroFeed</p><h1>9 postime. Një drejtim i qartë.</h1><p className={s.headerDescription}>Zgjedh produktet, trego idenë dhe krijo një feed që lidhet si fushatë.</p></div>
    <div className={s.headerMeta}>{products.length > 0 && <div className={s.headerReferences} aria-label="Referencat e zgjedhura">{products.map(item => <img key={item.id} src={item.previewUrl} alt="" />)}</div>}<span>9 imazhe <strong>50 credits</strong></span></div>
  </header>;
}

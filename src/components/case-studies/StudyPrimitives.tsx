import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { futureStudies } from "@/data/case-studies";
import s from "./CaseStudies.module.css";

export function StudyStats({ items }: { items: { value: number; label: string }[] }) {
  return <dl className={s.stats}>{items.map(({ value, label }) => <div key={label}><dt>{label}</dt><dd>{String(value).padStart(2, "0")}</dd></div>)}</dl>;
}

export function FutureStudies() {
  return <section className={s.future} aria-labelledby="future-title"><div className={s.sectionHeading}><span className={s.eyebrow}>NË VIJIM</span><h2 id="future-title">Eksperimenti vazhdon.</h2></div><div className={s.futureGrid}>{futureStudies.map((study) => <div key={study.number}><span className={s.eyebrow}>Case Study {study.number}</span><strong>{study.module}</strong><span className={s.muted}>Coming soon</span></div>)}</div></section>;
}

export function StudyFooter() {
  return <footer className={s.footer}><Link href="/">maro<span>.al</span></Link><p>Same brief. Same asset. Different intelligence.</p><Link href="/case-studies">Maro Lab <ArrowUpRight size={15} aria-hidden /></Link></footer>;
}

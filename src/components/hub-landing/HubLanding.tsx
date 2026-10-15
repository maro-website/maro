"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { getProductBrand } from "@/lib/design/maro-system";
import { getModuleAvailability } from "@/lib/modules/availability";
import { ProductLogo } from "@/components/ui/ProductLogo";
import { Logo } from "@/components/ui/Logo";
import { LEGAL_ENTITY } from "@/components/legal/legal-config";
import { FilmaPreview } from "@/components/hub-vision/FilmaPreview";
import { HubHero } from "./HubHero";
import { HubPricing } from "./HubPricing";
import { HUB_FAQS } from "./content";
import s from "./HubLanding.module.css";

const activeTools = [
  { product: "maroImazh", route: "/imazh", description: "Shkruaje idenë. Maroje imazh." },
  { product: "maroLogo", route: "/marologo", description: "Maro një logo për brendin tënd." },
  { product: "maroBrain", route: "/brain", description: "Njoftoje Maro-n me brendin tënd." },
  { product: "maroPresets", route: "/presets", description: "Zgjedhe stilin. Shto produktin tënd." },
] as const;
const footerLinks = [
  ["/legal/fair-use", "Përdorimi i drejtë"], ["/legal/terms", "Kushtet e Përdorimit"],
  ["/legal/privacy", "Politika e Privatësisë"], ["/legal/refund", "Politika e Rimbursimit"],
  ["/legal/cookies", "Politika e Cookies"], ["/pricing", "Planet & Kreditet"], ["/contact", "Kontakt"],
] as const;

export function HubFaq() {
  return <section className={s.faq} id="faq" aria-labelledby="hub-faq-title">
    <div className={s.faqIntro}><h3 id="hub-faq-title">Pyetje të shpeshta</h3><p>Për toolsat, brendin dhe planin tënd.</p><div className={s.faqContact}><span>Ke pyetje tjetër?</span><Link href="/contact">Na shkruaj <ArrowUpRight size={18} aria-hidden /></Link></div></div>
    <div className={s.faqItems}>{HUB_FAQS.map(faq => <details key={faq.question} name="hub-faq"><summary><span>{faq.question}</span><span className={s.faqToggle} aria-hidden><Plus size={18} /></span></summary><p>{faq.answer}</p></details>)}</div>
  </section>;
}

export function HubLanding() {
  return <div className={s.landing} data-hub-landing>
    <HubHero />
    <section className={`${s.section} ${s.tools}`} id="tools" aria-labelledby="hub-tools-title">
      <h2 className={s.sectionTitle} id="hub-tools-title">Çka mun me maru sot?</h2>
      <div className={s.toolGrid}>{activeTools.map(tool => {
        const brand = getProductBrand(tool.product)!;
        return <article className={s.toolCard} key={tool.product} style={{ "--hub-tool-color": brand.color } as CSSProperties} aria-labelledby={`hub-tool-${brand.moduleId}`}>
          <div className={s.toolHeading}><span className={s.toolIcon} aria-hidden><img src={brand.icon} alt="" draggable={false} /></span><h3 id={`hub-tool-${brand.moduleId}`}>{tool.product.slice(4)}</h3></div>
          <p>{tool.description}</p>
          <Link className={s.tryButton} href={tool.route} aria-label={`Provoje ${tool.product}`}><span>Provoje</span><span className={s.tryArrow} aria-hidden><ArrowRight size={18} /></span></Link>
        </article>;
      })}</div>
    </section>
    <section className={`${s.section} ${s.future}`} id="future" aria-labelledby="hub-future-title">
      <h2 className={s.sectionTitle} id="hub-future-title">Çka po marohet?</h2>
      <div className={s.futureGrid}>
        <article className={s.filmCard}><div className={s.filmPreview}><FilmaPreview /></div><div className={s.filmFooter}><ProductLogo product="maroFilma" className={s.filmLogo} /><Link href="/filma">Vjen në v2 <ArrowUpRight size={18} aria-hidden /></Link></div></article>
        <div className={s.futureList}>{(["web", "audio", "marketing"] as const).map(id => {
          const availability = getModuleAvailability(id)!;
          const brand = getProductBrand(id)!;
          return <Link key={id} className={s.futureRow} href={`/${id}`}><img src={brand.icon} alt="" draggable={false} /><span><strong>maro {id}</strong><span>Vjen në {availability.version.toLowerCase()}</span></span><ArrowUpRight size={24} aria-hidden /></Link>;
        })}</div>
      </div>
    </section>
    <section className={`${s.section} ${s.pricing}`} id="plans" aria-labelledby="hub-pricing-title"><HubPricing /><HubFaq /></section>
    <footer className={`${s.section} ${s.footer}`}>
      <div className={s.footerMain}><div className={s.footerBrand}><a href="#top" aria-label="Kthehu në ballinë"><Logo showWord className={s.footerLogo} wordClassName={s.footerLockup} /></a><p>Produkt i krijuar me dashuri nga<br /><Link className={s.niceLink} href="/contact" aria-describedby="hub-nice-tooltip">NICE.al<span className={s.niceTooltip} id="hub-nice-tooltip" role="tooltip">NICE Creative Agency sh.p.k</span></Link></p></div><nav className={s.footerLinks} aria-label="Ligjore dhe kontakt">{footerLinks.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</nav></div>
      <div className={s.footerBottom}><span>© {new Date().getFullYear()} · maro.al</span><span>NRB {LEGAL_ENTITY.nrb}</span></div>
    </footer>
  </div>;
}

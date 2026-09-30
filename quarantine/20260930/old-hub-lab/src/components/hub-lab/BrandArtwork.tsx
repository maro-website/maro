import s from "./HubLab.module.css";

/** Authored fictional brand studies, not customer work or generated results. */
export function BrandMark({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <path d="M20 74V26h22c20 0 30 9 30 24S62 74 42 74H20Z" stroke="currentColor" strokeWidth="12" />
    <path d="M47 26v48M20 50h53" stroke="currentColor" strokeWidth="5" />
    <circle cx="80" cy="20" r="7" fill="currentColor" />
  </svg>;
}

export function CoffeeArtwork({ compact = false }: { compact?: boolean }) {
  return <div className={`${s.coffeeArt} ${compact ? s.compactArt : ""}`} aria-hidden="true">
    <span className={s.orbit} /><span className={s.orbitTwo} />
    <div className={s.coffeeBag}>
      <span className={s.bagTop} />
      <span className={s.bagMeta}>PRISHTINË / PJEKJE LOKALE</span>
      <BrandMark className={s.bagMark} />
      <strong>ditë.</strong>
      <span className={s.bagBottom}>KAFE PËR DITË TË MIRA.<br />BLEND 01 · 250 g</span>
    </div>
    <span className={s.artCaption}>NJË FILLIM I MIRË.</span>
  </div>;
}

export function WebsiteArtwork() {
  return <div className={s.websiteArt} aria-hidden="true">
    <div className={s.browserBar}><span>•••</span><span>ditë / coffee studio</span><span>↗</span></div>
    <div className={s.siteNav}><strong>ditë.</strong><span>KAFE &nbsp; HISTORIA &nbsp; NA GJEJ</span></div>
    <div className={s.siteHero}><div><small>PRISHTINË, ÇDO MËNGJES.</small><strong>Një kafe.<br />Një ditë<br /><i>ma e mirë.</i></strong><span className={s.siteCta}>Njihe kafen tonë ↗</span></div><CoffeeArtwork compact /></div>
    <div className={s.siteFoot}>PJEKJE LOKALE <span>ME KUJDES, PREJ FILLIMIT.</span></div>
  </div>;
}

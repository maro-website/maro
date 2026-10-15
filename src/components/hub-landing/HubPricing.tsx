"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Lock } from "lucide-react";
import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";
import { useMaro } from "@/context/store";
import { useCommerceEntitlements } from "@/lib/commerce/useCommerceEntitlements";
import { useRaiAcceptAvailability } from "@/lib/payments/useRaiAcceptAvailability";
import { formatEur, PLAN_PACKAGES } from "@/lib/credits/money";
import { formatCredits } from "@/lib/credits/format";
import type { PricingCatalog } from "@/app/pricing/PricingClient";
import s from "./HubLanding.module.css";

type Plan = PricingCatalog["plans"][number];

/** Homepage presentation of the live catalog; existing commerce gates and routes remain authoritative. */
export function HubPricing() {
  const { user, ready } = useMaro();
  const commerce = useCommerceEntitlements();
  const entitlements = commerce.data?.entitlements;
  const purchasesEnabled = useRaiAcceptAvailability();
  const [catalog, setCatalog] = useState<PricingCatalog | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"plans" | "topup">("plans");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/commerce/catalog", { signal: controller.signal }).then(response => { if (!response.ok) throw new Error("catalog"); return response.json(); }).then((data: PricingCatalog) => { if (!controller.signal.aborted) setCatalog(data); }).catch(() => undefined).finally(() => { if (!controller.signal.aborted) setLoaded(true); });
    return () => controller.abort();
  }, []);
  const business = PLAN_PACKAGES.find(plan => plan.id === "biz");
  const plans: Plan[] = catalog && business && !catalog.plans.some(plan => plan.id === "business" || plan.id === "biz") ? [...catalog.plans, { id: "business", name: business.name, tagline: business.tagline, credits: business.credits, priceEur: business.priceEur, contactOnly: true, features: business.features.map(feature => feature.text) }] : catalog?.plans ?? [];
  const actionClass = `maro-button ${s.purchaseButton}`;
  const closed = (message: string) => <p className={s.purchaseStatus}><Lock size={14} aria-hidden />{message}</p>;

  // Keep the same availability, entitlement, renewal and upgrade decisions as /pricing.
  function planAction(plan: Plan) {
    if (!purchasesEnabled) return closed("Blerjet janë të mbyllura.");
    if (!ready) return closed("Duke ngarkuar…");
    if (!user) {
      const next = `/checkout?item=${encodeURIComponent(plan.id)}&provider=raiaccept`;
      return <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className={actionClass} data-variant="brand">Zgjedh planin<ArrowUpRight size={18} aria-hidden /></Link>;
    }
    if (commerce.loading) return closed("Duke kontrolluar planin…");
    if (commerce.error || !entitlements) return <p role="alert" className={s.purchaseStatus}>Plani nuk u ngarkua. <Link href="/pricing">Shiko planet.</Link></p>;
    let href = `/checkout?item=${encodeURIComponent(plan.id)}&provider=raiaccept`;
    let label = "Zgjedh planin";
    if (entitlements.can_top_up) {
      if (entitlements.plan_id === plan.id && entitlements.renewal_available) { href = "/checkout?item=renew&provider=raiaccept"; label = "Rinovo planin"; }
      else if (plan.id === "pro" && commerce.data?.upgradeQuote?.eligible) { href = "/checkout?item=upgrade-pro&provider=raiaccept"; label = "Kalo në maroPro"; }
      else { href = "/account?tab=billing"; label = entitlements.plan_id === plan.id ? "Plani yt aktiv" : "Menaxho planin"; }
    }
    return <Link href={href} className={actionClass} data-variant="brand">{label}<ArrowUpRight size={18} aria-hidden /></Link>;
  }
  function topupAction(id: string) {
    if (!purchasesEnabled) return closed("Blerjet janë të mbyllura.");
    if (!ready) return closed("Duke ngarkuar…");
    if (!user) return <Link className={actionClass} data-variant="brand" href="/sign-up?next=%2Fpricing%3Ftab%3Dtopup">Krijo llogari<ArrowUpRight size={18} aria-hidden /></Link>;
    if (commerce.loading) return closed("Duke kontrolluar planin…");
    if (commerce.error || !entitlements) return <p role="alert" className={s.purchaseStatus}>Plani nuk u ngarkua. <Link href="/pricing?tab=topup">Shiko kreditet.</Link></p>;
    return entitlements.can_top_up ? <Link className={actionClass} data-variant="brand" href={`/checkout?item=${encodeURIComponent(id)}&provider=raiaccept`}>Bli kredite<ArrowUpRight size={18} aria-hidden /></Link> : <Link className={actionClass} data-variant="secondary" href="/pricing">Zgjedh një plan aktiv</Link>;
  }

  return <>
    <div className={s.pricingHeading}><h2 className={s.sectionTitle} id="hub-pricing-title">Mos maro <span>pa plan</span></h2><p>Kredite për idetë e tua. Hapësirë për mënyrën si krijon.</p></div>
    <div className={s.pricingTabs} role="group" aria-label="Planet dhe kreditet"><button type="button" aria-pressed={tab === "plans"} onClick={() => setTab("plans")}>Planet</button><button type="button" aria-pressed={tab === "topup"} onClick={() => setTab("topup")}>Top-up</button></div>
    {!catalog ? <div className={s.catalogStatus} role="status">{!loaded ? "Duke ngarkuar planet…" : <>Planet nuk u ngarkuan tani. <Link href="/pricing">Shiko katalogun.</Link></>}</div> : tab === "plans" ? <div className={s.planGrid}>{plans.map(plan => <article key={plan.id} className={s.planCard}>
      <h3>{plan.name}</h3><p>{plan.tagline}</p><div className={s.planPrice}>{plan.contactOnly ? <strong className={s.businessPrice}>Sipas marrëveshjes</strong> : <><strong>{formatEur(plan.priceEur)}</strong><span>· {formatCredits(plan.credits)} kredite</span></>}</div>
      <ul>{plan.features.map(feature => <li key={feature}><Check size={16} aria-hidden /><span>{feature.startsWith("Top-up") && !purchasesEnabled ? "Blerjet e reja janë të mbyllura" : feature}</span></li>)}</ul>
      {plan.contactOnly ? <Link href="/contact" className={actionClass} data-variant="secondary">Na kontakto<ArrowUpRight size={18} aria-hidden /></Link> : planAction(plan)}
    </article>)}</div> : <><p className={s.topupNotice}>Top-up kërkon plan aktiv (maroStandard ose maroPro).</p><div className={s.topupGrid}>{catalog.topups.map(tier => <article key={tier.id} className={s.topupCard}><h3>{formatCredits(tier.credits)}<span>kredite</span></h3><strong>{formatEur(tier.priceEur)}</strong>{topupAction(tier.id)}</article>)}</div></>}
    <p className={s.pricingPolicy}>Pagesa është njëherëshe. Planet zgjasin 30 ditë dhe rinovimi bëhet manualisht.</p>
  </>;
}

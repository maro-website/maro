"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { formatEur, PLAN_PACKAGES } from "@/lib/credits/money";
import { formatCredits } from "@/lib/credits/format";
import { ArrowUpRight, Check, ChevronDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import s from "./PricingPage.module.css";
import { useRaiAcceptAvailability } from "@/lib/payments/useRaiAcceptAvailability";

type Tab = "plans" | "topup";

type CatalogPlan = {
  id: string;
  name: string;
  tagline: string;
  priceEur: number;
  credits: number;
  badge?: string | null;
  contactOnly?: boolean;
  features: string[];
};

type CatalogTopup = {
  id: string;
  credits: number;
  priceEur: number;
  discountPct?: number;
};

export default function PricingPage() {
  return (
    <React.Suspense fallback={null}>
      <PricingPageInner />
    </React.Suspense>
  );
}

function PricingPageInner() {
  const purchasesEnabled=useRaiAcceptAvailability();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [catalog, setCatalog] = React.useState<{
    plans: CatalogPlan[];
    topups: CatalogTopup[];
    listPriceEurPerCredit: number;
  } | null>(null);
  const initialTab = searchParams.get("tab") === "topup" ? "topup" : "plans";
  const [tab, setTab] = React.useState<Tab>(initialTab);

  React.useEffect(() => {
    fetch("/api/commerce/catalog")
      .then((r) => r.json())
      .then((data) => setCatalog(data))
      .catch(() => null);
  }, []);

  React.useEffect(() => {
    const t = searchParams.get("tab") === "topup" ? "topup" : "plans";
    setTab(t);
  }, [searchParams]);

  const setTabAndUrl = (next: Tab) => {
    setTab(next);
    router.replace(next === "topup" ? "/pricing?tab=topup" : "/pricing", { scroll: false });
  };

  const catalogPlans = catalog?.plans ?? [];
  const businessPlan = PLAN_PACKAGES.find((plan) => plan.id === "biz");
  // Contact-only maroBiz is shown for inquiries, without enabling a purchase.
  const plans = catalog && businessPlan && !catalogPlans.some((plan) => plan.id === "business" || plan.id === "biz")
    ? [...catalogPlans, {
      id: "business",
      name: businessPlan.name,
      tagline: businessPlan.tagline,
      credits: businessPlan.credits,
      priceEur: businessPlan.priceEur,
      contactOnly: businessPlan.contactOnly,
      features: businessPlan.features.map((feature) => feature.text),
    }]
    : catalogPlans;
  const topups = catalog?.topups ?? [];

  return (
    <AppShell showFooter>
      <div className={s.page}>
        <header className={s.header}>
          <div className={s.intro}>
            <h1>Mos <span className={s.titleBrand}>maro</span><br />pa plan</h1>
            <p className={s.description}>Kredite për idetë e tua. Hapësirë për mënyrën si krijon.</p>
          </div>
          <aside className={s.catalogNotice} aria-labelledby="pricing-catalog-title">
            <div className={s.noticeHeading}>
              <span className={s.noticeIcon}><Lock size={19} aria-hidden /></span>
              <h2 id="pricing-catalog-title">Katalogu, në një vend.</h2>
            </div>
            <p>{purchasesEnabled?"Zgjedh planin ose kreditë që të duhen. Pagesa është njëherëshe dhe rinovimi bëhet manualisht.":"Katalogu i planeve dhe krediteve. Blerjet e reja janë të mbyllura në këtë version; plani ekzistues shfaqet te llogaria."}</p>
            <Link href="/account" className={s.accountLink}>Shiko llogarinë<ArrowUpRight size={16} aria-hidden /></Link>
          </aside>
        </header>

        <div className={s.tabs} aria-label="Katalogu i planeve dhe krediteve">
          {(
            [
              { id: "plans" as const, label: "Planet" },
              { id: "topup" as const, label: "Top-up" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTabAndUrl(t.id)}
              className={s.tab}
              aria-pressed={tab === t.id}
              aria-controls="pricing-catalog"
            >
              {t.id === "topup" && (
                <Lock size={14} aria-hidden />
              )}
              {t.label}
            </button>
          ))}
        </div>

        {tab === "plans" && (
          <div id="pricing-catalog">
            <div className={s.plans}>
              {plans.map((plan) => (
                <section
                  key={plan.id}
                  className={s.plan}
                  data-recommended={Boolean(plan.badge) || undefined}
                  aria-label={plan.name}
                >
                  <div className={s.planHeading}>
                    <h2>{plan.name}</h2>
                    {plan.badge && <span className={s.planBadge}>{plan.badge}</span>}
                  </div>
                  <p className={s.tagline}>{plan.tagline}</p>

                  <p className={s.price} data-contact={plan.contactOnly || undefined}>
                    {plan.contactOnly ? "Sipas marrëveshjes" : formatEur(plan.priceEur)}
                  </p>

                  <ul className={s.features}>
                    {plan.features.map((text) => (
                      <li key={text}>
                        <Check size={16} aria-hidden />
                        {text.startsWith("Top-up")&&!purchasesEnabled ? "Blerjet e reja janë të mbyllura" : text}
                      </li>
                    ))}
                  </ul>

                  {plan.contactOnly
                    ? <Link href="/contact" className={`maro-button ${s.contactCta}`} data-variant="inverse">Na kontakto<ArrowUpRight size={16} aria-hidden /></Link>
                    : purchasesEnabled?<Link href={`/checkout?item=${encodeURIComponent(plan.id)}&provider=raiaccept`} className={`maro-button ${s.contactCta}`} data-variant="inverse">Zgjedh planin<ArrowUpRight size={16} aria-hidden/></Link>:<p className={s.closed}><Lock size={14} aria-hidden />Blerjet janë të mbyllura.</p>}
                </section>
              ))}
            </div>

            <section className={s.comparison} aria-labelledby="pricing-comparison-title">
              <div className={s.sectionHeading}>
                <h2 id="pricing-comparison-title">Krahasim i shkurtër</h2>
                <p>Detajet kryesore, në një vend.</p>
              </div>
              <div className={s.tableScroll} role="region" aria-labelledby="pricing-comparison-title" tabIndex={0}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th scope="col"><span className="sr-only">Veçoria</span></th>
                      <th scope="col">maroStandard</th>
                      <th scope="col">maroPro</th>
                      <th scope="col">maroBiz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Kredite", "100", "500", "Sipas nevojës"],
                      ["Kohëzgjatja", "30 ditë", "30 ditë", "Sipas marrëveshjes"],
                      ["Kreditet skadojnë?", "Jo", "Jo", "Jo"],
                      ["Workspaces", "1", "Deri në 5", "Sipas nevojës"],
                      ["Gjenerime njëkohësisht", "1", "Deri në 3", "Sipas marrëveshjes"],
                      ["Top-up", "I mbyllur", "I mbyllur", "I mbyllur"],
                    ].map(([label, ...vals]) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        {vals.map((v, i) => (
                          <td key={i}>
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={s.faq} aria-labelledby="pricing-faq-title">
              <div className={s.sectionHeading}>
                <h2 id="pricing-faq-title">Pyetje të shpeshta</h2>
                <p>Gjërat që ia vlen t'i dish.</p>
              </div>
              <div className={s.questions}>
              {[
                {
                  q: "A është ky abonim automatik?",
                  a: purchasesEnabled?"Jo. Planet blihen për 30 ditë dhe rinovohen manualisht. Abonimet historike ekzistuese ruajnë kushtet e tyre.":"Blerjet e reja janë të mbyllura. Për një plan ekzistues, mënyra e rinovimit dhe afati shfaqen te llogaria.",
                },
                {
                  q: "A skadojnë kreditet?",
                  a: "Jo. Kreditet mbeten në llogarinë tënde edhe pas skadimit të planit.",
                },
                {
                  q: "Kur mund ta rinovoj planin?",
                  a: purchasesEnabled?"Në 7 ditët e fundit të planit, te llogaria jote. Rinovimi shton 30 ditë nga afati ekzistues.":"Rinovimet manuale janë të mbyllura. Një abonim ekzistues me rinovim automatik vazhdon sipas kushteve të tij.",
                },
                {
                  q: "A mund të blej vetëm kredite?",
                  a: purchasesEnabled?"Po, top-up është i disponueshëm gjatë planit aktiv. Kreditet nuk skadojnë.":"Blerjet e reja të krediteve janë të mbyllura në këtë version.",
                },
              ].map((item) => (
                <details key={item.q} className={s.question}>
                  <summary>{item.q}<ChevronDown size={17} aria-hidden /></summary>
                  <p>{item.a}</p>
                </details>
              ))}
              </div>
            </section>
          </div>
        )}

        {tab === "topup" && (
          <div id="pricing-catalog" className={s.topup}>
              <div className={s.topupNotice}>
                <span className={s.noticeIcon}><Lock size={19} aria-hidden /></span>
                <div>
                  <h2>{purchasesEnabled?"Kredite shtesë për planin tënd":"Blerjet janë të mbyllura"}</h2>
                  <p>
                    {purchasesEnabled?"Top-up kërkon plan aktiv. Kreditet e blera nuk skadojnë.":"Katalogu mbetet i dukshëm; kreditet dhe plani ekzistues ruhen."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTabAndUrl("plans")}
                    className={s.accountLink}
                  >
                    Shiko planet<ArrowUpRight size={16} aria-hidden />
                  </button>
                </div>
              </div>

            <div className={s.topupGrid}>
              {topups.map((tier) => {
                const locked = false;
                return (
                  <div
                    key={tier.id}
                    className={cn(
                      s.topupCard,
                      locked && "opacity-60"
                    )}
                  >
                    <h2 className={s.creditAmount}>
                      {formatCredits(tier.credits)}
                    </h2>
                    <p className={s.creditLabel}>kredite</p>
                    <p className={s.topupPrice}>{formatEur(tier.priceEur)}</p>
                    {tier.discountPct ? (
                      <p className={s.discount}>−{tier.discountPct}% nga çmimi bazë</p>
                    ) : null}
                    {purchasesEnabled?<Link className="maro-button mt-4" data-variant="inverse" href={`/checkout?item=${encodeURIComponent(tier.id)}&provider=raiaccept`}>Bli kredite<ArrowUpRight size={16} aria-hidden/></Link>:<p className={s.closed}><Lock size={14} aria-hidden />Blerjet janë të mbyllura.</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className={s.catalogFooter}>
          Vlera bazë e katalogut: €0,09/kredit ·{" "}
          <Link href="/legal/refund">
            Politika e rimbursimit
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

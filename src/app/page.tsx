"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BrowserFrame } from "@/components/website-previews/BrowserFrame";
import { PreviewThumb } from "@/components/website-previews/PreviewThumb";
import { landingExamples, heroProject } from "@/components/marketing/previewData";
import { useMaro } from "@/context/store";
import {
  ArrowRight,
  MessageSquareText,
  Sparkles,
  Rocket,
  Palette,
  Image as ImageIcon,
  LayoutGrid,
  Check,
  Play,
  Wand2,
  MousePointerClick,
  Globe,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { user, openDemoProject } = useMaro();
  // Preview data is seeded with random ids/dates, so build it client-side only
  // to avoid SSR/hydration mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const hero = React.useMemo(() => (mounted ? heroProject() : null), [mounted]);
  const examples = React.useMemo(() => (mounted ? landingExamples() : []), [mounted]);

  const startBuilding = () => router.push(user ? "/new" : "/sign-up");
  const tryDemo = () => {
    const demo = openDemoProject();
    router.push(`/projects/${demo.id}/editor`);
  };

  return (
    <div className="min-h-screen">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.5] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-8 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="brand" className="mb-6 px-3 py-1 text-[12px]">
              <Sparkles className="h-3.5 w-3.5" /> Website me AI · maro.al
            </Badge>
            <h1 className="text-balance text-[clamp(38px,7vw,74px)] font-extrabold leading-[0.98] tracking-[-0.04em] text-ink">
              Trego çka të duhet.
              <br />
              <span className="text-brand">Maro e maron.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-balance text-[17px] leading-relaxed text-ink-2">
              Përshkruaje biznesin tënd dhe Maro e kthen në një website profesional
              — të gatshëm për t'u redaktuar dhe publikuar. Pa kod, pa stres.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={startBuilding} iconRight={<ArrowRight className="h-4 w-4" />}>
                Maro Website
              </Button>
              <Button size="lg" variant="outline" onClick={tryDemo} icon={<Play className="h-4 w-4" />}>
                Provo demon
              </Button>
            </div>
            <div className="mt-4 text-[13px] text-ink-3">
              Falas për të filluar · Nuk kërkohet kartë krediti
            </div>
          </div>

          {/* Hero editor mockup (interface-driven, not stock photography) */}
          <div className="relative mx-auto mt-14 max-w-5xl animate-fade-up">
            <div className="absolute -inset-x-8 -top-6 bottom-0 -z-10 rounded-[32px] bg-brand/5 blur-2xl" />
            {hero ? (
              <EditorMockup project={hero} onOpen={tryDemo} />
            ) : (
              <div className="h-[420px] rounded-2xl border border-line-strong bg-surface shadow-pop" />
            )}
          </div>
        </div>
      </section>

      {/* Logos strip */}
      <section className="border-y border-line bg-surface/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-5 py-6 text-ink-3">
          <span className="text-[12.5px] font-medium uppercase tracking-widest">Besuar nga biznese si</span>
          {["Castello", "NICE", "Bright", "Beton", "Dardania"].map((n) => (
            <span key={n} className="text-[18px] font-extrabold tracking-tight text-ink-3/70">
              {n}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-24">
        <SectionHeading
          eyebrow="Si funksionon"
          title="Nga ideja te website-i në tri hapa"
          subtitle="Pa shabllone të mërzitshme. Pa faqe boshe. Vetëm përshkruaj dhe Maro maron."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            { n: "1", t: "Trego", d: "Përshkruaje biznesin, ngarko logon dhe zgjidh stilin që të pëlqen.", icon: MessageSquareText },
            { n: "2", t: "Maro", d: "AI ndërton strukturën, faqet dhe dizajnin sipas brandit tënd.", icon: Wand2 },
            { n: "3", t: "Publiko", d: "Redakto çdo detaj dhe publiko në maro.al ose domainin tënd.", icon: Rocket },
          ].map((s) => (
            <div key={s.n} className="group relative rounded-2xl border border-line bg-surface p-7 transition-all hover:shadow-card">
              <div className="mb-5 flex items-center justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-[44px] font-extrabold leading-none tracking-tighter text-line-strong">
                  {s.n}
                </span>
              </div>
              <h3 className="text-[19px] font-bold tracking-tight text-ink">{s.t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product preview */}
      <section id="product" className="border-y border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <SectionHeading
            eyebrow="Editori"
            title="Gjithçka që të duhet, në një vend"
            subtitle="Fol me AI ose kliko direkt mbi website. Ndrysho tekst, ngjyra, fonte dhe imazhe në kohë reale."
          />
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            <FeatureCard icon={Sparkles} title="Gjenerim me AI" desc="Përshkruaje çka do dhe Maro krijon faqe të plota me përmbajtje reale." />
            <FeatureCard icon={MousePointerClick} title="Redaktim live" desc="Kliko mbi çdo element dhe ndrysho tekstin apo imazhin menjëherë." />
            <FeatureCard icon={Palette} title="Kontroll brandi" desc="Ngjyra, fonte, radius dhe stil butonash — të gjitha të centralizuara." />
            <FeatureCard icon={ImageIcon} title="Biblioteka e aseteve" desc="Menaxho logon dhe imazhet e projektit në një bibliotekë të pastër." />
            <FeatureCard icon={LayoutGrid} title="Faqe & versione" desc="Shto faqe, ndrysho përmbajtjen dhe kthehu në versione të mëparshme." />
            <FeatureCard icon={Globe} title="Publikim me një klik" desc="Website-i yt live në një subdomain maro.al ose domainin tënd." />
          </div>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="mx-auto max-w-6xl px-5 py-24">
        <SectionHeading
          eyebrow="Shembuj"
          title="Një gjuhë vizuale për çdo biznes"
          subtitle="Maro nuk gjeneron të njëjtin dizajn për të gjithë. Çdo kategori ka identitetin e vet."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {examples.map((p) => (
            <button
              key={p.id}
              onClick={tryDemo}
              className="group text-left"
            >
              <BrowserFrame url={p.previewUrl} compact className="transition-all group-hover:-translate-y-1 group-hover:shadow-pop">
                <PreviewThumb project={p} height={260} />
              </BrowserFrame>
              <div className="mt-3.5 flex items-center justify-between px-1">
                <div>
                  <div className="text-[15px] font-bold text-ink">{p.name}</div>
                  <div className="text-[13px] text-ink-3">{p.previewUrl}</div>
                </div>
                <Badge tone="neutral">{categoryLabel(p.category)}</Badge>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <SectionHeading
            eyebrow="Çmimet"
            title="Plane për çdo fazë"
            subtitle="Fillo falas. Rrit kur je gati. (Konceptuale — pagesat vijnë në Phase 3.)"
          />
          <div className="mt-14 grid gap-5 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.featured
                    ? "border-brand bg-surface shadow-brand/20"
                    : "border-line bg-surface"
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-white">
                    Më popullor
                  </span>
                )}
                <div className="text-[15px] font-bold text-ink">{plan.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-[36px] font-extrabold tracking-tight text-ink">{plan.price}</span>
                  <span className="text-[13px] text-ink-3">{plan.period}</span>
                </div>
                <p className="mt-2 text-[13px] text-ink-2">{plan.tagline}</p>
                <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13.5px] text-ink-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.featured ? "primary" : "outline"}
                  className="mt-6 w-full"
                  onClick={startBuilding}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-16 text-center sm:px-16">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.08]" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand/40 blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance text-[clamp(28px,4.4vw,48px)] font-extrabold leading-[1.02] tracking-[-0.03em] text-white">
              Gati me e maru website-in tënd?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-white/70">
              Përshkruaje idenë sot dhe shihe të gjallë brenda minutash.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={startBuilding} iconRight={<ArrowRight className="h-4 w-4" />}>
                Maro Website
              </Button>
              <Button size="lg" variant="outline" onClick={tryDemo} className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                Provo demon
              </Button>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="mb-3 text-[12.5px] font-bold uppercase tracking-[0.14em] text-brand">{eyebrow}</div>
      <h2 className="text-balance text-[clamp(26px,3.6vw,42px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-balance text-[16px] leading-relaxed text-ink-2">{subtitle}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 transition-all hover:shadow-card">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-[16px] font-bold tracking-tight text-ink">{title}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{desc}</p>
    </div>
  );
}

function EditorMockup({ project, onOpen }: { project: ReturnType<typeof heroProject>; onOpen: () => void }) {
  return (
    <BrowserFrame url="app.maro.al/editor" className="ring-1 ring-black/5">
      <div className="flex h-[420px] bg-canvas">
        {/* fake chat rail */}
        <div className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface p-3 sm:flex">
          <div className="mb-3 flex items-center gap-2 text-[12px] font-bold text-ink">
            <Sparkles className="h-3.5 w-3.5 text-brand" /> Maro AI
          </div>
          <div className="flex flex-col gap-2">
            <div className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-brand px-3 py-2 text-[11px] font-medium text-white">
              Make the hero more premium
            </div>
            <div className="max-w-[90%] rounded-xl rounded-bl-sm bg-surface-2 px-3 py-2 text-[11px] text-ink-2">
              Ndryshimet u krynë ✓
            </div>
          </div>
          <div className="mt-auto flex h-9 items-center rounded-lg border border-line px-3 text-[11px] text-ink-3">
            Çka don me ndryshu?
          </div>
        </div>
        {/* live preview */}
        <div className="relative flex-1 overflow-hidden">
          <PreviewThumb project={project} height={420} />
          <button
            onClick={onOpen}
            className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-white shadow-pop transition-transform hover:scale-105"
          >
            Hape editorin <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </BrowserFrame>
  );
}

function categoryLabel(c: string) {
  return { restaurant: "Restaurant", dentist: "Dentist", agency: "Creative Agency", construction: "Construction", portfolio: "Portfolio", generic: "Business" }[c] ?? "Business";
}

const PLANS = [
  { name: "Free", price: "€0", period: "", tagline: "Për të provuar Maro-n.", cta: "Fillo falas", featured: false, features: ["1 website", "Subdomain maro.al", "Editor bazik", "Gjenerim me AI"] },
  { name: "Starter", price: "€9", period: "/muaj", tagline: "Për projekte personale.", cta: "Zgjidh Starter", featured: false, features: ["3 website", "Domain i personalizuar", "Redaktim i plotë", "Heqja e Maro badge"] },
  { name: "Growth", price: "€19", period: "/muaj", tagline: "Për biznese në rritje.", cta: "Zgjidh Growth", featured: true, features: ["10 website", "AI i avancuar", "Analytics", "Mbështetje prioritare"] },
  { name: "Business", price: "€49", period: "/muaj", tagline: "Për ekipe dhe agjenci.", cta: "Zgjidh Business", featured: false, features: ["Website të pakufizuar", "Ekip & role", "SEO i avancuar", "Mbështetje 24/7"] },
];

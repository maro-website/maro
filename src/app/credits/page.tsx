"use client";

import * as React from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { useMaro } from "@/context/store";
import { useToast } from "@/components/ui/Toast";
import { timeAgo } from "@/lib/utils/format";
import type { CreditTransaction } from "@/lib/types";
import { Coins, Zap, Sparkles, Clock, Check, ArrowRight } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

// 1 credit = 1 cent (€0.01).
const CENT_PER_CREDIT = 1;
const PRESETS = [100, 500, 1000, 5000];

const PLANS = [
  { key: "free", name: "Free", price: "€0", features: ["1 website", "Subdomain maro.al", "Editor bazik"] },
  { key: "starter", name: "Starter", price: "€9", features: ["3 website", "Domain i personalizuar", "Heqja e badge"] },
  { key: "growth", name: "Growth", price: "€19", features: ["10 website", "AI i avancuar", "Analytics"], featured: true },
  { key: "business", name: "Business", price: "€49", features: ["Të pakufizuar", "Ekip & role", "Mbështetje 24/7"] },
];

function euros(credits: number): string {
  return `€${((credits * CENT_PER_CREDIT) / 100).toFixed(2)}`;
}

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: EASE });
    const unsub = mv.on("change", (v) => setDisplay(Math.round(v)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, mv]);
  return <>{display.toLocaleString("de-DE")}</>;
}

export default function CreditsPage() {
  const { user, credits, projects } = useMaro();
  const { toast } = useToast();
  const [amount, setAmount] = React.useState<number>(500);
  const [custom, setCustom] = React.useState<string>("");

  const chosen = custom.trim() ? Math.max(1, parseInt(custom, 10) || 0) : amount;

  const transactions: CreditTransaction[] = projects
    .flatMap((p) => p.credits)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const pay = () => {
    if (!user) {
      toast("Hyr për të blerë kredite.");
      return;
    }
    toast(`Paysera vjen së shpejti · ${chosen} kredite (${euros(chosen)})`);
  };

  return (
    <AppShell>
      <div className="relative h-full overflow-y-auto scroll-thin">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-aurora" />

        <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-8">
          {/* Balance hero */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="relative overflow-hidden rounded-[28px] border border-line bg-surface p-8 shadow-subtle sm:p-10"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand-soft blur-2xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[12.5px] font-semibold text-ink-2">
                  <Coins className="h-4 w-4 text-brand" /> Balanca jote
                </span>
                <div className="mt-4 flex items-baseline gap-2 text-[clamp(44px,9vw,76px)] font-extrabold leading-none tracking-[-0.04em] text-ink">
                  <AnimatedNumber value={credits} />
                  <span className="text-[20px] font-semibold text-ink-3">kredite</span>
                </div>
                <p className="mt-2 text-[14px] text-ink-2">≈ {euros(credits)} · 1 kredit = 1 cent</p>
              </div>
              {[0, 1, 2].map((n) => (
                <motion.span
                  key={n}
                  className="hidden h-10 w-10 rounded-2xl bg-brand-soft sm:block"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: n * 0.4, ease: "easeInOut" }}
                />
              ))}
            </div>
          </motion.div>

          {/* Buy credits */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
            className="mt-8 rounded-[28px] border border-line bg-surface p-6 sm:p-8"
          >
            <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-ink">Shto kredite</h2>
            <p className="mt-1 text-[14px] text-ink-2">Zgjidh një paketë ose shkruaj sasinë që dëshiron.</p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PRESETS.map((p) => {
                const active = !custom.trim() && amount === p;
                return (
                  <motion.button
                    key={p}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setAmount(p);
                      setCustom("");
                    }}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      active ? "border-brand bg-brand-soft" : "border-line-strong bg-surface hover:bg-surface-2"
                    }`}
                  >
                    <div className="text-[22px] font-extrabold tracking-tight text-ink">
                      {p.toLocaleString("de-DE")}
                    </div>
                    <div className="text-[12.5px] text-ink-3">kredite</div>
                    <div className="mt-2 text-[13px] font-semibold text-ink-2">{euros(p)}</div>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">
                  Sasi e personalizuar (min. 1)
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-line-strong bg-surface px-4 py-3">
                  <Coins className="h-4 w-4 text-brand" />
                  <input
                    type="number"
                    min={1}
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="p.sh. 250"
                    className="w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[12.5px] text-ink-3">Totali</div>
                <div className="text-[26px] font-extrabold tracking-tight text-ink">{euros(chosen)}</div>
              </div>
            </div>

            <button
              onClick={pay}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 text-[16px] font-semibold text-brand-fg transition-colors hover:bg-brand-hover"
            >
              Paguaj me Paysera · {chosen.toLocaleString("de-DE")} kredite
              <ArrowRight className="h-5 w-5" />
            </button>
            <p className="mt-2.5 text-center text-[12.5px] text-ink-3">
              Pagesat aktivizohen së shpejti. Për momentin ky është një demonstrim.
            </p>
          </motion.div>

          {/* Plans */}
          <div className="mt-12">
            <h2 className="mb-4 text-[18px] font-bold tracking-tight text-ink">Planet</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PLANS.map((p) => {
                const current = user?.plan === p.key;
                return (
                  <div
                    key={p.key}
                    className={`relative flex flex-col rounded-2xl border p-5 ${
                      p.featured ? "border-brand" : "border-line"
                    } bg-surface`}
                  >
                    {current && (
                      <span className="absolute -top-3 left-5 rounded-full bg-ink px-2.5 py-1 text-[10.5px] font-bold text-white">
                        Plani aktual
                      </span>
                    )}
                    {p.featured && !current && (
                      <span className="absolute -top-3 left-5 rounded-full bg-brand px-2.5 py-1 text-[10.5px] font-bold text-white">
                        Popullor
                      </span>
                    )}
                    <div className="text-[14px] font-bold text-ink">{p.name}</div>
                    <div className="mt-1 text-[26px] font-extrabold tracking-tight text-ink">
                      {p.price}
                      <span className="text-[13px] font-medium text-ink-3">/muaj</span>
                    </div>
                    <ul className="mt-4 flex flex-1 flex-col gap-2">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-[12.5px] text-ink-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={current ? "subtle" : p.featured ? "primary" : "outline"}
                      className="mt-4 w-full"
                      disabled={current}
                      onClick={() => toast("Abonimet vijnë së shpejti.")}
                    >
                      {current ? "Aktiv" : "Zgjidh"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Usage */}
          <div className="mt-12 mb-6">
            <h2 className="mb-4 text-[18px] font-bold tracking-tight text-ink">Përdorimi i krediteve</h2>
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              <AnimatePresence initial={false}>
                {transactions.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[13.5px] text-ink-3">Ende s&apos;ka përdorim.</div>
                ) : (
                  transactions.map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`flex items-center justify-between px-5 py-3.5 ${
                        i !== transactions.length - 1 ? "border-b border-line" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-ink-2">
                          {t.reason === "generation" ? <Zap className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                        </span>
                        <div>
                          <div className="text-[13.5px] font-semibold text-ink">{t.label}</div>
                          <div className="flex items-center gap-1 text-[11.5px] text-ink-3">
                            <Clock className="h-3 w-3" /> {timeAgo(t.createdAt)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[14px] font-bold text-ink">{t.amount} kredite</span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

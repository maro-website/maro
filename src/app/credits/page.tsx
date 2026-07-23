"use client";

import * as React from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { useMaro } from "@/context/store";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/lib/hooks/useSettings";
import { resolveFortConfig } from "@/lib/fort/config";
import { fetchUsage, type UsageItem } from "@/lib/services/usageService";
import { validatePromo, trackPromo, type PromoInfo } from "@/lib/services/promoService";
import { timeAgo } from "@/lib/utils/format";
import {
  Coins,
  ArrowRight,
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Globe,
  Heart,
  Ticket,
  Check,
  X,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

// 1 credit = 1 cent (€0.01). Minimum purchase is 100 credits (€1.00).
const MIN_CREDITS = 100;

// Coin bundles. Large bundles are discounted (worth > price).
interface CoinTier {
  credits: number;
  eur: number;
  worth?: number;
}
const COIN_TIERS: CoinTier[] = [
  { credits: 100, eur: 1 },
  { credits: 500, eur: 5 },
  { credits: 1000, eur: 10 },
  { credits: 5000, eur: 39.99, worth: 50 },
  { credits: 10000, eur: 74.99, worth: 100 },
];

function fmtEur(eur: number): string {
  return `€${eur.toFixed(2)}`;
}

// Price for a given credit amount: bundle price if it matches a tier, else 1 cent each.
function priceEurFor(credits: number): number {
  const tier = COIN_TIERS.find((t) => t.credits === credits);
  return tier ? tier.eur : credits / 100;
}

function euros(credits: number): string {
  return fmtEur(credits / 100);
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

function actionLabel(item: UsageItem): { noun: string; icon: React.ElementType } {
  if (item.toolId === "logo") return { noun: "një logo", icon: Sparkles };
  if (item.toolId === "reklama") return { noun: "një reklamë", icon: ImageIcon };
  if (item.kind === "image") return { noun: "një imazh", icon: ImageIcon };
  return { noun: "një website", icon: Globe };
}

export default function CreditsPage() {
  const { user, credits, hasFort } = useMaro();
  const { toast } = useToast();
  const { fortConfig } = useSettings(Boolean(user));
  const fort = resolveFortConfig(fortConfig);
  const fortPlan = fortConfig.plan ?? {};
  const fortPrice = fortPlan.priceEur ?? 19.99;
  const fortCredits = fortPlan.credits ?? 2000;
  const fortPerks = fortPlan.perks ?? [
    "Akses në maroFort mode",
    "Beta maroArt 1.0 falas / pa limit",
    `${(fortCredits).toLocaleString("de-DE")} kredite çdo muaj`,
  ];
  const [amount, setAmount] = React.useState<number>(500);
  const [custom, setCustom] = React.useState<string>("");

  const subscribeFort = () => {
    if (hasFort) {
      toast("Ti tashmë ke maroFort aktiv.");
      return;
    }
    toast("Abonimi maroFort vjen së shpejti. Për momentin aktivizohet manualisht.");
  };

  const [usage, setUsage] = React.useState<{ items: UsageItem[]; count: number; spent: number } | null>(
    null
  );
  React.useEffect(() => {
    if (!user) {
      setUsage({ items: [], count: 0, spent: 0 });
      return;
    }
    void fetchUsage().then((u) =>
      setUsage({ items: u.items, count: u.totalCount, spent: u.totalCredits })
    );
  }, [user]);

  // Promo code
  const [promoInput, setPromoInput] = React.useState("");
  const [promo, setPromo] = React.useState<PromoInfo | null>(null);
  const [promoState, setPromoState] = React.useState<"idle" | "checking" | "invalid">("idle");

  const applyPromo = React.useCallback(
    async (raw: string, viaLink = false) => {
      const code = raw.trim();
      if (!code) return;
      setPromoState("checking");
      const info = await validatePromo(code);
      if (info) {
        setPromo(info);
        setPromoInput(info.code);
        setPromoState("idle");
        // A link visit is already tracked by /r/[slug]; only track code entry.
        if (!viaLink) void trackPromo(info.code, "code");
      } else {
        setPromo(null);
        setPromoState("invalid");
      }
    },
    []
  );

  // Pre-apply a promo passed via the URL (?promo=CODE, from a referral link).
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("promo");
    if (code) void applyPromo(code, params.get("via") === "link");
  }, [applyPromo]);

  const chosenRaw = custom.trim() ? parseInt(custom, 10) || 0 : amount;
  const chosen = Math.max(MIN_CREDITS, chosenRaw);
  const discount = promo?.discount ?? 0;
  const baseEur = priceEurFor(chosen);
  const totalEur = baseEur * (1 - discount / 100);
  const firstName = user?.name?.split(" ")[0] ?? "Ti";

  const clearPromo = () => {
    setPromo(null);
    setPromoInput("");
    setPromoState("idle");
  };

  const pay = () => {
    if (!user) {
      toast("Hyr për të blerë kredite.");
      return;
    }
    if (chosen < MIN_CREDITS) {
      toast(`Minimumi është ${MIN_CREDITS} kredite.`);
      return;
    }
    const promoNote = promo ? ` · zbritje ${discount}%` : "";
    toast(`Paysera vjen së shpejti · ${chosen} kredite (${fmtEur(totalEur)})${promoNote}`);
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
            className="relative overflow-hidden rounded-3xl border border-line bg-surface p-8 sm:p-10"
          >
            <div className="relative flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-wider text-ink-3">
                  <Coins className="h-4 w-4 text-brand" /> Balanca jote
                </span>
                <div className="mt-3 flex items-baseline gap-3 leading-none">
                  <span className="text-[clamp(40px,8vw,68px)] font-semibold tracking-[-0.04em] text-ink">
                    <AnimatedNumber value={credits} />
                  </span>
                  <span className="text-[16px] font-medium tracking-normal text-ink-3">kredite</span>
                </div>
                <p className="mt-2 text-[13.5px] text-ink-3">≈ {euros(credits)} · 1 kredit = 1 cent</p>
              </div>
              {user && (!user.plan || user.plan === "free") && (
                <a
                  href="#fort"
                  className="rounded-xl border border-line-strong px-4 py-2 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-2"
                >
                  Shiko maroFort
                </a>
              )}
            </div>
          </motion.div>

          {/* maroFort subscription */}
          {fort.enabled && (
            <motion.div
              id="fort"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.06 }}
              className="mt-8 scroll-mt-24 overflow-hidden rounded-3xl border border-brand/40 bg-surface p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-brand-fg">
                    <Sparkles className="h-3.5 w-3.5" /> {fort.label}
                  </span>
                  <h2 className="mt-4 text-[24px] font-extrabold tracking-[-0.02em] text-ink">
                    Modaliteti ekspert për krijime premium
                  </h2>
                  <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-ink-2">
                    {fort.description}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {fortPerks.map((perk, i) => (
                      <li key={i} className="flex items-center gap-2 text-[14px] text-ink">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-brand-fg">
                          <Check className="h-3 w-3" />
                        </span>
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="w-full shrink-0 sm:w-auto sm:text-right">
                  <div className="flex items-baseline gap-1.5 sm:justify-end">
                    <span className="text-[38px] font-extrabold tracking-[-0.03em] text-ink">
                      {fmtEur(fortPrice)}
                    </span>
                    <span className="text-[14px] font-semibold text-ink-3">/muaj</span>
                  </div>
                  <button
                    onClick={subscribeFort}
                    disabled={hasFort}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-line-strong bg-surface-2 px-6 py-3.5 text-[15px] font-semibold text-ink-2 transition-colors hover:bg-line disabled:cursor-not-allowed sm:w-auto"
                  >
                    {hasFort ? "Aktiv" : "Së shpejti"}
                  </button>
                  {!hasFort && (
                    <p className="mt-2 text-[12px] text-ink-3 sm:text-right">Aktivizohet manualisht për momentin.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Buy credits */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
            className="mt-8 rounded-[28px] border border-line bg-surface p-6 sm:p-8"
          >
            <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-ink">Shto kredite</h2>
            <p className="mt-1 text-[14px] text-ink-2">Zgjidh një paketë ose shkruaj sasinë që dëshiron.</p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {COIN_TIERS.map((t) => {
                const active = !custom.trim() && amount === t.credits;
                return (
                  <motion.button
                    key={t.credits}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setAmount(t.credits);
                      setCustom("");
                    }}
                    className={`relative rounded-2xl border p-4 text-left transition-colors ${
                      active ? "border-brand bg-brand-soft" : "border-line-strong bg-surface hover:bg-surface-2"
                    }`}
                  >
                    {t.worth && (
                      <span className="absolute right-2 top-2 rounded-md border border-line-strong px-1.5 py-0.5 text-[10px] font-semibold text-ink-2">
                        −{Math.round((1 - t.eur / t.worth) * 100)}%
                      </span>
                    )}
                    <div className="text-[22px] font-bold tracking-tight text-ink">
                      {t.credits.toLocaleString("de-DE")}
                    </div>
                    <div className="text-[12.5px] text-ink-3">kredite</div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-[13px] font-semibold text-ink-2">{fmtEur(t.eur)}</span>
                      {t.worth && (
                        <span className="text-[11.5px] text-ink-3 line-through">{fmtEur(t.worth)}</span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">
                  Sasi e personalizuar (min. {MIN_CREDITS})
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-line-strong bg-surface px-4 py-3">
                  <Coins className="h-4 w-4 text-brand" />
                  <input
                    type="number"
                    min={MIN_CREDITS}
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="p.sh. 250"
                    className="w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[12.5px] text-ink-3">Totali</div>
                {discount > 0 ? (
                  <div className="flex items-baseline justify-end gap-2">
                    <span className="text-[15px] font-semibold text-ink-3 line-through">{fmtEur(baseEur)}</span>
                    <span className="text-[26px] font-extrabold tracking-tight text-ink">
                      {fmtEur(totalEur)}
                    </span>
                  </div>
                ) : (
                  <div className="text-[26px] font-extrabold tracking-tight text-ink">{fmtEur(totalEur)}</div>
                )}
              </div>
            </div>

            {/* Promo code */}
            <div className="mt-5">
              <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">Kod promocional</label>
              {promo ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand bg-brand-soft px-4 py-3">
                  <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-brand-fg">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {promo.code} · zbritje {promo.discount}%
                  </div>
                  <button
                    onClick={clearPromo}
                    className="grid h-7 w-7 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface hover:text-ink"
                    aria-label="Hiq kodin"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-stretch gap-2">
                  <div
                    className={`flex flex-1 items-center gap-2 rounded-2xl border bg-surface px-4 py-3 ${
                      promoState === "invalid" ? "border-ink-3" : "border-line-strong"
                    }`}
                  >
                    <Ticket className="h-4 w-4 text-brand" />
                    <input
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value);
                        if (promoState === "invalid") setPromoState("idle");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void applyPromo(promoInput);
                      }}
                      placeholder="Kodi i zbritjes"
                      className="w-full bg-transparent text-[15px] uppercase text-ink outline-none placeholder:text-ink-3 placeholder:normal-case"
                    />
                  </div>
                  <button
                    onClick={() => void applyPromo(promoInput)}
                    disabled={promoState === "checking" || !promoInput.trim()}
                    className="shrink-0 rounded-2xl border border-line-strong bg-surface px-5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
                  >
                    {promoState === "checking" ? "…" : "Apliko"}
                  </button>
                </div>
              )}
              {promoState === "invalid" && (
                <p className="mt-1.5 text-[12.5px] text-ink-3">Ky kod nuk është valid ose ka skaduar.</p>
              )}
            </div>

            <button
              onClick={pay}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 text-[16px] font-semibold text-brand-fg transition-colors hover:bg-brand-hover"
            >
              Paguaj me Paysera · {fmtEur(totalEur)}
              <ArrowRight className="h-5 w-5" />
            </button>
            <p className="mt-2.5 text-center text-[12.5px] text-ink-3">
              Pagesat aktivizohen së shpejti. Për momentin ky është një demonstrim.
            </p>
          </motion.div>

          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.12 }}
            className="mt-8 overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface-2 text-brand">
                <Heart className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-[17px] font-bold tracking-[-0.02em] text-ink">
                  Ti po e ndihmon maro të bëhet realitet
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                  Për momentin, paratë e tua shkojnë direkt te Anthropic dhe OpenAI, plus koston
                  për ta mbajtur platformën gjallë. Por me ndihmën tënde, projekti{" "}
                  <span className="font-semibold text-ink">maro Imazh 1.0</span>, i pari gjenerator
                  shqiptar i imazheve me AI, bëhet realitet. Sa më shumë të rritemi, aq më lirë
                  bëhen gjenerimet, sepse ndërtojmë modelin tonë. Faleminderit që je pjesë e këtij
                  zhvillimi real.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Usage feed */}
          <div className="mt-12 mb-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[18px] font-bold tracking-tight text-ink">Aktiviteti yt</h2>
              {usage && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[12.5px] font-semibold text-ink-2">
                    <Wand2 className="h-3.5 w-3.5 text-brand" /> {usage.count} gjenerime
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[12.5px] font-semibold text-ink-2">
                    <Coins className="h-3.5 w-3.5 text-brand" /> {usage.spent} kredite gjithsej
                  </span>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              {!usage ? (
                <div className="px-5 py-10 text-center text-[13.5px] text-ink-3">Duke ngarkuar…</div>
              ) : usage.items.length === 0 ? (
                <div className="px-5 py-10 text-center text-[13.5px] text-ink-3">
                  Ende s&apos;ka gjenerime. Fillo me një logo ose website.
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {usage.items.slice(0, 20).map((it, i) => {
                    const { noun, icon: Icon } = actionLabel(it);
                    return (
                      <motion.div
                        key={it.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.4) }}
                        className={`flex items-center gap-3 px-5 py-3.5 ${
                          i !== Math.min(usage.items.length, 20) - 1 ? "border-b border-line" : ""
                        }`}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] text-ink">
                            <span className="font-semibold">{firstName}</span> maroi{" "}
                            <span className="font-semibold">{noun}</span>
                          </div>
                          <div className="text-[11.5px] text-ink-3">{timeAgo(it.createdAt)}</div>
                        </div>
                        <span className="shrink-0 text-[13px] font-bold text-ink">
                          {it.credits} kredite
                        </span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

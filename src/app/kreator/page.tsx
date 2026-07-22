"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import { useMaro } from "@/context/store";
import { useToast } from "@/components/ui/Toast";
import { submitCreatorApplication } from "@/lib/services/promoService";
import {
  Sparkles,
  Instagram,
  Youtube,
  Facebook,
  Globe,
  Music2,
  Copy,
  Check,
  Link2,
  Ticket,
  MousePointerClick,
  Coins,
  TrendingUp,
  Wallet,
  Star,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

function euros(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Copyable pill
// ---------------------------------------------------------------------------
function CopyRow({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast("U kopjua!");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("S'u kopjua dot.");
    }
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-2">
        <Icon className="h-3.5 w-3.5 text-brand" /> {label}
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-line-strong bg-surface-2 px-4 py-3">
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{value}</span>
        <button
          onClick={copy}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface hover:text-ink"
          aria-label={`Kopjo ${label}`}
        >
          {copied ? <Check className="h-4 w-4 text-brand" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creator dashboard
// ---------------------------------------------------------------------------
interface CreatorStats {
  hasCode: boolean;
  code: string | null;
  slug: string | null;
  discount: number;
  linkUses: number;
  codeUses: number;
  sales: number;
  salesCents: number;
  creditsSold: number;
  savedCents: number;
  earningsCents: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className="rounded-2xl border border-line bg-surface p-5"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-ink-2">
        <Icon className="h-4 w-4" />
      </span>
      <div className="mt-3 text-[28px] font-extrabold leading-none tracking-tight text-ink">{value}</div>
      <div className="mt-1.5 text-[13px] font-semibold text-ink-2">{label}</div>
      {sub && <div className="text-[11.5px] text-ink-3">{sub}</div>}
    </motion.div>
  );
}

function CreatorDashboard() {
  const { user, getAccessToken } = useMaro();
  const [stats, setStats] = React.useState<CreatorStats | null>(null);

  React.useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      try {
        const res = await fetch("/api/creator/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = (await res.json()) as CreatorStats;
        setStats(j);
      } catch {
        setStats(null);
      }
    })();
  }, [getAccessToken]);

  const firstName = user?.name?.split(" ")[0] ?? "Kreator";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://maro.al";
  const link = stats?.slug ? `${origin}/r/${stats.slug}` : null;

  return (
    <div className="relative h-full overflow-y-auto scroll-thin">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-aurora" />
      <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[12.5px] font-semibold text-ink-2">
            <Star className="h-3.5 w-3.5 text-brand" /> maro Kreator
          </span>
          <h1 className="mt-4 text-[clamp(30px,6vw,46px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">
            Mirë se erdhe, {firstName}
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-ink-2">
            Ndaje kodin ose linkun tënd. Sa herë dikush blen kredite me ta, ata marrin zbritje dhe ti
            fiton 10% të vlerës.
          </p>
        </motion.div>

        {/* Link + code */}
        {stats && !stats.hasCode ? (
          <div className="mt-8 rounded-2xl border border-line bg-surface p-6 text-[14px] text-ink-2">
            Kodi yt i Kreatorit po përgatitet nga ekipi i maro. Kthehu së shpejti.
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.05 }}
              className="rounded-[24px] border border-line bg-surface p-6"
            >
              <CopyRow label="Kodi yt i shitjes" value={stats?.code ?? "…"} icon={Ticket} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
              className="rounded-[24px] border border-line bg-surface p-6"
            >
              <CopyRow label="Linku yt i referimit" value={link ?? "…"} icon={Link2} />
            </motion.div>
          </div>
        )}

        {/* Stats */}
        <h2 className="mt-12 mb-4 text-[18px] font-bold tracking-tight text-ink">Statistikat</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard
            icon={MousePointerClick}
            label="Klikime linku"
            value={String(stats?.linkUses ?? 0)}
            delay={0.05}
          />
          <StatCard icon={Ticket} label="Kodi u përdor" value={String(stats?.codeUses ?? 0)} delay={0.1} />
          <StatCard icon={TrendingUp} label="Shitje totale" value={String(stats?.sales ?? 0)} delay={0.15} />
          <StatCard
            icon={Coins}
            label="Kredite të shitura"
            value={(stats?.creditsSold ?? 0).toLocaleString("de-DE")}
            delay={0.2}
          />
          <StatCard
            icon={Sparkles}
            label="Kursim për blerësit"
            value={euros(stats?.savedCents ?? 0)}
            delay={0.25}
          />
          <StatCard
            icon={Wallet}
            label="Fitimet e tua (10%)"
            value={euros(stats?.earningsCents ?? 0)}
            sub="Paguhet mujor"
            delay={0.3}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Join form (for non-creators)
// ---------------------------------------------------------------------------
const SOCIALS: { key: keyof SocialState; label: string; icon: React.ElementType; prefix: string }[] = [
  { key: "instagram", label: "Instagram", icon: Instagram, prefix: "@" },
  { key: "tiktok", label: "TikTok", icon: Music2, prefix: "@" },
  { key: "facebook", label: "Facebook", icon: Facebook, prefix: "/" },
  { key: "youtube", label: "YouTube", icon: Youtube, prefix: "@" },
  { key: "website", label: "Website", icon: Globe, prefix: "" },
];

interface SocialState {
  instagram: string;
  tiktok: string;
  facebook: string;
  youtube: string;
  website: string;
}

function JoinView() {
  const { user } = useMaro();
  const { toast } = useToast();
  const [name, setName] = React.useState(user?.name ?? "");
  const [email, setEmail] = React.useState(user?.email ?? "");
  const [socials, setSocials] = React.useState<SocialState>({
    instagram: "",
    tiktok: "",
    facebook: "",
    youtube: "",
    website: "",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const hasSocial = Object.values(socials).some((v) => v.trim());
  const valid = name.trim() && email.trim() && hasSocial;

  const submit = async () => {
    if (!valid) {
      toast("Plotëso emrin, email-in dhe të paktën një rrjet social.");
      return;
    }
    setSubmitting(true);
    const { error } = await submitCreatorApplication({ name, email, ...socials });
    setSubmitting(false);
    if (error) {
      toast(`Gabim: ${error}`);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="grid h-full place-items-center px-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="max-w-md rounded-[28px] border border-line bg-surface p-8 text-center"
        >
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand text-brand-fg">
            <Check className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-[22px] font-extrabold tracking-[-0.02em] text-ink">Kërkesa u dërgua</h2>
          <p className="mt-2 text-[14px] text-ink-2">
            Faleminderit! Ekipi i maro do ta shqyrtojë aplikimin tënd dhe do të kontaktojë me email.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto scroll-thin">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-aurora" />
      <div className="mx-auto w-full max-w-2xl px-5 py-14 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[12.5px] font-semibold text-ink-2">
            <Star className="h-3.5 w-3.5 text-brand" /> maro Kreator
          </span>
          <h1 className="mt-4 text-[clamp(28px,6vw,42px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">
            Bëhu Kreator i maro
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">
            Programi ynë shpërblen kreatorët që bëjnë përmbajtje rreth maro. Merr kodin dhe linkun
            tënd, ndaji me ndjekësit, dhe fito 10% nga çdo shitje. Kjo faqe hapet vetëm për Kreatorët
            e aprovuar. Apliko më poshtë.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
          className="mt-8 rounded-[28px] border border-line bg-surface p-6 sm:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Emri *">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Emri yt"
                className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
              />
            </Field>
            <Field label="Email *">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ti@email.com"
                className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
              />
            </Field>
          </div>

          <div className="mt-5 mb-2 text-[12.5px] font-semibold text-ink-2">
            Rrjetet sociale (të paktën një)
          </div>
          <div className="grid gap-3">
            {SOCIALS.map((s) => (
              <div
                key={s.key}
                className="flex items-center gap-2.5 rounded-2xl border border-line-strong bg-surface px-4 py-3"
              >
                <s.icon className="h-4 w-4 shrink-0 text-ink-2" />
                <span className="text-[14px] text-ink-3">{s.prefix}</span>
                <input
                  value={socials[s.key]}
                  onChange={(e) => setSocials((p) => ({ ...p, [s.key]: e.target.value }))}
                  placeholder={s.key === "website" ? "maro.al" : `username për ${s.label}`}
                  className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
                />
              </div>
            ))}
          </div>

          <button
            onClick={submit}
            disabled={submitting || !valid}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-4 text-[16px] font-semibold text-brand-fg transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {submitting ? "Duke dërguar…" : "Dërgo kërkesën"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-semibold text-ink-2">{label}</div>
      <div className="rounded-2xl border border-line-strong bg-surface px-4 py-3">{children}</div>
    </div>
  );
}

export default function KreatorPage() {
  const { ready, isCreator } = useMaro();
  return (
    <AppShell>
      {!ready ? (
        <div className="grid h-full place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-brand" />
        </div>
      ) : isCreator ? (
        <CreatorDashboard />
      ) : (
        <JoinView />
      )}
    </AppShell>
  );
}

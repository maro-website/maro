"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { useMaro } from "@/context/store";
import {
  GENERATION_STAGES,
  runGeneration,
  generateSite,
  InsufficientCreditsError,
  GenerationError,
  type GeneratedSite,
} from "@/lib/services/generationService";
import { cn } from "@/lib/utils/cn";
import {
  Check,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Coins,
  Eye,
  Globe,
} from "lucide-react";

function GeneratingInner() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { ready, getProject, updateProject } = useMaro();
  const project = getProject(projectId);

  const [active, setActive] = React.useState(-1);
  const [done, setDone] = React.useState(false);
  const [creditError, setCreditError] = React.useState<number | null>(null);
  const [genError, setGenError] = React.useState<string | null>(null);
  const [genDetail, setGenDetail] = React.useState<string | null>(null);
  const startedRef = React.useRef(false);
  const animDoneRef = React.useRef(false);
  const aiSettledRef = React.useRef(false);
  const aiResultRef = React.useRef<GeneratedSite | null>(null);
  const finalizedRef = React.useRef(false);

  const finalize = React.useCallback(() => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    const result = aiResultRef.current;
    updateProject(projectId, (p) => {
      if (!result) return { ...p, status: "ready" };
      return {
        ...p,
        status: "ready",
        pages: result.pages,
        activePageId: result.activePageId,
        theme: result.theme ? { ...p.theme, ...result.theme } : p.theme,
        brand: result.theme
          ? {
              ...p.brand,
              primaryColor: result.theme.primaryColor ?? p.brand.primaryColor,
              secondaryColor: result.theme.secondaryColor ?? p.brand.secondaryColor,
              backgroundColor: result.theme.backgroundColor ?? p.brand.backgroundColor,
              textColor: result.theme.textColor ?? p.brand.textColor,
            }
          : p.brand,
      };
    });
    setActive(GENERATION_STAGES.length - 1);
    setDone(true);
  }, [projectId, updateProject]);

  const maybeFinalize = React.useCallback(() => {
    if (animDoneRef.current && aiSettledRef.current) finalize();
  }, [finalize]);

  React.useEffect(() => {
    if (!ready || !project || startedRef.current) return;
    if (project.status !== "generating") {
      finalizedRef.current = true;
      setActive(GENERATION_STAGES.length - 1);
      setDone(true);
      return;
    }
    startedRef.current = true;

    const handle = runGeneration({
      onStage: (i) => setActive(i),
      onDone: () => {
        animDoneRef.current = true;
        maybeFinalize();
      },
      totalMs: 78000,
    });

    generateSite(project)
      .then((r) => {
        aiResultRef.current = r;
      })
      .catch((err) => {
        aiResultRef.current = null;
        if (err instanceof InsufficientCreditsError) {
          handle.cancel();
          setCreditError(err.needed);
        } else if (err instanceof GenerationError && !err.fallbackOk) {
          handle.cancel();
          setGenError(err.code);
          setGenDetail(err.detail ?? null);
        }
      })
      .finally(() => {
        aiSettledRef.current = true;
        maybeFinalize();
      });

    return () => handle.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, project?.id]);

  if (ready && !project) {
    return (
      <AppShell>
        <div className="grid h-full place-items-center px-6">
          <div className="text-center">
            <div className="text-[18px] font-bold text-ink">Projekti nuk u gjet</div>
            <Button className="mt-4" onClick={() => router.push("/tools/website")}>
              Kthehu te Maro Website
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const prompt = project?.prompt || project?.goal || project?.businessName || "";
  const pageCount = project?.pages?.length ?? 0;

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
          <div className="mx-auto w-full max-w-2xl space-y-5 px-5 py-8 sm:py-12">
            {/* User message */}
            {prompt && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-3 text-[15px] leading-relaxed text-brand-fg">
                  {prompt}
                </div>
              </div>
            )}

            {/* Assistant */}
            <div className="flex gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                {genError ? (
                  <ErrorCard
                    code={genError}
                    detail={genDetail}
                    onRetry={() => window.location.reload()}
                  />
                ) : creditError !== null ? (
                  <CreditCard needed={creditError} onBack={() => router.push("/tools/website")} />
                ) : (
                  <>
                    <div className="text-[15px] font-semibold text-ink">
                      {done ? "Faqja jote u maru." : "Po e maroj faqen tënde me Claude Opus 4.8…"}
                    </div>
                    <StepList active={active} done={done} />
                    <AnimatePresence>
                      {done && project && (
                        <ResultCard
                          name={project.businessName}
                          color={project.theme?.primaryColor ?? "#6b46e5"}
                          pages={pageCount}
                          onOpen={() => router.push(`/projects/${projectId}/editor`)}
                          onPreview={() => router.push(`/projects/${projectId}/preview`)}
                        />
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StepList({ active, done }: { active: number; done: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-2">
      {GENERATION_STAGES.map((stage, i) => {
        const isDone = i < active || done;
        const isActive = i === active && !done;
        return (
          <div
            key={stage.key}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
              isActive && "bg-surface-2"
            )}
          >
            <span
              className={cn(
                "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all",
                isDone
                  ? "border-brand bg-brand text-white"
                  : isActive
                  ? "border-brand text-brand"
                  : "border-line-strong text-ink-3"
              )}
            >
              {isDone ? (
                <Check className="h-3 w-3" />
              ) : isActive ? (
                <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse-soft" />
              ) : (
                <span className="h-1 w-1 rounded-full bg-current" />
              )}
            </span>
            <span
              className={cn(
                "text-[14px] transition-colors",
                isDone || isActive ? "font-medium text-ink" : "text-ink-3"
              )}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ResultCard({
  name,
  color,
  pages,
  onOpen,
  onPreview,
}: {
  name: string;
  color: string;
  pages: number;
  onOpen: () => void;
  onPreview: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
    >
      {/* Mini browser mockup */}
      <div className="relative h-36 overflow-hidden" style={{ background: color }}>
        <div className="absolute inset-x-0 top-0 flex h-8 items-center gap-1.5 bg-black/10 px-3">
          <span className="h-2 w-2 rounded-full bg-white/60" />
          <span className="h-2 w-2 rounded-full bg-white/60" />
          <span className="h-2 w-2 rounded-full bg-white/60" />
        </div>
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <Globe className="h-6 w-6 text-white/90" />
          <div className="mt-2 text-[16px] font-extrabold tracking-[-0.02em] text-white">
            {name}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <div className="text-[14.5px] font-semibold text-ink">{name}</div>
          <div className="text-[12.5px] text-ink-3">
            {pages} {pages === 1 ? "faqe" : "faqe"} · gati për editim
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<Eye className="h-4 w-4" />} onClick={onPreview}>
            Preview
          </Button>
          <Button size="sm" iconRight={<ArrowRight className="h-4 w-4" />} onClick={onOpen}>
            Editor
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  "no-key": "Çelësi i Anthropic nuk është konfiguruar në server.",
  "api-error": "Modeli ktheu një gabim (çelës, akses te modeli, ose rate limit).",
  truncated: "Përgjigja u ndërpre nga limiti i token-ave. Provo 'Landing Page' ose provo përsëri.",
  "parse-failed": "Përgjigja e modelit nuk u lexua dot. Provo përsëri.",
  unauthorized: "Sesioni skadoi. Hyr përsëri dhe provo sërish.",
  "ai-failed": "Modeli nuk u përgjigj. Provo përsëri.",
  empty: "Modeli ktheu një përgjigje bosh. Provo përsëri.",
  "http-504": "Gjenerimi zgjati shumë dhe u ndërpre (timeout). Provo përsëri.",
};

function ErrorCard({
  code,
  detail,
  onRetry,
}: {
  code: string;
  detail: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
      <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <AlertTriangle className="h-5 w-5 text-danger" /> Gjenerimi dështoi
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
        {ERROR_MESSAGES[code] || `Ndodhi një gabim (${code}).`}
      </p>
      {detail && (
        <p className="mt-2 break-words rounded-lg bg-surface px-3 py-2 font-mono text-[11.5px] text-ink-3">
          {detail}
        </p>
      )}
      <p className="mt-2 text-[12.5px] text-ink-3">Kreditet u kthyen automatikisht.</p>
      <Button size="sm" className="mt-3" onClick={onRetry}>
        Provo përsëri
      </Button>
    </div>
  );
}

function CreditCard({ needed, onBack }: { needed: number; onBack: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <Coins className="h-5 w-5 text-brand" /> Kredite të pamjaftueshme
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
        Ky gjenerim kërkon {needed} kredite. Shto kredite dhe provo përsëri.
      </p>
      <Button size="sm" className="mt-3" onClick={onBack}>
        Kthehu
      </Button>
    </div>
  );
}

export default function GeneratingPage() {
  return (
    <AuthGate>
      <GeneratingInner />
    </AuthGate>
  );
}

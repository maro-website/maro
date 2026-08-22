"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { StableImage } from "@/components/app/StableImage";
import { AiHtmlPreviewFrame } from "@/components/website-previews/AiHtmlPreviewFrame";
import { useMaro } from "@/context/store";
import {
  GENERATION_STAGES,
  generateSite,
  InsufficientCreditsError,
  GenerationError,
  type GeneratedSite,
  generateWebsiteThumbnail,
} from "@/lib/services/generationService";
import { cn } from "@/lib/utils/cn";
import { findOption, getTool } from "@/lib/tools/registry";
import {
  Check,
  AlertTriangle,
  BrainCircuit,
  Cpu,
  Coins,
  Eye,
  Flame,
  Gauge,
  Lightbulb,
  Monitor,
  Pencil,
} from "lucide-react";

function GeneratingInner() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { ready, user, getProject, updateProject } = useMaro();
  const project = getProject(projectId);

  const [active, setActive] = React.useState(-1);
  const [done, setDone] = React.useState(false);
  const [creditError, setCreditError] = React.useState<number | null>(null);
  const [genError, setGenError] = React.useState<string | null>(null);
  const [genDetail, setGenDetail] = React.useState<string | null>(null);
  const [genRefunded, setGenRefunded] = React.useState(false);
  const [creditsSpent, setCreditsSpent] = React.useState(0);
  const startedRef = React.useRef(false);
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
        renderMode: "html",
        htmlPages: result.htmlPages,
        activeHtmlPageId: result.activeHtmlPageId,
        generationId: result.generationId,
      };
    });
    const home = result?.htmlPages[0];
    if (result?.generationId && result.thumbnailToken && home?.html) {
      void generateWebsiteThumbnail({
        generationId: result.generationId,
        html: home.html,
        captureToken: result.thumbnailToken,
      }).then((thumbnail) => {
        if (thumbnail) updateProject(projectId, { thumbnailUrl: thumbnail.url, thumbnailStorageRef: thumbnail.storageRef });
      });
    }
    setActive(GENERATION_STAGES.length - 1);
    setDone(true);
  }, [projectId, updateProject]);

  const maybeFinalize = React.useCallback(() => {
    if (aiSettledRef.current) finalize();
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
    setActive(0);

    generateSite(project, { onStage: setActive })
      .then((r) => {
        aiResultRef.current = r;
        setCreditsSpent(r.creditsSpent ?? 0);
      })
      .catch((err) => {
        aiResultRef.current = null;
        if (err instanceof InsufficientCreditsError) {
          setCreditError(err.needed);
        } else if (err instanceof GenerationError && !err.fallbackOk) {
          setGenError(err.code);
          setGenDetail(err.detail ?? null);
          setGenRefunded(err.refunded);
        }
      })
      .finally(() => {
        aiSettledRef.current = true;
        maybeFinalize();
      });
  }, [ready, project, maybeFinalize]);

  if (ready && !project) {
    return (
      <AppShell>
        <div className="grid h-full place-items-center px-6">
          <div className="text-center">
            <div className="text-[18px] font-bold text-ink">Projekti nuk u gjet</div>
            <Button className="mt-4" onClick={() => router.push("/web")}>
              Kthehu te maro Web
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const prompt = project?.prompt || project?.goal || project?.businessName || "";
  const pageCount = project?.htmlPages?.length ?? project?.pages?.length ?? 0;
  const websiteTool = getTool("website");
  const selectionLabel = (settingId: string) => {
    const setting = websiteTool?.settings.find((item) => item.id === settingId);
    if (!setting) return undefined;
    const optionId = project?.toolSelections?.[settingId] ?? setting.default;
    return findOption(setting, optionId)?.label;
  };
  const modelLabel = selectionLabel("model");
  const typeLabel = selectionLabel("type");
  const speedLabel = selectionLabel("speed");
  const firstHtml = project?.htmlPages?.[0]?.html;

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
          <main className="mx-auto w-full max-w-[76rem] px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <article className="space-y-5">
              <div className="flex flex-wrap items-center gap-2.5">
                {user?.avatarUrl ? (
                  <StableImage src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-maro12 object-cover" />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-maro12 bg-ink text-[13px] font-bold text-white">
                    {(user?.name || "M").slice(0, 2).toUpperCase()}
                  </span>
                )}
                {project?.fort?.enabled && <GenerationMeta icon={Flame} label="maroFort" accent />}
                {project?.brain && <GenerationMeta icon={BrainCircuit} label="maroBrain" accent />}
                {project?.maroPromptId && <GenerationMeta icon={Lightbulb} label="maroPreset" />}
                {modelLabel && <GenerationMeta icon={Cpu} label={modelLabel} />}
                {typeLabel && <GenerationMeta icon={Monitor} label={typeLabel} />}
                {speedLabel && <GenerationMeta icon={Gauge} label={speedLabel} />}
                <time className="ml-auto text-[12px] font-medium text-ink-3">
                  {project?.createdAt ? new Date(project.createdAt).toLocaleString("sq-AL") : ""}
                </time>
              </div>

              {prompt && (
                <div className="rounded-maro16 bg-surface px-5 py-4 sm:px-7 sm:py-6">
                  <p className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-ink sm:text-[16px]">
                    {prompt}
                  </p>
                </div>
              )}

              {genError ? (
                <ErrorCard
                  code={genError}
                  detail={genDetail}
                  refunded={genRefunded}
                  onRetry={() => window.location.reload()}
                />
              ) : creditError !== null ? (
                <CreditCard needed={creditError} onBack={() => router.push("/web")} />
              ) : (
                <>
                  <WebGenerationTimeline active={active} done={done} />
                  <AnimatePresence>
                    {done && project && (
                      <ResultCard
                        name={project.businessName}
                        thumbnailUrl={project.thumbnailUrl}
                        html={firstHtml}
                        pages={pageCount}
                        creditsSpent={creditsSpent}
                        onOpen={() => router.push(`/projects/${projectId}/editor`)}
                        onPreview={() => router.push(`/projects/${projectId}/preview`)}
                      />
                    )}
                  </AnimatePresence>
                </>
              )}
            </article>
          </main>
        </div>
      </div>
    </AppShell>
  );
}

function GenerationMeta({
  icon: Icon,
  label,
  accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-maro12 px-3.5 text-[13px] font-semibold",
        accent ? "bg-generate text-generate-fg" : "bg-surface text-ink"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </span>
  );
}

const WEB_TIMELINE_STEPS = [
  { number: "01", label: "Përmbledhja e kërkesës", live: "maro po hulumton" },
  { number: "02", label: "Përpunimi i kërkesës", live: "maro pe përpunon" },
  { number: "03", label: "maro e maron", live: "maro pe maron" },
  { number: "04", label: "Dora e fundit", live: "maro pe përfundon" },
  { number: "✓", label: "u maru", live: "u maru" },
];

function WebGenerationTimeline({ active, done }: { active: number; done: boolean }) {
  const current = done
    ? WEB_TIMELINE_STEPS.length - 1
    : Math.min(3, Math.max(0, Math.floor((Math.max(active, 0) * 4) / GENERATION_STAGES.length)));

  return (
    <section className="rounded-maro20 bg-surface px-5 py-6 sm:px-7 sm:py-8" aria-label="Progresi i website-it">
      <div className="mb-6 inline-flex items-center gap-2 rounded-maro12 bg-ink px-3.5 py-2 text-[13px] font-semibold text-white" aria-live="polite">
        {done ? <Check className="h-4 w-4" /> : <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />}
        {WEB_TIMELINE_STEPS[current].live}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:gap-0">
        {WEB_TIMELINE_STEPS.map((step, index) => {
          const reached = index <= current;
          const complete = done || index < current;
          const isFinal = index === WEB_TIMELINE_STEPS.length - 1;
          return (
            <div key={step.number} className="relative flex min-w-0 items-center gap-3 sm:block">
              {index < WEB_TIMELINE_STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[calc(50%+1.35rem)] right-[calc(-50%+1.35rem)] top-5 hidden h-px sm:block",
                    complete ? "bg-ink" : "bg-line-strong"
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 grid h-10 min-w-10 place-items-center rounded-maro12 px-2 text-[13px] font-bold transition-colors sm:mx-auto",
                  reached ? "bg-ink text-white" : "bg-surface-2 text-ink-3",
                  done && isFinal && "bg-success text-white"
                )}
              >
                {step.number}
              </span>
              <span
                className={cn(
                  "min-w-0 text-[12px] font-semibold leading-tight sm:mt-3 sm:block sm:px-2 sm:text-center",
                  reached ? "text-ink" : "text-ink-3"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ResultCard({
  name,
  thumbnailUrl,
  html,
  pages,
  creditsSpent,
  onOpen,
  onPreview,
}: {
  name: string;
  thumbnailUrl?: string;
  html?: string;
  pages: number;
  creditsSpent?: number;
  onOpen: () => void;
  onPreview: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-4xl pt-2"
    >
      <div className="aspect-video w-full overflow-hidden rounded-maro20 bg-surface-2 p-2 sm:p-3">
        {thumbnailUrl ? (
          <StableImage src={thumbnailUrl} alt={`Pamja e website-it ${name}`} className="h-full w-full rounded-maro16 object-cover object-top" />
        ) : html ? (
          <AiHtmlPreviewFrame title={`Preview ${name}`} html={html} className="h-full w-full rounded-maro16 bg-white" />
        ) : (
          <div className="grid h-full place-items-center rounded-maro16 bg-surface text-[13px] font-medium text-ink-3">
            Duke përgatitur thumbnail-in…
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <div className="text-[14px] font-semibold text-ink">{name}</div>
        <div className="mt-1 text-[12px] text-ink-3">
          {pages} {pages === 1 ? "faqe" : "faqe"} · gati për editim{creditsSpent ? ` · ${creditsSpent} kredite` : ""}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
          <Button icon={<Pencil className="h-4 w-4" />} onClick={onOpen}>
            Editor
          </Button>
          <Button icon={<Eye className="h-4 w-4" />} onClick={onPreview}>
            Preview
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
  timeout: "Gjenerimi kaloi kohën e lejuar. Provo përsëri ose zvogëlo pak kërkesën.",
  "http-504": "Gjenerimi zgjati shumë dhe u ndërpre (timeout). Provo përsëri.",
  "http-524": "Gjenerimi zgjati shumë (Cloudflare timeout). Provo përsëri.",
};

function ErrorCard({
  code,
  detail,
  refunded,
  onRetry,
}: {
  code: string;
  detail: string | null;
  refunded: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-maro20 bg-danger/10 p-5" role="alert">
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
      {refunded && (
        <p className="mt-2 text-[12.5px] text-ink-3">Kreditet u kthyen automatikisht.</p>
      )}
      <Button size="sm" className="mt-3" onClick={onRetry}>
        Provo përsëri
      </Button>
    </div>
  );
}

function CreditCard({ needed, onBack }: { needed: number; onBack: () => void }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
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

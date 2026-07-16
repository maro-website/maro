"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { useMaro } from "@/context/store";
import {
  GENERATION_STAGES,
  runGeneration,
  generateSite,
  type GeneratedSite,
} from "@/lib/services/generationService";
import { cn } from "@/lib/utils/cn";
import { Check, ArrowRight, Sparkles } from "lucide-react";

function GeneratingInner() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { ready, getProject, updateProject } = useMaro();
  const project = getProject(projectId);

  const [active, setActive] = React.useState(-1);
  const [done, setDone] = React.useState(false);
  const startedRef = React.useRef(false);
  const animDoneRef = React.useRef(false);
  const aiSettledRef = React.useRef(false);
  const aiResultRef = React.useRef<GeneratedSite | null>(null);
  const finalizedRef = React.useRef(false);

  // Apply the AI-generated site (or fall back to the local factory content that
  // is already on the project) and reveal the success screen.
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
    // Skip re-running if already generated.
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
      totalMs: 11000,
    });

    // Real content generation (Claude Opus 4.8). On any failure we keep the
    // local factory content already present on the project.
    generateSite(project)
      .then((r) => {
        aiResultRef.current = r;
      })
      .catch(() => {
        aiResultRef.current = null;
      })
      .finally(() => {
        aiSettledRef.current = true;
        maybeFinalize();
      });

    return () => handle.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, project?.id]);

  const skip = () => {
    animDoneRef.current = true;
    aiSettledRef.current = true;
    finalize();
  };

  if (ready && !project) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <div className="text-[18px] font-bold text-ink">Projekti nuk u gjet</div>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>Kthehu te dashboard</Button>
        </div>
      </div>
    );
  }

  const progress = done ? 1 : Math.max(0, (active + 1) / GENERATION_STAGES.length);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[440px_1fr]">
      {/* Left: stages */}
      <div className="flex flex-col border-r border-line bg-canvas px-8 py-8">
        <Logo />
        <div className="flex flex-1 flex-col justify-center py-8">
          {!done ? (
            <>
              <div className="mb-1 inline-flex w-fit items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-[12px] font-semibold text-brand">
                <Sparkles className="h-3.5 w-3.5" /> Maro po e maron
              </div>
              <h1 className="mt-3 text-[26px] font-extrabold tracking-[-0.03em] text-ink">
                {project?.businessName}
              </h1>
              <p className="mt-1.5 text-[14px] text-ink-2">
                Po ndërtojmë website-in tënd. Kjo zgjat pak sekonda.
              </p>

              {/* progress line */}
              <div className="mt-7 h-1.5 w-full overflow-hidden rounded-full bg-line-strong">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-700 ease-out"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>

              <div className="mt-7 flex flex-col gap-1">
                {GENERATION_STAGES.map((stage, i) => {
                  const isDone = i < active || done;
                  const isActive = i === active && !done;
                  return (
                    <div
                      key={stage.key}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
                        isActive && "bg-surface"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-all",
                          isDone
                            ? "border-brand bg-brand text-white"
                            : isActive
                            ? "border-brand text-brand"
                            : "border-line-strong text-ink-3"
                        )}
                      >
                        {isDone ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : isActive ? (
                          <span className="h-2 w-2 rounded-full bg-brand animate-pulse-soft" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      <span
                        className={cn(
                          "text-[14px] transition-colors",
                          isDone || isActive ? "font-semibold text-ink" : "text-ink-3"
                        )}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="animate-fade-up">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-success/10 text-success">
                <Check className="h-7 w-7" />
              </div>
              <h1 className="mt-5 text-[30px] font-extrabold tracking-[-0.03em] text-ink">
                Website-i yt u maru.
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                Gjithçka është gati. Hape editorin për të parë dhe redaktuar website-in tënd.
              </p>
              <Button
                size="lg"
                className="mt-6"
                iconRight={<ArrowRight className="h-4 w-4" />}
                onClick={() => router.push(`/projects/${projectId}/editor`)}
              >
                Hape editorin
              </Button>
            </div>
          )}
        </div>

        {!done && (
          <button
            onClick={skip}
            className="text-left text-[12.5px] font-medium text-ink-3 transition-colors hover:text-ink-2"
          >
            Skip generation (dev)
          </button>
        )}
      </div>

      {/* Right: preview building up */}
      <div className="relative hidden overflow-hidden bg-surface-2 lg:block">
        <div className="absolute inset-0 bg-dot opacity-40" />
        <div className="relative flex h-full items-center justify-center p-10">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
            <div className="flex h-9 items-center gap-1.5 border-b border-line bg-surface-2 px-4">
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            </div>
            <div className="space-y-4 p-6">
              <SkeletonBlock show={active >= 0 || done} className="h-8 w-40" />
              <SkeletonBlock show={active >= 1 || done} className="h-24 w-full" />
              <div className="grid grid-cols-3 gap-3">
                <SkeletonBlock show={active >= 2 || done} className="h-20" delay={0} />
                <SkeletonBlock show={active >= 3 || done} className="h-20" delay={100} />
                <SkeletonBlock show={active >= 4 || done} className="h-20" delay={200} />
              </div>
              <SkeletonBlock show={active >= 5 || done} className="h-32 w-full" />
              <div className="flex gap-3">
                <SkeletonBlock show={active >= 6 || done} className="h-10 w-28" />
                <SkeletonBlock show={active >= 6 || done} className="h-10 w-28" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonBlock({ show, className, delay = 0 }: { show: boolean; className?: string; delay?: number }) {
  return (
    <div
      className={cn(
        "rounded-xl transition-all duration-500",
        show ? "skeleton opacity-100" : "bg-surface-2 opacity-30",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    />
  );
}

export default function GeneratingPage() {
  return (
    <AuthGate>
      <GeneratingInner />
    </AuthGate>
  );
}

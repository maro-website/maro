"use client";

import * as React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, BrainCircuit, Check, Clock, Flame, Globe, Lightbulb, Ratio } from "lucide-react";
import { MaroBuildingSpinner } from "@/components/app/MaroBuildingLoader";
import { PublishToExploreButton } from "@/components/app/PublishToExploreButton";
import { useMaro } from "@/context/store";
import { formatGenerationDate, resolveAspectBox } from "@/lib/design/aspectRatio";
import { fallbackFormatLabel } from "@/lib/design/generationMeta";
import type { ImageCreation } from "@/lib/types";
import { initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

function UserAvatar({
  user,
  className,
}: {
  user: { name: string; avatarColor: string; avatarUrl?: string };
  className?: string;
}) {
  if (user.avatarUrl) {
    return (
      <span className={cn("block shrink-0 overflow-hidden rounded-full", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full font-bold text-white", className)}
      style={{ background: user.avatarColor }}
    >
      {initials(user.name)}
    </span>
  );
}

function MetaPill({
  variant,
  icon: Icon,
  children,
}: {
  variant: "fort" | "brain" | "muted";
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold",
        variant === "fort"
          ? "bg-fort-pill text-white"
          : variant === "brain"
            ? "bg-generate text-generate-fg"
            : "bg-meta-pill text-ink"
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {children}
    </span>
  );
}

function GenerationImageBox({
  format,
  size,
  status,
  url,
  error,
  onOpen,
}: {
  format?: string;
  size?: string;
  status: "thinking" | "done" | "error";
  url?: string;
  error?: string;
  onOpen?: () => void;
}) {
  const { ratio, maxW } = resolveAspectBox(format, size);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setLoaded(false);
  }, [url]);

  if (status === "error") {
    return (
      <div
        className="relative mx-auto grid w-full overflow-hidden rounded-maro16 bg-danger/10 px-6 py-8 text-center text-danger"
        style={{ aspectRatio: ratio, maxWidth: maxW }}
        role="alert"
      >
        <div className="m-auto max-w-sm">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-maro12 bg-danger text-white">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div className="mt-4 text-[15px] font-bold text-ink">Gjenerimi dështoi</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-danger">
            {error || "Gabim gjenerimi. Provo përsëri."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-maro16 bg-surface"
      style={{ aspectRatio: ratio, maxWidth: maxW }}
    >
      {/* Watermark */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/maro-symbol.svg"
          alt=""
          className="h-16 w-16 select-none opacity-[0.08]"
          draggable={false}
        />
      </div>

      {status === "thinking" && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-3 text-[13px] font-semibold text-ink-3">
            <span className="grid h-11 w-11 place-items-center rounded-maro12 bg-ink text-white">
              <MaroBuildingSpinner className="h-5 w-5 brightness-0 invert" />
            </span>
            <span>maro po maron</span>
          </div>
        </div>
      )}

      {status === "done" && url && (
        <button
          type="button"
          onClick={onOpen}
          className="group absolute inset-0 block h-full w-full overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            onLoad={() => setLoaded(true)}
            className={cn(
              "h-full w-full object-cover transition-transform group-hover:scale-[1.01]",
              loaded && "image-reveal"
            )}
          />
        </button>
      )}
    </div>
  );
}

export type GenerationCardMessage = {
  id: string;
  text: string;
  attachments?: string[];
  fort?: boolean;
  brain?: boolean;
  promptCode?: string;
  format?: string;
  size?: string;
  formatLabel?: string;
  modelLabel?: string;
  speedLabel?: string;
  createdAt: string;
  status: "thinking" | "done" | "error";
  creation?: ImageCreation;
  error?: string;
  mediaType?: "image" | "audio" | "text";
};

export function GenerationCard({
  message,
  onOpen,
}: {
  message: GenerationCardMessage;
  onOpen?: (c: ImageCreation) => void;
}) {
  const { user } = useMaro();
  const isAudio = message.mediaType === "audio";
  const isText = message.mediaType === "text";

  const formatLabel =
    message.formatLabel ??
    message.creation?.formatLabel ??
    fallbackFormatLabel(message.format ?? message.creation?.format, message.size ?? message.creation?.size);
  const modelLabel = message.modelLabel ?? message.creation?.modelLabel;
  const speedLabel = message.speedLabel ?? message.creation?.speedLabel;
  const brain = message.brain ?? message.creation?.brain;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="flex flex-col gap-2.5"
    >
      {/* Header — attribute pills like mockup */}
      <div className="flex flex-wrap items-center gap-2">
        {user && <UserAvatar user={user} className="h-9 w-9 text-[13px]" />}
        {message.fort && (
          <MetaPill variant="fort" icon={Flame}>
            maroFort
          </MetaPill>
        )}
        {brain && (
          <MetaPill variant="brain" icon={BrainCircuit}>
            maroBrain
          </MetaPill>
        )}
        {message.promptCode && (
          <MetaPill variant="muted" icon={Lightbulb}>
            {message.promptCode}
          </MetaPill>
        )}
        {modelLabel && (
          <MetaPill variant="muted" icon={Globe}>
            {modelLabel}
          </MetaPill>
        )}
        {formatLabel && (
          <MetaPill variant="muted" icon={Ratio}>
            {formatLabel}
          </MetaPill>
        )}
        {speedLabel && (
          <MetaPill variant="muted" icon={Clock}>
            {speedLabel}
          </MetaPill>
        )}
        <time className="ml-auto shrink-0 text-[13px] font-medium text-ink-3">
          {formatGenerationDate(message.createdAt)}
        </time>
      </div>

      {/* Prompt */}
      <div className="rounded-maro16 bg-surface px-5 py-4 sm:px-6 sm:py-5">
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {message.attachments.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="max-h-36 max-w-full rounded-xl object-cover" />
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-ink">{message.text}</p>
      </div>

      {/* One stable result box carries all three states: loading, success and error. */}
      {!isAudio && !isText && (
        <>
          <div className="mt-2.5 flex items-center gap-2 px-0.5 text-[13px] font-semibold text-ink-3" aria-live="polite">
            <span className="grid h-8 w-8 place-items-center rounded-maro8 bg-ink text-white">
              {message.status === "thinking" ? (
                <MaroBuildingSpinner className="h-4 w-4 brightness-0 invert" />
              ) : message.status === "done" ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
            </span>
            <span>
              {message.status === "thinking"
                ? "maro po maron"
                : message.status === "done"
                  ? "maro e maroi"
                  : "maro s’mujti me maru"}
            </span>
          </div>
          <GenerationImageBox
            format={message.format}
            size={message.size ?? message.creation?.size}
            status={message.status}
            url={message.creation?.urls[0]}
            error={message.error}
            onOpen={message.creation && onOpen ? () => onOpen(message.creation!) : undefined}
          />
          {message.status === "done" && message.creation?.urls[0] && (
            <div className="flex flex-wrap gap-2 px-1">
              <PublishToExploreButton
                toolId={message.creation.toolId}
                prompt={message.text}
                url={message.creation.urls[0]}
              />
            </div>
          )}
        </>
      )}

      {/* Audio / text results */}
      {(isAudio || isText) && message.status === "thinking" && (
        <div className="flex items-center gap-2 px-1 text-[13px] font-semibold text-ink-3">
          <MaroBuildingSpinner />
          maro pe maron
        </div>
      )}

      {isAudio && message.status === "done" && message.creation?.urls[0] && (
        <div className="rounded-maro16 bg-surface px-4 py-3">
          <audio controls src={message.creation.urls[0]} className="w-full" />
        </div>
      )}

      {isText && message.status === "done" && message.creation && (
        <div className="rounded-maro16 bg-surface px-5 py-4">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{message.creation.text}</p>
          {onOpen && (
            <button
              type="button"
              onClick={() => onOpen(message.creation!)}
              className="mt-2 text-[12.5px] font-semibold text-brand hover:underline"
            >
              Hap & kopjo
            </button>
          )}
        </div>
      )}
      {message.status === "error" && (isAudio || isText) && (
        <p className="text-[14px] text-danger">{message.error || "Gabim gjenerimi."}</p>
      )}
    </motion.article>
  );
}

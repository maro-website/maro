"use client";

import { MARO_FORT_ENABLED } from "@/lib/shadow/maroFort";
import { StableImage } from "./StableImage";
import { PreviewFallback } from "./PreviewFallback";

import * as React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ToolIcon } from "./OptionIcon";
import { getProductBrand } from "@/lib/design/maro-system";
import { AlertCircle, BrainCircuit, Clock, Flame, Globe, Lightbulb, Ratio } from "lucide-react";
import { GenerationLoader } from "./GenerationLoader";
import { MaroBuildingSpinner } from "@/components/app/MaroBuildingLoader";
import { PublishToExploreButton } from "@/components/app/PublishToExploreButton";
import { useMaro } from "@/context/store";
import { formatGenerationDate, resolveAspectBox } from "@/lib/design/aspectRatio";
import { fallbackFormatLabel } from "@/lib/design/generationMeta";
import type { ImageCreation } from "@/lib/types";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { cn } from "@/lib/utils/cn";


function MetaPill({
  variant,
  icon: Icon,
  product,
  children,
}: {
  variant: "fort" | "brain" | "muted";
  icon?: LucideIcon;
  product?: string;
  children: React.ReactNode;
}) {
  const brand = product ? getProductBrand(product) : undefined;
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
      style={brand && brand.id !== "maroFort" ? { backgroundColor: brand.color, color: "var(--maro-color-text-on-accent)" } : undefined}
    >
      {brand && brand.id !== "maroFort" ? <ToolIcon toolId={brand.id} className="h-3.5 w-3.5 shrink-0" /> : Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {children}
    </span>
  );
}

function GenerationImageBox({
  format,
  size,
  module,
  refreshKey,
  status,
  url,
  error,
  onOpen,
}: {
  format?: string;
  size?: string;
  module?: string;
  refreshKey?: string;
  status: "thinking" | "done" | "error";
  url?: string;
  error?: string;
  onOpen?: () => void;
}) {
  const { ratio, maxW } = resolveAspectBox(format, size);
  if (status === "error") {
    return (
      <div
        className="relative mx-auto grid w-full overflow-hidden rounded-maro16 bg-danger/10 px-6 py-8 text-center text-danger"
        data-generation-result
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

  if (status === "done" && url) {
    return (
      <div className="relative mx-auto w-full overflow-hidden rounded-maro16 bg-surface" data-generation-result style={{ maxWidth: maxW }}>
        <button type="button" onClick={onOpen} className="group relative block w-full overflow-hidden">
          <StableImage src={url} refreshKey={refreshKey} alt="" module={module} loading="eager"
            className="h-auto w-full object-contain" fallbackClassName="min-h-40" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-maro16 bg-surface"
      data-generation-result
      style={{ aspectRatio: ratio, maxWidth: maxW }}
    >
      {status === "thinking" && <div className="absolute inset-0 bg-surface-2" />}
      {status === "done" && !url && <PreviewFallback module={module} className="absolute inset-0" />}

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
  const [promptExpanded, setPromptExpanded] = React.useState(false);
  const promptId = React.useId();
  const longPrompt = message.text.length > 320 || message.text.split("\n").length > 4;
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
      data-generation-id={message.id}
      className="flex flex-col gap-2.5"
    >
      {/* Header — attribute pills like mockup */}
      <div className="flex flex-wrap items-center gap-2">
        {user && <UserAvatar user={user} className="h-9 w-9 text-[13px]" />}
        {MARO_FORT_ENABLED && message.fort && (
          <MetaPill variant="fort" icon={Flame}>
            maroFort
          </MetaPill>
        )}
        {brain && (
          <MetaPill variant="brain" product="brain" icon={BrainCircuit}>
            maroBrain
          </MetaPill>
        )}
        {message.promptCode && (
          <MetaPill variant="muted" product="presets" icon={Lightbulb}>
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
        <p id={promptId} className={cn("whitespace-pre-wrap break-words text-[15px] font-medium leading-relaxed text-ink", longPrompt && !promptExpanded && "line-clamp-4")} style={{ overflowWrap: "anywhere" }}>{message.text}</p>
        {longPrompt && <button type="button" aria-expanded={promptExpanded} aria-controls={promptId} onClick={() => setPromptExpanded((value) => !value)} className="mt-2 text-[13px] font-bold text-brand underline underline-offset-4">{promptExpanded ? "Show less" : "Show more"}</button>}
      </div>

      {/* One stable result box carries all three states: loading, success and error. */}
      {!isAudio && !isText && (
        <div className="relative mx-auto w-full" style={{ maxWidth: resolveAspectBox(message.format, message.size ?? message.creation?.size).maxW }}>
          <GenerationLoader status={message.status === "thinking" ? "working" : message.status} startedAt={message.createdAt}
            className={message.status === "thinking" ? "pointer-events-none absolute inset-0 z-10 h-full !aspect-auto" : undefined} />
          {(message.status === "done" && message.creation ? message.creation.urls : [undefined]).map((url, index) => <React.Fragment key={index}><GenerationImageBox
            format={message.format}
            size={message.size ?? message.creation?.size}
            module={message.creation?.toolId ?? "imazh"}
            refreshKey={message.creation?.storageRefs?.[index] ?? message.id}
            status={message.status}
            url={url}
            error={message.error}
            onOpen={message.creation && onOpen && url ? () => onOpen({ ...message.creation!, urls: [url], storageRefs: message.creation!.storageRefs?.[index] ? [message.creation!.storageRefs[index]] : undefined }) : undefined}
          />
          {message.status === "done" && message.creation && url && (
            <div className="flex flex-wrap gap-2 px-1">
              <PublishToExploreButton
                toolId={message.creation.toolId}
                prompt={message.text}
                url={url}
                storedUrl={message.creation.storageRefs?.[index]}
                selections={message.creation.selections}
              />
            </div>
          )}</React.Fragment>)}
        </div>
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

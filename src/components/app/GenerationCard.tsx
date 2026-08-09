"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Lightbulb, Sparkles } from "lucide-react";
import { MaroBuildingLoader, MaroBuildingSpinner } from "@/components/app/MaroBuildingLoader";
import { useMaro } from "@/context/store";
import { formatGenerationDate, resolveAspectBox } from "@/lib/design/aspectRatio";
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
        className="mx-auto w-full overflow-hidden rounded-2xl border border-line bg-surface px-4 py-6 text-center text-[14px] text-danger"
        style={{ aspectRatio: ratio, maxWidth: maxW }}
      >
        {error || "Gabim gjenerimi."}
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-2xl border border-line bg-surface"
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
          <MaroBuildingLoader size={44} />
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
  promptCode?: string;
  format?: string;
  size?: string;
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

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2.5">
        {user && <UserAvatar user={user} className="h-9 w-9 text-[13px]" />}
        {message.fort && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[12px] font-bold text-brand-fg">
            <Sparkles className="h-3.5 w-3.5" />
            maroFort
          </span>
        )}
        {message.promptCode && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[12px] font-bold text-white">
            <Lightbulb className="h-3.5 w-3.5" />
            maroPrompt
          </span>
        )}
        <time className="ml-auto text-[13px] font-medium text-ink-3">
          {formatGenerationDate(message.createdAt)}
        </time>
      </div>

      {/* Prompt */}
      <div className="rounded-2xl border border-line bg-surface px-5 py-4 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {message.attachments.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="max-h-36 max-w-full rounded-xl object-cover" />
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{message.text}</p>
      </div>

      {/* Building status + image result */}
      {!isAudio && !isText && (
        <>
          {message.status === "thinking" && (
            <div className="flex items-center gap-2 px-1 text-[13px] font-semibold text-ink-3">
              <MaroBuildingSpinner />
              maro po maron
            </div>
          )}
          <GenerationImageBox
            format={message.format}
            size={message.size ?? message.creation?.size}
            status={message.status}
            url={message.creation?.urls[0]}
            error={message.error}
            onOpen={message.creation && onOpen ? () => onOpen(message.creation!) : undefined}
          />
        </>
      )}

      {/* Audio / text results */}
      {(isAudio || isText) && message.status === "thinking" && (
        <div className="flex items-center gap-2 px-1 text-[13px] font-semibold text-ink-3">
          <MaroBuildingSpinner />
          maro po maron
        </div>
      )}

      {isAudio && message.status === "done" && message.creation?.urls[0] && (
        <div className="rounded-2xl border border-line bg-surface px-4 py-3">
          <audio controls src={message.creation.urls[0]} className="w-full" />
        </div>
      )}

      {isText && message.status === "done" && message.creation && (
        <div className="rounded-2xl border border-line bg-surface px-5 py-4">
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

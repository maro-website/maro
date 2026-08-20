"use client";

import Link from "next/link";
import { MaroIcon, ToolIcon } from "@/components/app/OptionIcon";
import { Lock, Megaphone, type LucideIcon } from "lucide-react";

const HUB_TILE_PREVIEWS: Record<string, string> = {
  imazh: "/images/hub/marketing-stack.png",
  marologo: "/images/hub/marketing-stack.png",
  web: "/images/hub/marketing-stack.png",
  filma: "/images/hub/marketing-stack.png",
  audio: "/images/hub/marketing-stack.png",
  marketing: "/images/hub/marketing-stack.png",
  presets: "/images/hub/marketing-stack.png",
};

export function HubToolTile({
  label,
  toolId,
  icon,
  href,
  locked,
  id,
}: {
  label: string;
  toolId?: string;
  icon?: LucideIcon;
  href: string;
  locked?: boolean;
  id?: string;
}) {
  const Icon = icon ?? Megaphone;
  const previewUrl = id ? HUB_TILE_PREVIEWS[id] : undefined;

  const inner = (
    <div className="maro-hub-tile" data-locked={locked || undefined}>
      {previewUrl && !locked && (
        <div className="maro-hub-tile__preview" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" />
        </div>
      )}
      <div className="maro-hub-tile__icon-area">
        {locked ? (
          <Lock className="h-10 w-10 text-ink-3" />
        ) : toolId ? (
          <ToolIcon toolId={toolId} fallback={Icon} className="h-12 w-12 text-brand group-hover:text-white" />
        ) : (
          <MaroIcon name="prompts" fallback={Icon} className="h-12 w-12 text-brand group-hover:text-white" />
        )}
      </div>
      <span className="maro-hub-tile__label">{label}</span>
      {locked && <span className="pb-3 text-center text-[11px] font-medium text-ink-3">së shpejti</span>}
    </div>
  );

  if (locked) return inner;
  return (
    <Link href={href} className="group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      {inner}
    </Link>
  );
}

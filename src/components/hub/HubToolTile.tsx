"use client";

import Link from "next/link";
import { MaroIcon, ToolIcon } from "@/components/app/OptionIcon";
import { Megaphone, type LucideIcon } from "lucide-react";

const HUB_TILE_PREVIEWS: Record<string, string> = {
  imazh: "/images/hub/marketing-stack.png",
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
        {toolId ? (
          <ToolIcon toolId={toolId} fallback={Icon} className="h-14 w-14 text-[var(--maro-blue-soft-icon)] group-hover:text-white" />
        ) : (
          <MaroIcon name="prompts" fallback={Icon} className="h-14 w-14 text-[var(--maro-blue-soft-icon)] group-hover:text-white" />
        )}
      </div>
      <span className="maro-hub-tile__label">{label}</span>
    </div>
  );

  if (locked) return inner;
  return (
    <Link href={href} className="group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      {inner}
    </Link>
  );
}

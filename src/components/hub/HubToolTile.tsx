"use client";

import Link from "next/link";
import { ToolIcon } from "@/components/app/OptionIcon";
import { Sparkles } from "lucide-react";

export function HubToolTile({
  label,
  toolId,
  href,
  backgroundImage,
  locked,
}: {
  label: string;
  toolId: string;
  href: string;
  backgroundImage: string;
  locked?: boolean;
}) {
  const inner = (
    <div className="maro-hub-tile" data-locked={locked || undefined}>
      <div className="maro-hub-tile__preview" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={backgroundImage} alt="" />
      </div>
      <div className="maro-hub-tile__icon-area">
        <ToolIcon toolId={toolId} fallback={Sparkles} className="h-14 w-14 text-[var(--maro-blue-soft-icon)]" />
      </div>
      <div className="maro-hub-tile__copy">
        <span className="maro-hub-tile__label">{label}</span>
        {locked && <span className="maro-hub-tile__status">së shpejti</span>}
      </div>
    </div>
  );

  if (locked) {
    return (
      <div className="maro-hub-tile-shell" aria-disabled="true">
        {inner}
      </div>
    );
  }

  return (
    <Link href={href} className="maro-hub-tile-shell group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand">
      {inner}
    </Link>
  );
}

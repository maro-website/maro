"use client";

import { StableImage } from "@/components/app/StableImage";
import { PreviewFallback } from "@/components/app/PreviewFallback";

import Link from "next/link";
import { getModuleAvailability } from "@/lib/modules/availability";


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
  backgroundImage?: string;
  locked?: boolean;
}) {
  const inner = (
    <div className="maro-hub-tile" data-locked={locked || undefined}>
      <div className="absolute inset-x-0 bottom-14 top-0" aria-hidden>
        {backgroundImage ? <StableImage src={backgroundImage} alt="" module={toolId} className="h-full w-full object-cover" /> : <PreviewFallback module={toolId} />}
      </div>
      <div className="maro-hub-tile__copy">
        <span className="maro-hub-tile__label">{label}</span>
        {locked && <span className="maro-hub-tile__status">së shpejti · {getModuleAvailability(toolId)?.version}</span>}
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

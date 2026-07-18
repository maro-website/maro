"use client";

import * as React from "react";
import { useMaro } from "@/context/store";
import { useSettings } from "@/lib/hooks/useSettings";
import type { ToolId } from "@/lib/tools/registry";

// Admin-managed promotional banner. Shown above the composer prompt on the
// tools selected in Admin -> Reklamat. Image + optional link are set by admin.
export function AdBanner({ toolId }: { toolId: ToolId }) {
  const { user } = useMaro();
  const { pricing } = useSettings(Boolean(user));
  const ads = pricing.ads;

  if (!ads?.imageUrl || !ads.pages?.includes(toolId)) return null;

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ads.imageUrl}
      alt="Reklamë"
      className="h-auto w-full object-cover"
    />
  );

  return (
    <div className="mb-2.5 overflow-hidden rounded-2xl border border-line bg-surface-2">
      {ads.link ? (
        <a href={ads.link} target="_blank" rel="noopener noreferrer" className="block">
          {img}
        </a>
      ) : (
        img
      )}
    </div>
  );
}

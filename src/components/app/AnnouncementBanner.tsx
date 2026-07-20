"use client";

import * as React from "react";
import { useMaro } from "@/context/store";
import { useSettings } from "@/lib/hooks/useSettings";
import type { Announcement } from "@/lib/supabase/types";

// Admin-managed announcements shown above the composer prompt on the tools
// selected in Admin -> Reklamat. Either an uploaded image, or a text card with
// a color-customizable CTA. Falls back to the legacy single `ads` banner.
export function AnnouncementBanner({ toolId }: { toolId: string }) {
  const { user } = useMaro();
  const { pricing } = useSettings(Boolean(user));

  const list: Announcement[] = React.useMemo(() => {
    const anns = (pricing.announcements ?? []).filter(
      (a) => a.active !== false && a.pages?.includes(toolId)
    );
    if (anns.length) return anns;
    // Legacy single ad banner.
    const ads = pricing.ads;
    if (ads?.imageUrl && ads.pages?.includes(toolId)) {
      return [
        { id: "legacy", pages: ads.pages, kind: "image", imageUrl: ads.imageUrl, link: ads.link },
      ];
    }
    return [];
  }, [pricing, toolId]);

  if (!list.length) return null;

  return (
    <div className="mb-2.5 flex flex-col gap-2">
      {list.map((a) => (
        <AnnouncementCard key={a.id} a={a} />
      ))}
    </div>
  );
}

function AnnouncementCard({ a }: { a: Announcement }) {
  if (a.kind === "image") {
    if (!a.imageUrl) return null;
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={a.imageUrl} alt={a.title || "Njoftim"} className="h-auto w-full object-cover" />
    );
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
        {a.link ? (
          <a href={a.link} target="_blank" rel="noopener noreferrer" className="block">
            {img}
          </a>
        ) : (
          img
        )}
      </div>
    );
  }

  // Text announcement with customizable colors.
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-line px-4 py-3"
      style={{ background: a.bg || "var(--surface-2)", color: a.textColor || "var(--ink)" }}
    >
      <div className="min-w-0 flex-1">
        {a.title && <div className="text-[14px] font-bold leading-tight">{a.title}</div>}
        {a.body && <div className="text-[13px] opacity-90">{a.body}</div>}
      </div>
      {a.ctaLabel && (
        <a
          href={a.ctaLink || "#"}
          target={a.ctaLink ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="shrink-0 rounded-xl px-4 py-2 text-[13px] font-semibold"
          style={{ background: a.btnColor || "var(--brand)", color: a.btnTextColor || "#fff" }}
        >
          {a.ctaLabel}
        </a>
      )}
    </div>
  );
}

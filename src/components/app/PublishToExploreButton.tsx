"use client";

import * as React from "react";
import { shareToExplore } from "@/lib/services/exploreFeedService";
import { useMaro } from "@/context/store";
import { useToast } from "@/components/ui/Toast";
import { Globe, Loader2 } from "lucide-react";

export function PublishToExploreButton({
  toolId,
  prompt,
  url,
  remixOf,
}: {
  toolId: string;
  prompt: string;
  url: string;
  remixOf?: string;
}) {
  const { user } = useMaro();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [published, setPublished] = React.useState(false);

  const publish = async () => {
    if (!user) {
      toast("Hyr për të publikuar në Explore.");
      return;
    }
    setLoading(true);
    try {
      const res = await shareToExplore({ toolId, prompt, url, remixOf });
      setPublished(true);
      toast(res.slug ? `Publikuar! /c/${res.slug}` : "Publikuar në Explore!");
    } catch {
      toast("S'u publikua dot. Provo përsëri.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={publish}
      disabled={loading || published}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[12px] font-semibold text-ink transition-colors hover:bg-canvas disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Globe className="h-3.5 w-3.5" />
      )}
      {published ? "Publikuar" : "Publiko në Explore"}
    </button>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchCreationBySlug, remixCreation, toggleCreationLike } from "@/lib/services/exploreFeedService";
import type { ExploreItemExtended } from "@/lib/explore/types";
import { useMaro } from "@/context/store";
import { useToast } from "@/components/ui/Toast";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils/cn";
import { Heart, Repeat2 } from "lucide-react";

export default function CreationPermalinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const router = useRouter();
  const { user } = useMaro();
  const { toast } = useToast();
  const [item, setItem] = React.useState<ExploreItemExtended | null>(null);
  const [liked, setLiked] = React.useState(false);
  const [likes, setLikes] = React.useState(0);

  React.useEffect(() => {
    void fetchCreationBySlug(slug).then((data) => {
      setItem(data);
      if (data) {
        setLiked(Boolean(data.liked));
        setLikes(data.like_count ?? 0);
      }
    });
  }, [slug]);

  if (!item) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-canvas text-[14px] text-ink-3">
        Duke ngarkuar…
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 sm:px-6">
        <Link href="/">
          <Logo showWord wordClassName="h-6 w-auto" />
        </Link>
        <Link href="/explore" className="text-[14px] font-semibold text-brand hover:underline">
          Explore
        </Link>
      </header>

      <div className="mx-auto grid max-w-[900px] gap-6 px-4 py-8 sm:grid-cols-[1fr_280px] sm:px-6">
        <div className="overflow-hidden rounded-maro16 border border-line bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt="" className="w-full object-contain" />
        </div>
        <aside className="flex flex-col gap-4">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-ink-3">Prompt</p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink">{item.prompt}</p>
          </div>
          <p className="text-[14px] font-semibold text-ink">{item.author}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  toast("Hyr për të pëlqyer.");
                  return;
                }
                const next = !liked;
                setLiked(next);
                void toggleCreationLike(item.id, next).then(setLikes);
              }}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl border border-line px-4 text-[13px] font-semibold",
                liked ? "text-danger" : "text-ink"
              )}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
              {likes}
            </button>
            <button
              type="button"
              onClick={() => remixCreation(item)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-4 text-[13px] font-bold text-white"
            >
              <Repeat2 className="h-4 w-4" />
              Remix
            </button>
          </div>
          <button
            type="button"
            onClick={() => router.push("/imazh")}
            className="mt-auto inline-flex h-11 items-center justify-center rounded-xl bg-brand text-[14px] font-bold text-brand-fg"
          >
            Krijo me maro
          </button>
        </aside>
      </div>
    </div>
  );
}

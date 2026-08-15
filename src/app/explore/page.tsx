"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app/AppShell";
import {
  fetchExploreFeed,
  toggleCreationLike,
  remixCreation,
  fetchActiveChallenge,
} from "@/lib/services/exploreFeedService";
import { EXPLORE_SORTS, type ExploreItemExtended, type ExploreSort } from "@/lib/explore/types";
import { useMaro } from "@/context/store";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import { Compass, Heart, Repeat2, Share2, Trophy } from "lucide-react";

function ExploreCard({
  item,
  onLike,
}: {
  item: ExploreItemExtended;
  onLike: (id: string, liked: boolean) => void;
}) {
  const [liked, setLiked] = React.useState(Boolean(item.liked));
  const [likes, setLikes] = React.useState(item.like_count ?? 0);
  const { user } = useMaro();
  const { toast } = useToast();

  const toggleLike = () => {
    if (!user) {
      toast("Hyr për të pëlqyer.");
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    void toggleCreationLike(item.id, next).then(setLikes);
  };

  const share = async () => {
    const slug = item.slug;
    const url = slug ? `${window.location.origin}/c/${slug}` : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast("Linku u kopjua!");
    } catch {
      toast(url);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 break-inside-avoid overflow-hidden rounded-maro16 border border-line bg-surface"
    >
      <Link href={item.slug ? `/c/${item.slug}` : "#"} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.url} alt="" className="w-full object-cover" />
      </Link>
      <div className="p-3">
        <p className="line-clamp-2 text-[13px] text-ink-2">{item.prompt}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Link
            href={item.user_id ? `/u/${item.user_id}` : "#"}
            className="truncate text-[12px] font-semibold text-ink hover:underline"
          >
            {item.author}
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={toggleLike}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-lg transition-colors",
                liked ? "text-danger" : "text-ink-3 hover:bg-canvas hover:text-ink"
              )}
              aria-label="Pëlqe"
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
            </button>
            <span className="min-w-[1.25rem] text-[11px] font-semibold text-ink-3">{likes}</span>
            <button
              type="button"
              onClick={() => remixCreation(item)}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-canvas hover:text-ink"
              aria-label="Remix"
            >
              <Repeat2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={share}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-canvas hover:text-ink"
              aria-label="Ndaj"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function ExplorePage() {
  const [items, setItems] = React.useState<ExploreItemExtended[]>([]);
  const [sort, setSort] = React.useState<ExploreSort>("recent");
  const [loading, setLoading] = React.useState(true);
  const [challenge, setChallenge] = React.useState<Awaited<ReturnType<typeof fetchActiveChallenge>>>(null);

  React.useEffect(() => {
    void fetchActiveChallenge().then(setChallenge);
  }, []);

  React.useEffect(() => {
    setLoading(true);
    void fetchExploreFeed(sort).then((feed) => {
      setItems(feed);
      setLoading(false);
    });
  }, [sort]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-brand">
              <Compass className="h-6 w-6" />
              <h1 className="text-[26px] font-bold tracking-brand text-ink">Explore</h1>
            </div>
            <p className="mt-1 text-[14px] text-ink-2">
              Shiko, pëlqe dhe remix krijimet e komunitetit maro.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXPLORE_SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors",
                  sort === s.id
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-surface text-ink-2 hover:border-ink"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {challenge && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-maro16 border border-line bg-surface px-5 py-4">
            <div className="flex items-start gap-3">
              <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <div>
                <p className="text-[14px] font-bold text-ink">{challenge.title}</p>
                <p className="text-[13px] text-ink-2">{challenge.prompt_hint}</p>
                <p className="mt-1 text-[12px] font-semibold text-brand">
                  +{challenge.reward_credits} kredite për fituesit
                </p>
              </div>
            </div>
            <Link
              href="/imazh"
              className="inline-flex h-10 items-center rounded-xl bg-ink px-4 text-[13px] font-bold text-white"
            >
              Merr pjesë
            </Link>
          </div>
        )}

        {loading ? (
          <p className="mt-10 text-center text-[14px] text-ink-3">Duke ngarkuar…</p>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-maro16 border border-line bg-surface px-6 py-16 text-center">
            <p className="text-[15px] font-semibold text-ink">Ende pa krijime publike</p>
            <p className="mt-2 text-[14px] text-ink-2">
              Gjenero diçka dhe publiko në Explore që të të shohin të tjerët.
            </p>
            <Link
              href="/imazh"
              className="mt-6 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-[14px] font-bold text-white"
            >
              Shko te maro Imazh
            </Link>
          </div>
        ) : (
          <div className="mt-8 columns-2 gap-3 sm:columns-3 lg:columns-4 lg:gap-4">
            {items.map((item) => (
              <ExploreCard key={item.id} item={item} onLike={() => {}} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

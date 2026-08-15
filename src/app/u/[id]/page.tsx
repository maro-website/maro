"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { fetchExploreFeed, toggleFollow } from "@/lib/services/exploreFeedService";
import { useMaro } from "@/context/store";
import { useToast } from "@/components/ui/Toast";
import { User } from "lucide-react";

export default function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { user } = useMaro();
  const { toast } = useToast();
  const [items, setItems] = React.useState<Awaited<ReturnType<typeof fetchExploreFeed>>>([]);
  const [following, setFollowing] = React.useState(false);

  React.useEffect(() => {
    void fetchExploreFeed("recent").then((feed) =>
      setItems(feed.filter((i) => i.user_id === id))
    );
  }, [id]);

  const author = items[0]?.author ?? "Krijues";

  const follow = async () => {
    if (!user) {
      toast("Hyr për të ndjekur.");
      return;
    }
    const next = !following;
    setFollowing(next);
    const ok = await toggleFollow(id, next);
    if (!ok) {
      setFollowing(!next);
      toast("S'u ruajt dot.");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[900px] px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-ink text-white">
            <User className="h-8 w-8" />
          </span>
          <div>
            <h1 className="text-[24px] font-bold tracking-brand text-ink">{author}</h1>
            <p className="text-[14px] text-ink-2">{items.length} krijime publike</p>
          </div>
          {user && user.id !== id && (
            <button
              type="button"
              onClick={follow}
              className="ml-auto inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 text-[14px] font-semibold text-ink hover:bg-canvas"
            >
              {following ? "Po ndjek" : "Ndiq"}
            </button>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.slug ? `/c/${item.slug}` : "/explore"}
              className="overflow-hidden rounded-maro16 border border-line bg-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" className="aspect-square w-full object-cover" />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

"use client";
import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { ExploreDetails } from "@/components/explore/ExploreFeed";
import { fetchCreationBySlug } from "@/lib/services/exploreFeedService";
import type { ExploreItemExtended } from "@/lib/explore/types";
import { useMaro } from "@/context/store";
export default function CreationPermalinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params);
  const { user, ready } = useMaro();
  const [item, setItem] = React.useState<ExploreItemExtended | null>(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    if (!ready) return;
    let active = true; setLoading(true); setItem(null);
    void fetchCreationBySlug(slug).then(data => { if (active) setItem(data); }).catch(() => undefined).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug, user?.id, ready]);
  return <AppShell><div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
    <Link href="/explore" className="mb-6 inline-block text-sm text-ink-3 hover:text-ink">← Explore</Link>
    {loading ? <p role="status" className="py-12 text-center text-sm text-ink-3">Duke ngarkuar…</p> : item ? <ExploreDetails item={item} /> : <p className="py-12 text-center text-sm text-ink-3">Ky publikim nuk është në dispozicion.</p>}
  </div></AppShell>;
}

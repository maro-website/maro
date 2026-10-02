"use client";
import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { ExploreFeed } from "@/components/explore/ExploreFeed";
import { fetchActiveChallenge } from "@/lib/services/exploreFeedService";
import { Compass, Trophy } from "lucide-react";
export default function ExplorePage() {
  const [challenge, setChallenge] = React.useState<Awaited<ReturnType<typeof fetchActiveChallenge>>>(null);
  React.useEffect(() => { void fetchActiveChallenge().then(setChallenge).catch(() => undefined); }, []);
  return <AppShell><div className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
    <div className="mb-6 flex items-center gap-2"><Compass className="h-6 w-6 text-ink-3" /><h1 className="maro-page-title">Explore</h1></div>
    {challenge && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-maro16 bg-surface px-5 py-4"><div className="flex items-start gap-3"><Trophy className="h-5 w-5 text-ink-3" /><div><p className="text-sm font-bold text-ink">{challenge.title}</p><p className="text-sm text-ink-2">{challenge.prompt_hint}</p><p className="mt-1 text-xs text-ink-3">+{challenge.reward_credits} kredite për fituesit</p></div></div><Link href="/imazh" className="maro-button" data-variant="inverse">Merr pjesë</Link></div>}
    <ExploreFeed />
  </div></AppShell>;
}

"use client";
import { rateLimitedFetch as fetch } from "@/lib/client/rateLimit";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { ExploreFeed } from "@/components/explore/ExploreFeed";
import { StableImage } from "@/components/app/StableImage";
import { toggleFollow } from "@/lib/services/exploreFeedService";
import { useMaro } from "@/context/store";
import { useToast } from "@/components/ui/Toast";
import { User } from "lucide-react";
type PublicProfile = { id: string; name: string; username: string | null; avatarUrl: string | null };
export default function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { user } = useMaro();
  const { toast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = React.useState<PublicProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [following, setFollowing] = React.useState(false);
  React.useEffect(() => {
    const controller = new AbortController(); setProfile(null); setLoading(true);
    void fetch("/api/profiles?user=" + encodeURIComponent(id), { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const result: { profile: PublicProfile } = await response.json(); setProfile(result.profile);
      if (result.profile.username && /^[0-9a-f-]{36}$/i.test(id)) router.replace("/u/" + result.profile.username);
    }).catch(() => undefined).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, router]);
  const follow = async () => {
    if (!user || !profile) { toast("Hyr për të ndjekur."); return; }
    const ok = await toggleFollow(profile.id, !following); if (ok) setFollowing(!following); else toast("Ndryshimi nuk u ruajt.");
  };
  return <AppShell><div className="mx-auto w-full max-w-[1120px] px-4 py-10 sm:px-6">
    {loading ? <p role="status" className="text-sm text-ink-3">Duke ngarkuar…</p> : !profile ? <p className="text-sm text-ink-3">Profili nuk u gjet.</p> : <>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        {profile.avatarUrl ? <StableImage src={profile.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" /> : <span className="grid h-20 w-20 place-items-center rounded-full bg-surface-2 text-ink-3"><User className="h-8 w-8" /></span>}
        <div><h1 className="maro-page-title">{profile.name}</h1><p className="mt-1 text-sm text-ink-3">@{profile.username}</p></div>
        {user?.id === profile.id ? <Link href="/account" className="maro-button ml-auto" data-variant="secondary">Ndrysho profilin</Link> : <button type="button" onClick={() => void follow()} className="maro-button ml-auto" data-variant="secondary">{following ? "Po ndjek" : "Ndiq"}</button>}
      </div>
      <h2 className="mb-4 text-lg font-semibold text-ink">Krijimet publike</h2>
      <ExploreFeed author={profile.id} hideAuthorFilter />
    </>}
  </div></AppShell>;
}

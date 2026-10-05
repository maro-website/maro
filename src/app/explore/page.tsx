"use client";
import { AppShell } from "@/components/app/AppShell";
import { ExploreFeed } from "@/components/explore/ExploreFeed";
import { Compass } from "lucide-react";
export default function ExplorePage() {
  return <AppShell><div className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
    <div className="mb-6 flex items-center gap-2"><Compass className="h-6 w-6 text-ink-3" /><h1 className="maro-page-title">Explore</h1></div>
    <ExploreFeed />
  </div></AppShell>;
}

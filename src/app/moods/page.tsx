"use client";
import { AppShell } from "@/components/app/AppShell";
import { MoodCollection } from "@/components/moods/MoodCollection";

export default function MoodsPage() {
  return <AppShell><main className="moods-page scroll-thin relative flex h-full min-w-0 flex-col overflow-y-auto overflow-x-clip max-lg:h-auto"><div className="moods-container"><MoodCollection discovery /></div></main></AppShell>;
}

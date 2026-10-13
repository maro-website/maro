"use client";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { MoodCollection } from "@/components/moods/MoodCollection";
import { useMaro } from "@/context/store";
import { canUseMoods } from "@/lib/moods/model";

export default function MoodsPage() {
  const { user } = useMaro();
  return <AppShell><div className="mx-auto w-full max-w-6xl overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
    {canUseMoods(user?.email) && <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand">Një ide. Atmosfera të reja.</p><h1 className="text-3xl font-bold tracking-tight text-ink">maroMoods</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-2">Ruaje një mood dhe shtoja promptit, presetit dhe referencave të tua. Ideja mbetet e jotja.</p></div><Link href="/krijimet?category=moods" className="rounded-maro12 bg-surface px-4 py-3 text-sm font-semibold text-ink hover:bg-surface-2">Moods e ruajtura</Link></div>}
    <MoodCollection />
  </div></AppShell>;
}

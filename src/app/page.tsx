"use client";

import { AppShell } from "@/components/app/AppShell";
import { HomeHub } from "@/components/app/HomeHub";
import { useMaro } from "@/context/store";

export default function HomePage() {
  const { user } = useMaro();
  const firstName = user?.name?.split(" ")[0];

  return (
    <AppShell>
      <HomeHub firstName={firstName} />
    </AppShell>
  );
}

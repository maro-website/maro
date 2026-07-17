"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { Composer } from "@/components/app/Composer";

export default function WebsiteToolPage() {
  return (
    <AppShell>
      <Composer />
    </AppShell>
  );
}

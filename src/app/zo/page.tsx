"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { AudioStudio } from "@/components/app/AudioStudio";

export default function ZoToolPage() {
  return (
    <AppShell>
      <AudioStudio toolId="zo" />
    </AppShell>
  );
}

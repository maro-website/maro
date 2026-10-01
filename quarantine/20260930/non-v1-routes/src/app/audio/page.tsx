"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { AudioWorkspace } from "@/components/modules/AudioWorkspace";

export default function AudioToolPage() {
  return (
    <AppShell>
      <React.Suspense fallback={null}>
        <AudioWorkspace toolId="zo" />
      </React.Suspense>
    </AppShell>
  );
}

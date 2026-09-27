"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { ImazhWorkspace } from "@/components/modules/ImazhWorkspace";

export default function ImazhToolPage() {
  return (
    <AppShell>
      <React.Suspense fallback={null}>
        <ImazhWorkspace toolId="reklama" />
      </React.Suspense>
    </AppShell>
  );
}

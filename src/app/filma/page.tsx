"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { FilmaWorkspace } from "@/components/modules/FilmaWorkspace";

export default function FilmaToolPage() {
  return (
    <AppShell>
      <React.Suspense fallback={null}>
        <FilmaWorkspace toolId="filma" />
      </React.Suspense>
    </AppShell>
  );
}

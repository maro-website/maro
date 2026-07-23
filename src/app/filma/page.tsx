"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { ToolComposer } from "@/components/app/ToolComposer";

export default function FilmaToolPage() {
  return (
    <AppShell>
      <React.Suspense fallback={null}>
        <ToolComposer toolId="filma" />
      </React.Suspense>
    </AppShell>
  );
}

"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { ToolComposer } from "@/components/app/ToolComposer";

export default function WebsiteToolPage() {
  return (
    <AppShell>
      <React.Suspense fallback={null}>
        <ToolComposer toolId="website" />
      </React.Suspense>
    </AppShell>
  );
}

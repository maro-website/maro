"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { WebWorkspace } from "@/components/modules/WebWorkspace";

export default function WebsiteToolPage() {
  return (
    <AppShell>
      <React.Suspense fallback={null}>
        <WebWorkspace toolId="website" />
      </React.Suspense>
    </AppShell>
  );
}

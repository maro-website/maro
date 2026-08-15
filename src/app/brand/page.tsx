"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { BrandWorkspace } from "@/components/modules/BrandWorkspace";

export default function BrandToolPage() {
  return (
    <AppShell>
      <React.Suspense fallback={null}>
        <BrandWorkspace toolId="logo" />
      </React.Suspense>
    </AppShell>
  );
}

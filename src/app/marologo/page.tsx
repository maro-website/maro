"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { MaroLogoWizard } from "@/components/marologo/MaroLogoWizard";
import "@/components/marologo/marologo.css";

export default function MaroLogoPage() {
  return (
    <AppShell>
      <React.Suspense fallback={null}>
        <MaroLogoWizard />
      </React.Suspense>
    </AppShell>
  );
}

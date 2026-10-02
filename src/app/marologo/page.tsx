"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { MaroLogoWizard } from "@/components/marologo/MaroLogoWizard";
import "@/components/marologo/marologo.css";
import { useSearchParams } from "next/navigation";
import { ToolComposer } from "@/components/app/ToolComposer";

function LogoContent() {
  const params = useSearchParams();
  return params.has("chat") || params.has("open") ? <ToolComposer toolId="logo" /> : <MaroLogoWizard />;
}

export default function MaroLogoPage() {
  return (
    <AppShell>
      <React.Suspense fallback={null}>
        <LogoContent />
      </React.Suspense>
    </AppShell>
  );
}

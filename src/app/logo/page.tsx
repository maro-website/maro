"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { ImageStudio } from "@/components/app/ImageStudio";

export default function LogoToolPage() {
  return (
    <AppShell>
      <React.Suspense fallback={null}>
        <ImageStudio toolId="logo" />
      </React.Suspense>
    </AppShell>
  );
}

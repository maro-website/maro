"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { ImageStudio } from "@/components/app/ImageStudio";

export default function ImazhToolPage() {
  return (
    <AppShell>
      <React.Suspense fallback={null}>
        <ImageStudio toolId="reklama" />
      </React.Suspense>
    </AppShell>
  );
}

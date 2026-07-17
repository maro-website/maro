"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { ImageComposer } from "@/components/app/ImageComposer";

export default function ReklamaToolPage() {
  return (
    <AppShell>
      <ImageComposer toolId="reklama" />
    </AppShell>
  );
}

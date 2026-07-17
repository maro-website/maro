"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { ImageComposer } from "@/components/app/ImageComposer";

export default function LogoToolPage() {
  return (
    <AppShell>
      <ImageComposer toolId="logo" />
    </AppShell>
  );
}

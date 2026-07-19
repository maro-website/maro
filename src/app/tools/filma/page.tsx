"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { VideoComposer } from "@/components/app/VideoComposer";

export default function FilmaToolPage() {
  return (
    <AppShell>
      <VideoComposer />
    </AppShell>
  );
}

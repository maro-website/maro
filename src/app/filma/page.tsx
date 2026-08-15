"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { VideoStudio } from "@/components/app/VideoStudio";

export default function FilmaToolPage() {
  return (
    <AppShell>
      <VideoStudio toolId="filma" />
    </AppShell>
  );
}

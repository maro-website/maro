"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { AssistantPanel } from "@/components/app/AssistantPanel";

export default function BrainPage() {
  return (
    <AppShell>
      <AssistantPanel variant="page" />
    </AppShell>
  );
}

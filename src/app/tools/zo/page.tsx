"use client";

import { AppShell } from "@/components/app/AppShell";
import { ToolComposer } from "@/components/app/ToolComposer";

export default function ZoToolPage() {
  return (
    <AppShell>
      <ToolComposer toolId="zo" />
    </AppShell>
  );
}

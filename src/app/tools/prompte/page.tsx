"use client";

import { AppShell } from "@/components/app/AppShell";
import { ToolComposer } from "@/components/app/ToolComposer";

export default function PrompteToolPage() {
  return (
    <AppShell>
      <ToolComposer toolId="prompte" />
    </AppShell>
  );
}

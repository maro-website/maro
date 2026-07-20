"use client";

import { AppShell } from "@/components/app/AppShell";
import { ToolComposer } from "@/components/app/ToolComposer";

export default function FilmaToolPage() {
  return (
    <AppShell>
      <ToolComposer toolId="filma" />
    </AppShell>
  );
}

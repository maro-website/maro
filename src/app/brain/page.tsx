"use client";

import * as React from "react";
import { AppShell } from "@/components/app/AppShell";
import { BrainWorkspace } from "@/components/modules/BrainWorkspace";

/** maroBrain — workspace identity & Burimet (not chat). */
export default function BrainPage() {
  return (
    <AppShell>
      <BrainWorkspace />
    </AppShell>
  );
}

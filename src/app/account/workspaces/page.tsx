"use client";

import { AuthGate } from "@/components/dashboard/AuthGate";
import { AppShell } from "@/components/app/AppShell";
import { WorkspacesList } from "@/components/workspaces/WorkspacesList";

export default function WorkspacesPage() {
  return <AuthGate><AppShell showFooter><WorkspacesList /></AppShell></AuthGate>;
}

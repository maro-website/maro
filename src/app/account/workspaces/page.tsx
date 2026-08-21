"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/dashboard/AuthGate";
import { AppShell } from "@/components/app/AppShell";
import { useWorkspace } from "@/context/workspace";
import { MAX_WORKSPACES } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils/cn";
import { Plus, Settings } from "lucide-react";

function WorkspacesListInner() {
  const router = useRouter();
  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace, ready } = useWorkspace();
  const [creating, setCreating] = React.useState(false);

  const onCreate = async () => {
    if (workspaces.length >= MAX_WORKSPACES) return;
    setCreating(true);
    try {
      const n = workspaces.length + 1;
      const ws = await createWorkspace(`Maro Workspace #${n}`);
      await setActiveWorkspace(ws.id);
      router.push(`/account/workspaces/${ws.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell showFooter>
      <div className="maro-page-shell max-w-2xl">
        <h1 className="maro-page-title">Workspace-et</h1>
        <p className="maro-page-description text-[15px]">
          Menaxho workspace-et e maro. Mund të kesh deri në {MAX_WORKSPACES} workspace.
        </p>

        {!ready ? (
          <p className="mt-[30px] text-ink-3">Duke ngarkuar…</p>
        ) : (
          <ul className="maro-list mt-[30px]">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <Link
                  href={`/account/workspaces/${ws.id}`}
                  className={cn(
                    "maro-list-row transition-colors hover:bg-surface-hover",
                    ws.id === activeWorkspace?.id && "border-brand/30"
                  )}
                >
                  {ws.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ws.iconUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-[14px] font-bold text-brand">
                      {ws.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{ws.name}</span>
                  {ws.id === activeWorkspace?.id && (
                    <span className="text-[12px] font-semibold text-brand">Aktiv</span>
                  )}
                  <Settings className="h-4 w-4 shrink-0 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {workspaces.length >= MAX_WORKSPACES ? (
          <p className="mt-[30px] text-[13px] text-ink-2">
            Për më shumë se {MAX_WORKSPACES} workspace, na kontakto.
          </p>
        ) : (
          <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            className="maro-button mt-[30px]" data-variant="inverse"
          >
            <Plus className="h-4 w-4" />
            Shto workspace
          </button>
        )}
      </div>
    </AppShell>
  );
}

export default function WorkspacesPage() {
  return (
    <AuthGate>
      <WorkspacesListInner />
    </AuthGate>
  );
}

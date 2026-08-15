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
      <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8">
        <h1 className="text-[28px] font-bold tracking-brand text-ink">Workspace-et</h1>
        <p className="mt-2 text-[15px] text-ink-2">
          Menaxho workspace-et e maro. Mund të kesh deri në {MAX_WORKSPACES} workspace.
        </p>

        {!ready ? (
          <p className="mt-8 text-ink-3">Duke ngarkuar…</p>
        ) : (
          <ul className="mt-8 flex flex-col gap-2">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <Link
                  href={`/account/workspaces/${ws.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-maro16 border border-line bg-surface px-4 py-3 transition-colors hover:bg-canvas",
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
          <p className="mt-6 text-[13px] text-ink-2">
            Për më shumë se {MAX_WORKSPACES} workspace, na kontakto.
          </p>
        ) : (
          <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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

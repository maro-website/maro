"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Settings } from "lucide-react";
import { useMaro } from "@/context/store";
import { useWorkspace } from "@/context/workspace";
import { useCommerceEntitlements } from "@/lib/commerce/useCommerceEntitlements";
import { fetchCommerceEntitlements } from "@/lib/commerce/client";
import type { ResolvedEntitlements } from "@/lib/commerce/types";
import { workspaceCreationAction, workspaceLimitNotice } from "@/lib/workspaces/creationPolicy";
import { workspaceErrorMessage, workspaceRequest } from "@/lib/workspaces/request";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export function WorkspacesList() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, getAccessToken } = useMaro();
  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace, ready, error, refreshWorkspaces } = useWorkspace();
  const commerce = useCommerceEntitlements();
  const [creating, setCreating] = React.useState(false);
  const [checked, setChecked] = React.useState<{ owner: string; policy: ResolvedEntitlements } | null>(null);
  const [notice, setNotice] = React.useState<ReturnType<typeof workspaceLimitNotice> | null>(null);
  const busy = React.useRef(false);
  const addButton = React.useRef<HTMLButtonElement>(null);
  const mounted = React.useRef(false);
  const owner = React.useRef(user?.id);
  owner.current = user?.id;
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  React.useEffect(() => { setChecked(null); setNotice(null); }, [user?.id]);
  const policy = checked?.owner === user?.id ? checked?.policy : commerce.data?.entitlements;
  const closeNotice = () => {
    setNotice(null);
    // The async check temporarily disabled the trigger before opening the dialog.
    requestAnimationFrame(() => { if (mounted.current) addButton.current?.focus(); });
  };

  async function onCreate() {
    if (busy.current || !ready || error || !user) return;
    busy.current = true; setCreating(true); setNotice(null);
    const userId = user.id;
    const current = () => mounted.current && owner.current === userId;
    const readPolicy = async () => {
      const payload = await workspaceRequest(async signal => {
        const token = await getAccessToken();
        if (!current()) throw new Error("workspace_changed");
        return fetchCommerceEntitlements(token, signal);
      });
      if (!current()) throw new Error("workspace_changed");
      workspaceCreationAction(payload.entitlements);
      setChecked({ owner: userId, policy: payload.entitlements });
      return payload.entitlements;
    };
    try {
      // Recheck every click so admin changes apply to an already-open page.
      const latest = await readPolicy();
      if (workspaceCreationAction(latest) !== "create") { setNotice(workspaceLimitNotice(latest)); return; }
      const ws = await createWorkspace(`Maro Workspace #${latest.current_workspace_count + 1}`);
      if (!current()) return;
      await setActiveWorkspace(ws.id);
      if (current()) router.push(`/account/workspaces/${ws.id}`);
    } catch (cause) {
      if (!current()) return;
      if (cause instanceof Error && cause.message === "WORKSPACE_LIMIT") {
        // Another tab may have used the last slot; the DB is the final guard.
        try {
          const latest = await readPolicy();
          await refreshWorkspaces();
          if (current()) setNotice(workspaceLimitNotice(latest));
        }
        catch { if (current()) toast("Limiti nuk u ngarkua. Provo përsëri.", "error"); }
      } else toast(workspaceErrorMessage(cause, "Workspace nuk u krijua. Provo përsëri."), "error");
    } finally { busy.current = false; if (mounted.current) setCreating(false); }
  }

  return <div className="maro-page-shell max-w-2xl">
    <h1 className="maro-page-title">Workspace-et</h1>
    <p className="maro-page-description">Menaxho workspace-et e maro.</p>
    {ready && !error && policy && <p className="mt-2 text-sm text-ink-3">{workspaces.length} nga {policy.workspace_limit} workspace të përdorura.</p>}
    {!ready ? <p className="mt-8 text-ink-3">Duke ngarkuar…</p> : error ? <div role="alert" className="mt-8 space-y-3 text-danger"><p>{error}</p><Button variant="secondary" onClick={() => void refreshWorkspaces()}>Provo përsëri</Button></div> : <ul className="maro-list mt-8">
      {workspaces.map(ws => <li key={ws.id}><Link href={`/account/workspaces/${ws.id}`} className={cn("maro-list-row transition-colors hover:bg-surface-hover", ws.id === activeWorkspace?.id && "border-brand/30")}>
        {ws.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ws.iconUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
        ) : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-sm font-bold text-brand">{ws.name.charAt(0).toUpperCase()}</span>}
        <span className="min-w-0 flex-1 truncate text-base font-semibold text-ink">{ws.name}</span>
        {ws.id === activeWorkspace?.id && <span className="text-xs font-semibold text-brand">Aktiv</span>}
        <Settings className="h-4 w-4 shrink-0 text-ink-3" />
      </Link></li>)}
    </ul>}
    <Button ref={addButton} variant="primary" className="mt-8" icon={<Plus className="h-4 w-4" />} loading={creating} disabled={!ready || Boolean(error) || !user} onClick={() => void onCreate()}>{creating ? "Duke kontrolluar…" : "Shto workspace"}</Button>
    {notice && <Modal open onClose={closeNotice} aria-label={notice.title}>
      <ModalHeader title={notice.title} description={notice.description} />
      <ModalFooter><Button variant="secondary" onClick={closeNotice}>Mbyll</Button><Link href={notice.href} className="maro-button" data-variant="brand" data-size="md">{notice.label}</Link></ModalFooter>
    </Modal>}
  </div>;
}

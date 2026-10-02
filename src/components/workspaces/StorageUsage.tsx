"use client";
import * as React from "react";
import { useMaro } from "@/context/store";
import { fetchAccountPolicy } from "@/lib/workspaces/accountPolicyClient";
import { STORAGE_CHANGED_EVENT, type AccountPolicy } from "@/lib/workspaces/accountPolicy";

export function StorageUsage({ className = "" }: { className?: string }) {
  const userId = useMaro().user?.id;
  const [usage, setUsage] = React.useState<AccountPolicy | null>(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    setUsage(null);
    setFailed(false);
    const refresh = () => {
      if (!userId) return;
      void fetchAccountPolicy(userId).then((policy) => {
        if (active) { setUsage(policy); setFailed(false); }
      }).catch(() => { if (active) setFailed(true); });
    };
    refresh();
    window.addEventListener(STORAGE_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener(STORAGE_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [userId]);
  if (!userId) return null;
  const percent = usage?.limitBytes ? Math.min(100, usage.usedBytes / usage.limitBytes * 100) : 0;
  return <div className={`rounded-maro16 bg-surface-2 p-4 ${className}`}>
    <div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-ink"><span>Hapësira</span><span>{usage?.limitBytes ? `${Math.round(percent)}%` : ""}</span></div>
    <p role="status" className="mt-2 text-[13px] text-ink-2">{failed ? "Storage nuk u ngarkua." : usage ?
      `${(usage.usedBytes / 1e9).toFixed(3)} GB${usage.limitBytes === null ? " të përdorura" : ` / ${usage.limitBytes / 1e9} GB`}` : "Duke ngarkuar…"}</p>
    {usage?.limitBytes && <div role="progressbar" aria-label="Hapësira e përdorur" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-hover"><div className={`h-full rounded-full ${percent >= 95 ? "bg-danger" : "bg-ink-3"}`} style={{ width: `${percent}%` }} /></div>}
    <p className="mt-2 text-[11px] leading-relaxed text-ink-3">Gjenerimet dhe upload-et në gjithë llogarinë.</p>
  </div>;
}

"use client";
import * as React from "react";
import { useMaro } from "@/context/store";
import { fetchAccountPolicy } from "@/lib/workspaces/accountPolicyClient";
import { STORAGE_CHANGED_EVENT, type AccountPolicy } from "@/lib/workspaces/accountPolicy";

export function StorageUsage() {
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
  return <p role="status" className="mt-2 text-[12px] text-ink-3">
    {failed ? "Storage nuk u ngarkua. Provo përsëri." : usage ?
      `${(usage.usedBytes / 1e9).toFixed(3)} GB${usage.limitBytes === null ? " të përdorura" : ` / ${usage.limitBytes / 1e9} GB`} · Gjenerimet dhe upload-et në gjithë llogarinë` :
      "Duke ngarkuar storage…"}
  </p>;
}

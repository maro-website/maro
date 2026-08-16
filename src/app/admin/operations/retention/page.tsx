"use client";

import * as React from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";

export default function OperationsRetentionPage() {
  const [runs, setRuns] = React.useState<Array<{ domain: string; status: string; rowsAffected: number; startedAt: string }>>([]);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const res = await fetch("/api/admin/operations/retention", { headers });
    const data = (await res.json()) as { runs?: typeof runs };
    setRuns(data.runs ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function runRetention() {
    setBusy(true);
    const headers = await adminAuthHeaders(true);
    await fetch("/api/admin/operations/retention", { method: "POST", headers });
    setBusy(false);
    await load();
  }

  return (
    <div>
      <AdminPageHeader
        title="Data retention"
        description="Politikat e pastrimit për metadata debug — kurrë pagesat ose audit log."
      />

      <section className="rounded-xl border border-line bg-surface p-4">
        <p className="text-[13px] text-ink-2">
          Ekzekuton politikat e retention për generation_debug dhe metadata të ngjashme.
        </p>
        <Button className="mt-3" size="sm" loading={busy} onClick={() => void runRetention()}>
          Run retention now
        </Button>
        <ul className="mt-4 space-y-1 text-[12px] text-ink-2">
          {runs.slice(0, 10).map((r, i) => (
            <li key={i}>
              {r.domain} · {r.status} · {r.rowsAffected} rows · {new Date(r.startedAt).toLocaleString()}
            </li>
          ))}
          {runs.length === 0 && <li>Nuk ka ekzekutime të regjistruara ende.</li>}
        </ul>
      </section>
    </div>
  );
}

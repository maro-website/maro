"use client";

import * as React from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { timeAgo } from "@/lib/utils/format";

interface AuditRow {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
}

export default function OperationsAuditPage() {
  const [events, setEvents] = React.useState<AuditRow[]>([]);

  React.useEffect(() => {
    void (async () => {
      const headers = await adminAuthHeaders();
      const res = await fetch("/api/admin/operations/logs?kind=audit", { headers });
      const data = (await res.json()) as { events?: AuditRow[] };
      setEvents(data.events ?? []);
    })();
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="Audit log"
        description="Immutable admin audit trail (audit_events)"
        actions={
          <Link href="/admin/operations/logs" className="text-[13px] font-semibold text-brand hover:underline">
            System logs →
          </Link>
        }
      />

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface-2 text-[11px] uppercase text-ink-3">
            <tr>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {events.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-2 font-semibold">{e.action}</td>
                <td className="px-3 py-2 text-ink-2">
                  {e.targetType ?? "—"} {e.targetId ? `· ${e.targetId.slice(0, 8)}…` : ""}
                </td>
                <td className="px-3 py-2 font-mono text-[11px]">{e.actorId?.slice(0, 8) ?? "system"}</td>
                <td className="px-3 py-2 text-ink-3">{timeAgo(e.createdAt)}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-ink-3">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

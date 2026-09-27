"use client";

import * as React from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { timeAgo } from "@/lib/utils/format";

export default function OperationsLogsPage() {
  const [generations, setGenerations] = React.useState<Array<{ id: string; tool: string; credits: number; createdAt: string }>>([]);
  const [security, setSecurity] = React.useState<Array<{ id: string; eventType: string; severity: string; createdAt: string }>>([]);

  React.useEffect(() => {
    void (async () => {
      const headers = await adminAuthHeaders();
      const [genRes, secRes] = await Promise.all([
        fetch("/api/admin/operations/logs?kind=generations", { headers }),
        fetch("/api/admin/operations/logs?kind=security", { headers }),
      ]);
      const genData = (await genRes.json()) as { generations?: typeof generations };
      const secData = (await secRes.json()) as { events?: typeof security };
      setGenerations(genData.generations ?? []);
      setSecurity(secData.events ?? []);
    })();
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="Operations logs"
        description="Recent generations and security events"
        actions={
          <Link href="/admin/operations/flags" className="text-[13px] font-semibold text-brand hover:underline">
            Kill switches →
          </Link>
        }
      />

      <section className="mb-6">
        <h2 className="mb-2 text-[14px] font-semibold text-ink">Generations</h2>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-2 text-[11px] uppercase text-ink-3">
              <tr>
                <th className="px-3 py-2">Tool</th>
                <th className="px-3 py-2">Credits</th>
                <th className="px-3 py-2">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {generations.map((g) => (
                <tr key={g.id}>
                  <td className="px-3 py-2 font-semibold">{g.tool}</td>
                  <td className="px-3 py-2">{g.credits}</td>
                  <td className="px-3 py-2 text-ink-3">{timeAgo(g.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[14px] font-semibold text-ink">Security events</h2>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-2 text-[11px] uppercase text-ink-3">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {security.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2">{e.eventType}</td>
                  <td className="px-3 py-2">{e.severity}</td>
                  <td className="px-3 py-2 text-ink-3">{timeAgo(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

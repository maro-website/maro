"use client";

import * as React from "react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { timeAgo } from "@/lib/utils/format";

interface TicketRow {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = React.useState<TicketRow[]>([]);
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const res = await fetch("/api/admin/support/tickets", { headers });
    const data = (await res.json()) as { tickets?: TicketRow[] };
    setTickets(data.tickets ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function createTicket() {
    if (!subject.trim() || !body.trim()) return;
    setBusy(true);
    try {
      const headers = await adminAuthHeaders(true);
      await fetch("/api/admin/support/tickets", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "create_ticket", subject, body }),
      });
      setSubject("");
      setBody("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    const headers = await adminAuthHeaders(true);
    await fetch("/api/admin/support/tickets", {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "update_status", ticketId: id, status }),
    });
    await load();
  }

  return (
    <div>
      <AdminPageHeader
        title="Support Center"
        description="Tickets, generation reports, and manual refund records"
        actions={
          <Link href="/admin/support/reports" className="text-[13px] font-semibold text-brand hover:underline">
            Generation reports →
          </Link>
        }
      />

      <div className="mb-4 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-semibold text-ink">New ticket</h2>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Initial message" />
        </div>
        <Button className="mt-2" onClick={() => void createTicket()} disabled={busy}>
          Create
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface-2 text-[11px] uppercase text-ink-3">
            <tr>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {tickets.map((t) => (
              <tr key={t.id}>
                <td className="px-3 py-2">{t.subject}</td>
                <td className="px-3 py-2">{t.priority}</td>
                <td className="px-3 py-2">
                  <select
                    value={t.status}
                    onChange={(e) => void setStatus(t.id, e.target.value)}
                    className="rounded border border-line bg-surface px-2 py-1 text-[12px]"
                  >
                    {["open", "pending", "resolved", "closed"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-ink-3">{timeAgo(t.createdAt)}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-ink-3">
                  No tickets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { ADMIN_ROUTES } from "@/lib/admin/routes";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";
import { timeAgo } from "@/lib/utils/format";

interface LeadRow {
  id: string;
  user_id: string | null;
  email: string;
  status: string;
  questionnaire: Record<string, unknown> | null;
  admin_notes: string | null;
  created_at: string;
}

interface BusinessMembership {
  user_id: string;
  plan_id: string;
  status: string;
  expires_at: string | null;
  workspace_limit_override: number | null;
  concurrency_limit_override: number | null;
  commercial_notes: string | null;
}

export default function CommerceBusinessPage() {
  const [leads, setLeads] = React.useState<LeadRow[]>([]);
  const [memberships, setMemberships] = React.useState<BusinessMembership[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const res = await fetch("/api/admin/commerce/business", { headers });
    const data = (await res.json()) as { leads?: LeadRow[]; businessMemberships?: BusinessMembership[] };
    setLeads(data.leads ?? []);
    setMemberships(data.businessMemberships ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function patchLead(id: string, patch: { status?: string; admin_notes?: string }) {
    setBusy(id);
    try {
      const headers = await adminAuthHeaders(true);
      await fetch("/api/admin/commerce/business", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ kind: "lead", id, patch }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function patchMembership(userId: string, patch: Partial<BusinessMembership>) {
    setBusy(userId);
    try {
      const headers = await adminAuthHeaders(true);
      await fetch("/api/admin/commerce/business", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ kind: "membership", userId, patch }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Business"
        description="Leads, questionnaire data, and business membership overrides — not a full CRM"
        actions={
          <Link href={ADMIN_ROUTES.commerce.overview} className="text-brand hover:underline text-[13px] font-semibold">
            Overview →
          </Link>
        }
      />

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-semibold text-ink">Business leads</h2>
        <div className="mt-4 space-y-4">
          {leads.length === 0 && <p className="text-[13px] text-ink-3">No leads yet.</p>}
          {leads.map((lead) => (
            <div key={lead.id} className="rounded-lg border border-line p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{lead.email}</p>
                  <p className="text-[12px] text-ink-3">
                    {lead.status} · {timeAgo(lead.created_at)}
                    {lead.user_id ? ` · user ${lead.user_id.slice(0, 8)}…` : ""}
                  </p>
                </div>
                <select
                  className="rounded-lg border border-line bg-surface px-2 py-1 text-[13px]"
                  value={lead.status}
                  onChange={(e) => void patchLead(lead.id, { status: e.target.value })}
                  disabled={busy === lead.id}
                >
                  <option value="new">new</option>
                  <option value="contacted">contacted</option>
                  <option value="qualified">qualified</option>
                  <option value="closed_won">closed_won</option>
                  <option value="closed_lost">closed_lost</option>
                </select>
              </div>
              {lead.questionnaire && (
                <pre className="mt-2 max-h-[120px] overflow-auto rounded bg-surface-2 p-2 text-[11px] text-ink-2">
                  {JSON.stringify(lead.questionnaire, null, 2)}
                </pre>
              )}
              <textarea
                className="mt-2 w-full rounded-lg border border-line bg-surface p-2 text-[13px]"
                rows={2}
                placeholder="Admin notes"
                defaultValue={lead.admin_notes ?? ""}
                onBlur={(e) => {
                  if (e.target.value !== (lead.admin_notes ?? "")) {
                    void patchLead(lead.id, { admin_notes: e.target.value });
                  }
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-semibold text-ink">Business memberships</h2>
        <div className="mt-4 space-y-4">
          {memberships.length === 0 && <p className="text-[13px] text-ink-3">No business memberships.</p>}
          {memberships.map((m) => (
            <div key={m.user_id} className="rounded-lg border border-line p-3">
              <p className="font-mono text-[12px] text-ink-2">{m.user_id}</p>
              <p className="text-[13px] text-ink">
                {m.status} · expires {m.expires_at ? timeAgo(m.expires_at) : "—"}
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <label className="text-[11px] text-ink-3">
                  Workspace override
                  <Input
                    type="number"
                    defaultValue={m.workspace_limit_override ?? ""}
                    onBlur={(e) =>
                      void patchMembership(m.user_id, {
                        workspace_limit_override: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </label>
                <label className="text-[11px] text-ink-3">
                  Concurrency override
                  <Input
                    type="number"
                    defaultValue={m.concurrency_limit_override ?? ""}
                    onBlur={(e) =>
                      void patchMembership(m.user_id, {
                        concurrency_limit_override: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </label>
              </div>
              <textarea
                className="mt-2 w-full rounded-lg border border-line bg-surface p-2 text-[13px]"
                rows={2}
                placeholder="Commercial notes"
                defaultValue={m.commercial_notes ?? ""}
                onBlur={(e) =>
                  void patchMembership(m.user_id, { commercial_notes: e.target.value || null })
                }
              />
              <Button className="mt-2" size="sm" disabled={busy === m.user_id} onClick={() => void load()}>
                Refresh
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

"use client";

import * as React from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { adminAuthHeaders } from "@/lib/admin/clientFetch";

interface CampaignRow {
  id: string;
  kind: string;
  title: string;
  body: string;
  active: boolean;
}

export default function AdminNotificationsPage() {
  const [campaigns, setCampaigns] = React.useState<CampaignRow[]>([]);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  const load = React.useCallback(async () => {
    const headers = await adminAuthHeaders();
    const res = await fetch("/api/admin/notifications/campaigns", { headers });
    const data = (await res.json()) as { campaigns?: CampaignRow[] };
    setCampaigns(data.campaigns ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function createBanner() {
    if (!title.trim()) return;
    const headers = await adminAuthHeaders(true);
    await fetch("/api/admin/notifications/campaigns", {
      method: "POST",
      headers,
      body: JSON.stringify({ kind: "global_banner", title, body, active: false }),
    });
    setTitle("");
    setBody("");
    await load();
  }

  async function toggleActive(c: CampaignRow) {
    const headers = await adminAuthHeaders(true);
    await fetch("/api/admin/notifications/campaigns", {
      method: "POST",
      headers,
      body: JSON.stringify({ id: c.id, kind: c.kind, title: c.title, body: c.body, active: !c.active }),
    });
    await load();
  }

  return (
    <div>
      <AdminPageHeader title="Notifications" description="Global banners, tool banners, and in-app campaigns" />

      <div className="mb-4 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-semibold text-ink">New global banner (draft)</h2>
        <div className="mt-2 grid gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body" />
        </div>
        <Button className="mt-2" onClick={() => void createBanner()}>
          Save draft
        </Button>
      </div>

      <div className="space-y-2">
        {campaigns.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
            <div>
              <div className="font-semibold text-ink">{c.title}</div>
              <div className="text-[12px] text-ink-3">
                {c.kind} · {c.body.slice(0, 80)}
              </div>
            </div>
            <Switch checked={c.active} onChange={() => void toggleActive(c)} />
          </div>
        ))}
        {campaigns.length === 0 && <div className="text-[13px] text-ink-3">No campaigns yet.</div>}
      </div>
    </div>
  );
}

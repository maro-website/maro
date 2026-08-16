"use client";

import * as React from "react";
import { useMaro } from "@/context/store";
import { getSupabaseBrowser, supabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Misc";
import { useToast } from "@/components/ui/Toast";
import { timeAgo } from "@/lib/utils/format";
import { Archive, RotateCcw } from "lucide-react";

interface ReportRow {
  id: string;
  user_email: string;
  status: string;
  tool_id?: string | null;
  message?: string | null;
  prompt?: string | null;
  target_url?: string | null;
  credits_spent?: number | null;
  created_at: string;
}

export function GenerationReportsPanel() {
  const { toast } = useToast();
  const { getAccessToken } = useMaro();
  const [rows, setRows] = React.useState<ReportRow[] | null>(null);
  const [missing, setMissing] = React.useState(false);
  const [big, setBig] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!supabaseConfigured) return setRows([]);
    const { data, error } = await getSupabaseBrowser()
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setMissing(true);
      setRows([]);
      return;
    }
    setRows((data as ReportRow[]) ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, action: "refund" | "archive") => {
    setBusy(id);
    const token = await getAccessToken();
    const res = await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ id, action }),
    });
    setBusy(null);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      return toast("Error: " + (j.error || res.status));
    }
    toast(action === "refund" ? "Credits refunded" : "Archived");
    void load();
  };

  if (rows === null) return <Spinner className="h-6 w-6" />;

  if (missing) {
    return (
      <div className="rounded-xl bg-surface-2 px-4 py-3 text-[13.5px] text-ink-2">
        Reports table missing — run migration 0008_reports_announcements.sql.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="rounded-2xl bg-surface p-4">
          <div className="flex flex-wrap items-start gap-4">
            {r.target_url && !r.target_url.startsWith("data:") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.target_url}
                alt=""
                onClick={() => setBig(r.target_url!)}
                className="h-16 w-16 shrink-0 cursor-zoom-in rounded-xl object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                {r.user_email}
                <Badge tone={r.status === "open" ? "neutral" : "brand"} className="text-[10px] capitalize">
                  {r.status}
                </Badge>
                {r.tool_id && <span className="text-[12px] font-normal text-ink-3">· {r.tool_id}</span>}
              </div>
              {r.message && <div className="mt-1 text-[13px] text-ink-2">{r.message}</div>}
              {r.prompt && <div className="mt-1 line-clamp-2 text-[12px] text-ink-3">{r.prompt}</div>}
              <div className="mt-1 text-[11.5px] text-ink-3">
                {timeAgo(r.created_at)} · {r.credits_spent ?? 0} credits
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" icon={<RotateCcw className="h-3.5 w-3.5" />} loading={busy === r.id} onClick={() => void act(r.id, "refund")}>
                Refund credits
              </Button>
              <Button size="sm" variant="ghost" icon={<Archive className="h-3.5 w-3.5" />} onClick={() => void act(r.id, "archive")}>
                Archive
              </Button>
            </div>
          </div>
        </div>
      ))}
      {rows.length === 0 && <div className="rounded-xl bg-surface px-4 py-10 text-center text-[13.5px] text-ink-3">No reports yet.</div>}
      {big && (
        <div onClick={() => setBig(null)} className="fixed inset-0 z-[100] grid cursor-zoom-out place-items-center bg-scrim p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt="" className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
}

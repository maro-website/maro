import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { feedUsageTool, jobUsageTool, refundFeedId, type CreditUsage, type CreditUsageRow, type UsageFeed, type UsageJob } from "./usage";

const PAGE_SIZE = 500;
const JOB_BATCH_SIZE = 100;

type UsageTransaction = {
  id: string;
  job_id: string | null;
  type: string;
  amount: number;
  idempotency_key: string | null;
  module: string | null;
};

/** Read-only account totals from the immutable ledger, including historical jobs.
 * Never return job metadata, private prompts, feed briefs or provider costs.
 */
export async function fetchCreditUsage(userId: string): Promise<CreditUsage> {
  const db = getSupabaseAdmin();
  const snapshot = new Date().toISOString();
  const feedsById = new Map<string, UsageFeed>();
  const feedsByJob = new Map<string, UsageFeed>();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await db.from("maro_feeds")
      .select("id,order_job_id,app_format:brief->mobile->>format,marketing_id:brief->marketing->>campaignId")
      .eq("owner_id", userId).lte("created_at", snapshot)
      .order("created_at", { ascending: true }).order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error("credit_usage_unavailable");
    const rows = (data ?? []) as UsageFeed[];
    for (const feed of rows) {
      feedsById.set(feed.id, feed);
      feedsByJob.set(feed.order_job_id, feed);
    }
    if (rows.length < PAGE_SIZE) break;
  }

  const totals = new Map<string, CreditUsageRow>();
  let unattributedRefunds = 0;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await db.from("credit_transactions")
      .select("id,job_id,type,amount,idempotency_key,module:metadata->>module")
      .eq("user_id", userId).in("type", ["charge", "refund"])
      .lte("created_at", snapshot)
      .order("created_at", { ascending: true }).order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error("credit_usage_unavailable");
    const rows = (data ?? []) as UsageTransaction[];
    const jobIds = [...new Set(rows.flatMap(row => row.job_id ? [row.job_id] : []))];
    const jobs = new Map<string, UsageJob>();
    for (let start = 0; start < jobIds.length; start += JOB_BATCH_SIZE) {
      const result = await db.from("generation_jobs")
        .select("id,module,feed_order:metadata->maro_feed_order,feed_id:metadata->>maro_feed_id,preset_id:metadata->v1_request->>presetId")
        .eq("user_id", userId).in("id", jobIds.slice(start, start + JOB_BATCH_SIZE));
      if (result.error) throw new Error("credit_usage_unavailable");
      for (const job of (result.data ?? []) as UsageJob[]) jobs.set(job.id, job);
    }
    for (const tx of rows) {
      const job = tx.job_id ? jobs.get(tx.job_id) : undefined;
      const refundId = tx.type === "refund" ? refundFeedId(tx.idempotency_key) : null;
      const feed = feedsByJob.get(tx.job_id ?? "") ?? feedsById.get(job?.feed_id ?? refundId ?? "");
      const tool = feed ? feedUsageTool(feed) : jobUsageTool(job, undefined, tx.module);
      if (tx.type === "refund" && tool.module === "unattributed") {
        // An account-level refund cannot be guessed into an unrelated tool.
        unattributedRefunds += tx.amount;
        continue;
      }
      const total = totals.get(tool.module) ?? { ...tool, charged: 0, refunded: 0, credits: 0 };
      if (tx.type === "charge") total.charged += tx.amount;
      else total.refunded += tx.amount;
      total.credits = total.charged - total.refunded;
      totals.set(tool.module, total);
    }
    if (rows.length < PAGE_SIZE) break;
  }
  return {
    items: [...totals.values()].filter(row => row.charged || row.refunded)
      .sort((a, b) => b.credits - a.credits || a.label.localeCompare(b.label)),
    unattributedRefunds,
  };
}

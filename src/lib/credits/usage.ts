import { getModuleAvailability, resolveProductModule } from "@/lib/modules/availability";

export interface CreditUsageRow {
  module: string;
  label: string;
  charged: number;
  refunded: number;
  credits: number;
}

export interface CreditUsage {
  items: CreditUsageRow[];
  unattributedRefunds: number;
}

export interface UsageJob {
  id: string;
  module: string;
  feed_order: boolean | null;
  feed_id: string | null;
  preset_id: string | null;
}

export interface UsageFeed {
  id: string;
  order_job_id: string;
  app_format: string | null;
  marketing_id: string | null;
}

export function feedUsageTool(feed?: UsageFeed): { module: string; label: string } {
  if (feed?.app_format) return { module: "apps", label: "maroApps" };
  if (feed?.marketing_id) return { module: "marketing", label: "maroMarketing" };
  return { module: "feed", label: "maroFeed" };
}

export function jobUsageTool(job?: UsageJob, feed?: UsageFeed, legacyModule?: string | null) {
  if (feed || job?.feed_order || job?.feed_id) return feedUsageTool(feed);
  if (job?.preset_id) return { module: "presets", label: "maroPresets" };
  const product = getModuleAvailability(job?.module || legacyModule);
  return product
    ? { module: resolveProductModule(job?.module || legacyModule)!, label: product.name }
    : { module: "unattributed", label: "Tool i paidentifikuar" };
}

/** These exact keys are written by the atomic Feed refund/cancellation RPCs. */
export function refundFeedId(key: string | null): string | null {
  return key?.match(/^feed-(?:cancel|refund)-([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i)?.[1] ?? null;
}

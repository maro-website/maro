export type AccountPolicy = {
  brainAccess: boolean;
  brainResetAt: string | null;
  brainDeleteAt: string | null;
  usedBytes: number;
  limitBytes: number | null;
};

export function parseAccountPolicy(value: unknown): AccountPolicy {
  if (!value || typeof value !== "object") throw new Error("account_policy_unavailable");
  const row = value as Record<string, unknown>;
  if (typeof row.brainAccess !== "boolean" || typeof row.usedBytes !== "number" ||
      !Number.isSafeInteger(row.usedBytes) || row.usedBytes < 0 ||
      (row.limitBytes !== null && (typeof row.limitBytes !== "number" || !Number.isSafeInteger(row.limitBytes) || row.limitBytes <= 0)) ||
      (row.brainResetAt !== null && (typeof row.brainResetAt !== "string" || !Number.isFinite(Date.parse(row.brainResetAt)))) ||
      (row.brainDeleteAt !== null && (typeof row.brainDeleteAt !== "string" || !Number.isFinite(Date.parse(row.brainDeleteAt))))) {
    throw new Error("account_policy_unavailable");
  }
  return row as AccountPolicy;
}

export const STORAGE_CHANGED_EVENT = "maro:storage-changed";
export function notifyStorageChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(STORAGE_CHANGED_EVENT));
}

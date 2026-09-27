export const NOTICE_DISMISSAL_TTL_MS = 24 * 60 * 60 * 1000;

export function isNoticeEligible(input: {
  targets: string[];
  moduleId: string;
  dismissedAt?: string | null;
  now?: number;
}): boolean {
  const targets = input.targets.length ? input.targets : ["all"];
  if (!targets.includes("all") && !targets.includes(input.moduleId)) return false;
  if (!input.dismissedAt) return true;
  const dismissed = Date.parse(input.dismissedAt);
  if (!Number.isFinite(dismissed)) return true;
  return (input.now ?? Date.now()) - dismissed >= NOTICE_DISMISSAL_TTL_MS;
}

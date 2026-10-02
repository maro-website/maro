const DAY_MS = 24 * 60 * 60 * 1000;
export const BRAIN_RETENTION_DAYS = 60;

/** Presentation only. Access and deletion remain governed by the server policy. */
export function brainRetentionView(deleteAt: string | null, resetAt: string | null, now: number) {
  const deadline = deleteAt ? Date.parse(deleteAt) : NaN;
  if (!Number.isFinite(deadline)) {
    return { kind: resetAt ? "reset" : "new", deadline: null, startedAt: null, daysLeft: null, elapsedDays: 0, progress: 0 } as const;
  }
  const duration = BRAIN_RETENTION_DAYS * DAY_MS;
  const startedAt = deadline - duration;
  const progress = Math.max(0, Math.min(100, (now - startedAt) / duration * 100));
  return {
    kind: now >= deadline ? "due" : "retained",
    deadline, startedAt,
    daysLeft: Math.max(0, Math.min(BRAIN_RETENTION_DAYS, Math.ceil((deadline - now) / DAY_MS))),
    elapsedDays: Math.max(0, Math.min(BRAIN_RETENTION_DAYS, Math.floor((now - startedAt) / DAY_MS))),
    progress,
  } as const;
}

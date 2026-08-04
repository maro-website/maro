/** maroHerët: free maroFort for users who sign up in August 2026, until 1 Sep 2026. */
export const MARO_HERET_END = new Date("2026-09-01T00:00:00+02:00");

export function isMaroHeretOfferActive(now = new Date()): boolean {
  return now < MARO_HERET_END;
}

export function isAugust2026Signup(createdAt: string | undefined | null): boolean {
  if (!createdAt) return false;
  const d = new Date(createdAt);
  return d.getFullYear() === 2026 && d.getMonth() === 7;
}

export function isMaroHeretEligible(
  createdAt: string | undefined | null,
  now = new Date()
): boolean {
  return isMaroHeretOfferActive(now) && isAugust2026Signup(createdAt);
}

export function maroHeretCountdown(now = new Date()): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
} {
  const diff = Math.max(0, MARO_HERET_END.getTime() - now.getTime());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
    expired: diff === 0,
  };
}

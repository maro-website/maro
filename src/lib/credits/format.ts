/**
 * Format a credit count without locale grouping.
 *
 * Credits are product units, not money: `3000` must never be rendered as
 * `3.000` or `3,000` because either separator can be read as a decimal mark.
 */
export function formatCredits(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(Math.trunc(value));
}

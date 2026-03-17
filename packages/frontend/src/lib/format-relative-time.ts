/**
 * Canonical relative-time formatter.
 *
 * Two call modes:
 *   - `formatRelativeTime(createdAt)` — short tokens: "now", "2m", "1h", "3d", "1w"
 *   - `formatRelativeTime(createdAt, t)` — i18n strings via translator function
 *
 * `createdAt` is Unix epoch SECONDS (not ms), consistent with the codebase convention.
 *
 * Buckets (per user decision):
 *   < 60s   → "now"
 *   1–59m   → "{n}m"
 *   1–23h   → "{n}h"
 *   1–6d    → "{n}d"
 *   ≥ 7d    → "{n}w"
 */

export function formatRelativeTime(createdAt: number): string;
export function formatRelativeTime(
  createdAt: number,
  t: (key: string, values?: Record<string, number>) => string,
): string;
export function formatRelativeTime(
  createdAt: number,
  t?: (key: string, values?: Record<string, number>) => string,
): string {
  const diffSeconds = Math.floor(Date.now() / 1000) - createdAt;

  if (diffSeconds < 60) {
    return t ? t("timeJustNow") : "now";
  }

  if (diffSeconds < 3600) {
    const count = Math.floor(diffSeconds / 60);
    return t ? t("timeMinutesAgo", { count }) : `${count}m`;
  }

  if (diffSeconds < 86400) {
    const count = Math.floor(diffSeconds / 3600);
    return t ? t("timeHoursAgo", { count }) : `${count}h`;
  }

  if (diffSeconds < 604800) {
    const count = Math.floor(diffSeconds / 86400);
    return t ? t("timeDaysAgo", { count }) : `${count}d`;
  }

  const count = Math.floor(diffSeconds / 604800);
  return t ? t("timeWeeksAgo", { count }) : `${count}w`;
}

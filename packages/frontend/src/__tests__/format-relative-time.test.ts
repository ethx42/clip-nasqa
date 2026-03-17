import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatRelativeTime } from "@/lib/format-relative-time";

const NOW_EPOCH_S = 1_700_000_000; // arbitrary fixed "now" in seconds

function secondsAgo(s: number): number {
  return NOW_EPOCH_S - s;
}

describe("formatRelativeTime — short-token mode (no translator)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_EPOCH_S * 1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "now" for createdAt = exact now', () => {
    expect(formatRelativeTime(secondsAgo(0))).toBe("now");
  });

  it('returns "now" for 30s ago', () => {
    expect(formatRelativeTime(secondsAgo(30))).toBe("now");
  });

  it('returns "now" for 59s ago', () => {
    expect(formatRelativeTime(secondsAgo(59))).toBe("now");
  });

  it('returns "1m" for 60s ago', () => {
    expect(formatRelativeTime(secondsAgo(60))).toBe("1m");
  });

  it('returns "2m" for 120s ago', () => {
    expect(formatRelativeTime(secondsAgo(120))).toBe("2m");
  });

  it('returns "59m" for 3599s ago', () => {
    expect(formatRelativeTime(secondsAgo(3599))).toBe("59m");
  });

  it('returns "1h" for 3600s ago', () => {
    expect(formatRelativeTime(secondsAgo(3600))).toBe("1h");
  });

  it('returns "2h" for 7200s ago', () => {
    expect(formatRelativeTime(secondsAgo(7200))).toBe("2h");
  });

  it('returns "23h" for 86399s ago', () => {
    expect(formatRelativeTime(secondsAgo(86399))).toBe("23h");
  });

  it('returns "1d" for 86400s ago', () => {
    expect(formatRelativeTime(secondsAgo(86400))).toBe("1d");
  });

  it('returns "6d" for 518400s ago', () => {
    expect(formatRelativeTime(secondsAgo(518400))).toBe("6d");
  });

  it('returns "1w" for 604800s ago', () => {
    expect(formatRelativeTime(secondsAgo(604800))).toBe("1w");
  });

  it('returns "2w" for 1209600s ago', () => {
    expect(formatRelativeTime(secondsAgo(1209600))).toBe("2w");
  });
});

describe("formatRelativeTime — i18n mode (with translator)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_EPOCH_S * 1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mockT(key: string, values?: Record<string, number>): string {
    if (values !== undefined) {
      return `i18n:${key}:${values.count}`;
    }
    return `i18n:${key}`;
  }

  it("calls t('timeJustNow') for < 60s", () => {
    expect(formatRelativeTime(secondsAgo(30), mockT)).toBe("i18n:timeJustNow");
  });

  it("calls t('timeMinutesAgo', { count: 2 }) for 120s ago", () => {
    expect(formatRelativeTime(secondsAgo(120), mockT)).toBe("i18n:timeMinutesAgo:2");
  });

  it("calls t('timeHoursAgo', { count: 2 }) for 7200s ago", () => {
    expect(formatRelativeTime(secondsAgo(7200), mockT)).toBe("i18n:timeHoursAgo:2");
  });

  it("calls t('timeDaysAgo', { count: 1 }) for 86400s ago", () => {
    expect(formatRelativeTime(secondsAgo(86400), mockT)).toBe("i18n:timeDaysAgo:1");
  });

  it("calls t('timeWeeksAgo', { count: 1 }) for 604800s ago", () => {
    expect(formatRelativeTime(secondsAgo(604800), mockT)).toBe("i18n:timeWeeksAgo:1");
  });

  it("calls t('timeWeeksAgo', { count: 2 }) for 1209600s ago", () => {
    expect(formatRelativeTime(secondsAgo(1209600), mockT)).toBe("i18n:timeWeeksAgo:2");
  });
});

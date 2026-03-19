"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";

import type { ConnectionStatus } from "@/hooks/use-session-updates";

interface LiveIndicatorProps {
  connectionStatus: ConnectionStatus;
  lastHostActivity?: number | null;
}

function formatMinutesAgo(
  timestamp: number,
  t: (key: string, values?: Record<string, number>) => string,
): string {
  const diffMin = Math.floor((Date.now() - timestamp) / 60_000);
  if (diffMin < 1) return t("timeJustNow");
  return t("timeMinutesAgo", { count: diffMin });
}

/**
 * Displays live connection status — vertical stack layout (dot on top, label below).
 *
 * - connected: green pulsing dot + "LIVE"
 * - connecting: yellow dot + "Reconnecting..."
 * - disconnected: grey dot + "Paused"
 *
 * When connected and lastHostActivity is set and more than 2 minutes ago,
 * shows stale activity as a tooltip-style line.
 */
export function LiveIndicator({ connectionStatus, lastHostActivity }: LiveIndicatorProps) {
  const t = useTranslations("session");
  const isStale = useMemo(() => {
    if (
      connectionStatus !== "connected" ||
      lastHostActivity === null ||
      lastHostActivity === undefined
    ) {
      return false;
    }
    // eslint-disable-next-line react-hooks/purity -- staleness check intentionally uses current time at render
    return Date.now() - lastHostActivity > 2 * 60_000;
  }, [connectionStatus, lastHostActivity]);

  if (connectionStatus === "connected") {
    return (
      <div
        className="flex flex-col items-center gap-0.5"
        title={
          isStale && lastHostActivity
            ? t("lastSnippet", { time: formatMinutesAgo(lastHostActivity, t) })
            : undefined
        }
      >
        <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400">
          {t("live")}
        </span>
      </div>
    );
  }

  if (connectionStatus === "connecting") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
        <span className="text-[10px] font-medium uppercase tracking-widest text-warning-foreground">
          {t("reconnecting")}
        </span>
      </div>
    );
  }

  // disconnected
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
        {t("paused")}
      </span>
    </div>
  );
}

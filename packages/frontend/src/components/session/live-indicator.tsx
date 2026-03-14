'use client';

import type { ConnectionStatus } from '@/hooks/use-session-updates';

interface LiveIndicatorProps {
  connectionStatus: ConnectionStatus;
  lastHostActivity?: number | null;
}

function formatMinutesAgo(timestamp: number): string {
  const diffMin = Math.floor((Date.now() - timestamp) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1m ago';
  return `${diffMin}m ago`;
}

/**
 * Displays live connection status in the session header.
 *
 * - connected: green pulsing dot + "LIVE"
 * - connecting: yellow dot + "Reconnecting..."
 * - disconnected: grey dot + "Paused"
 *
 * When connected and lastHostActivity is set and more than 2 minutes ago,
 * shows "Last snippet Xm ago" next to the dot.
 */
export function LiveIndicator({ connectionStatus, lastHostActivity }: LiveIndicatorProps) {
  const isStale =
    connectionStatus === 'connected' &&
    lastHostActivity !== null &&
    lastHostActivity !== undefined &&
    Date.now() - lastHostActivity > 2 * 60_000;

  if (connectionStatus === 'connected') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">LIVE</span>
        {isStale && lastHostActivity && (
          <span className="text-[13px] text-muted-foreground">
            · Last snippet {formatMinutesAgo(lastHostActivity)}
          </span>
        )}
      </div>
    );
  }

  if (connectionStatus === 'connecting') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Reconnecting...</span>
      </div>
    );
  }

  // disconnected
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
      <span className="text-sm text-muted-foreground">Paused</span>
    </div>
  );
}

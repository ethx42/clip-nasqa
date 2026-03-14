'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface SessionShellProps {
  title: string;
  isHost?: boolean;
  sessionSlug?: string;
  clipboardSlot: React.ReactNode;
  qaSlot: React.ReactNode;
  hostToolbar?: React.ReactNode;
  /** Optional live indicator shown next to the session title. Plan 05 provides the actual component. */
  liveIndicator?: React.ReactNode;
}

type Tab = 'clipboard' | 'qa';

export function SessionShell({
  title,
  isHost = false,
  sessionSlug: _sessionSlug,
  clipboardSlot,
  qaSlot,
  hostToolbar,
  liveIndicator,
}: SessionShellProps) {
  void isHost; // reserved for Phase 3 additional host-only behaviour
  const t = useTranslations('session');
  const [activeTab, setActiveTab] = useState<Tab>('clipboard');

  return (
    <div className="flex h-[calc(100dvh-49px)] flex-col">
      {/* Session header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="truncate text-lg font-semibold text-foreground">
            {title}
          </h1>
          {liveIndicator}
        </div>
      </div>

      {/* Optional host toolbar */}
      {hostToolbar && (
        <div className="border-b border-border px-4 py-3">{hostToolbar}</div>
      )}

      {/* Mobile tab bar (hidden on lg+) */}
      <div className="flex border-b border-border lg:hidden">
        <button
          onClick={() => setActiveTab('clipboard')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'clipboard'
              ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('clipboard')}
        </button>
        <button
          onClick={() => setActiveTab('qa')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'qa'
              ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('qa')}
        </button>
      </div>

      {/* Content area */}
      <div className="flex min-h-0 flex-1 p-4">
        {/* Desktop: two-column grid */}
        <div className="hidden w-full gap-4 lg:grid lg:grid-cols-2 lg:gap-6">
          {clipboardSlot}
          {qaSlot}
        </div>

        {/* Mobile: single panel based on active tab */}
        <div className="flex w-full lg:hidden">
          {activeTab === 'clipboard' ? clipboardSlot : qaSlot}
        </div>
      </div>
    </div>
  );
}

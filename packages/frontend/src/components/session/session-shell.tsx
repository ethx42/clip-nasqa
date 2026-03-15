'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { IdentityEditor } from '@/components/session/identity-editor';

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
    <div className="flex h-[calc(100dvh-53px)] flex-col">
      {/* Session header */}
      <div className="border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {liveIndicator}
          <div className="ml-auto">
            <IdentityEditor />
          </div>
        </div>
      </div>

      {/* Optional host toolbar */}
      {hostToolbar && (
        <div className="border-b border-border px-6 py-3">{hostToolbar}</div>
      )}

      {/* Mobile tab bar (hidden on lg+) */}
      <div className="flex border-b border-border lg:hidden">
        <button
          onClick={() => setActiveTab('clipboard')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'clipboard'
              ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('clipboard')}
        </button>
        <button
          onClick={() => setActiveTab('qa')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'qa'
              ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('qa')}
        </button>
      </div>

      {/* Content area */}
      <div className="flex min-h-0 flex-1 p-5 lg:p-6">
        {/* Desktop: two-column grid */}
        <div className="hidden w-full gap-5 lg:grid lg:grid-cols-2 lg:gap-6">
          <div className="flex min-h-0 flex-col gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground/70">{t('clipboard')}</h2>
            {clipboardSlot}
          </div>
          <div className="flex min-h-0 flex-col gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground/70">{t('qa')}</h2>
            {qaSlot}
          </div>
        </div>

        {/* Mobile: single panel based on active tab */}
        <div className="flex w-full lg:hidden">
          {activeTab === 'clipboard' ? clipboardSlot : qaSlot}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import type { Reply } from '@nasqa/core';
import { linkifyText } from '@/lib/linkify';

interface ReplyListProps {
  replies: Reply[];
  isHost: boolean;
}

function formatRelativeTime(createdAt: number, t: (key: string, values?: Record<string, number>) => string): string {
  const now = Math.floor(Date.now() / 1000);
  const diffSeconds = now - createdAt;

  if (diffSeconds < 60) return t('timeJustNow');
  if (diffSeconds < 3600) return t('timeMinutesAgo', { count: Math.floor(diffSeconds / 60) });
  if (diffSeconds < 86400) return t('timeHoursAgo', { count: Math.floor(diffSeconds / 3600) });
  return t('timeDaysAgo', { count: Math.floor(diffSeconds / 86400) });
}

export function ReplyList({ replies }: ReplyListProps) {
  const t = useTranslations('session');
  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <div
          key={reply.id}
          className={
            reply.isHostReply
              ? 'border-l-2 border-emerald-500 pl-4'
              : 'border-l-2 border-border pl-4'
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            {reply.isHostReply && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500">
                {t('speaker')}
              </span>
            )}
            <span className="text-[13px] text-muted-foreground">
              {formatRelativeTime(reply.createdAt, t)}
            </span>
          </div>
          <p className="mt-1 break-words text-[15px] leading-relaxed text-foreground/85">
            {linkifyText(reply.text)}
          </p>
        </div>
      ))}
    </div>
  );
}

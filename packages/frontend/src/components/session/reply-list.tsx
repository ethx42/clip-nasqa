'use client';

import type { Reply } from '@nasqa/core';
import { linkifyText } from '@/lib/linkify';

interface ReplyListProps {
  replies: Reply[];
  isHost: boolean;
}

function formatRelativeTime(createdAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diffSeconds = now - createdAt;

  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

export function ReplyList({ replies }: ReplyListProps) {
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
                Speaker
              </span>
            )}
            <span className="text-[13px] text-muted-foreground">
              {formatRelativeTime(reply.createdAt)}
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

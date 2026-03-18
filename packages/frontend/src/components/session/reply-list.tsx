"use client";

import { useTranslations } from "next-intl";

import type { Reply } from "@nasqa/core";

import { formatRelativeTime } from "@/lib/format-relative-time";
import { linkifyText } from "@/lib/linkify";

import { ReactionBar } from "./reaction-bar";

interface ReplyListProps {
  replies: Reply[];
  isHost: boolean;
  sessionCode: string;
  fingerprint: string;
}

export function ReplyList({ replies, sessionCode, fingerprint }: ReplyListProps) {
  const t = useTranslations("session");
  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <div
          key={reply.id}
          className={
            reply.isHostReply
              ? "border-l-2 border-indigo-500 pl-4"
              : "border-l-2 border-border pl-4"
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            {reply.isHostReply && (
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-500">
                {t("speaker")}
              </span>
            )}
            <span className="text-[13px] text-muted-foreground">
              {formatRelativeTime(reply.createdAt, t)}
            </span>
          </div>
          <p className="mt-1 break-words text-[15px] leading-relaxed text-foreground/85">
            {linkifyText(reply.text)}
          </p>
          <ReactionBar
            sessionCode={sessionCode}
            targetId={reply.id}
            targetType="REPLY"
            reactionCounts={reply.reactionCounts}
            reactionOrder={reply.reactionOrder}
            fingerprint={fingerprint}
            className="mt-1.5"
          />
        </div>
      ))}
    </div>
  );
}

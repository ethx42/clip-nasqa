"use client";

import { MicVocal } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Reply } from "@nasqa/core";

import { formatRelativeTime } from "@/lib/format-relative-time";
import { linkifyText } from "@/lib/linkify";
import { cn } from "@/lib/utils";

import { PixelAvatar } from "./pixel-avatar";
import { ReactionBar } from "./reaction-bar";

interface ReplyListProps {
  replies: Reply[];
  isHost: boolean;
  sessionCode: string;
  fingerprint: string;
}

export function ReplyList({ replies, sessionCode, fingerprint }: ReplyListProps) {
  const t = useTranslations("session");
  const tIdentity = useTranslations("identity");

  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <div
          key={reply.id}
          className={
            reply.isHostReply
              ? "border-l-2 border-indigo-500 dark:border-amber-400 pl-4"
              : "border-l-2 border-border pl-4"
          }
        >
          <div className="mb-1 flex items-center gap-2">
            <PixelAvatar seed={reply.fingerprint} size={22} className="shrink-0 rounded-full" />
            <span
              className={cn(
                "text-[13px] font-semibold truncate max-w-[10rem]",
                reply.fingerprint === fingerprint
                  ? "text-indigo-600 dark:text-amber-400"
                  : "text-foreground/80",
              )}
            >
              {reply.fingerprint === fingerprint
                ? t("you")
                : reply.authorName || tIdentity("anonymous")}
            </span>
            {reply.isHostReply && (
              <MicVocal className="h-3.5 w-3.5 text-indigo-500 dark:text-amber-400 shrink-0" />
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

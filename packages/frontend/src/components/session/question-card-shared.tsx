"use client";

// ── Shared sub-components ─────────────────────────────────────────────────────
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Question } from "@nasqa/core";

import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

// ── Constants ────────────────────────────────────────────────────────────────

export const REPLY_CHAR_LIMIT = 500;
export const REPLY_COUNTER_THRESHOLD = Math.floor(REPLY_CHAR_LIMIT * 0.8);

// ── Types ────────────────────────────────────────────────────────────────────

export interface QuestionCardBaseProps {
  question: Question;
  isHost: boolean;
  fingerprint: string;
  sessionCode: string;
  hostSecretHash?: string;
  votedQuestionIds: Set<string>;
  downvotedQuestionIds: Set<string>;
  onUpvote: (questionId: string, remove: boolean) => void;
  onDownvote: (questionId: string, remove: boolean) => void;
  onReply: (questionId: string, text: string) => void;
  onFocus?: (questionId: string | undefined) => void;
  onBanQuestion?: (questionId: string) => void;
  onBanParticipant?: (fingerprint: string) => void;
  onRestore?: (questionId: string) => void;
  onEdit?: (questionId: string, text: string) => void;
  onDelete?: (questionId: string) => void;
  onEditReply?: (replyId: string, text: string) => void;
  onDeleteReply?: (replyId: string) => void;
}

// ── Pure utilities ────────────────────────────────────────────────────────────

/** "Santiago Torres" → "Santiago T." */
export function formatDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name.trim();
  const first = parts[0];
  const lastInitial = parts[parts.length - 1]![0]!.toUpperCase();
  return `${first} ${lastInitial}.`;
}

interface VoteRowProps {
  question: Question;
  isVoted: boolean;
  isDownvoted: boolean;
  onUpvoteClick: () => void;
  onDownvoteClick: () => void;
}

/** Reddit-style vertical voting: up arrow, net score, down arrow */
export function VoteRow({
  question,
  isVoted,
  isDownvoted,
  onUpvoteClick,
  onDownvoteClick,
}: VoteRowProps) {
  const tSession = useTranslations("session");
  const netScore = question.upvoteCount - question.downvoteCount;

  return (
    <div className="flex flex-col items-center gap-0">
      {/* Upvote */}
      <IconButton
        compact
        tooltip={isVoted ? tSession("removeUpvote") : tSession("upvoteQuestion")}
        aria-pressed={isVoted}
        onClick={onUpvoteClick}
        className={cn(
          "transition-all active:scale-90",
          isVoted ? "text-indigo-600 dark:text-indigo-400" : undefined,
        )}
      >
        <ArrowBigUp className={cn("h-5 w-5", isVoted && "fill-current")} />
      </IconButton>

      {/* Net score */}
      <span
        className={cn(
          "text-xs font-bold tabular-nums leading-none",
          isVoted
            ? "text-indigo-600 dark:text-indigo-400"
            : isDownvoted
              ? "text-muted-foreground"
              : "text-muted-foreground",
        )}
      >
        {netScore}
      </span>

      {/* Downvote */}
      <IconButton
        compact
        tooltip={isDownvoted ? tSession("removeDownvote") : tSession("downvoteQuestion")}
        aria-pressed={isDownvoted}
        onClick={onDownvoteClick}
        className={cn(
          "transition-all active:scale-90",
          isDownvoted ? "text-foreground" : undefined,
        )}
      >
        <ArrowBigDown className={cn("h-5 w-5", isDownvoted && "fill-current")} />
      </IconButton>
    </div>
  );
}

// ── BannedTombstone ───────────────────────────────────────────────────────────

export function BannedTombstone() {
  const t = useTranslations("moderation");

  return (
    <div className="rounded-lg bg-transparent py-3 px-1">
      <p className="text-sm text-muted-foreground italic">{t("questionRemoved")}</p>
    </div>
  );
}

// ── HiddenCollapsed ───────────────────────────────────────────────────────────

interface HiddenCollapsedProps {
  question: Question;
  isHost: boolean;
  onShowContent: () => void;
  onRestore?: (questionId: string) => void;
}

export function HiddenCollapsed({
  question,
  isHost,
  onShowContent,
  onRestore,
}: HiddenCollapsedProps) {
  const t = useTranslations("moderation");

  return (
    <div className="rounded-lg py-3 px-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{t("hiddenByCommunity")}</span>
        <button
          onClick={onShowContent}
          className="font-semibold text-foreground/70 underline-offset-2 hover:underline"
        >
          [{t("show")}]
        </button>
        {isHost && (
          <button
            onClick={() => onRestore?.(question.id)}
            className="ml-auto rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-500/10"
          >
            {t("restore")}
          </button>
        )}
      </div>
    </div>
  );
}

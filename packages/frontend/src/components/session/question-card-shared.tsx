"use client";

// ── Shared sub-components ─────────────────────────────────────────────────────

import { ChevronUp, ThumbsDown } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Question } from "@nasqa/core";

import { cn } from "@/lib/utils";

// ── Constants ────────────────────────────────────────────────────────────────

export const REPLY_CHAR_LIMIT = 500;
export const REPLY_COUNTER_THRESHOLD = Math.floor(REPLY_CHAR_LIMIT * 0.8);

// ── Types ────────────────────────────────────────────────────────────────────

export interface QuestionCardBaseProps {
  question: Question;
  isHost: boolean;
  fingerprint: string;
  sessionSlug: string;
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

interface VoteColumnProps {
  question: Question;
  isVoted: boolean;
  isDownvoted: boolean;
  onUpvoteClick: () => void;
  onDownvoteClick: () => void;
}

export function VoteColumn({
  question,
  isVoted,
  isDownvoted,
  onUpvoteClick,
  onDownvoteClick,
}: VoteColumnProps) {
  const tSession = useTranslations("session");

  return (
    <div className="flex flex-col items-center gap-1 pt-0.5">
      {/* Upvote */}
      <button
        onClick={onUpvoteClick}
        aria-label={isVoted ? tSession("removeUpvote") : tSession("upvoteQuestion")}
        className={cn(
          "rounded-lg p-1.5 transition-colors hover:bg-accent",
          isVoted ? "text-amber-500" : "text-muted-foreground",
        )}
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <span
        className={cn(
          "text-base font-bold tabular-nums",
          isVoted ? "text-amber-500" : "text-muted-foreground",
        )}
      >
        {question.upvoteCount}
      </span>

      {/* Downvote */}
      <button
        onClick={onDownvoteClick}
        aria-label={isDownvoted ? tSession("removeDownvote") : tSession("downvoteQuestion")}
        className={cn(
          "mt-1 rounded-lg p-1.5 transition-colors hover:bg-accent",
          isDownvoted ? "text-destructive" : "text-muted-foreground",
        )}
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
      <span
        className={cn(
          "text-xs font-semibold tabular-nums",
          isDownvoted ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {question.downvoteCount}
      </span>
    </div>
  );
}

// ── BannedTombstone ───────────────────────────────────────────────────────────

export function BannedTombstone() {
  const t = useTranslations("moderation");

  return (
    <div className="rounded-xl border border-border bg-card p-5">
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
    <div className="rounded-xl border border-border bg-card p-4">
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

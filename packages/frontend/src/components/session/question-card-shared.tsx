"use client";

// ── Shared sub-components ─────────────────────────────────────────────────────
import { ChevronDown, ChevronUp } from "lucide-react";
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

/** Reddit-style horizontal voting: [▲] upvotes · downvotes [▼] */
export function VoteRow({
  question,
  isVoted,
  isDownvoted,
  onUpvoteClick,
  onDownvoteClick,
}: VoteRowProps) {
  const tSession = useTranslations("session");

  return (
    <div className="flex flex-row items-center gap-1">
      {/* Upvote */}
      <IconButton
        tooltip={isVoted ? tSession("removeUpvote") : tSession("upvoteQuestion")}
        aria-pressed={isVoted}
        onClick={onUpvoteClick}
        className={cn(
          "transition-all active:scale-95",
          isVoted
            ? "bg-indigo-600 text-white hover:bg-indigo-500 hover:text-white dark:bg-indigo-500 dark:hover:bg-indigo-400"
            : undefined,
        )}
      >
        <ChevronUp className="h-4 w-4" />
      </IconButton>

      {/* Upvote count */}
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          isVoted ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground",
        )}
      >
        {question.upvoteCount}
      </span>

      {/* Separator */}
      <span className="text-muted-foreground/40 select-none">·</span>

      {/* Downvote count */}
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          isDownvoted ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {question.downvoteCount}
      </span>

      {/* Downvote */}
      <IconButton
        tooltip={isDownvoted ? tSession("removeDownvote") : tSession("downvoteQuestion")}
        aria-pressed={isDownvoted}
        onClick={onDownvoteClick}
        className={cn(
          "transition-all active:scale-95",
          isDownvoted ? "bg-muted text-foreground hover:brightness-110" : undefined,
        )}
      >
        <ChevronDown className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

/** @deprecated Use VoteRow — kept for backwards compatibility during transition */
export const VoteColumn = VoteRow;

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

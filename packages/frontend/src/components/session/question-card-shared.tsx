"use client";

// ── Shared sub-components ─────────────────────────────────────────────────────
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type React from "react";

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

/** Reddit-style vertical voting: up chevron, net score, down chevron */
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
    <div className="flex h-16 w-8 flex-col items-center justify-between pl-3">
      {/* Upvote */}
      <IconButton
        compact
        tooltip={isVoted ? tSession("removeUpvote") : tSession("upvoteQuestion")}
        aria-pressed={isVoted}
        onClick={onUpvoteClick}
        className={cn(
          "rounded-sm transition-all active:scale-90",
          isVoted ? "text-primary bg-primary/10" : "text-muted-foreground/50 hover:bg-accent",
        )}
      >
        <ChevronUp className="h-4 w-4" strokeWidth={2} />
      </IconButton>

      {/* Net score */}
      <span
        className={cn(
          "text-xs font-medium tabular-nums leading-none select-none",
          isVoted
            ? "text-primary"
            : isDownvoted
              ? "text-muted-foreground"
              : "text-muted-foreground/50",
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
          "rounded-sm transition-all active:scale-90",
          isDownvoted
            ? "text-muted-foreground bg-muted"
            : "text-muted-foreground/50 hover:bg-accent",
        )}
      >
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </IconButton>
    </div>
  );
}

// ── ThreadSpine ──────────────────────────────────────────────────────────────
// Continuous vertical line that groups a reply thread visually.
// Aligned with parent avatar center (28px / 2 = 14px) so the spine
// reads as an extension of the question author.

interface ThreadSpineProps {
  children: React.ReactNode;
  /** When true the spine turns indigo (e.g. while the reply input is focused). */
  active?: boolean;
}

export function ThreadSpine({ children, active }: ThreadSpineProps) {
  return (
    <div className="relative mt-3">
      {/* Spine — absolute, aligned with avatar center */}
      <div
        className={cn(
          "absolute left-[13px] top-0 bottom-0 w-0.5 rounded-full transition-colors duration-200",
          active ? "bg-primary/40" : "bg-border",
        )}
      />
      {/* Fade-out tail */}
      <div
        className="absolute left-[13px] bottom-0 w-0.5 h-6 rounded-full"
        style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--background)))" }}
      />
      {/* Thread content — offset past the spine */}
      <div className="pl-8 pb-2">{children}</div>
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
            className="ml-auto rounded-lg px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            {t("restore")}
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Ban, ChevronUp, MessageSquare, ShieldX, ThumbsDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { Question, Reply } from "@nasqa/core";

import { linkifyText } from "@/lib/linkify";
import { cn } from "@/lib/utils";

import { PixelAvatar } from "./pixel-avatar";
import { ReactionBar } from "./reaction-bar";
import { ReplyList } from "./reply-list";

interface QuestionCardProps {
  question: Question;
  replies: Reply[];
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

/** "Santiago Torres" → "Santiago T." */
function formatDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name.trim();
  const first = parts[0];
  const lastInitial = parts[parts.length - 1]![0]!.toUpperCase();
  return `${first} ${lastInitial}.`;
}

function formatRelativeTime(
  createdAt: number,
  tSession: (key: string, values?: Record<string, number>) => string,
): string {
  const now = Math.floor(Date.now() / 1000);
  const diffSeconds = now - createdAt;

  if (diffSeconds < 60) return tSession("timeJustNow");
  if (diffSeconds < 3600)
    return tSession("timeMinutesAgo", { count: Math.floor(diffSeconds / 60) });
  if (diffSeconds < 86400)
    return tSession("timeHoursAgo", { count: Math.floor(diffSeconds / 3600) });
  return tSession("timeDaysAgo", { count: Math.floor(diffSeconds / 86400) });
}

export function QuestionCard({
  question,
  replies,
  isHost,
  fingerprint,
  hostSecretHash,
  votedQuestionIds,
  downvotedQuestionIds,
  onUpvote,
  onDownvote,
  onReply,
  onFocus,
  onBanQuestion,
  onBanParticipant,
  onRestore,
}: QuestionCardProps) {
  const t = useTranslations("moderation");
  const tSession = useTranslations("session");
  const tCommon = useTranslations("common");
  const tIdentity = useTranslations("identity");
  const [showReplies, setShowReplies] = useState(question.isFocused);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showHiddenContent, setShowHiddenContent] = useState(false);
  const [banConfirmOpen, setBanConfirmOpen] = useState(false);

  const isVoted = votedQuestionIds.has(question.id);
  const isDownvoted = downvotedQuestionIds.has(question.id);
  const isOwn = question.fingerprint === fingerprint;
  const REPLY_CHAR_LIMIT = 500;
  const REPLY_COUNTER_THRESHOLD = Math.floor(REPLY_CHAR_LIMIT * 0.8);

  void hostSecretHash; // used by parent when calling focusQuestionAction

  function handleUpvoteClick() {
    // Mutually exclusive: clicking upvote when downvoted removes downvote first
    if (isDownvoted) {
      onDownvote(question.id, true);
    }
    onUpvote(question.id, isVoted);
  }

  function handleDownvoteClick() {
    // Mutually exclusive: clicking downvote when upvoted removes upvote first
    if (isVoted) {
      onUpvote(question.id, true);
    }
    onDownvote(question.id, isDownvoted);
  }

  function handleReplySubmit() {
    const trimmed = replyText.trim();
    if (!trimmed || trimmed.length > REPLY_CHAR_LIMIT) return;
    onReply(question.id, trimmed);
    setReplyText("");
    setShowReplyInput(false);
  }

  function handleReplyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReplySubmit();
    }
  }

  function handleFocusToggle() {
    if (question.isFocused) {
      onFocus?.(undefined);
    } else {
      onFocus?.(question.id);
    }
  }

  function handleBanQuestionClick() {
    onBanQuestion?.(question.id);
  }

  function handleConfirmBanParticipant() {
    setBanConfirmOpen(false);
    onBanParticipant?.(question.fingerprint);
  }

  // ── Banned state: tombstone ─────────────────────────────────────────────────
  if (question.isBanned) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground italic">{t("questionRemoved")}</p>
      </div>
    );
  }

  // ── Community-hidden state: collapsed with expand option ───────────────────
  if (question.isHidden && !showHiddenContent) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{t("hiddenByCommunity")}</span>
          <button
            onClick={() => setShowHiddenContent(true)}
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

  // ── Normal / expanded hidden state ─────────────────────────────────────────
  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border bg-card p-4 transition-all",
        question.isFocused &&
          "ring-2 ring-indigo-500/50 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]",
      )}
    >
      {question.isFocused && (
        <div className="mb-3 flex items-center gap-1.5">
          <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-indigo-500">
            {tSession("focused")}
          </span>
        </div>
      )}

      <div className="flex gap-4">
        {/* Vote column: upvote + downvote */}
        <div className="flex flex-col items-center gap-1 pt-0.5">
          {/* Upvote */}
          <button
            onClick={handleUpvoteClick}
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
            onClick={handleDownvoteClick}
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

        {/* Content column */}
        <div className="min-w-0 flex-1">
          {/* Author row — avatar + name + time + host actions */}
          <div className="mb-2 flex items-center gap-2.5">
            {/* Pixel-art avatar */}
            <PixelAvatar seed={question.fingerprint} size={28} className="shrink-0 rounded-full" />
            <span
              title={question.authorName || undefined}
              className={cn(
                "text-[13px] font-semibold truncate max-w-[10rem]",
                isOwn
                  ? "text-indigo-600 dark:text-indigo-400"
                  : question.authorName
                    ? "text-foreground/80"
                    : "text-muted-foreground/60",
              )}
            >
              {isOwn
                ? tSession("you")
                : question.authorName
                  ? formatDisplayName(question.authorName)
                  : tIdentity("anonymous")}
            </span>
            <span className="text-[12px] text-muted-foreground/50">
              {formatRelativeTime(question.createdAt, tSession)}
            </span>

            {/* Hidden badge + collapse button */}
            {question.isHidden && showHiddenContent && (
              <>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
                  {t("hidden")}
                </span>
                <button
                  onClick={() => setShowHiddenContent(false)}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  [{t("hiddenByCommunity")}]
                </button>
              </>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Host inline moderation icons */}
            {isHost && (
              <div className="flex shrink-0 items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleFocusToggle}
                  aria-label={
                    question.isFocused ? tSession("unfocusQuestion") : tSession("focusQuestion")
                  }
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title={
                    question.isFocused ? tSession("unfocusQuestion") : tSession("focusQuestion")
                  }
                >
                  <span className="text-xs font-bold">{question.isFocused ? "●" : "○"}</span>
                </button>
                <button
                  onClick={handleBanQuestionClick}
                  aria-label={t("banQuestion")}
                  title={t("banQuestion")}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <ShieldX className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setBanConfirmOpen(true)}
                  aria-label={t("banParticipant")}
                  title={t("banParticipant")}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Ban className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Question body */}
          <p className="break-words text-base leading-relaxed text-foreground">
            {linkifyText(question.text)}
          </p>

          {/* Action row — reply count + reply button */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            {replies.length > 0 && (
              <button
                onClick={() => setShowReplies((v) => !v)}
                className="flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {tSession("replyCount", { count: replies.length })}
              </button>
            )}
            <button
              onClick={() => setShowReplyInput((v) => !v)}
              className="font-semibold transition-colors hover:text-foreground"
            >
              {tSession("reply")}
            </button>
          </div>

          {/* Reaction bar — only in normal/expanded state, not banned/hidden-collapsed */}
          <ReactionBar
            sessionSlug={question.sessionSlug}
            targetId={question.id}
            targetType="QUESTION"
            reactionCounts={question.reactionCounts}
            reactionOrder={question.reactionOrder}
            fingerprint={fingerprint}
            className="mt-2"
          />

          {/* Inline reply input */}
          {showReplyInput && (
            <div className="mt-4">
              <div className="relative">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleReplyKeyDown}
                  placeholder={tSession("replyPlaceholder")}
                  rows={2}
                  maxLength={REPLY_CHAR_LIMIT}
                  className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <div className="mt-2 flex items-center justify-between">
                  {replyText.length >= REPLY_COUNTER_THRESHOLD ? (
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        replyText.length >= 490 ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {replyText.length}/{REPLY_CHAR_LIMIT}
                    </span>
                  ) : (
                    <span />
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowReplyInput(false);
                        setReplyText("");
                      }}
                      className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                    >
                      {tCommon("cancel")}
                    </button>
                    <button
                      onClick={handleReplySubmit}
                      disabled={!replyText.trim() || replyText.length > REPLY_CHAR_LIMIT}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {tSession("send")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expanded reply list */}
          {showReplies && replies.length > 0 && (
            <div className="mt-4">
              <ReplyList
                replies={replies}
                isHost={isHost}
                sessionSlug={question.sessionSlug}
                fingerprint={fingerprint}
              />
            </div>
          )}
        </div>
      </div>

      {/* Ban participant confirmation dialog */}
      <Dialog.Root open={banConfirmOpen} onOpenChange={setBanConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
              <Dialog.Title className="mb-2 text-lg font-bold text-foreground">
                {t("confirmBan")}
              </Dialog.Title>
              <Dialog.Description className="mb-5 text-sm text-muted-foreground">
                {t("confirmBanQuestion")}
              </Dialog.Description>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setBanConfirmOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleConfirmBanParticipant}
                  className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-destructive/90"
                >
                  {t("confirmBan")}
                </button>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

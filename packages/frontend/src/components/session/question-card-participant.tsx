"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { Reply } from "@nasqa/core";

import { formatRelativeTime } from "@/lib/format-relative-time";
import { linkifyText } from "@/lib/linkify";
import { cn } from "@/lib/utils";

import { PixelAvatar } from "./pixel-avatar";
import {
  BannedTombstone,
  formatDisplayName,
  HiddenCollapsed,
  REPLY_CHAR_LIMIT,
  REPLY_COUNTER_THRESHOLD,
  VoteColumn,
} from "./question-card-shared";
import type { QuestionCardBaseProps } from "./question-card-shared";
import { ReactionBar } from "./reaction-bar";
import { ReplyList } from "./reply-list";

interface QuestionCardParticipantProps extends Omit<
  QuestionCardBaseProps,
  "isHost" | "onFocus" | "onBanQuestion" | "onBanParticipant" | "onRestore"
> {
  replies: Reply[];
}

export function QuestionCardParticipant({
  question,
  replies,
  fingerprint,
  sessionSlug: _sessionSlug,
  hostSecretHash: _hostSecretHash,
  votedQuestionIds,
  downvotedQuestionIds,
  onUpvote,
  onDownvote,
  onReply,
}: QuestionCardParticipantProps) {
  const t = useTranslations("moderation");
  const tSession = useTranslations("session");
  const tCommon = useTranslations("common");
  const tIdentity = useTranslations("identity");
  const [showReplies, setShowReplies] = useState(question.isFocused);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showHiddenContent, setShowHiddenContent] = useState(false);

  const isVoted = votedQuestionIds.has(question.id);
  const isDownvoted = downvotedQuestionIds.has(question.id);
  const isOwn = question.fingerprint === fingerprint;

  function handleUpvoteClick() {
    if (isDownvoted) {
      onDownvote(question.id, true);
    }
    onUpvote(question.id, isVoted);
  }

  function handleDownvoteClick() {
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

  // Determine visual state key for AnimatePresence
  const visualState = question.isBanned
    ? "banned"
    : question.isHidden && !showHiddenContent
      ? "hidden"
      : "normal";

  return (
    <AnimatePresence mode="wait" initial={false}>
      {visualState === "banned" && (
        <motion.div
          key="banned"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ overflow: "hidden" }}
        >
          <BannedTombstone />
        </motion.div>
      )}

      {visualState === "hidden" && (
        <motion.div
          key="hidden"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ overflow: "hidden" }}
        >
          <HiddenCollapsed
            question={question}
            isHost={false}
            onShowContent={() => setShowHiddenContent(true)}
          />
        </motion.div>
      )}

      {visualState === "normal" && (
        <motion.div
          key="normal"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{ overflow: "hidden" }}
        >
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
              <VoteColumn
                question={question}
                isVoted={isVoted}
                isDownvoted={isDownvoted}
                onUpvoteClick={handleUpvoteClick}
                onDownvoteClick={handleDownvoteClick}
              />

              {/* Content column */}
              <div className="min-w-0 flex-1">
                {/* Author row */}
                <div className="mb-2 flex items-center gap-2.5">
                  <PixelAvatar
                    seed={question.fingerprint}
                    size={28}
                    className="shrink-0 rounded-full"
                  />
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

                  {/* Hidden badge + collapse button (when expanded) */}
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

                  <div className="flex-1" />
                </div>

                {/* Question body */}
                <p className="break-words text-base leading-relaxed text-foreground">
                  {linkifyText(question.text)}
                </p>

                {/* Action row */}
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

                {/* Reaction bar */}
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
                              replyText.length >= 490
                                ? "text-destructive"
                                : "text-muted-foreground",
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
                      isHost={false}
                      sessionSlug={question.sessionSlug}
                      fingerprint={fingerprint}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

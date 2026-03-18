"use client";

import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, MessageSquare, MicVocal, ShieldX } from "lucide-react";
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

interface QuestionCardHostProps extends QuestionCardBaseProps {
  replies: Reply[];
}

export function QuestionCardHost({
  question,
  replies,
  fingerprint,
  sessionCode: _sessionCode,
  hostSecretHash: _hostSecretHash,
  votedQuestionIds,
  downvotedQuestionIds,
  onUpvote,
  onDownvote,
  onReply,
  onFocus,
  onBanQuestion,
  onBanParticipant,
  onRestore,
}: QuestionCardHostProps) {
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

  void _hostSecretHash; // used by parent when calling focusQuestionAction

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

  // Determine visual state key for AnimatePresence
  const visualState = question.isBanned
    ? "banned"
    : question.isHidden && !showHiddenContent
      ? "hidden"
      : "normal";

  return (
    <>
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
              isHost={true}
              onShowContent={() => setShowHiddenContent(true)}
              onRestore={onRestore}
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
                  {/* Author row — avatar + name + time + host moderation actions */}
                  <div className="mb-2 flex items-center gap-2.5">
                    <PixelAvatar
                      seed={question.fingerprint}
                      size={28}
                      className={cn(
                        "shrink-0 rounded-full",
                        isOwn &&
                          "ring-2 ring-indigo-500 dark:ring-amber-400 ring-offset-2 ring-offset-background",
                      )}
                    />
                    <span
                      title={question.authorName || undefined}
                      className={cn(
                        "text-[13px] font-semibold truncate max-w-[10rem]",
                        isOwn
                          ? "text-indigo-600 dark:text-amber-400 pl-1"
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
                    {question.isHostQuestion && (
                      <MicVocal className="h-3.5 w-3.5 text-indigo-500 dark:text-amber-400 shrink-0" />
                    )}
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

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Host inline moderation icons */}
                    <div className="flex shrink-0 items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={handleFocusToggle}
                        aria-label={
                          question.isFocused
                            ? tSession("unfocusQuestion")
                            : tSession("focusQuestion")
                        }
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title={
                          question.isFocused
                            ? tSession("unfocusQuestion")
                            : tSession("focusQuestion")
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
                    sessionCode={question.sessionCode}
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
                        isHost={true}
                        sessionCode={question.sessionCode}
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

      {/* Ban participant confirmation dialog — self-contained, outside AnimatePresence */}
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
    </>
  );
}

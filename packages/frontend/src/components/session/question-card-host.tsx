"use client";

import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  Ban,
  Check,
  Megaphone,
  MessageSquare,
  MicVocal,
  Pencil,
  ShieldX,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { Reply } from "@nasqa/core";

import { IconButton } from "@/components/ui/icon-button";
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
  VoteRow,
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
  onEdit,
  onDelete,
  onEditReply,
  onDeleteReply,
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
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(question.text);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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

  function handleEditSave() {
    const trimmed = editText.trim();
    if (!trimmed) return;
    onEdit?.(question.id, trimmed);
    setIsEditing(false);
  }

  function handleEditCancel() {
    setEditText(question.text);
    setIsEditing(false);
  }

  function handleConfirmDelete() {
    setDeleteConfirmOpen(false);
    onDelete?.(question.id);
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
                "group relative py-3 px-1 transition-all",
                question.isFocused && "ring-2 ring-indigo-500/50 bg-indigo-500/5 rounded-lg",
              )}
            >
              {question.isFocused && (
                <div className="mb-3 flex items-center gap-1.5">
                  <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-indigo-500">
                    {tSession("focused")}
                  </span>
                </div>
              )}

              {/* Single-column Slack-style layout */}
              <div className="min-w-0">
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

                  {/* Edited badge */}
                  {question.editedAt && (
                    <span
                      className="text-[11px] text-muted-foreground/60"
                      title={new Date(question.editedAt * 1000).toLocaleString()}
                    >
                      {tSession("edited")}
                    </span>
                  )}

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

                  {/* Host inline moderation icons — semantic order: spotlight, edit, ban-question, ban-participant, delete */}
                  {!isEditing && (
                    <div className="flex shrink-0 items-center gap-px opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      {/* 1. Focus/spotlight — primary positive action */}
                      <IconButton
                        compact
                        tooltip={
                          question.isFocused
                            ? tSession("unfocusQuestion")
                            : tSession("focusQuestion")
                        }
                        onClick={handleFocusToggle}
                        className={
                          question.isFocused ? "text-indigo-500 hover:text-indigo-600" : undefined
                        }
                      >
                        <Megaphone
                          className={cn("h-3.5 w-3.5", question.isFocused && "fill-current")}
                        />
                      </IconButton>
                      {/* 2. Edit */}
                      <IconButton
                        compact
                        tooltip={tSession("editQuestion")}
                        onClick={() => {
                          setEditText(question.text);
                          setIsEditing(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                      {/* 3. Ban question — moderate destructive */}
                      <IconButton
                        compact
                        tooltip={t("banQuestion")}
                        onClick={handleBanQuestionClick}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <ShieldX className="h-3.5 w-3.5" />
                      </IconButton>
                      {/* 4. Ban participant — severe destructive */}
                      <IconButton
                        compact
                        tooltip={t("banParticipant")}
                        onClick={() => setBanConfirmOpen(true)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </IconButton>
                      {/* 5. Delete — most destructive, last */}
                      <IconButton
                        compact
                        tooltip={tSession("deleteQuestion")}
                        onClick={() => setDeleteConfirmOpen(true)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  )}
                </div>

                {/* Question body — inline edit or display */}
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={Math.max(2, editText.split("\n").length)}
                      maxLength={500}
                      className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleEditCancel}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent"
                      >
                        <X className="h-3.5 w-3.5" />
                        {tSession("cancelEdit")}
                      </button>
                      <button
                        onClick={handleEditSave}
                        disabled={!editText.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {tSession("saveEdit")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="break-words text-base leading-relaxed text-foreground">
                    {linkifyText(question.text)}
                  </p>
                )}

                {/* Vote column — vertical Reddit-style, below question text */}
                {!isEditing && (
                  <div className="mt-2 flex items-start gap-2">
                    <VoteRow
                      question={question}
                      isVoted={isVoted}
                      isDownvoted={isDownvoted}
                      onUpvoteClick={handleUpvoteClick}
                      onDownvoteClick={handleDownvoteClick}
                    />
                  </div>
                )}

                {/* Action row */}
                {!isEditing && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
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
                )}

                {/* Reaction bar */}
                {!isEditing && (
                  <ReactionBar
                    sessionCode={question.sessionCode}
                    targetId={question.id}
                    targetType="QUESTION"
                    reactionCounts={question.reactionCounts}
                    reactionOrder={question.reactionOrder}
                    fingerprint={fingerprint}
                    className="mt-2"
                  />
                )}

                {/* Inline reply input */}
                {showReplyInput && !isEditing && (
                  <div className="mt-4">
                    <div className="relative">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={handleReplyKeyDown}
                        placeholder={tSession("replyPlaceholder")}
                        rows={2}
                        maxLength={REPLY_CHAR_LIMIT}
                        className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
                {showReplies && replies.length > 0 && !isEditing && (
                  <div className="mt-4">
                    <ReplyList
                      replies={replies}
                      isHost={true}
                      sessionCode={question.sessionCode}
                      fingerprint={fingerprint}
                      onEditReply={onEditReply}
                      onDeleteReply={onDeleteReply}
                    />
                  </div>
                )}
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
            <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
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

      {/* Delete question confirmation dialog */}
      <Dialog.Root open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
              <Dialog.Title className="mb-2 text-lg font-bold text-foreground">
                {tSession("confirmDeleteQuestion")}
              </Dialog.Title>
              <Dialog.Description className="mb-5 text-sm text-muted-foreground">
                {tSession("confirmDeleteQuestionDesc")}
              </Dialog.Description>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-destructive/90"
                >
                  {tSession("deleteQuestion")}
                </button>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Popover } from "@base-ui/react/popover";
import { AnimatePresence, motion } from "framer-motion";
import {
  Ban,
  Check,
  ChevronUp,
  Ellipsis,
  Megaphone,
  MessageSquare,
  MicVocal,
  Pencil,
  Reply as ReplyIcon,
  ShieldX,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

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
  ThreadSpine,
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
  const [showThread, setShowThread] = useState(question.isFocused);
  const [replyText, setReplyText] = useState("");
  const [replyActive, setReplyActive] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
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
    setReplyActive(false);
  }

  function handleReplyKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleReplySubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setReplyText("");
      setReplyActive(false);
      replyInputRef.current?.blur();
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
                "group relative py-3.5 px-1 transition-colors hover:bg-accent/60",
                question.isFocused && "ring-2 ring-primary/50 bg-primary/5",
              )}
            >
              {question.isFocused && (
                <div className="mb-3 flex items-center gap-1.5">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                    {tSession("focused")}
                  </span>
                </div>
              )}

              {/* Two-column layout: votes left, content right */}
              <div className="flex gap-3">
                {/* Vote column — left side */}
                {!isEditing && (
                  <div className="shrink-0 self-start pt-1">
                    <VoteRow
                      question={question}
                      isVoted={isVoted}
                      isDownvoted={isDownvoted}
                      onUpvoteClick={handleUpvoteClick}
                      onDownvoteClick={handleDownvoteClick}
                    />
                  </div>
                )}

                {/* Content column */}
                <div className="min-w-0 flex-1">
                  {/* Author row — avatar + name + time + host moderation actions */}
                  <div className="mb-1 flex items-center gap-2.5">
                    <PixelAvatar
                      seed={question.fingerprint}
                      size={28}
                      className={cn(
                        "shrink-0 rounded-full",
                        isOwn && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      )}
                    />
                    <span
                      title={question.authorName || undefined}
                      className={cn(
                        "text-[13px] font-semibold truncate max-w-[10rem]",
                        isOwn
                          ? "text-primary text-[10px] font-bold uppercase rounded-full bg-primary/10 px-1.5 py-0.5 border border-primary/20"
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
                      <span className="inline-flex items-center rounded-full bg-primary/10 p-1 border border-primary/20">
                        <MicVocal className="h-3 w-3 text-primary shrink-0" />
                      </span>
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

                    {/* Host action bar — progressive disclosure: Edit + Delete visible, moderation behind overflow */}
                    {!isEditing && (
                      <div className="flex shrink-0 items-center gap-px opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150">
                        {/* Primary: Edit */}
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
                        {/* Primary: Delete */}
                        <IconButton
                          compact
                          tooltip={tSession("deleteQuestion")}
                          onClick={() => setDeleteConfirmOpen(true)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                        {/* Overflow: moderation tools */}
                        <Popover.Root>
                          <Popover.Trigger
                            aria-label={t("moreActions")}
                            className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <Ellipsis className="h-3.5 w-3.5" />
                          </Popover.Trigger>
                          <Popover.Portal>
                            <Popover.Positioner side="bottom" align="end" sideOffset={4}>
                              <Popover.Popup className="z-50 min-w-[180px] rounded-md border border-border bg-card py-1 shadow-lg">
                                {/* Focus/spotlight */}
                                <button
                                  onClick={handleFocusToggle}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                                >
                                  <Megaphone
                                    className={cn(
                                      "h-3.5 w-3.5 shrink-0",
                                      question.isFocused && "fill-current text-primary",
                                    )}
                                  />
                                  {question.isFocused
                                    ? tSession("unfocusQuestion")
                                    : tSession("focusQuestion")}
                                </button>
                                <div className="mx-2 border-t border-border" />
                                {/* Ban question */}
                                <button
                                  onClick={handleBanQuestionClick}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                                >
                                  <ShieldX className="h-3.5 w-3.5 shrink-0" />
                                  {t("banQuestion")}
                                </button>
                                {/* Ban participant */}
                                <button
                                  onClick={() => setBanConfirmOpen(true)}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                                >
                                  <Ban className="h-3.5 w-3.5 shrink-0" />
                                  {t("banParticipant")}
                                </button>
                              </Popover.Popup>
                            </Popover.Positioner>
                          </Popover.Portal>
                        </Popover.Root>
                      </div>
                    )}
                  </div>

                  {/* Question body — inline edit or display */}
                  {isEditing ? (
                    <div className="rounded-md border border-border bg-card p-3 shadow-lg dark:shadow-black/20">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={Math.max(2, editText.split("\n").length)}
                        maxLength={500}
                        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                        autoFocus
                      />
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={handleEditCancel}
                          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent"
                        >
                          <X className="h-3.5 w-3.5" />
                          {tSession("cancelEdit")}
                        </button>
                        <button
                          onClick={handleEditSave}
                          disabled={!editText.trim()}
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
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

                  {/* Action row: reply trigger + reply counter + reactions */}
                  {!isEditing && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground">
                      {/* Reply trigger — hidden when thread is expanded (bottom input visible) */}
                      {!showThread && (
                        <button
                          onClick={() => {
                            if (replies.length > 0) setShowThread(true);
                            setReplyActive(true);
                            requestAnimationFrame(() => replyInputRef.current?.focus());
                          }}
                          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 -ml-1.5 transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <ReplyIcon className="h-3.5 w-3.5" />
                          {tSession("reply")}
                        </button>
                      )}
                      {replies.length > 0 && (
                        <>
                          {!showThread && (
                            <span className="h-3.5 border-l border-border" aria-hidden="true" />
                          )}
                          <button
                            onClick={() => setShowThread((v) => !v)}
                            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 -ml-1.5 transition-colors hover:bg-accent hover:text-foreground"
                          >
                            {showThread ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <MessageSquare className="h-3.5 w-3.5" />
                            )}
                            {tSession("replyCount", { count: replies.length })}
                          </button>
                        </>
                      )}
                      <span className="h-3.5 border-l border-border" aria-hidden="true" />
                      <ReactionBar
                        sessionCode={question.sessionCode}
                        targetId={question.id}
                        targetType="QUESTION"
                        reactionCounts={question.reactionCounts}
                        reactionOrder={question.reactionOrder}
                        fingerprint={fingerprint}
                      />
                    </div>
                  )}

                  {/* Intent-based reply input — only visible when activated */}
                  {replyActive && replies.length === 0 && !isEditing && (
                    <div className="mt-2 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <PixelAvatar
                        seed={fingerprint}
                        size={24}
                        className="shrink-0 rounded-full mt-1.5"
                      />
                      <div className="min-w-0 flex-1">
                        <textarea
                          ref={replyInputRef}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={handleReplyKeyDown}
                          onBlur={() => {
                            if (!replyText.trim()) setReplyActive(false);
                          }}
                          placeholder={tSession("replyPlaceholder")}
                          rows={2}
                          maxLength={REPLY_CHAR_LIMIT}
                          className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <div className="mt-2 flex items-center justify-end gap-2">
                          {replyText.length >= REPLY_COUNTER_THRESHOLD && (
                            <span
                              className={cn(
                                "mr-auto text-xs tabular-nums",
                                replyText.length >= 490
                                  ? "text-destructive"
                                  : "text-muted-foreground",
                              )}
                            >
                              {replyText.length}/{REPLY_CHAR_LIMIT}
                            </span>
                          )}
                          <kbd className="text-[11px] text-muted-foreground/40 select-none">⌘⏎</kbd>
                          <button
                            onClick={() => {
                              setReplyText("");
                              setReplyActive(false);
                              replyInputRef.current?.blur();
                            }}
                            className="rounded-md px-2.5 py-1 text-sm text-muted-foreground hover:bg-accent"
                          >
                            {tCommon("cancel")}
                          </button>
                          <button
                            onClick={handleReplySubmit}
                            disabled={!replyText.trim() || replyText.length > REPLY_CHAR_LIMIT}
                            className="rounded-md bg-primary px-2.5 py-1 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {tSession("send")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Thread with replies — input only at bottom when active */}
                  {replies.length > 0 && showThread && !isEditing && (
                    <ThreadSpine active={replyActive}>
                      <ReplyList
                        replies={replies}
                        isHost={true}
                        sessionCode={question.sessionCode}
                        fingerprint={fingerprint}
                        onEditReply={onEditReply}
                        onDeleteReply={onDeleteReply}
                      />
                      <div className={cn("pt-3", replyActive ? "flex items-start gap-2" : "")}>
                        {replyActive && (
                          <PixelAvatar
                            seed={fingerprint}
                            size={24}
                            className="shrink-0 rounded-full mt-1.5"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <textarea
                            ref={replyInputRef}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={handleReplyKeyDown}
                            onFocus={() => setReplyActive(true)}
                            onBlur={() => {
                              if (!replyText.trim()) setReplyActive(false);
                            }}
                            placeholder={tSession("replyPlaceholder")}
                            rows={replyActive ? 2 : 1}
                            maxLength={REPLY_CHAR_LIMIT}
                            className={cn(
                              "w-full resize-none text-sm leading-relaxed transition-all",
                              replyActive
                                ? "rounded-md border border-border bg-background px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                : "rounded-md border border-transparent bg-transparent px-3 py-2 placeholder:text-muted-foreground/50 hover:bg-accent/50 cursor-text",
                            )}
                          />
                          {replyActive && (
                            <div className="mt-2 mb-4 flex items-center justify-end gap-2 animate-in fade-in duration-150">
                              {replyText.length >= REPLY_COUNTER_THRESHOLD && (
                                <span
                                  className={cn(
                                    "mr-auto text-xs tabular-nums",
                                    replyText.length >= 490
                                      ? "text-destructive"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {replyText.length}/{REPLY_CHAR_LIMIT}
                                </span>
                              )}
                              <kbd className="text-[11px] text-muted-foreground/40 select-none">
                                ⌘⏎
                              </kbd>
                              <button
                                onClick={() => {
                                  setReplyText("");
                                  setReplyActive(false);
                                  replyInputRef.current?.blur();
                                }}
                                className="rounded-md px-2.5 py-1 text-sm text-muted-foreground hover:bg-accent"
                              >
                                {tCommon("cancel")}
                              </button>
                              <button
                                onClick={handleReplySubmit}
                                disabled={!replyText.trim() || replyText.length > REPLY_CHAR_LIMIT}
                                className="rounded-md bg-primary px-2.5 py-1 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {tSession("send")}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </ThreadSpine>
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

"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Check, MicVocal, Pencil, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { Reply } from "@nasqa/core";

import { IconButton } from "@/components/ui/icon-button";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { linkifyText } from "@/lib/linkify";
import { cn } from "@/lib/utils";

import { ReactionBar } from "./reaction-bar";

const EDIT_WINDOW_SECONDS = 300;

interface ReplyListProps {
  replies: Reply[];
  isHost: boolean;
  sessionCode: string;
  fingerprint: string;
  onEditReply?: (replyId: string, text: string) => void;
  onDeleteReply?: (replyId: string) => void;
}

interface ReplyRowProps {
  reply: Reply;
  isHost: boolean;
  sessionCode: string;
  fingerprint: string;
  onEditReply?: (replyId: string, text: string) => void;
  onDeleteReply?: (replyId: string) => void;
}

function ReplyRow({
  reply,
  isHost,
  sessionCode,
  fingerprint,
  onEditReply,
  onDeleteReply,
}: ReplyRowProps) {
  const t = useTranslations("session");
  const tCommon = useTranslations("common");
  const tIdentity = useTranslations("identity");
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(reply.text);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isOwn = reply.fingerprint === fingerprint;

  const [withinEditWindow, setWithinEditWindow] = useState(
    () => Math.floor(Date.now() / 1000) - reply.createdAt < EDIT_WINDOW_SECONDS,
  );
  const canEdit = isHost || (isOwn && withinEditWindow);

  useEffect(() => {
    if (isHost || !isOwn || !withinEditWindow) return;
    const msUntilExpiry = (reply.createdAt + EDIT_WINDOW_SECONDS) * 1000 - Date.now();
    if (msUntilExpiry <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- immediately expiring edit window that was already past due on mount
      setWithinEditWindow(false);
      return;
    }
    const timer = setTimeout(() => setWithinEditWindow(false), msUntilExpiry);
    return () => clearTimeout(timer);
  }, [isHost, isOwn, withinEditWindow, reply.createdAt]);

  function handleEditSave() {
    const trimmed = editText.trim();
    if (!trimmed) return;
    onEditReply?.(reply.id, trimmed);
    setIsEditing(false);
  }

  function handleEditCancel() {
    setEditText(reply.text);
    setIsEditing(false);
  }

  function handleConfirmDelete() {
    setDeleteConfirmOpen(false);
    onDeleteReply?.(reply.id);
  }

  const authorName = isOwn ? t("you") : reply.authorName || tIdentity("anonymous");

  return (
    <>
      <div className="group pb-2">
        {/* Author line — no avatar, compact */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[13px] font-semibold",
              isOwn
                ? "text-foreground text-[11px] font-medium rounded-full bg-primary/10 px-1.5 py-0.5 border border-primary/20"
                : "text-foreground/70",
            )}
          >
            {authorName}
          </span>
          {reply.isHostReply && (
            <span className="inline-flex items-center rounded-full bg-primary/10 p-0.5 border border-primary/20">
              <MicVocal className="h-3 w-3 text-primary shrink-0" />
            </span>
          )}
          <span className="text-[11px] text-muted-foreground/50">
            {formatRelativeTime(reply.createdAt, t)}
          </span>
          {reply.editedAt && (
            <span
              className="text-[11px] text-muted-foreground/50"
              title={new Date(reply.editedAt * 1000).toLocaleString()}
            >
              {t("edited")}
            </span>
          )}
          <div className="flex-1" />
          {canEdit && !isEditing && (
            <div className="flex shrink-0 items-center gap-0.5 opacity-100 lg:opacity-20 lg:group-hover:opacity-100 transition-opacity">
              <IconButton
                compact
                tooltip={t("editReply")}
                onClick={() => {
                  setEditText(reply.text);
                  setIsEditing(true);
                }}
              >
                <Pencil className="h-3 w-3" />
              </IconButton>
              <IconButton
                compact
                tooltip={t("deleteReply")}
                onClick={() => setDeleteConfirmOpen(true)}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </IconButton>
            </div>
          )}
        </div>

        {/* Reply body */}
        {isEditing ? (
          <div className="mt-1 rounded-md border border-border bg-card p-2.5 shadow-lg dark:shadow-black/20">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={Math.max(2, editText.split("\n").length)}
              maxLength={500}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[13px] leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              autoFocus
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                onClick={handleEditCancel}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
              >
                <X className="h-3 w-3" />
                {t("cancelEdit")}
              </button>
              <button
                onClick={handleEditSave}
                disabled={!editText.trim()}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                {t("saveEdit")}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 break-words text-[13px] leading-snug text-foreground/80">
            {linkifyText(reply.text)}
          </p>
        )}

        {/* Inline reaction bar */}
        {!isEditing && (
          <ReactionBar
            sessionCode={sessionCode}
            targetId={reply.id}
            targetType="REPLY"
            reactionCounts={reply.reactionCounts}
            reactionOrder={reply.reactionOrder}
            fingerprint={fingerprint}
            className="mt-0.5"
          />
        )}
      </div>

      {/* Delete reply confirmation dialog */}
      <Dialog.Root open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
              <Dialog.Title className="mb-2 text-lg font-bold text-foreground">
                {t("confirmDeleteReply")}
              </Dialog.Title>
              <Dialog.Description className="mb-5 text-sm text-muted-foreground">
                {t("confirmDeleteReplyDesc")}
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
                  {t("deleteReply")}
                </button>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export function ReplyList({
  replies,
  isHost,
  sessionCode,
  fingerprint,
  onEditReply,
  onDeleteReply,
}: ReplyListProps) {
  return (
    <div className="space-y-0.5">
      {replies.map((reply) => (
        <ReplyRow
          key={reply.id}
          reply={reply}
          isHost={isHost}
          sessionCode={sessionCode}
          fingerprint={fingerprint}
          onEditReply={onEditReply}
          onDeleteReply={onDeleteReply}
        />
      ))}
    </div>
  );
}

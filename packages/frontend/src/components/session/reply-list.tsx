"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Check, MicVocal, Pencil, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { Reply } from "@nasqa/core";

import { formatRelativeTime } from "@/lib/format-relative-time";
import { linkifyText } from "@/lib/linkify";
import { cn } from "@/lib/utils";

import { PixelAvatar } from "./pixel-avatar";
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

  // Track whether we're within the 5-minute edit window (participant path only).
  // Initial value computed once from reply.createdAt; auto-expires via setTimeout.
  const [withinEditWindow, setWithinEditWindow] = useState(
    () => Math.floor(Date.now() / 1000) - reply.createdAt < EDIT_WINDOW_SECONDS,
  );
  const canEdit = isHost || (isOwn && withinEditWindow);

  // Auto-expire participant edit window — no page reload required
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

  return (
    <>
      <div className="group border-l-2 border-border pl-4">
        <div className="mb-1 flex items-center gap-2">
          <PixelAvatar
            seed={reply.fingerprint}
            size={22}
            className={cn(
              "shrink-0 rounded-full",
              isOwn &&
                "ring-2 ring-indigo-500 dark:ring-amber-400 ring-offset-2 ring-offset-background",
            )}
          />
          <span
            className={cn(
              "text-[13px] font-semibold truncate max-w-[10rem]",
              isOwn ? "text-indigo-600 dark:text-amber-400 pl-1" : "text-foreground/80",
            )}
          >
            {isOwn ? t("you") : reply.authorName || tIdentity("anonymous")}
          </span>
          {reply.isHostReply && (
            <MicVocal className="h-3.5 w-3.5 text-indigo-500 dark:text-amber-400 shrink-0" />
          )}
          <span className="text-[13px] text-muted-foreground">
            {formatRelativeTime(reply.createdAt, t)}
          </span>

          {/* Edited badge */}
          {reply.editedAt && (
            <span
              className="text-[11px] text-muted-foreground/60"
              title={new Date(reply.editedAt * 1000).toLocaleString()}
            >
              {t("edited")}
            </span>
          )}

          <div className="flex-1" />

          {/* Edit/delete buttons */}
          {canEdit && !isEditing && (
            <div className="flex shrink-0 items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  setEditText(reply.text);
                  setIsEditing(true);
                }}
                aria-label={t("editReply")}
                title={t("editReply")}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                aria-label={t("deleteReply")}
                title={t("deleteReply")}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Reply body — inline edit or display */}
        {isEditing ? (
          <div className="space-y-2 pl-0">
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
                {t("cancelEdit")}
              </button>
              <button
                onClick={handleEditSave}
                disabled={!editText.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                {t("saveEdit")}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 break-words text-[15px] leading-relaxed text-foreground/85">
            {linkifyText(reply.text)}
          </p>
        )}

        {!isEditing && (
          <ReactionBar
            sessionCode={sessionCode}
            targetId={reply.id}
            targetType="REPLY"
            reactionCounts={reply.reactionCounts}
            reactionOrder={reply.reactionOrder}
            fingerprint={fingerprint}
            className="mt-1.5"
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
    <div className="space-y-3">
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

"use client";

import { Check, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import type { Snippet } from "@nasqa/core";

import { useShikiHighlight } from "@/hooks/use-shiki-highlight";
import { formatRelativeTime } from "@/lib/format-relative-time";

import { CopyButton } from "./copy-button";

// Keep SnippetWithHtml for backwards compatibility with ClipboardPanel's prop type.
// highlightedHtml is no longer used for rendering — useShikiHighlight provides HTML client-side.
export interface SnippetWithHtml extends Snippet {
  highlightedHtml?: string;
}

interface SnippetCardProps {
  snippet: SnippetWithHtml;
  variant: "hero" | "compact";
  isHost: boolean;
  onDelete?: () => void;
  /** Persistent creation-order number (#1 = oldest). */
  snippetNumber?: number;
  /** True when the server push for this snippet failed. */
  isFailed?: boolean;
  /** True when this is an optimistic (unconfirmed) snippet. */
  isOptimistic?: boolean;
  /** Called to retry a failed push. */
  onRetry?: () => void;
  /** Called to dismiss (permanently remove) a failed snippet. */
  onDismiss?: () => void;
  /** Called when the host starts inline-editing an optimistic snippet. */
  onEditStart?: () => void;
  /** Called when the host finishes inline-editing; provides final content and lang. */
  onEditEnd?: (content: string, lang: string) => void;
}

export function SnippetCard({
  snippet,
  variant,
  isHost,
  onDelete,
  snippetNumber,
  isFailed = false,
  isOptimistic = false,
  onRetry,
  onDismiss,
  onEditStart,
  onEditEnd,
}: SnippetCardProps) {
  const t = useTranslations("session");
  const { resolvedTheme } = useTheme();

  const [expanded, setExpanded] = useState(variant === "hero");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(snippet.content);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const lang = snippet.language ?? "text";
  const isCode = lang !== "text";
  const relativeTime = formatRelativeTime(snippet.createdAt, t);
  const lineCount = snippet.content.split("\n").length;
  const isLong = variant === "compact" && lineCount > 3;

  // Client-side Shiki highlighting — only render when expanded or hero
  const shouldHighlight = variant === "hero" || expanded;
  const shikiHtml = useShikiHighlight(
    shouldHighlight ? snippet.content : "",
    lang,
    resolvedTheme === "dark" ? "dark" : "light",
  );

  // Focus the edit textarea when entering edit mode
  useEffect(() => {
    if (isEditing && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.selectionStart = editTextareaRef.current.value.length;
      editTextareaRef.current.selectionEnd = editTextareaRef.current.value.length;
    }
  }, [isEditing]);

  const handleEditClick = () => {
    setEditContent(snippet.content);
    setIsEditing(true);
    onEditStart?.();
  };

  const handleEditSave = () => {
    setIsEditing(false);
    onEditEnd?.(editContent, snippet.language ?? "text");
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    // Resume the push with original content since editing is "finished" even if cancelled
    onEditEnd?.(snippet.content, snippet.language ?? "text");
  };

  const isHero = variant === "hero";
  const padding = isHero ? "p-5" : "px-4 py-3";
  const textSize = isHero ? "text-[15px]" : "text-sm";

  return (
    <div
      className={`rounded-2xl border bg-card ${padding} transition-all duration-200 ${
        isFailed
          ? "border-destructive hover:border-destructive/80"
          : "border-border hover:border-indigo-500/20"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {/* Language badge */}
          <span
            className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold ${isHero ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-muted text-muted-foreground"}`}
          >
            {isCode ? lang : t("text")}
          </span>
          {/* Snippet number badge */}
          {snippetNumber !== undefined && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
              #{snippetNumber}
            </span>
          )}
          {/* Relative time */}
          <span className="text-xs text-muted-foreground">{relativeTime}</span>
          {/* Failed indicator label */}
          {isFailed && (
            <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive">
              {t("pushFailed")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Copy button — hidden for failed snippets (not yet confirmed) */}
          {!isFailed && <CopyButton value={snippet.content} label={t("copy")} />}

          {/* Inline edit button — only for optimistic, non-failed snippets (host-only) */}
          {isOptimistic && !isFailed && isHost && onEditStart && !isEditing && (
            <button
              type="button"
              title={t("editSnippet")}
              onClick={handleEditClick}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={t("editSnippet")}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Retry button — only for failed snippets */}
          {isFailed && onRetry && (
            <button
              type="button"
              title={t("retryPush")}
              onClick={onRetry}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={t("retryPush")}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Delete button — for confirmed host snippets */}
          {isHost && onDelete && !isFailed && (
            <button
              type="button"
              title={t("deleteSnippet")}
              onClick={onDelete}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("deleteSnippet")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Dismiss button — for failed snippets */}
          {isFailed && onDismiss && (
            <button
              type="button"
              title={t("dismissFailed")}
              onClick={onDismiss}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("dismissFailed")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inline edit mode */}
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            ref={editTextareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={Math.max(3, editContent.split("\n").length)}
            spellCheck={false}
            className="w-full resize-none rounded-xl border border-input bg-muted/30 px-4 py-3 font-mono text-[15px] leading-normal text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              title={t("cancelEdit")}
              onClick={handleEditCancel}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              aria-label={t("cancelEdit")}
            >
              <X className="h-3.5 w-3.5" />
              {t("cancel")}
            </button>
            <button
              type="button"
              title={t("saveEdit")}
              onClick={handleEditSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
              aria-label={t("saveEdit")}
            >
              <Check className="h-3.5 w-3.5" />
              {t("save")}
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`overflow-hidden rounded-xl bg-muted/30 ${isLong && !expanded ? "cursor-pointer" : ""}`}
          onClick={isLong && !expanded ? () => setExpanded(true) : undefined}
        >
          {expanded || !isLong ? (
            shikiHtml ? (
              <div
                className={`shiki-wrapper overflow-x-auto ${textSize} leading-relaxed`}
                dangerouslySetInnerHTML={{ __html: shikiHtml }}
              />
            ) : (
              <pre
                className={`whitespace-pre-wrap break-words p-4 ${textSize} leading-relaxed ${isCode ? "font-mono" : "font-sans"} text-foreground`}
              >
                {snippet.content}
              </pre>
            )
          ) : (
            <pre
              className={`line-clamp-3 whitespace-pre-wrap break-words p-3 ${textSize} ${isCode ? "font-mono" : "font-sans"} text-foreground/80`}
            >
              {snippet.content}
            </pre>
          )}
        </div>
      )}

      {isLong && !isEditing && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {expanded ? t("collapse") : t("showAllLines", { count: lineCount })}
        </button>
      )}
    </div>
  );
}

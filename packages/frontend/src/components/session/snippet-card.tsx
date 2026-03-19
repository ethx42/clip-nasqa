"use client";

import { Check, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import type { Snippet } from "@nasqa/core";

import { IconButton } from "@/components/ui/icon-button";
import { useShikiHighlight } from "@/hooks/use-shiki-highlight";
import { SUPPORTED_LANGUAGES } from "@/lib/detect-language";
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
  /** Session code for building participant-facing shareable links. */
  sessionCode?: string;
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
  /** Called when host edits a confirmed (non-optimistic) snippet. */
  onEditSnippet?: (snippetId: string, content: string, language?: string) => void;
}

export function SnippetCard({
  snippet,
  variant,
  isHost,
  onDelete,
  sessionCode,
  snippetNumber,
  isFailed = false,
  isOptimistic = false,
  onRetry,
  onDismiss,
  onEditStart,
  onEditEnd,
  onEditSnippet,
}: SnippetCardProps) {
  const t = useTranslations("session");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();

  const [expanded, setExpanded] = useState(variant === "hero");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(snippet.content);
  const [editLanguage, setEditLanguage] = useState(snippet.language ?? "text");
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);

  // On mount, check if this card is the hash target and highlight it
  useEffect(() => {
    if (snippetNumber === undefined) return;
    const hash = window.location.hash;
    if (hash === `#snippet-${snippetNumber}`) {
      // Scroll into view and pulse
      requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        setIsHighlighted(true);
        setTimeout(() => setIsHighlighted(false), 2000);
      });
    }
  }, [snippetNumber]);

  const lang = snippet.language ?? "text";
  const isCode = lang !== "text";
  const relativeTime = formatRelativeTime(snippet.createdAt, t);
  const lineCount = snippet.content.split("\n").length;
  const isLong = variant === "compact" && lineCount > 3;

  // Client-side Shiki highlighting — render when content is visible (hero, expanded, or short compact)
  const shouldHighlight = variant === "hero" || expanded || !isLong;
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
    setEditLanguage(snippet.language ?? "text");
    setIsEditing(true);
    onEditStart?.();
  };

  const handleEditSave = () => {
    setIsEditing(false);
    if (onEditSnippet && !isOptimistic) {
      // Confirmed snippet edit — calls host mutation via onEditSnippet
      onEditSnippet(snippet.id, editContent, editLanguage !== "text" ? editLanguage : undefined);
    } else {
      // Optimistic snippet edit — signals useHostSnippetPush to finalize content
      onEditEnd?.(editContent, editLanguage);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    if (!isOptimistic) return;
    // Resume the push with original content since editing is "finished" even if cancelled
    onEditEnd?.(snippet.content, snippet.language ?? "text");
  };

  const isHero = variant === "hero";
  const textSize = isHero ? "text-[15px]" : "text-sm";

  return (
    <div
      ref={cardRef}
      className={`py-3 px-1 transition-all duration-200 ${
        isHighlighted
          ? "bg-indigo-500/5 rounded-lg ring-2 ring-indigo-500/30 animate-[snippet-highlight_2s_ease-out]"
          : isFailed
            ? "bg-destructive/5 rounded-lg"
            : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {/* Snippet number badge FIRST — clickable anchor, copies participant-view link */}
          {snippetNumber !== undefined && (
            <button
              type="button"
              id={`snippet-${snippetNumber}`}
              onClick={() => {
                const origin = window.location.origin;
                const url = sessionCode
                  ? `${origin}/${locale}/${sessionCode}#snippet-${snippetNumber}`
                  : `${origin}${window.location.pathname}#snippet-${snippetNumber}`;
                void navigator.clipboard.writeText(url);
              }}
              className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground transition-colors hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
              title={t("copySnippetLink")}
            >
              #{snippetNumber}
            </button>
          )}
          {/* Language badge */}
          <span
            className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold ${isHero ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-muted text-muted-foreground"}`}
          >
            {isCode ? lang : t("text")}
          </span>
          {/* Relative time */}
          <span className="text-xs text-muted-foreground">{relativeTime}</span>
          {/* Edited badge */}
          {snippet.editedAt && (
            <span
              className="text-[11px] text-muted-foreground/60"
              title={new Date(snippet.editedAt * 1000).toLocaleString()}
            >
              {t("edited")}
            </span>
          )}
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

          {/* Inline edit button — optimistic snippets (pre-push) or confirmed snippets (host only) */}
          {isHost &&
            !isFailed &&
            !isEditing &&
            ((isOptimistic && onEditStart) || (!isOptimistic && onEditSnippet)) && (
              <IconButton tooltip={t("editSnippet")} onClick={handleEditClick}>
                <Pencil className="h-3.5 w-3.5" />
              </IconButton>
            )}

          {/* Retry button — only for failed snippets */}
          {isFailed && onRetry && (
            <IconButton tooltip={t("retryPush")} onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5" />
            </IconButton>
          )}

          {/* Delete button — for confirmed host snippets */}
          {isHost && onDelete && !isFailed && (
            <IconButton
              tooltip={t("deleteSnippet")}
              onClick={onDelete}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          )}

          {/* Dismiss button — for failed snippets */}
          {isFailed && onDismiss && (
            <IconButton
              tooltip={t("dismissFailed")}
              onClick={onDismiss}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </IconButton>
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
            className="w-full resize-none rounded-lg border border-input bg-muted/30 px-4 py-3 font-mono text-[15px] leading-normal text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center justify-between gap-2">
            {/* Language selector — only for confirmed snippet edits */}
            {!isOptimistic && onEditSnippet ? (
              <select
                value={editLanguage}
                onChange={(e) => setEditLanguage(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                aria-label={t("selectLanguage")}
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.value === "text" ? t("text") : l.label}
                  </option>
                ))}
              </select>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
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
        </div>
      ) : (
        <div
          className={`overflow-hidden rounded-lg bg-muted/30 ${isLong && !expanded ? "cursor-pointer" : ""}`}
          onClick={isLong && !expanded ? () => setExpanded(true) : undefined}
        >
          {expanded || !isLong ? (
            shikiHtml && isCode ? (
              <div className="flex min-h-full">
                <div
                  aria-hidden
                  className={`select-none border-r border-border bg-muted/40 px-2.5 py-3 text-right font-mono ${textSize} leading-[1.65] text-muted-foreground`}
                >
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <div
                  className={`shiki-preview shiki-wrapper flex-1 overflow-x-auto px-3 py-3 font-mono ${textSize} leading-[1.65]`}
                  dangerouslySetInnerHTML={{ __html: shikiHtml }}
                />
              </div>
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
          {expanded ? t("collapse") : t("showAll")}
        </button>
      )}
    </div>
  );
}

"use client";

import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { Snippet } from "@nasqa/core";

import { renderHighlight } from "@/actions/snippet";
import { formatRelativeTime } from "@/lib/format-relative-time";

import { CopyButton } from "./copy-button";
import { HostInput } from "./host-input";
import { NewContentBanner } from "./new-content-banner";

interface SnippetWithHtml extends Snippet {
  highlightedHtml?: string;
}

interface ClipboardPanelProps {
  isHost?: boolean;
  sessionSlug: string;
  hostSecretHash?: string;
  snippets: SnippetWithHtml[];
  connectionStatus?: "connected" | "connecting" | "disconnected";
  onDeleteSnippet?: (snippetId: string) => void;
  onClearClipboard?: () => void;
}

const HISTORY_PAGE_SIZE = 10;
const SCROLL_THRESHOLD = 80;

function SnippetCard({
  snippet,
  variant,
  isHost,
  onDelete,
}: {
  snippet: SnippetWithHtml;
  variant: "hero" | "compact";
  isHost: boolean;
  onDelete?: () => void;
}) {
  const t = useTranslations("session");
  const [html, setHtml] = useState(snippet.highlightedHtml ?? null);
  const [expanded, setExpanded] = useState(variant === "hero");
  const lang = snippet.language ?? "text";
  const isCode = lang !== "text";
  const relativeTime = formatRelativeTime(snippet.createdAt, t);
  const lineCount = snippet.content.split("\n").length;
  const isLong = variant === "compact" && lineCount > 3;

  useEffect(() => {
    if (!html && isCode && (variant === "hero" || expanded)) {
      renderHighlight(snippet.content, lang).then((result) => {
        if (result) setHtml(result);
      });
    }
  }, [snippet.content, lang, isCode, html, variant, expanded]);

  const isHero = variant === "hero";
  const padding = isHero ? "p-5" : "px-4 py-3";
  const textSize = isHero ? "text-[15px]" : "text-sm";

  return (
    <div
      className={`rounded-2xl border border-border bg-card ${padding} transition-all duration-200 hover:border-indigo-500/20`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold ${isHero ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-muted text-muted-foreground"}`}
          >
            {isCode ? lang : t("text")}
          </span>
          <span className="text-xs text-muted-foreground">{relativeTime}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CopyButton value={snippet.content} label={t("copy")} />
          {isHost && onDelete && (
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
        </div>
      </div>

      <div
        className={`overflow-hidden rounded-xl bg-muted/30 ${isLong && !expanded ? "cursor-pointer" : ""}`}
        onClick={isLong && !expanded ? () => setExpanded(true) : undefined}
      >
        {expanded || !isLong ? (
          html ? (
            <div
              className={`shiki-wrapper overflow-x-auto ${textSize} leading-relaxed`}
              dangerouslySetInnerHTML={{ __html: html }}
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

      {isLong && (
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

export function ClipboardPanel({
  isHost = false,
  sessionSlug,
  hostSecretHash = "",
  snippets,
  connectionStatus = "connecting",
  onDeleteSnippet,
  onClearClipboard,
}: ClipboardPanelProps) {
  const t = useTranslations("session");
  const tCommon = useTranslations("common");
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const [showNewBanner, setShowNewBanner] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "clear";
    snippetId?: string;
  } | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevSnippetCount = useRef(snippets.length);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + HISTORY_PAGE_SIZE);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const newCount = snippets.length;
    const oldCount = prevSnippetCount.current;
    prevSnippetCount.current = newCount;

    if (newCount > oldCount) {
      const container = scrollContainerRef.current;
      if (container && container.scrollTop > SCROLL_THRESHOLD) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- subscription-driven state update based on scroll position
        setShowNewBanner(true);
      }
    }
  }, [snippets.length]);

  const prevSnippetsRef = useRef(snippets);
  useEffect(() => {
    const prev = prevSnippetsRef.current;
    prevSnippetsRef.current = snippets;
    if (prev.length > 0 && snippets.length === 0 && !isHost) {
      toast(t("clipboardCleared"));
    }
  }, [snippets, isHost, t]);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setShowNewBanner(false);
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop <= SCROLL_THRESHOLD) {
      setShowNewBanner(false);
    }
  }, []);

  const heroSnippet = snippets[0];
  const historySnippets = snippets.slice(1, visibleCount + 1);
  const hasMore = snippets.length > visibleCount + 1;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Scrollable content */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <NewContentBanner message={t("newSnippet")} visible={showNewBanner} onTap={scrollToTop} />

        {/* Host controls */}
        {isHost && snippets.length > 0 && (
          <div className="flex items-center justify-end px-1 pb-3">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmAction({ type: "clear" })}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("clearAll")}
            </button>
          </div>
        )}

        {snippets.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/30" />
            {connectionStatus === "connected" ? (
              <p className="text-base text-muted-foreground">{t("speakerLive")}</p>
            ) : (
              <p className="animate-pulse text-base text-muted-foreground">
                {t("waitingForSpeaker")}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-1">
            <AnimatePresence mode="popLayout">
              {heroSnippet && (
                <motion.div
                  key={heroSnippet.id}
                  layout
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <SnippetCard
                    snippet={heroSnippet}
                    variant="hero"
                    isHost={isHost}
                    onDelete={
                      onDeleteSnippet
                        ? () => setConfirmAction({ type: "delete", snippetId: heroSnippet.id })
                        : undefined
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {historySnippets.length > 0 && (
              <AnimatePresence initial={false}>
                {historySnippets.map((snippet) => (
                  <motion.div
                    key={snippet.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SnippetCard
                      snippet={snippet}
                      variant="compact"
                      isHost={isHost}
                      onDelete={
                        onDeleteSnippet
                          ? () => setConfirmAction({ type: "delete", snippetId: snippet.id })
                          : undefined
                      }
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {hasMore && <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />}
          </div>
        )}
      </div>

      {/* Host input — sticky at bottom */}
      {isHost && (
        <div className="shrink-0 border-t border-border p-3">
          <HostInput sessionSlug={sessionSlug} hostSecretHash={hostSecretHash} />
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog.Root
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <Dialog.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
              <Dialog.Title className="mb-2 text-lg font-bold text-foreground">
                {confirmAction?.type === "clear" ? t("clearAllTitle") : t("deleteSnippetTitle")}
              </Dialog.Title>
              <Dialog.Description className="mb-5 text-sm text-muted-foreground">
                {confirmAction?.type === "clear" ? t("clearAllDesc") : t("deleteSnippetDesc")}
              </Dialog.Description>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  onClick={() => {
                    if (confirmAction?.type === "clear") {
                      onClearClipboard?.();
                    } else if (confirmAction?.type === "delete" && confirmAction.snippetId) {
                      onDeleteSnippet?.(confirmAction.snippetId);
                    }
                    setConfirmAction(null);
                  }}
                  className="rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-destructive/90"
                >
                  {confirmAction?.type === "clear" ? t("clearAll") : t("delete")}
                </button>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

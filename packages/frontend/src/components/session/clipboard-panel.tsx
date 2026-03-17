"use client";

import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { HostInput } from "./host-input";
import { NewContentBanner } from "./new-content-banner";
import { SnippetCard, type SnippetWithHtml } from "./snippet-card";

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

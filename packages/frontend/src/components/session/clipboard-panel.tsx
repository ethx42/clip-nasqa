'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { Snippet } from '@nasqa/core';
import { HostInput } from './host-input';
import { CopyButton } from './copy-button';
import { NewContentBanner } from './new-content-banner';
import { renderHighlight } from '@/actions/snippet';

interface SnippetWithHtml extends Snippet {
  highlightedHtml?: string;
}

interface ClipboardPanelProps {
  isHost?: boolean;
  sessionSlug: string;
  hostSecretHash?: string;
  /** Snippets passed from parent — initially from SSR, later updated by subscription. */
  snippets: SnippetWithHtml[];
  /** Called by host to delete a single snippet. */
  onDeleteSnippet?: (snippetId: string) => void;
  /** Called by host to clear all snippets. */
  onClearClipboard?: () => void;
}

const HISTORY_PAGE_SIZE = 10;
const SCROLL_THRESHOLD = 80; // px scrolled down before showing the banner

function formatRelativeTime(createdAt: number): string {
  const now = Date.now();
  const diffMs = now - createdAt * 1000;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1m ago';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return '1h ago';
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

/** Inline hero card rendered client-side using pre-rendered HTML or plain text. */
function HeroCard({
  snippet,
  snippetNumber,
  isHost,
  onDelete,
}: {
  snippet: SnippetWithHtml;
  snippetNumber: number;
  isHost: boolean;
  onDelete?: () => void;
}) {
  const [html, setHtml] = useState(snippet.highlightedHtml ?? null);
  const lang = snippet.language ?? 'text';
  const isCode = lang !== 'text';
  const relativeTime = formatRelativeTime(snippet.createdAt);

  // If no pre-rendered HTML, fetch via Server Action
  useEffect(() => {
    if (!html && isCode) {
      renderHighlight(snippet.content, lang).then((result) => {
        if (result) setHtml(result);
      });
    }
  }, [snippet.content, lang, isCode, html]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {isCode ? lang : 'Text'}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{relativeTime}</span>
          <span className="text-xs font-medium text-muted-foreground">#{snippetNumber}</span>
          <CopyButton value={snippet.content} label="Copy" />
          {isHost && onDelete && (
            <button
              type="button"
              title="Delete snippet"
              onClick={onDelete}
              className="text-xs text-muted-foreground hover:text-destructive transition"
              aria-label="Delete snippet"
            >
              ···
            </button>
          )}
        </div>
      </div>
      <div className="max-h-[30rem] overflow-y-auto rounded-lg bg-muted/30">
        {html ? (
          <div
            className="shiki-wrapper overflow-x-auto text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre
            className={`whitespace-pre-wrap break-words p-3 text-sm leading-relaxed ${
              isCode ? 'font-mono' : 'font-sans'
            } text-foreground`}
          >
            {snippet.content}
          </pre>
        )}
      </div>
    </div>
  );
}

/** Inline history card rendered client-side. */
function HistoryCard({
  snippet,
  snippetNumber,
  isHost,
  onDelete,
}: {
  snippet: SnippetWithHtml;
  snippetNumber: number;
  isHost: boolean;
  onDelete?: () => void;
}) {
  const lang = snippet.language ?? 'text';
  const isCode = lang !== 'text';
  const relativeTime = formatRelativeTime(snippet.createdAt);
  // First 3 lines for truncated view
  const truncated = snippet.content.split('\n').slice(0, 3).join('\n');

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          {isCode ? lang : 'Text'}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{relativeTime}</span>
          <span className="text-xs text-muted-foreground">#{snippetNumber}</span>
          <CopyButton value={snippet.content} label="Copy" />
          {isHost && onDelete && (
            <button
              type="button"
              title="Delete snippet"
              onClick={onDelete}
              className="text-xs text-muted-foreground hover:text-destructive transition"
              aria-label="Delete snippet"
            >
              ···
            </button>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded bg-muted/30">
        <pre
          className={`line-clamp-3 whitespace-pre-wrap break-words p-2 text-xs ${
            isCode ? 'font-mono' : 'font-sans'
          } text-foreground`}
        >
          {truncated}
        </pre>
      </div>
    </div>
  );
}

/**
 * Client Component — clipboard panel displaying:
 * - HostInput (if isHost) at the top
 * - Empty state with pulse animation when no snippets
 * - HeroCard for latest snippet with Framer Motion entrance + hero-to-history layout animation
 * - Lazy-loaded HistoryCard list with IntersectionObserver sentinel
 * - Clear All button (host only) with confirmation
 * - Delete button (host only) on each snippet card
 * - Scroll-aware "New snippet" banner
 * - Toast notification when clipboard is cleared
 */
export function ClipboardPanel({
  isHost = false,
  sessionSlug,
  hostSecretHash = '',
  snippets,
  onDeleteSnippet,
  onClearClipboard,
}: ClipboardPanelProps) {
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const [showNewBanner, setShowNewBanner] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevSnippetCount = useRef(snippets.length);

  // Lazy-load more history items via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + HISTORY_PAGE_SIZE);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Show new content banner when a snippet arrives and user is scrolled down
  useEffect(() => {
    const newCount = snippets.length;
    const oldCount = prevSnippetCount.current;
    prevSnippetCount.current = newCount;

    if (newCount > oldCount) {
      const container = scrollContainerRef.current;
      if (container && container.scrollTop > SCROLL_THRESHOLD) {
        setShowNewBanner(true);
      }
    }
  }, [snippets.length]);

  // Show toast when CLIPBOARD_CLEARED event arrives (snippet count drops to 0 from >0)
  const prevSnippetsRef = useRef(snippets);
  useEffect(() => {
    const prev = prevSnippetsRef.current;
    prevSnippetsRef.current = snippets;
    if (prev.length > 0 && snippets.length === 0 && !isHost) {
      toast('Clipboard cleared by speaker');
    }
  }, [snippets, isHost]);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setShowNewBanner(false);
  }, []);

  // Hide banner when user scrolls back to top
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop <= SCROLL_THRESHOLD) {
      setShowNewBanner(false);
    }
  }, []);

  // snippets are reverse-chronological (newest first)
  const heroSnippet = snippets[0];
  const historySnippets = snippets.slice(1, visibleCount + 1);
  const hasMore = snippets.length > visibleCount + 1;

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      {/* New snippet banner — sticky at top */}
      <NewContentBanner
        message="New snippet from speaker"
        visible={showNewBanner}
        onTap={scrollToTop}
      />

      {/* Host input zone */}
      {isHost && (
        <div className="shrink-0">
          <HostInput
            sessionSlug={sessionSlug}
            hostSecretHash={hostSecretHash}
          />
        </div>
      )}

      {/* Host controls */}
      {isHost && snippets.length > 0 && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-destructive transition"
            onClick={() => {
              if (window.confirm('Clear all snippets? This cannot be undone.')) {
                onClearClipboard?.();
              }
            }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Content area */}
      {snippets.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <p className="animate-pulse text-sm text-muted-foreground">
            Waiting for the speaker...
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Hero (latest snippet) — animated entrance */}
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
                <HeroCard
                  snippet={heroSnippet}
                  snippetNumber={snippets.length}
                  isHost={isHost}
                  onDelete={onDeleteSnippet ? () => onDeleteSnippet(heroSnippet.id) : undefined}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* History list */}
          {historySnippets.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Previous snippets</p>
              <AnimatePresence initial={false}>
                {historySnippets.map((snippet, idx) => (
                  <motion.div
                    key={snippet.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <HistoryCard
                      snippet={snippet}
                      snippetNumber={snippets.length - 1 - idx}
                      isHost={isHost}
                      onDelete={onDeleteSnippet ? () => onDeleteSnippet(snippet.id) : undefined}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Lazy-load sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />
          )}
        </div>
      )}
    </div>
  );
}

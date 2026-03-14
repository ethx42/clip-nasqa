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
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {isCode ? lang : 'Text'}
          </span>
          <span className="text-base font-bold tabular-nums text-muted-foreground">#{snippetNumber}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted-foreground">{relativeTime}</span>
          <CopyButton value={snippet.content} label="Copy" />
          {isHost && onDelete && (
            <button
              type="button"
              title="Delete snippet"
              onClick={onDelete}
              className="text-sm text-muted-foreground hover:text-destructive transition"
              aria-label="Delete snippet"
            >
              ···
            </button>
          )}
        </div>
      </div>
      <div className="max-h-[30rem] overflow-y-auto rounded-xl bg-muted/30">
        {html ? (
          <div
            className="shiki-wrapper overflow-x-auto text-[15px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre
            className={`whitespace-pre-wrap break-words p-4 text-[15px] leading-relaxed ${
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

/** Inline history card rendered client-side with expand/collapse. */
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
  const [expanded, setExpanded] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const lang = snippet.language ?? 'text';
  const isCode = lang !== 'text';
  const relativeTime = formatRelativeTime(snippet.createdAt);
  const lineCount = snippet.content.split('\n').length;
  const isLong = lineCount > 3;

  // Fetch highlighted HTML when expanded (code only)
  useEffect(() => {
    if (expanded && isCode && !html) {
      renderHighlight(snippet.content, lang).then((result) => {
        if (result) setHtml(result);
      });
    }
  }, [expanded, isCode, html, snippet.content, lang]);

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="rounded-md px-2 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
            {isCode ? lang : 'Text'}
          </span>
          <span className="text-sm font-semibold tabular-nums text-muted-foreground">#{snippetNumber}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] text-muted-foreground">{relativeTime}</span>
          <CopyButton value={snippet.content} label="Copy" />
          {isHost && onDelete && (
            <button
              type="button"
              title="Delete snippet"
              onClick={onDelete}
              className="text-sm text-muted-foreground hover:text-destructive transition"
              aria-label="Delete snippet"
            >
              ···
            </button>
          )}
        </div>
      </div>
      <div
        className={`overflow-hidden rounded-lg bg-muted/30 ${isLong ? 'cursor-pointer' : ''}`}
        onClick={isLong ? () => setExpanded((v) => !v) : undefined}
      >
        {expanded ? (
          html ? (
            <div
              className="shiki-wrapper overflow-x-auto text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <pre
              className={`whitespace-pre-wrap break-words p-3 text-sm ${
                isCode ? 'font-mono' : 'font-sans'
              } text-foreground`}
            >
              {snippet.content}
            </pre>
          )
        ) : (
          <pre
            className={`line-clamp-3 whitespace-pre-wrap break-words p-3 text-sm ${
              isCode ? 'font-mono' : 'font-sans'
            } text-foreground/80`}
          >
            {snippet.content}
          </pre>
        )}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          {expanded ? 'Collapse' : `Show all ${lineCount} lines`}
        </button>
      )}
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
      className="flex flex-1 flex-col gap-5 overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-sm"
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
            className="text-sm font-medium text-muted-foreground hover:text-destructive transition"
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
        <div className="flex flex-1 items-center justify-center p-10 text-center">
          <p className="animate-pulse text-base text-muted-foreground">
            Waiting for the speaker...
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
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
            <div className="flex flex-col gap-3">
              <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground/50">History</p>
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

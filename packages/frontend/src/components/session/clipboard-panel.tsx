'use client';

import { useState, useEffect, useRef } from 'react';
import type { Snippet } from '@nasqa/core';
import { HostInput } from './host-input';
import { CopyButton } from './copy-button';
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
function HeroCard({ snippet, snippetNumber }: { snippet: SnippetWithHtml; snippetNumber: number }) {
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
function HistoryCard({ snippet, snippetNumber }: { snippet: SnippetWithHtml; snippetNumber: number }) {
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
 * - HeroCard for latest snippet
 * - Lazy-loaded HistoryCard list with IntersectionObserver sentinel
 * - Clear All button (host only, placeholder — mutation wired in Plan 04)
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
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  // snippets are reverse-chronological (newest first)
  const heroSnippet = snippets[0];
  const historySnippets = snippets.slice(1, visibleCount + 1);
  const hasMore = snippets.length > visibleCount + 1;

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-sm">
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
              if (window.confirm('Clear all snippets?')) {
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
          {/* Hero (latest snippet) */}
          {heroSnippet && (
            <HeroCard snippet={heroSnippet} snippetNumber={snippets.length} />
          )}

          {/* History list */}
          {historySnippets.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Previous snippets</p>
              {historySnippets.map((snippet, idx) => (
                <HistoryCard
                  key={snippet.id}
                  snippet={snippet}
                  snippetNumber={snippets.length - 1 - idx}
                />
              ))}
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

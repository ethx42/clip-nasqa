import type { Snippet } from '@nasqa/core';
import { ShikiBlock } from './shiki-block';
import { CopyButton } from './copy-button';

interface SnippetHeroProps {
  snippet: Snippet;
  snippetNumber: number;
  /** Pre-rendered Shiki HTML, if available (passed from ClipboardPanel Server wrapper or SSR). */
  highlightedHtml?: string;
}

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

/**
 * Server Component — displays the latest snippet as a full-width hero card.
 * Uses ShikiBlock for dual-theme syntax highlighting (code only).
 * Line numbers shown for code snippets, not for plain text.
 * Also accepts pre-rendered highlightedHtml for use from Client Component parents.
 */
export async function SnippetHero({ snippet, snippetNumber, highlightedHtml }: SnippetHeroProps) {
  const lang = snippet.language ?? 'text';
  const isCode = lang !== 'text';
  const relativeTime = formatRelativeTime(snippet.createdAt);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Language badge */}
          <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {isCode ? lang : 'Text'}
          </span>
          <span className="text-base font-bold tabular-nums text-muted-foreground">#{snippetNumber}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted-foreground">{relativeTime}</span>
          <CopyButton value={snippet.content} label="Copy" />
        </div>
      </div>

      {/* Code / text block */}
      <div className="max-h-[30rem] overflow-y-auto rounded-xl bg-muted/30">
        {highlightedHtml ? (
          <div
            className={`shiki-wrapper overflow-x-auto text-[15px] leading-relaxed ${isCode ? 'shiki-line-numbers' : ''}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <ShikiBlock
            code={snippet.content}
            lang={lang}
            showLineNumbers={isCode}
          />
        )}
      </div>
    </div>
  );
}

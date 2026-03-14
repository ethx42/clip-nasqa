import type { Snippet } from '@nasqa/core';
import { ShikiBlock } from './shiki-block';
import { CopyButton } from './copy-button';

interface SnippetHeroProps {
  snippet: Snippet;
  snippetNumber: number;
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
 */
export async function SnippetHero({ snippet, snippetNumber }: SnippetHeroProps) {
  const lang = snippet.language ?? 'text';
  const isCode = lang !== 'text';
  const relativeTime = formatRelativeTime(snippet.createdAt);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Language badge */}
          <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {isCode ? lang : 'Text'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{relativeTime}</span>
          <span className="text-xs font-medium text-muted-foreground">#{snippetNumber}</span>
          <CopyButton value={snippet.content} label="Copy" />
        </div>
      </div>

      {/* Code / text block */}
      <div className="max-h-[30rem] overflow-y-auto rounded-lg bg-muted/30">
        <ShikiBlock
          code={snippet.content}
          lang={lang}
          showLineNumbers={isCode}
        />
      </div>
    </div>
  );
}

import type { Snippet } from "@nasqa/core";

import { formatRelativeTime } from "@/lib/format-relative-time";

import { CopyButton } from "./copy-button";
import { ShikiBlock } from "./shiki-block";

interface SnippetCardProps {
  snippet: Snippet;
  snippetNumber: number;
  expanded?: boolean;
}

/**
 * Server Component — displays a collapsed history snippet card.
 * Shows first 3 lines when not expanded; full ShikiBlock when expanded.
 * Click-to-expand toggle will be added in Plan 04 (client-side state).
 */
export async function SnippetCard({ snippet, snippetNumber, expanded = false }: SnippetCardProps) {
  const lang = snippet.language ?? "text";
  const isCode = lang !== "text";
  const relativeTime = formatRelativeTime(snippet.createdAt);

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      {/* Header row */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="rounded-md px-2 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
            {isCode ? lang : "Text"}
          </span>
          <span className="text-sm font-semibold tabular-nums text-muted-foreground">
            #{snippetNumber}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] text-muted-foreground">{relativeTime}</span>
          <CopyButton value={snippet.content} label="Copy" />
        </div>
      </div>

      {/* Content */}
      {expanded ? (
        <div className="overflow-x-auto rounded-lg bg-muted/30 text-sm">
          <ShikiBlock code={snippet.content} lang={lang} showLineNumbers={false} />
        </div>
      ) : (
        <div className="line-clamp-3 overflow-hidden rounded-lg bg-muted/30 text-sm">
          <pre
            className={`whitespace-pre-wrap break-words ${isCode ? "font-mono" : "font-sans"} p-3`}
          >
            {snippet.content}
          </pre>
        </div>
      )}
    </div>
  );
}

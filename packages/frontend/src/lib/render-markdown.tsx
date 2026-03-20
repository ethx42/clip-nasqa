import React from "react";

const URL_PATTERN = /https?:\/\/\S+/g;

/**
 * Lightweight inline markdown renderer — intentionally hand-rolled, no AST library.
 *
 * Handles (in priority order):
 *   1. Line breaks  — \n → <br />
 *   2. Bold         — **text** → <strong>
 *   3. Italic       — *text* or _text_ → <em>
 *   4. Inline code  — `code` → <code> with monospace styling
 *   5. URLs         — https?://... → <a> with external link styling
 *
 * Returns React.ReactNode for direct use in JSX.
 */
export function renderMarkdown(text: string): React.ReactNode {
  // Split on newlines first — each line is processed independently for inline formatting
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]!;
    const nodes = parseInline(line, `${lineIndex}`);
    result.push(...nodes);
    // Add <br /> between lines (not after the last one)
    if (lineIndex < lines.length - 1) {
      result.push(<br key={`br-${lineIndex}`} />);
    }
  }

  return result.length === 1 ? result[0]! : <>{result}</>;
}

/**
 * Parse a single line of text for inline markdown patterns.
 * Returns an array of React nodes.
 */
function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
  if (!text) return [""];

  // Tokenize: split by bold, italic, code, and URLs — process in a single pass
  // Pattern order matters: code > bold > italic > url
  const tokenPattern = /(\*\*(.+?)\*\*)|(`(.+?)`)|((?:\*|_)(.+?)(?:\*|_))|(https?:\/\/\S+)/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    // Push plain text before this match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const key = `${keyPrefix}-${keyIndex++}`;

    if (match[1]) {
      // **bold**
      nodes.push(<strong key={key}>{match[2]}</strong>);
    } else if (match[3]) {
      // `inline code`
      nodes.push(
        <code key={key} className="rounded bg-muted px-1 font-mono text-[0.9em]">
          {match[4]}
        </code>,
      );
    } else if (match[5]) {
      // *italic* or _italic_
      nodes.push(<em key={key}>{match[6]}</em>);
    } else if (match[7]) {
      // URL
      const url = match[7];
      nodes.push(
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
        >
          {url}
        </a>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining plain text after last match
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length === 0 ? [text] : nodes;
}

// Keep URL_PATTERN export-compatible for potential future reuse
void URL_PATTERN;

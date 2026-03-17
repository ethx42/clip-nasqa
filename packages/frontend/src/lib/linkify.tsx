import React from "react";

/**
 * Converts a plain text string to React nodes with URLs wrapped in anchor tags.
 * Exported for use in both snippet text rendering and Q&A.
 */
export function linkifyText(text: string): React.ReactNode {
  const urlPattern = /https?:\/\/\S+/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const url = match[0];
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-500 underline underline-offset-2 hover:text-indigo-400 break-all"
      >
        {url}
      </a>,
    );
    lastIndex = match.index + url.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 0 ? text : <>{parts}</>;
}

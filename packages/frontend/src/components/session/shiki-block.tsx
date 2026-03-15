import { codeToHtml } from "shiki";
import type { BundledLanguage } from "shiki";

import { linkifyText } from "@/lib/linkify";

interface ShikiBlockProps {
  code: string;
  lang: string;
  showLineNumbers?: boolean;
}

/**
 * Async Server Component that renders code with Shiki dual-theme syntax highlighting.
 * For text snippets (lang === 'text'), renders as plain text with auto-linkified URLs.
 * No 'use client' — keeps Shiki entirely out of the client bundle.
 */
export async function ShikiBlock({ code, lang, showLineNumbers = false }: ShikiBlockProps) {
  if (lang === "text") {
    return (
      <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground leading-relaxed">
        {linkifyText(code)}
      </pre>
    );
  }

  // Determine if lang is a supported Shiki language; fallback to 'text' rendering
  let html: string;
  try {
    html = await codeToHtml(code, {
      lang: lang as BundledLanguage,
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      transformers: showLineNumbers
        ? [
            {
              line(node, line) {
                node.properties["data-line"] = line;
              },
            },
          ]
        : [],
    });
  } catch {
    // Fallback: render as plain text if language not supported
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground leading-relaxed">
        {code}
      </pre>
    );
  }

  return (
    <div
      className={`shiki-wrapper overflow-x-auto text-sm leading-relaxed ${showLineNumbers ? "shiki-line-numbers" : ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

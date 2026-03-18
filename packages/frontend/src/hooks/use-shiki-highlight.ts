"use client";

import type { HighlighterCore } from "@shikijs/core";
import { useEffect, useState } from "react";

import { SUPPORTED_LANGUAGES } from "@/lib/detect-language";

// Module-level singleton cache — shared across all hook instances
let _highlighterPromise: Promise<HighlighterCore> | null = null;

async function getHighlighter(): Promise<HighlighterCore> {
  if (_highlighterPromise) return _highlighterPromise;
  _highlighterPromise = (async () => {
    const { createHighlighterCore } = await import("shiki/core");
    const { createJavaScriptRegexEngine } = await import("shiki/engine/javascript");
    return createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      themes: [
        () => import("shiki/themes/github-light.mjs"),
        () => import("shiki/themes/github-dark.mjs"),
      ],
      langs: [],
    });
  })();
  return _highlighterPromise;
}

// Language loaders — one per supported language (excluding "text")
const LANG_LOADERS: Record<string, () => Promise<unknown>> = {
  typescript: () => import("shiki/langs/typescript.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  java: () => import("shiki/langs/java.mjs"),
  rust: () => import("shiki/langs/rust.mjs"),
  cpp: () => import("shiki/langs/cpp.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
  bash: () => import("shiki/langs/bash.mjs"),
};

// Validate LANG_LOADERS matches SUPPORTED_LANGUAGES at module load (dev-time safety)
if (process.env.NODE_ENV !== "production") {
  for (const { value } of SUPPORTED_LANGUAGES) {
    if (value !== "text" && !LANG_LOADERS[value]) {
      console.warn(`[use-shiki-highlight] Missing lang loader for: ${value}`);
    }
  }
}

/**
 * Client-side Shiki syntax highlighting hook with singleton highlighter.
 * All Shiki imports are dynamic — never in the initial bundle.
 *
 * @param code - Source code to highlight
 * @param lang - Language identifier (e.g. "typescript", "python", "text")
 * @param resolvedTheme - "light" or "dark"
 * @returns Highlighted HTML string, or null while loading or when lang is "text"
 */
export function useShikiHighlight(
  code: string,
  lang: string,
  resolvedTheme: "light" | "dark",
): string | null {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!code.trim() || lang === "text") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting highlight when input becomes empty or lang is plain text
      setHtml(null);
      return;
    }

    const theme = resolvedTheme === "dark" ? "github-dark" : "github-light";

    void (async () => {
      try {
        const highlighter = await getHighlighter();
        if (cancelled) return;

        // Lazily load the language grammar if not already loaded
        const loadedLangs = highlighter.getLoadedLanguages();
        if (!loadedLangs.includes(lang)) {
          const loader = LANG_LOADERS[lang];
          if (!loader) {
            // Unknown language — fall back to plain text
            setHtml(null);
            return;
          }
          await highlighter.loadLanguage(loader as Parameters<typeof highlighter.loadLanguage>[0]);
          if (cancelled) return;
        }

        const result = highlighter.codeToHtml(code, { lang, theme });
        if (!cancelled) setHtml(result);
      } catch {
        // Syntax error or unsupported language — fall back gracefully
        if (!cancelled) setHtml(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, lang, resolvedTheme]);

  return html;
}

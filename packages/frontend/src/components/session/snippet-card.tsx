"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { Snippet } from "@nasqa/core";

import { renderHighlight } from "@/actions/snippet";
import { formatRelativeTime } from "@/lib/format-relative-time";

import { CopyButton } from "./copy-button";

export interface SnippetWithHtml extends Snippet {
  highlightedHtml?: string;
}

interface SnippetCardProps {
  snippet: SnippetWithHtml;
  variant: "hero" | "compact";
  isHost: boolean;
  onDelete?: () => void;
}

export function SnippetCard({ snippet, variant, isHost, onDelete }: SnippetCardProps) {
  const t = useTranslations("session");
  const [html, setHtml] = useState(snippet.highlightedHtml ?? null);
  const [expanded, setExpanded] = useState(variant === "hero");
  const lang = snippet.language ?? "text";
  const isCode = lang !== "text";
  const relativeTime = formatRelativeTime(snippet.createdAt, t);
  const lineCount = snippet.content.split("\n").length;
  const isLong = variant === "compact" && lineCount > 3;

  useEffect(() => {
    if (!html && isCode && (variant === "hero" || expanded)) {
      renderHighlight(snippet.content, lang).then((result) => {
        if (result) setHtml(result);
      });
    }
  }, [snippet.content, lang, isCode, html, variant, expanded]);

  const isHero = variant === "hero";
  const padding = isHero ? "p-5" : "px-4 py-3";
  const textSize = isHero ? "text-[15px]" : "text-sm";

  return (
    <div
      className={`rounded-2xl border border-border bg-card ${padding} transition-all duration-200 hover:border-indigo-500/20`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold ${isHero ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-muted text-muted-foreground"}`}
          >
            {isCode ? lang : t("text")}
          </span>
          <span className="text-xs text-muted-foreground">{relativeTime}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CopyButton value={snippet.content} label={t("copy")} />
          {isHost && onDelete && (
            <button
              type="button"
              title={t("deleteSnippet")}
              onClick={onDelete}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("deleteSnippet")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        className={`overflow-hidden rounded-xl bg-muted/30 ${isLong && !expanded ? "cursor-pointer" : ""}`}
        onClick={isLong && !expanded ? () => setExpanded(true) : undefined}
      >
        {expanded || !isLong ? (
          html ? (
            <div
              className={`shiki-wrapper overflow-x-auto ${textSize} leading-relaxed`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <pre
              className={`whitespace-pre-wrap break-words p-4 ${textSize} leading-relaxed ${isCode ? "font-mono" : "font-sans"} text-foreground`}
            >
              {snippet.content}
            </pre>
          )
        ) : (
          <pre
            className={`line-clamp-3 whitespace-pre-wrap break-words p-3 ${textSize} ${isCode ? "font-mono" : "font-sans"} text-foreground/80`}
          >
            {snippet.content}
          </pre>
        )}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {expanded ? t("collapse") : t("showAllLines", { count: lineCount })}
        </button>
      )}
    </div>
  );
}

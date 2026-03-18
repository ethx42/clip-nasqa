"use client";

import { Copy, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useCallback, useRef, useState } from "react";

import { useShikiHighlight } from "@/hooks/use-shiki-highlight";
import { detectLanguage, SUPPORTED_LANGUAGES } from "@/lib/detect-language";

interface HostInputProps {
  sessionCode: string;
  hostSecretHash: string;
  /** Optimistic push handler. If not provided, push button is disabled. */
  onPush?: (content: string, lang: string) => Promise<{ success: boolean; tempId: string }>;
  /** Called after a snippet is pushed — use for scroll-to-top. */
  onSnippetPushed?: () => void;
}

export function HostInput({ onPush, onSnippetPushed }: HostInputProps) {
  const t = useTranslations("session");
  const { resolvedTheme } = useTheme();

  const [value, setValue] = useState("");
  const [manualLang, setManualLang] = useState<string>("auto");
  const [showPreview, setShowPreview] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const cursorPos = useRef(0);

  const activeLang = manualLang === "auto" ? detectLanguage(value) : manualLang;
  const shikiHtml = useShikiHighlight(
    value,
    activeLang,
    resolvedTheme === "dark" ? "dark" : "light",
  );
  const hasHighlight = activeLang !== "text" && shikiHtml !== null;

  // Sync scroll between textarea and highlight backdrop
  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const bd = backdropRef.current;
    if (ta && bd) {
      bd.scrollTop = ta.scrollTop;
      bd.scrollLeft = ta.scrollLeft;
    }
  }, []);

  // Auto-resize both textarea and backdrop
  const resize = useCallback(() => {
    const ta = textareaRef.current;
    const bd = backdropRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const h = `${Math.min(ta.scrollHeight, 300)}px`;
    ta.style.height = h;
    if (bd) bd.style.height = h;
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      resize();
    },
    [resize],
  );

  const handleTogglePreview = useCallback(() => {
    if (!showPreview) {
      // Capture cursor position before switching to preview
      cursorPos.current = textareaRef.current?.selectionStart ?? 0;
      setShowPreview(true);
    } else {
      setShowPreview(false);
      // Restore cursor position after switching back to edit
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(cursorPos.current, cursorPos.current);
        }
      });
    }
  }, [showPreview]);

  const handlePush = useCallback(async () => {
    const content = value.trim();
    if (!content || !onPush) return;

    const lang = activeLang;

    // Clear immediately — optimistic push is instant, no spinner
    setValue("");
    setManualLang("auto");
    setShowPreview(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      // Fix SHIKI-07 clear artifact: reset selection to prevent residual highlight from text-transparent
      textareaRef.current.selectionStart = 0;
      textareaRef.current.selectionEnd = 0;
      textareaRef.current.focus();
    }
    if (backdropRef.current) {
      backdropRef.current.style.height = "auto";
    }

    await onPush(content, lang);
    onSnippetPushed?.();
  }, [value, activeLang, onPush, onSnippetPushed]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handlePush();
      }
    },
    [handlePush],
  );

  const handleCopyPreview = useCallback(() => {
    void navigator.clipboard.writeText(value);
  }, [value]);

  const lineCount = value.split("\n").length;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      {/* Language dropdown — only visible when there is text */}
      {value.trim() && (
        <div className="flex items-center gap-2">
          <select
            value={manualLang}
            onChange={(e) => setManualLang(e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            aria-label={t("selectLanguage")}
          >
            <option value="auto">
              {t("autoDetect")} (
              {activeLang === "text"
                ? t("text")
                : (SUPPORTED_LANGUAGES.find((l) => l.value === activeLang)?.label ?? activeLang)}
              )
            </option>
            {SUPPORTED_LANGUAGES.filter((l) => l.value !== "text").map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Editor: preview mode or overlay textarea on top of highlighted backdrop */}
      <div className="relative" style={{ minHeight: "80px", maxHeight: "300px" }}>
        {showPreview ? (
          /* Preview mode — syntax-highlighted output with line numbers */
          <div
            className="relative overflow-hidden rounded-xl border border-input bg-background"
            style={{ minHeight: "80px", maxHeight: "300px" }}
          >
            <div className="overflow-auto" style={{ maxHeight: "300px" }}>
              {shikiHtml ? (
                <div className="flex">
                  {/* Line numbers gutter */}
                  <div
                    aria-hidden
                    className="select-none border-r border-border bg-muted/40 px-3 py-3 text-right font-mono text-[13px] leading-normal text-muted-foreground"
                  >
                    {Array.from({ length: lineCount }, (_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  {/* Highlighted code */}
                  <div
                    className="shiki-wrapper flex-1 overflow-x-auto px-4 py-3 font-mono text-[15px] leading-normal"
                    dangerouslySetInnerHTML={{ __html: shikiHtml }}
                  />
                </div>
              ) : (
                <pre className="p-4 font-mono text-[15px] leading-normal text-foreground whitespace-pre-wrap break-words">
                  {value}
                </pre>
              )}
            </div>
            {/* Copy button in preview mode */}
            <button
              type="button"
              onClick={handleCopyPreview}
              title={t("copy")}
              aria-label={t("copy")}
              className="absolute right-2 top-2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            {/* Highlighted backdrop — rendered behind the textarea */}
            <div
              ref={backdropRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl border border-transparent bg-background px-4 py-3"
              style={{ minHeight: "80px" }}
            >
              {hasHighlight ? (
                <div
                  className="shiki-wrapper whitespace-pre-wrap break-words font-mono text-[15px] leading-normal"
                  dangerouslySetInnerHTML={{ __html: shikiHtml! }}
                />
              ) : (
                <span className="whitespace-pre-wrap break-words font-mono text-[15px] leading-normal text-transparent">
                  {value}
                </span>
              )}
            </div>

            {/* Textarea — transparent text when highlighted, visible otherwise */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onScroll={syncScroll}
              placeholder={t("pasteOrType")}
              rows={3}
              spellCheck={false}
              className={`relative z-10 w-full resize-none rounded-xl border border-input bg-transparent px-4 py-3 font-mono text-[15px] leading-normal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 transition caret-foreground ${
                hasHighlight ? "text-transparent" : "text-foreground"
              }`}
              style={{ minHeight: "80px", maxHeight: "300px" }}
            />
          </>
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Language badge when no dropdown shown */}
          {value.trim() ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              {activeLang === "text"
                ? t("text")
                : (SUPPORTED_LANGUAGES.find((l) => l.value === activeLang)?.label ?? activeLang)}
            </span>
          ) : (
            <span />
          )}

          {/* Preview toggle — only when there is text */}
          {value.trim() && (
            <button
              type="button"
              onClick={handleTogglePreview}
              title={showPreview ? t("editMode") : t("previewMode")}
              aria-label={showPreview ? t("editMode") : t("previewMode")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handlePush()}
          disabled={!value.trim() || !onPush}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2 text-base font-bold text-white shadow-sm transition hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {t("pushSnippet")}
          <kbd className="ml-1 hidden rounded-md bg-white/20 px-1.5 py-0.5 text-xs font-medium sm:inline">
            ⌘↵
          </kbd>
        </button>
      </div>
    </div>
  );
}

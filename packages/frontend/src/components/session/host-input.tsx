"use client";

import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

import { pushSnippetAction, renderHighlight } from "@/actions/snippet";
import { detectLanguage, SUPPORTED_LANGUAGES } from "@/lib/detect-language";

interface HostInputProps {
  sessionSlug: string;
  hostSecretHash: string;
  onSnippetPushed?: () => void;
}

/**
 * Client Component — host snippet composer with:
 * - Auto-resize textarea
 * - Language auto-detection with manual override dropdown
 * - Live Shiki preview via Server Action (300ms debounced)
 * - Cmd/Ctrl+Enter to push, "Push Snippet" button
 * - Input clears immediately after push (optimistic)
 */
export function HostInput({ sessionSlug, hostSecretHash, onSnippetPushed }: HostInputProps) {
  const t = useTranslations("session");
  const [value, setValue] = useState("");
  const [detectedLang, setDetectedLang] = useState("text");
  const [previewHtml, setPreviewHtml] = useState("");
  const [isPushing, setIsPushing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeLang = detectedLang;

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 300)}px`;
  }, []);

  // Debounced live preview
  const schedulePreview = useCallback((code: string, lang: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!code.trim() || lang === "text") {
        setPreviewHtml("");
        return;
      }
      const html = await renderHighlight(code, lang);
      setPreviewHtml(html);
    }, 300);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      resizeTextarea();
      const detected = detectLanguage(newValue);
      setDetectedLang(detected);
      schedulePreview(newValue, detected);
    },
    [resizeTextarea, schedulePreview],
  );

  const handlePush = useCallback(async () => {
    const content = value.trim();
    if (!content || isPushing) return;
    setIsPushing(true);
    // Clear immediately (optimistic)
    setValue("");
    setPreviewHtml("");
    setDetectedLang("text");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    const lang = activeLang;
    const type = lang !== "text" ? "code" : "text";
    await pushSnippetAction({
      sessionSlug,
      hostSecretHash,
      content,
      type,
      language: lang !== "text" ? lang : undefined,
    });
    setIsPushing(false);
    onSnippetPushed?.();
  }, [value, isPushing, activeLang, sessionSlug, hostSecretHash, onSnippetPushed]);

  // Keyboard shortcut: Cmd/Ctrl + Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void handlePush();
      }
    },
    [handlePush],
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-3">
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={t("pasteOrType")}
        rows={3}
        className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 font-mono text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        style={{ minHeight: "80px", maxHeight: "300px" }}
      />

      {/* Controls row */}
      <div className="flex items-center justify-between gap-3">
        {/* Read-only language chip — only visible when there's content */}
        {value.trim() ? (
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {activeLang === "text"
              ? t("text")
              : (SUPPORTED_LANGUAGES.find((l) => l.value === activeLang)?.label ?? activeLang)}
          </span>
        ) : (
          <span />
        )}

        {/* Push button */}
        <button
          type="button"
          onClick={() => void handlePush()}
          disabled={!value.trim() || isPushing}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-base font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          {isPushing ? t("pushing") : t("pushSnippet")}
          <kbd className="ml-1 hidden rounded-md bg-white/20 px-1.5 py-0.5 text-xs font-medium sm:inline">
            ⌘↵
          </kbd>
        </button>
      </div>

      {/* Live preview */}
      {previewHtml && (
        <div
          className="max-h-48 overflow-y-auto overflow-x-auto rounded-xl border border-border bg-background p-3 text-[15px]"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}
    </div>
  );
}

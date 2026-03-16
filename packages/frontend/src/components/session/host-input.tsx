"use client";

import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { pushSnippetAction, renderHighlight } from "@/actions/snippet";
import { detectLanguage, SUPPORTED_LANGUAGES } from "@/lib/detect-language";

interface HostInputProps {
  sessionSlug: string;
  hostSecretHash: string;
  onSnippetPushed?: () => void;
}

export function HostInput({ sessionSlug, hostSecretHash, onSnippetPushed }: HostInputProps) {
  const t = useTranslations("session");
  const [value, setValue] = useState("");
  const [detectedLang, setDetectedLang] = useState("text");
  const [highlightHtml, setHighlightHtml] = useState("");
  const [isPushing, setIsPushing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeLang = detectedLang;
  const hasHighlight = activeLang !== "text" && highlightHtml !== "";

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

  // Debounced syntax highlight
  const scheduleHighlight = useCallback((code: string, lang: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!code.trim() || lang === "text") {
        setHighlightHtml("");
        return;
      }
      const html = await renderHighlight(code, lang);
      setHighlightHtml(html);
    }, 200);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      resize();
      const detected = detectLanguage(newValue);
      setDetectedLang(detected);
      scheduleHighlight(newValue, detected);
    },
    [resize, scheduleHighlight],
  );

  const handlePush = useCallback(async () => {
    const content = value.trim();
    if (!content || isPushing) return;

    if (!hostSecretHash) {
      toast.error("Host secret not ready — try again in a moment");
      return;
    }

    // Cancel any pending highlight to avoid racing with the push server action
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    setIsPushing(true);
    const lang = activeLang;
    setValue("");
    setHighlightHtml("");
    setDetectedLang("text");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    if (backdropRef.current) {
      backdropRef.current.style.height = "auto";
    }
    const type = lang !== "text" ? "code" : "text";
    const result = await pushSnippetAction({
      sessionSlug,
      hostSecretHash,
      content,
      type,
      language: lang !== "text" ? lang : undefined,
    });
    setIsPushing(false);
    if (!result.success) {
      // Restore content so the user doesn't lose their work
      setValue(content);
      setDetectedLang(lang);
      toast.error(result.error, { duration: 5000 });
      return;
    }
    onSnippetPushed?.();
  }, [value, isPushing, activeLang, sessionSlug, hostSecretHash, onSnippetPushed]);

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
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      {/* Editor: overlay textarea on top of highlighted backdrop */}
      <div className="relative" style={{ minHeight: "80px", maxHeight: "300px" }}>
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
              dangerouslySetInnerHTML={{ __html: highlightHtml }}
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
          className={`relative z-10 w-full resize-none rounded-xl border border-input bg-transparent px-4 py-3 font-mono text-[15px] leading-normal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 transition caret-foreground ${
            hasHighlight ? "text-transparent" : "text-foreground"
          }`}
          style={{ minHeight: "80px", maxHeight: "300px" }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-3">
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
    </div>
  );
}

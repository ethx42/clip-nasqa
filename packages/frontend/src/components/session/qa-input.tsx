"use client";

import { Loader2, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { PixelAvatar } from "./pixel-avatar";

const CHAR_LIMIT = 500;
const COUNTER_THRESHOLD = Math.floor(CHAR_LIMIT * 0.8); // 400

interface QAInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  isBanned?: boolean;
  fingerprint?: string;
  authorName?: string;
  /** When true, disables the input and shows a spinner on the send button. */
  isPending?: boolean;
  /** When truthy, restores this text into the input (e.g. after a failed submission). */
  restoredText?: string;
}

export function QAInput({
  onSubmit,
  disabled = false,
  isBanned = false,
  fingerprint,
  authorName,
  isPending = false,
  restoredText = "",
}: QAInputProps) {
  const t = useTranslations("moderation");
  const tSession = useTranslations("session");
  const tIdentity = useTranslations("identity");
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevRestoredTextRef = useRef("");

  const isEffectivelyDisabled = disabled || isBanned || isPending;

  // Restore text when restoredText prop changes to a truthy value (failed submission)
  useEffect(() => {
    if (restoredText && restoredText !== prevRestoredTextRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring failed submission text from parent prop change
      setText(restoredText);
      prevRestoredTextRef.current = restoredText;
    }
  }, [restoredText]);

  // Auto-resize textarea between 1-3 rows
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 26; // approx px per row
    const minHeight = lineHeight;
    const maxHeight = lineHeight * 3;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
  }, [text]);

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > CHAR_LIMIT || isEffectivelyDisabled) return;
    onSubmit(trimmed);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isOverLimit = text.length > CHAR_LIMIT;
  const showCounter = text.length >= COUNTER_THRESHOLD;
  const canSubmit = text.trim().length > 0 && !isOverLimit && !isEffectivelyDisabled;

  // Banned state: show disabled input with message
  if (isBanned) {
    return (
      <div className="border-t border-border bg-card px-5 py-4">
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground cursor-not-allowed select-none">
          {t("blockedFromPosting")}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-card px-5 py-4">
      {/* Identity row — always visible, purely informational */}
      {fingerprint && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <PixelAvatar seed={fingerprint} size={20} className="rounded-full shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {authorName || tIdentity("anonymous")}
          </span>
        </div>
      )}
      <div className="flex items-end gap-3">
        <div className="relative min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tSession("askQuestion")}
            disabled={isEffectivelyDisabled}
            rows={1}
            style={{ resize: "none", overflow: "hidden" }}
            className={cn(
              "block w-full rounded-xl border border-border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed",
              isOverLimit && "border-destructive focus:ring-destructive/50",
            )}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label={tSession("sendQuestion")}
          className="flex-shrink-0 rounded-xl bg-indigo-600 p-3 text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>

      {showCounter && (
        <div className="mt-2 flex justify-end">
          <span
            className={cn(
              "text-xs tabular-nums",
              isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground",
            )}
          >
            {text.length}/{CHAR_LIMIT}
          </span>
        </div>
      )}
    </div>
  );
}

"use client";

import { SmilePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { EMOJI_PALETTE } from "@nasqa/core";
import type { EmojiKey } from "@nasqa/core";

import { useReactionState } from "@/hooks/use-reaction-state";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns "99+" for counts over 99; otherwise the count as a string. */
function formatCount(n: number): string {
  return n > 99 ? "99+" : String(n);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ReactionBarProps {
  sessionSlug: string;
  targetId: string;
  targetType: "QUESTION" | "REPLY";
  reactionCounts: string | undefined; // raw AWSJSON from question/reply
  fingerprint: string;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Slack-style reaction bar with:
 * - Active pills for emojis with count > 0
 * - Add-reaction trigger that opens an inline emoji picker (not a popover)
 * - Optimistic toggle via useReactionState
 * - Full ARIA accessibility with 44px minimum touch targets
 * - Neutral gray active highlight (bg-muted — never brand indigo)
 */
export function ReactionBar({
  sessionSlug,
  targetId,
  targetType,
  reactionCounts,
  fingerprint,
  className,
}: ReactionBarProps) {
  const t = useTranslations("reactions");
  const [pickerOpen, setPickerOpen] = useState(false);

  const { displayCounts, activeEmojis, toggle } = useReactionState({
    sessionSlug,
    targetId,
    targetType,
    serverCounts: reactionCounts,
    fingerprint,
  });

  // Only render pills for emojis that have at least one reaction
  const activePills = EMOJI_PALETTE.filter(({ key }) => displayCounts[key as EmojiKey] > 0);

  function handlePillClick(key: EmojiKey) {
    toggle(key);
  }

  function handlePickerSelect(key: EmojiKey) {
    toggle(key);
    setPickerOpen(false);
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {/* Active reaction pills */}
      {activePills.map(({ key, emoji }) => {
        const emojiKey = key as EmojiKey;
        const isActive = activeEmojis.has(emojiKey);
        const count = displayCounts[emojiKey];

        return (
          <button
            key={emojiKey}
            type="button"
            onClick={() => handlePillClick(emojiKey)}
            aria-label={t(isActive ? "emojiLabelActive" : "emojiLabel", {
              emoji: t(emojiKey),
              count,
            })}
            aria-pressed={isActive}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-sm transition-colors select-none",
              isActive
                ? "border-foreground/15 bg-muted text-foreground"
                : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/40",
            )}
          >
            <span className="text-base leading-none" aria-hidden="true">
              {emoji}
            </span>
            <span className="tabular-nums text-xs font-medium">{formatCount(count)}</span>
          </button>
        );
      })}

      {/* Add-reaction trigger */}
      <button
        type="button"
        onClick={() => setPickerOpen((v) => !v)}
        aria-label={t("addReaction")}
        aria-expanded={pickerOpen}
        className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/40 transition-colors"
      >
        <SmilePlus className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Inline emoji picker — rendered in the flex flow, not as a floating popover */}
      {pickerOpen && (
        <div className="flex items-center gap-1 animate-in fade-in duration-150">
          {EMOJI_PALETTE.map(({ key, emoji }) => {
            const emojiKey = key as EmojiKey;
            return (
              <button
                key={emojiKey}
                type="button"
                onClick={() => handlePickerSelect(emojiKey)}
                aria-label={t(emojiKey)}
                className="rounded-full p-1.5 text-base hover:bg-muted/40 transition-colors"
              >
                <span aria-hidden="true">{emoji}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

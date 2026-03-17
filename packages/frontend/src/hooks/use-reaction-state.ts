"use client";

import { useEffect, useRef, useState } from "react";

import { EMOJI_KEYS } from "@nasqa/core";
import type { EmojiKey, ReactionCounts } from "@nasqa/core";

import { reactAction } from "@/actions/reactions";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse a raw AWSJSON string (or undefined/null) into a ReactionCounts object.
 * Builds a zero-filled default, then merges parsed JSON over it.
 * Exported for reuse by other components.
 */
export function parseReactionCounts(raw: string | undefined | null): ReactionCounts {
  const defaults = Object.fromEntries(EMOJI_KEYS.map((k) => [k, 0])) as unknown as ReactionCounts;
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Partial<ReactionCounts>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function reactionsLocalKey(sessionSlug: string, targetId: string): string {
  return `reactions:${sessionSlug}:${targetId}`;
}

function readActiveEmojis(sessionSlug: string, targetId: string): Set<EmojiKey> {
  try {
    const raw = localStorage.getItem(reactionsLocalKey(sessionSlug, targetId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as EmojiKey[];
    return new Set(
      parsed.filter((k): k is EmojiKey => (EMOJI_KEYS as readonly string[]).includes(k)),
    );
  } catch {
    return new Set();
  }
}

function writeActiveEmojis(sessionSlug: string, targetId: string, set: Set<EmojiKey>): void {
  try {
    localStorage.setItem(reactionsLocalKey(sessionSlug, targetId), JSON.stringify([...set]));
  } catch {
    // SSR or storage unavailable — ignore
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseReactionStateOptions {
  sessionSlug: string;
  targetId: string;
  targetType: "QUESTION" | "REPLY";
  serverCounts: string | undefined; // raw AWSJSON from state (question.reactionCounts)
  fingerprint: string;
}

interface UseReactionStateResult {
  displayCounts: ReactionCounts;
  activeEmojis: Set<EmojiKey>;
  toggle: (emoji: EmojiKey) => void;
}

/**
 * Per-item optimistic reaction state with localStorage persistence and 300ms debounce.
 *
 * - Active emojis are tracked locally in localStorage and in component state.
 * - Tapping an emoji immediately updates displayCounts (optimistic).
 * - After 300ms of inactivity, calls reactAction on the server.
 * - On server failure, silently reverts to pre-toggle state (no toast).
 * - When serverCounts changes (subscription event), optimistic override is cleared.
 */
export function useReactionState({
  sessionSlug,
  targetId,
  targetType,
  serverCounts,
  fingerprint,
}: UseReactionStateOptions): UseReactionStateResult {
  // Initialize activeEmojis from localStorage on mount
  const [activeEmojis, setActiveEmojis] = useState<Set<EmojiKey>>(() => new Set());

  useEffect(() => {
    // Safe to read localStorage on client only
    setActiveEmojis(readActiveEmojis(sessionSlug, targetId));
  }, [sessionSlug, targetId]);

  // localOverrideCounts is set during optimistic update and cleared on server response
  const [localOverrideCounts, setLocalOverrideCounts] = useState<ReactionCounts | null>(null);

  // When server authoritative counts arrive, clear optimistic override
  useEffect(() => {
    setLocalOverrideCounts(null);
  }, [serverCounts]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track pre-toggle snapshot for rollback
  const preToggleRef = useRef<{ activeEmojis: Set<EmojiKey> } | null>(null);

  function toggle(emoji: EmojiKey): void {
    setActiveEmojis((prev) => {
      const next = new Set(prev);
      const isAdding = !next.has(emoji);

      // Save pre-toggle state for potential rollback
      preToggleRef.current = { activeEmojis: new Set(prev) };

      if (isAdding) {
        next.add(emoji);
      } else {
        next.delete(emoji);
      }

      writeActiveEmojis(sessionSlug, targetId, next);

      // Compute optimistic counts: take current display, increment/decrement
      setLocalOverrideCounts((currentOverride) => {
        const base = currentOverride ?? parseReactionCounts(serverCounts);
        const updated = { ...base };
        updated[emoji] = Math.max(0, base[emoji] + (isAdding ? 1 : -1));
        return updated;
      });

      return next;
    });

    // 300ms debounce — clear existing timer and schedule new mutation
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void (async () => {
        const result = await reactAction({
          sessionSlug,
          targetId,
          targetType,
          emoji,
          fingerprint,
        });

        if (!result.success && preToggleRef.current) {
          // Silent rollback — restore pre-toggle state
          const { activeEmojis: prevActiveEmojis } = preToggleRef.current;
          setActiveEmojis(prevActiveEmojis);
          writeActiveEmojis(sessionSlug, targetId, prevActiveEmojis);
          setLocalOverrideCounts(null);
        } else if (result.success) {
          // Clear optimistic override — subscription event will provide authoritative counts
          setLocalOverrideCounts(null);
        }
        preToggleRef.current = null;
      })();
    }, 300);
  }

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const displayCounts = localOverrideCounts ?? parseReactionCounts(serverCounts);

  return { displayCounts, activeEmojis, toggle };
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
 * Architecture: server counts are always the base. Pending toggles are tracked as
 * per-emoji deltas (+1 or -1) applied on top. This means subscription events can
 * update the base freely without destroying the optimistic state for unrelated emojis.
 *
 * - Active emojis are tracked in localStorage and component state.
 * - Tapping an emoji immediately shows the delta (optimistic).
 * - After 300ms, calls reactAction on the server.
 * - On server failure, silently reverts (no toast).
 * - On success, clears the delta — server counts are now authoritative.
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
    setActiveEmojis(readActiveEmojis(sessionSlug, targetId));
  }, [sessionSlug, targetId]);

  // Pending optimistic delta — per-emoji, not a full snapshot.
  // When set, displayCounts = serverCounts + pending.delta for pending.emoji.
  // Other emojis always show the latest server value.
  const [pending, setPending] = useState<{ emoji: EmojiKey; delta: number } | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preToggleRef = useRef<{ activeEmojis: Set<EmojiKey> } | null>(null);

  const toggle = useCallback(
    (emoji: EmojiKey): void => {
      setActiveEmojis((prev) => {
        const next = new Set(prev);
        const isAdding = !next.has(emoji);

        // Save pre-toggle state for rollback
        preToggleRef.current = { activeEmojis: new Set(prev) };

        if (isAdding) {
          next.add(emoji);
        } else {
          next.delete(emoji);
        }

        writeActiveEmojis(sessionSlug, targetId, next);

        // Set per-emoji optimistic delta
        setPending({ emoji, delta: isAdding ? 1 : -1 });

        return next;
      });

      // 300ms debounce
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
            // Silent rollback
            const { activeEmojis: prevActiveEmojis } = preToggleRef.current;
            setActiveEmojis(prevActiveEmojis);
            writeActiveEmojis(sessionSlug, targetId, prevActiveEmojis);
          }

          // Clear pending delta — server has processed (or rejected) the action.
          // If subscription already arrived, serverCounts is authoritative.
          // If not yet, a brief flash is possible but the subscription follows shortly.
          setPending(null);
          preToggleRef.current = null;
        })();
      }, 300);
    },
    [sessionSlug, targetId, targetType, fingerprint],
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Compute display: server counts as base, apply pending delta for one emoji
  const serverParsed = useMemo(() => parseReactionCounts(serverCounts), [serverCounts]);

  const displayCounts = useMemo(() => {
    if (!pending) return serverParsed;
    return {
      ...serverParsed,
      [pending.emoji]: Math.max(0, serverParsed[pending.emoji] + pending.delta),
    };
  }, [serverParsed, pending]);

  return { displayCounts, activeEmojis, toggle };
}

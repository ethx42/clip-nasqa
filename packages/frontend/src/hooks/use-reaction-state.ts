"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EMOJI_KEYS } from "@nasqa/core";
import type { EmojiKey, ReactionCounts } from "@nasqa/core";

import { graphqlMutation } from "@/lib/appsync-client";
import { REACT } from "@/lib/graphql/mutations";

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

function reactionsLocalKey(sessionCode: string, targetId: string): string {
  return `reactions:${sessionCode}:${targetId}`;
}

function readActiveEmojis(sessionCode: string, targetId: string): Set<EmojiKey> {
  try {
    const raw = localStorage.getItem(reactionsLocalKey(sessionCode, targetId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as EmojiKey[];
    return new Set(
      parsed.filter((k): k is EmojiKey => (EMOJI_KEYS as readonly string[]).includes(k)),
    );
  } catch {
    return new Set();
  }
}

function writeActiveEmojis(sessionCode: string, targetId: string, set: Set<EmojiKey>): void {
  try {
    localStorage.setItem(reactionsLocalKey(sessionCode, targetId), JSON.stringify([...set]));
  } catch {
    // SSR or storage unavailable — ignore
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseReactionStateOptions {
  sessionCode: string;
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
 * - After 300ms, calls graphqlMutation directly from the client.
 * - On server failure, silently reverts (no toast).
 * - On success, pending stays until the subscription updates serverCounts — no flash.
 */
export function useReactionState({
  sessionCode,
  targetId,
  targetType,
  serverCounts,
  fingerprint,
}: UseReactionStateOptions): UseReactionStateResult {
  // Initialize activeEmojis from localStorage on mount
  const [activeEmojis, setActiveEmojis] = useState<Set<EmojiKey>>(() => new Set());

  useEffect(() => {
    setActiveEmojis(readActiveEmojis(sessionCode, targetId));
  }, [sessionCode, targetId]);

  // Pending optimistic delta — per-emoji, not a full snapshot.
  // When set, displayCounts = serverCounts + pending.delta for pending.emoji.
  // Other emojis always show the latest server value.
  const [pending, setPending] = useState<{ emoji: EmojiKey; delta: number } | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preToggleRef = useRef<{ activeEmojis: Set<EmojiKey> } | null>(null);
  // The server count for the pending emoji at the moment of toggle — used to detect
  // when the subscription has delivered the updated value so we can safely clear pending.
  const pendingBaseCountRef = useRef<number | null>(null);

  // Compute display: server counts as base, apply pending delta for one emoji
  const serverParsed = useMemo(() => parseReactionCounts(serverCounts), [serverCounts]);

  // Keep a ref so toggle callback can read the latest value without stale closures
  const serverParsedRef = useRef(serverParsed);
  useEffect(() => {
    serverParsedRef.current = serverParsed;
  }, [serverParsed]);

  // Auto-clear pending when the subscription delivers an updated count for the pending emoji.
  // This bridges the gap between "server action resolved" and "subscription arrived" — the
  // optimistic delta stays applied until the real data lands, so there is never a flash.
  useEffect(() => {
    if (pending && pendingBaseCountRef.current !== null) {
      if (serverParsed[pending.emoji] !== pendingBaseCountRef.current) {
        setPending(null);
        pendingBaseCountRef.current = null;
        if (safetyTimerRef.current !== null) {
          clearTimeout(safetyTimerRef.current);
          safetyTimerRef.current = null;
        }
      }
    }
  }, [serverParsed, pending]);

  const toggle = useCallback(
    (emoji: EmojiKey): void => {
      // Snapshot the current server count so the effect knows when the subscription arrives
      pendingBaseCountRef.current = serverParsedRef.current[emoji];

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

        writeActiveEmojis(sessionCode, targetId, next);

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
          let mutationSuccess = true;
          try {
            await graphqlMutation("react", REACT, {
              sessionCode,
              targetId,
              targetType,
              emoji,
              fingerprint,
            });
          } catch {
            mutationSuccess = false;
          }

          if (!mutationSuccess && preToggleRef.current) {
            // Silent rollback — revert activeEmojis and clear pending immediately
            const { activeEmojis: prevActiveEmojis } = preToggleRef.current;
            setActiveEmojis(prevActiveEmojis);
            writeActiveEmojis(sessionCode, targetId, prevActiveEmojis);
            setPending(null);
            pendingBaseCountRef.current = null;
          }

          preToggleRef.current = null;

          // Safety net: if the subscription never arrives, clear pending after 5s
          // to avoid a permanently stale optimistic delta.
          if (safetyTimerRef.current !== null) {
            clearTimeout(safetyTimerRef.current);
          }
          safetyTimerRef.current = setTimeout(() => {
            setPending(null);
            pendingBaseCountRef.current = null;
            safetyTimerRef.current = null;
          }, 5000);
        })();
      }, 300);
    },
    [sessionCode, targetId, targetType, fingerprint],
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      if (safetyTimerRef.current !== null) {
        clearTimeout(safetyTimerRef.current);
      }
    };
  }, []);

  const displayCounts = useMemo(() => {
    if (!pending) return serverParsed;
    return {
      ...serverParsed,
      [pending.emoji]: Math.max(0, serverParsed[pending.emoji] + pending.delta),
    };
  }, [serverParsed, pending]);

  return { displayCounts, activeEmojis, toggle };
}

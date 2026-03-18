"use client";

import { useCallback, useEffect, useState } from "react";

const FINGERPRINT_KEY = "nasqa_fingerprint";

function votesKey(sessionCode: string): string {
  return `votes:${sessionCode}`;
}

function downvotesKey(sessionCode: string): string {
  return `downvotes:${sessionCode}`;
}

interface FingerprintResult {
  fingerprint: string;
  votedIds: Set<string>;
  downvotedIds: Set<string>;
  addVote: (id: string) => void;
  removeVote: (id: string) => void;
  addDownvote: (id: string) => void;
  removeDownvote: (id: string) => void;
}

/**
 * Provides a stable localStorage UUID fingerprint and per-session vote tracking.
 *
 * - On mount, reads or generates `nasqa_fingerprint` in localStorage.
 * - Reads `votes:{sessionCode}` as a JSON array of upvoted question IDs.
 * - Reads `downvotes:{sessionCode}` as a JSON array of downvoted question IDs.
 * - addVote / removeVote / addDownvote / removeDownvote persist changes back to localStorage.
 */
export function useFingerprint(sessionCode: string): FingerprintResult {
  const [fingerprint, setFingerprint] = useState<string>("");
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [downvotedIds, setDownvotedIds] = useState<Set<string>>(new Set());

  // Initialize fingerprint and voted IDs from localStorage on mount
  useEffect(() => {
    let fp = localStorage.getItem(FINGERPRINT_KEY);
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem(FINGERPRINT_KEY, fp);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initializing state from localStorage on mount
    setFingerprint(fp);

    const raw = localStorage.getItem(votesKey(sessionCode));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as string[];
        setVotedIds(new Set(parsed));
      } catch {
        // Corrupted data — reset
        localStorage.removeItem(votesKey(sessionCode));
      }
    }

    const rawDownvotes = localStorage.getItem(downvotesKey(sessionCode));
    if (rawDownvotes) {
      try {
        const parsed = JSON.parse(rawDownvotes) as string[];
        setDownvotedIds(new Set(parsed));
      } catch {
        localStorage.removeItem(downvotesKey(sessionCode));
      }
    }
  }, [sessionCode]);

  const addVote = useCallback(
    (id: string) => {
      setVotedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        localStorage.setItem(votesKey(sessionCode), JSON.stringify([...next]));
        return next;
      });
    },
    [sessionCode],
  );

  const removeVote = useCallback(
    (id: string) => {
      setVotedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        localStorage.setItem(votesKey(sessionCode), JSON.stringify([...next]));
        return next;
      });
    },
    [sessionCode],
  );

  const addDownvote = useCallback(
    (id: string) => {
      setDownvotedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        localStorage.setItem(downvotesKey(sessionCode), JSON.stringify([...next]));
        return next;
      });
    },
    [sessionCode],
  );

  const removeDownvote = useCallback(
    (id: string) => {
      setDownvotedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        localStorage.setItem(downvotesKey(sessionCode), JSON.stringify([...next]));
        return next;
      });
    },
    [sessionCode],
  );

  return { fingerprint, votedIds, downvotedIds, addVote, removeVote, addDownvote, removeDownvote };
}

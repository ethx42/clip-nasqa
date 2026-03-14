'use client';

import { useState, useCallback, useEffect } from 'react';

const FINGERPRINT_KEY = 'nasqa_fingerprint';

function votesKey(sessionSlug: string): string {
  return `votes:${sessionSlug}`;
}

interface FingerprintResult {
  fingerprint: string;
  votedIds: Set<string>;
  addVote: (id: string) => void;
  removeVote: (id: string) => void;
}

/**
 * Provides a stable localStorage UUID fingerprint and per-session vote tracking.
 *
 * - On mount, reads or generates `nasqa_fingerprint` in localStorage.
 * - Reads `votes:{sessionSlug}` as a JSON array of question IDs.
 * - addVote / removeVote persist changes back to localStorage.
 */
export function useFingerprint(sessionSlug: string): FingerprintResult {
  const [fingerprint, setFingerprint] = useState<string>('');
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  // Initialize fingerprint and voted IDs from localStorage on mount
  useEffect(() => {
    let fp = localStorage.getItem(FINGERPRINT_KEY);
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem(FINGERPRINT_KEY, fp);
    }
    setFingerprint(fp);

    const raw = localStorage.getItem(votesKey(sessionSlug));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as string[];
        setVotedIds(new Set(parsed));
      } catch {
        // Corrupted data — reset
        localStorage.removeItem(votesKey(sessionSlug));
      }
    }
  }, [sessionSlug]);

  const addVote = useCallback(
    (id: string) => {
      setVotedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        localStorage.setItem(votesKey(sessionSlug), JSON.stringify([...next]));
        return next;
      });
    },
    [sessionSlug]
  );

  const removeVote = useCallback(
    (id: string) => {
      setVotedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        localStorage.setItem(votesKey(sessionSlug), JSON.stringify([...next]));
        return next;
      });
    },
    [sessionSlug]
  );

  return { fingerprint, votedIds, addVote, removeVote };
}

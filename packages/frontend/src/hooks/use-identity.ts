'use client';

import { useState, useEffect, useCallback } from 'react';

const IDENTITY_KEY = 'nasqa_identity';

interface Identity {
  name?: string;
  /** Email is stored in localStorage only — never sent to the server (IDENT-03). */
  email?: string;
}

interface IdentityResult {
  name: string | undefined;
  email: string | undefined;
  hasIdentity: boolean;
  setIdentity: (name?: string, email?: string) => void;
  clearIdentity: () => void;
}

export function useIdentity(): IdentityResult {
  const [identity, setIdentityState] = useState<Identity>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(IDENTITY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Identity;
        setIdentityState(parsed);
      }
    } catch {
      // Corrupted data — reset
      localStorage.removeItem(IDENTITY_KEY);
    }
  }, []);

  const setIdentity = useCallback((name?: string, email?: string) => {
    const next: Identity = { name: name ?? undefined, email: email ?? undefined };
    setIdentityState(next);
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(next));
  }, []);

  const clearIdentity = useCallback(() => {
    setIdentityState({});
    localStorage.removeItem(IDENTITY_KEY);
  }, []);

  return {
    name: identity.name,
    email: identity.email,
    hasIdentity: !!identity.name,
    setIdentity,
    clearIdentity,
  };
}

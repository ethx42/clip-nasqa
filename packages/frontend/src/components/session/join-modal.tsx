'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import { useIdentity } from '@/hooks/use-identity';

interface JoinModalProps {
  sessionSlug: string;
  open: boolean;
  onClose: () => void;
}

function joinShownKey(slug: string) {
  return `nasqa_join_shown_${slug}`;
}

export function JoinModal({ sessionSlug, open, onClose }: JoinModalProps) {
  const t = useTranslations('identity');
  const { name: savedName, email: savedEmail, setIdentity } = useIdentity();

  const [name, setName] = useState(savedName ?? '');
  const [email, setEmail] = useState(savedEmail ?? '');

  // Pre-fill from saved identity when it loads
  useEffect(() => {
    if (savedName) setName(savedName);
    if (savedEmail) setEmail(savedEmail);
  }, [savedName, savedEmail]);

  function handleJoin() {
    const trimmedName = name.trim() || undefined;
    const trimmedEmail = email.trim() || undefined;
    setIdentity(trimmedName, trimmedEmail);
    sessionStorage.setItem(joinShownKey(sessionSlug), '1');
    onClose();
  }

  function handleSkip() {
    sessionStorage.setItem(joinShownKey(sessionSlug), '1');
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) handleSkip(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <Dialog.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
            <Dialog.Title className="mb-1 text-xl font-bold text-foreground">
              {t('whatsYourName')}
            </Dialog.Title>
            <Dialog.Description className="mb-5 text-sm text-muted-foreground">
              {t('displayName')}
            </Dialog.Description>

            <div className="space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 50))}
                placeholder={t('displayName')}
                maxLength={50}
                className="block w-full rounded-xl border border-border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.slice(0, 100))}
                placeholder={t('email')}
                maxLength={100}
                className="block w-full rounded-xl border border-border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={handleJoin}
                className="w-full rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                {t('joinSession')}
              </button>
              <button
                onClick={handleSkip}
                className="w-full rounded-xl py-3 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('skip')}
              </button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Returns true if the join modal should be shown for this session.
 * Checks sessionStorage to avoid showing on every page load.
 */
export function shouldShowJoinModal(sessionSlug: string): boolean {
  if (typeof window === 'undefined') return false;
  return !sessionStorage.getItem(joinShownKey(sessionSlug));
}

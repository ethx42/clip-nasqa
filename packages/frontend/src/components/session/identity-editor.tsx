'use client';

import { useState, useEffect } from 'react';
import { Popover } from '@base-ui/react/popover';
import { User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useIdentity } from '@/hooks/use-identity';

export function IdentityEditor() {
  const t = useTranslations('identity');
  const { name: savedName, email: savedEmail, setIdentity, clearIdentity } = useIdentity();

  const [name, setName] = useState(savedName ?? '');
  const [email, setEmail] = useState(savedEmail ?? '');
  const [open, setOpen] = useState(false);

  // Sync fields when saved identity changes (e.g., set by JoinModal)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local form fields from external identity store
    setName(savedName ?? '');
    setEmail(savedEmail ?? '');
  }, [savedName, savedEmail]);

  function handleSave() {
    const trimmedName = name.trim() || undefined;
    const trimmedEmail = email.trim() || undefined;
    setIdentity(trimmedName, trimmedEmail);
    setOpen(false);
  }

  function handleClear() {
    clearIdentity();
    setName('');
    setEmail('');
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={t('editProfile')}
        className="flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <User className="h-5 w-5" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className="z-50 w-72 rounded-2xl border border-border bg-card p-4 shadow-xl">
            <Popover.Title className="mb-3 text-sm font-bold text-foreground">
              {t('editProfile')}
            </Popover.Title>

            <div className="space-y-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 50))}
                placeholder={t('displayName')}
                maxLength={50}
                className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.slice(0, 100))}
                placeholder={t('email')}
                maxLength={100}
                className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                {t('save')}
              </button>
              <button
                onClick={handleClear}
                className="flex-1 rounded-xl border border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {t('clear')}
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

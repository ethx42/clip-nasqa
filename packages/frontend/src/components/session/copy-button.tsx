'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function CopyButton({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const t = useTranslations('session');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      aria-label={label ?? t('copied')}
      className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-500" />
          {t('copied')}
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {label ?? t('copySecret')}
        </>
      )}
    </button>
  );
}

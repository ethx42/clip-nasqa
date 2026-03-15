'use client';

import { useTranslations } from 'next-intl';

interface NewContentBannerProps {
  /** Message to show, e.g. "New snippet from speaker" or "2 new questions". */
  message: string;
  visible: boolean;
  onTap: () => void;
}

/**
 * Sticky banner that appears at the top of a scroll panel when new content
 * arrives while the user is scrolled down.
 *
 * Slides in from above when visible, slides out when hidden.
 * Clicking/tapping calls onTap which should scroll the container to the top.
 */
export function NewContentBanner({ message, visible, onTap }: NewContentBannerProps) {
  const t = useTranslations('session');
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onTap();
      }}
      style={{ position: 'sticky', top: 0, zIndex: 10 }}
      className={`
        cursor-pointer select-none
        bg-emerald-500 text-white text-sm font-semibold text-center py-2.5 px-5 shadow-md
        transition-all duration-300 ease-in-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'}
      `}
    >
      {message} · {t('tapToScroll')}
    </div>
  );
}

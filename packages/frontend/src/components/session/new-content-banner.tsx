"use client";

import { useTranslations } from "next-intl";

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
 * Only rendered when visible — takes zero layout space.
 */
export function NewContentBanner({ message, visible, onTap }: NewContentBannerProps) {
  const t = useTranslations("session");

  if (!visible) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-hidden="true"
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onTap();
      }}
      className="sticky top-0 z-10 cursor-pointer select-none bg-emerald-500 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
    >
      {message} · {t("tapToScroll")}
    </div>
  );
}

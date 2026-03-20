"use client";

interface NewContentBannerProps {
  /** Message to show, e.g. "New snippet from speaker" or "2 new questions". */
  message: string;
  visible: boolean;
  onTap: () => void;
}

/**
 * Compact centered pill that appears over a scroll panel when new content
 * arrives while the user is scrolled down. Uses opacity fade, takes no layout space.
 */
export function NewContentBanner({ message, visible, onTap }: NewContentBannerProps) {
  return (
    <div
      role="button"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={visible ? onTap : undefined}
      onKeyDown={(e) => {
        if (visible && (e.key === "Enter" || e.key === " ")) onTap();
      }}
      className={`absolute top-2 left-1/2 -translate-x-1/2 z-10 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg transition-opacity cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {message}
    </div>
  );
}

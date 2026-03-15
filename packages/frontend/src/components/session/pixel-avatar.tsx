import { createAvatar } from "@dicebear/core";
import * as notionists from "@dicebear/notionists";
import { useMemo } from "react";

interface PixelAvatarProps {
  /** Seed string — typically the user's fingerprint. */
  seed: string;
  /** Size in pixels. Defaults to 28 (matches the previous 7×4=28px circle). */
  size?: number;
  className?: string;
}

export function PixelAvatar({ seed, size = 28, className }: PixelAvatarProps) {
  const dataUri = useMemo(() => {
    const avatar = createAvatar(notionists, {
      seed,
      size,
    });
    return avatar.toDataUri();
  }, [seed, size]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URI avatars cannot be optimized by next/image
    <img src={dataUri} alt="" width={size} height={size} className={className} aria-hidden="true" />
  );
}

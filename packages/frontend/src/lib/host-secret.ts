const KEY_PREFIX = "nasqa:host-secret:";

export function storeHostSecret(slug: string, rawSecret: string): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}${slug}`, rawSecret);
  } catch {
    // localStorage unavailable (SSR, private browsing quota, etc.)
  }
}

export function loadHostSecret(slug: string): string | null {
  try {
    return localStorage.getItem(`${KEY_PREFIX}${slug}`);
  } catch {
    return null;
  }
}

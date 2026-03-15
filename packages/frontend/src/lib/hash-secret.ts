/**
 * Hashes a plain-text secret using SHA-256 (Web Crypto API).
 * Runs client-side only — never import this in a Server Component or Server Action.
 *
 * Returns a lowercase hex string (64 chars).
 */
export async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

import { headers } from 'next/headers';

/**
 * Derive the base URL from the incoming request headers.
 * Works on localhost, Netlify previews, and production (nasqa.io).
 */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

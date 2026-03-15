/**
 * Server-side AppSync client using plain fetch.
 *
 * Amplify's generateClient() is browser-only. Server Actions must use
 * direct HTTP POST to the AppSync endpoint with the API key header.
 */
export async function appsyncMutation<T = unknown>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const url = process.env.NEXT_PUBLIC_APPSYNC_URL;
  const apiKey = process.env.NEXT_PUBLIC_APPSYNC_API_KEY;

  if (!url || !apiKey) {
    throw new Error("AppSync URL or API key not configured");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = await res.json();

  if (body.errors?.length) {
    const msg = body.errors.map((e: { message: string }) => e.message).join("; ");
    throw new Error(msg);
  }

  return body.data as T;
}

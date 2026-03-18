import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";

Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: process.env.NEXT_PUBLIC_APPSYNC_URL!,
        region: process.env.NEXT_PUBLIC_AWS_REGION ?? "us-east-1",
        defaultAuthMode: "apiKey",
        apiKey: process.env.NEXT_PUBLIC_APPSYNC_API_KEY!,
      },
    },
  },
  { ssr: true },
);

export const appsyncClient = generateClient();

// ── Client-side mutation utilities ────────────────────────────────────────────

/**
 * Auth config for graphqlMutation. Accepts API key (current) or JWT (future SSO/Cognito).
 * Swapping auth is a config change, not a rewrite.
 */
export type AuthConfig = { type: "api-key"; key: string } | { type: "jwt"; token: string };

/**
 * Compile-time guard: only participant mutation names are accepted.
 * Passing a host mutation name (pushSnippet, deleteSnippet, etc.) is a TypeScript error.
 */
export type ParticipantMutationName =
  | "addQuestion"
  | "upvoteQuestion"
  | "downvoteQuestion"
  | "addReply"
  | "react";

/**
 * Direct AppSync HTTP POST from the browser — no Netlify Server Action round-trip.
 * Enforces at compile time that only participant mutations can be called client-side.
 *
 * @throws TypeError on network failure (re-thrown as-is for safeClientMutation to classify)
 * @throws Error on GraphQL error response
 */
export async function graphqlMutation<T = unknown>(
  mutationName: ParticipantMutationName,
  query: string,
  variables: Record<string, unknown>,
  auth: AuthConfig = {
    type: "api-key",
    key: process.env.NEXT_PUBLIC_APPSYNC_API_KEY!,
  },
): Promise<T> {
  void mutationName; // used for compile-time type guard only

  const url = process.env.NEXT_PUBLIC_APPSYNC_URL!;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth.type === "api-key") {
    headers["x-api-key"] = auth.key;
  } else {
    headers["Authorization"] = auth.token;
  }

  // Let TypeError (network failure) propagate as-is so safeClientMutation can classify it
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const body = (await response.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (body.errors?.length) {
    const msg = body.errors.map((e) => e.message).join(", ");
    throw new Error(msg);
  }

  return body.data as T;
}

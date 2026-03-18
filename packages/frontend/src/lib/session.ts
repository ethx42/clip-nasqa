import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { cache } from "react";

import { EMOJI_KEYS, type Question, type Reply, type Snippet } from "@nasqa/core";

import { docClient, tableName } from "@/lib/dynamo";

export interface Session {
  code: string;
  title: string;
  isActive: boolean;
  createdAt: number;
  expiresAt: number;
}

export const getSession = cache(async function getSession(code: string): Promise<Session | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: {
        PK: `SESSION#${code}`,
        SK: `SESSION#${code}`,
      },
    }),
  );

  const item = result.Item;

  if (!item) {
    return null;
  }

  // TTL filter: DynamoDB may not immediately remove expired items;
  // filter at application layer to enforce 24h expiry (SESS-07)
  const now = Math.floor(Date.now() / 1000);
  if (item.TTL < now) {
    return null;
  }

  return {
    code: item.code as string,
    title: item.title as string,
    isActive: item.isActive as boolean,
    createdAt: item.createdAt as number,
    expiresAt: item.TTL as number,
  };
});

export interface SessionData {
  snippets: Snippet[];
  questions: Question[];
  replies: Reply[];
}

/**
 * Fetches all active snippets, questions, and replies for a session from DynamoDB.
 * Used for SSR initial hydration of the session page.
 *
 * Filters items whose TTL has already passed (DynamoDB lazy delete).
 */
/** Deduplicate reactionOrder keeping first occurrence, filter to emojis with count > 0 */
function buildReactionOrder(rawOrder: string[], counts: Record<string, number>): string {
  const seen = new Set<string>();
  const order = rawOrder.filter((k) => {
    if (seen.has(k)) return false;
    seen.add(k);
    return (counts[k] ?? 0) > 0;
  });
  return JSON.stringify(order);
}

export const getSessionData = cache(async function getSessionData(
  code: string,
): Promise<SessionData> {
  const now = Math.floor(Date.now() / 1000);

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `SESSION#${code}`,
      },
    }),
  );

  const items = result.Items ?? [];

  const snippets: Snippet[] = [];
  const questions: Question[] = [];
  const replies: Reply[] = [];

  for (const item of items) {
    const sk = item.SK as string;
    // Skip expired items
    if (item.TTL && (item.TTL as number) < now) continue;

    if (sk.startsWith("SNIPPET#")) {
      snippets.push({
        id: item.id as string,
        sessionCode: item.sessionCode as string,
        type: item.type as string,
        content: item.content as string,
        language: item.language as string | undefined,
        createdAt: item.createdAt as number,
        TTL: item.TTL as number,
      });
    } else if (sk.startsWith("QUESTION#")) {
      questions.push({
        id: item.id as string,
        sessionCode: item.sessionCode as string,
        text: item.text as string,
        fingerprint: item.fingerprint as string,
        authorName: item.authorName as string | undefined,
        upvoteCount: (item.upvoteCount as number) ?? 0,
        downvoteCount: (item.downvoteCount as number) ?? 0,
        isHidden: (item.isHidden as boolean) ?? false,
        isFocused: (item.isFocused as boolean) ?? false,
        isBanned: (item.isBanned as boolean) ?? false,
        reactionCounts: JSON.stringify(
          Object.fromEntries(
            EMOJI_KEYS.map((key) => [key, Math.max(0, (item[`rxn_${key}_count`] as number) ?? 0)]),
          ),
        ),
        reactionOrder: buildReactionOrder(
          (item.reactionOrder as string[] | undefined) ?? [],
          Object.fromEntries(
            EMOJI_KEYS.map((key) => [key, Math.max(0, (item[`rxn_${key}_count`] as number) ?? 0)]),
          ),
        ),
        createdAt: item.createdAt as number,
        TTL: item.TTL as number,
      });
    } else if (sk.startsWith("REPLY#")) {
      replies.push({
        id: item.id as string,
        questionId: item.questionId as string,
        sessionCode: item.sessionCode as string,
        text: item.text as string,
        isHostReply: (item.isHostReply as boolean) ?? false,
        fingerprint: item.fingerprint as string,
        authorName: item.authorName as string | undefined,
        reactionCounts: JSON.stringify(
          Object.fromEntries(
            EMOJI_KEYS.map((key) => [key, Math.max(0, (item[`rxn_${key}_count`] as number) ?? 0)]),
          ),
        ),
        reactionOrder: buildReactionOrder(
          (item.reactionOrder as string[] | undefined) ?? [],
          Object.fromEntries(
            EMOJI_KEYS.map((key) => [key, Math.max(0, (item[`rxn_${key}_count`] as number) ?? 0)]),
          ),
        ),
        createdAt: item.createdAt as number,
        TTL: item.TTL as number,
      });
    }
  }

  // Sort snippets newest first; replies oldest first; questions unsorted (client sorts by votes)
  snippets.sort((a, b) => b.createdAt - a.createdAt);
  replies.sort((a, b) => a.createdAt - b.createdAt);

  return { snippets, questions, replies };
});

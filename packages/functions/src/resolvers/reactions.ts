import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { EMOJI_KEYS, emojiKeySchema } from "@nasqa/core";
import type { EmojiKey, ReactArgs, SessionEventType, SessionUpdate } from "@nasqa/core";

import { docClient } from "./index";
import { logger } from "./logger";
import { checkNotBanned, checkRateLimit } from "./rate-limit";

function tableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error("TABLE_NAME environment variable is not set");
  return name;
}

function itemSK(targetType: "QUESTION" | "REPLY", targetId: string): string {
  return targetType === "QUESTION" ? `QUESTION#${targetId}` : `REPLY#${targetId}`;
}

export async function handleReact(args: ReactArgs): Promise<SessionUpdate> {
  const { sessionSlug, targetId, targetType, emoji, fingerprint } = args;

  // Validate emoji against the canonical palette
  const parseResult = emojiKeySchema.safeParse(emoji);
  if (!parseResult.success) {
    throw new Error(`INVALID_EMOJI:${emoji}`);
  }
  const emojiKey = parseResult.data as EmojiKey;

  // Enforce ban check and rate limit (separate reaction# namespace from question submissions)
  await checkNotBanned(sessionSlug, fingerprint);
  await checkRateLimit(`reaction#${fingerprint}`, 30, 60);

  const countAttr = `rxn_${emojiKey}_count`;
  const reactorsAttr = `rxn_${emojiKey}_reactors`;
  const SK = itemSK(targetType, targetId);

  let result: { Attributes?: Record<string, unknown> };
  let isNowReacted: boolean;

  // Attempt toggle-on: add fingerprint to reactors Set, increment count
  try {
    result = await docClient.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { PK: `SESSION#${sessionSlug}`, SK },
        UpdateExpression: `ADD ${countAttr} :one, ${reactorsAttr} :fpSet`,
        ConditionExpression: `NOT contains(${reactorsAttr}, :fp) OR attribute_not_exists(${reactorsAttr})`,
        ExpressionAttributeValues: {
          ":one": 1,
          ":fp": fingerprint,
          ":fpSet": new Set([fingerprint]),
        },
        ReturnValues: "ALL_NEW",
      }),
    );
    isNowReacted = true;
  } catch (err) {
    if (!(err instanceof ConditionalCheckFailedException)) throw err;

    // Fingerprint already in reactors — toggle off: remove fingerprint, decrement count
    try {
      result = await docClient.send(
        new UpdateCommand({
          TableName: tableName(),
          Key: { PK: `SESSION#${sessionSlug}`, SK },
          UpdateExpression: `ADD ${countAttr} :negOne DELETE ${reactorsAttr} :fpSet`,
          ConditionExpression: `contains(${reactorsAttr}, :fp)`,
          ExpressionAttributeValues: {
            ":negOne": -1,
            ":fp": fingerprint,
            ":fpSet": new Set([fingerprint]),
          },
          ReturnValues: "ALL_NEW",
        }),
      );
      isNowReacted = false;
    } catch (err2) {
      if (!(err2 instanceof ConditionalCheckFailedException)) throw err2;
      // Race condition: fingerprint already removed by another concurrent request — no-op
      isNowReacted = false;
      result = { Attributes: {} };
    }
  }

  const attrs = result.Attributes ?? {};

  // Build counts — use Math.max(0, ...) for display safety (Pitfall 6 guard)
  const counts = Object.fromEntries(
    EMOJI_KEYS.map((key) => [key, Math.max(0, (attrs[`rxn_${key}_count`] as number) ?? 0)]),
  ) as Record<EmojiKey, number>;

  // Build reactedByMe using Array.from to avoid DocumentClient StringSet representation issues (Pitfall 5)
  const reactedByMe = Object.fromEntries(
    EMOJI_KEYS.map((key) => {
      const reactors = attrs[`rxn_${key}_reactors`];
      const reactorArray = reactors ? Array.from(reactors as Iterable<string>) : [];
      return [key, reactorArray.includes(fingerprint)];
    }),
  ) as Record<EmojiKey, boolean>;

  // Override with known result for the toggled emoji (authoritative, avoids SET representation ambiguity)
  reactedByMe[emojiKey] = isNowReacted;

  // Compute clean reactionOrder: dedup, remove emojis with count=0, append newly activated emoji
  const rawOrder = (attrs.reactionOrder as string[] | undefined) ?? [];
  const seen = new Set<string>();
  const reactionOrder = rawOrder.filter((k) => {
    if (seen.has(k)) return false;
    seen.add(k);
    return counts[k as EmojiKey] > 0;
  });
  // If this toggle-on activated a new emoji type, append it at the end
  if (isNowReacted && !reactionOrder.includes(emojiKey)) {
    reactionOrder.push(emojiKey);
  }

  // Persist the clean order back to DynamoDB (fire-and-forget)
  docClient
    .send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { PK: `SESSION#${sessionSlug}`, SK },
        UpdateExpression: "SET reactionOrder = :order",
        ExpressionAttributeValues: { ":order": reactionOrder },
      }),
    )
    .catch((err) => logger.error({ err }, "failed to update reactionOrder"));

  logger.info(
    {
      sessionSlug,
      targetId,
      targetType,
      emoji: emojiKey,
      isNowReacted,
      fingerprint: fingerprint.slice(0, 8),
    },
    "reaction toggled",
  );

  return {
    eventType: "REACTION_UPDATED" as SessionEventType,
    sessionSlug,
    payload: JSON.stringify({
      targetId,
      targetType,
      emoji: emojiKey,
      counts,
      reactedByMe,
      reactionOrder,
    }),
  };
}

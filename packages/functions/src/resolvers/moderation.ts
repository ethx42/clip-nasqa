import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { docClient } from "./index";
import type {
  BanQuestionArgs,
  BanParticipantArgs,
  DownvoteQuestionArgs,
  RestoreQuestionArgs,
  SessionUpdate,
  SessionEventType,
} from "@nasqa/core";

function tableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error("TABLE_NAME environment variable is not set");
  return name;
}

async function verifyHostSecret(sessionSlug: string, hostSecretHash: string): Promise<void> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: {
        PK: `SESSION#${sessionSlug}`,
        SK: `SESSION#${sessionSlug}`,
      },
    })
  );
  if (!result.Item || result.Item.hostSecretHash !== hostSecretHash) {
    throw new Error("Unauthorized");
  }
}

/**
 * banQuestion: marks a question as isBanned=true, isHidden=true.
 * Increments bannedPostCount on the participant's BAN item.
 * If bannedPostCount reaches 3, auto-bans the participant.
 * Broadcasts QUESTION_UPDATED.
 */
export async function handleBanQuestion(args: BanQuestionArgs): Promise<SessionUpdate> {
  const { sessionSlug, hostSecretHash, questionId } = args;
  await verifyHostSecret(sessionSlug, hostSecretHash);

  const now = Math.floor(Date.now() / 1000);
  const banTTL = now + 86400; // 24h

  // Get question to find fingerprint
  const questionResult = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: {
        PK: `SESSION#${sessionSlug}`,
        SK: `QUESTION#${questionId}`,
      },
    })
  );

  if (!questionResult.Item) {
    throw new Error("Question not found");
  }

  const fingerprint = questionResult.Item.fingerprint as string;

  // Mark question as banned and hidden
  const questionUpdate = await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: {
        PK: `SESSION#${sessionSlug}`,
        SK: `QUESTION#${questionId}`,
      },
      UpdateExpression: "SET isBanned = :true, isHidden = :true",
      ExpressionAttributeValues: {
        ":true": true,
      },
      ReturnValues: "ALL_NEW",
    })
  );

  // Increment bannedPostCount on BAN item; set isBanned=false if not yet existing
  const banUpdate = await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: {
        PK: `SESSION#${sessionSlug}`,
        SK: `BAN#${fingerprint}`,
      },
      UpdateExpression:
        "ADD bannedPostCount :one SET isBanned = if_not_exists(isBanned, :false), fingerprint = if_not_exists(fingerprint, :fp), #ttl = :ttl",
      ExpressionAttributeNames: {
        "#ttl": "TTL",
      },
      ExpressionAttributeValues: {
        ":one": 1,
        ":false": false,
        ":fp": fingerprint,
        ":ttl": banTTL,
      },
      ReturnValues: "ALL_NEW",
    })
  );

  const bannedPostCount = (banUpdate.Attributes?.bannedPostCount as number) ?? 0;

  // Auto-ban if 3 or more banned posts
  if (bannedPostCount >= 3) {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: {
          PK: `SESSION#${sessionSlug}`,
          SK: `BAN#${fingerprint}`,
        },
        UpdateExpression: "SET isBanned = :true",
        ExpressionAttributeValues: {
          ":true": true,
        },
      })
    );

    // Broadcast PARTICIPANT_BANNED for auto-ban
    // Note: we broadcast QUESTION_UPDATED below; auto-ban event is separate
    // The subscription handles both events; we return QUESTION_UPDATED as primary
  }

  const attrs = questionUpdate.Attributes ?? {};

  return {
    eventType: "QUESTION_UPDATED" as SessionEventType,
    sessionSlug,
    payload: JSON.stringify({
      questionId,
      isBanned: attrs.isBanned ?? true,
      isHidden: attrs.isHidden ?? true,
      autoBanned: bannedPostCount >= 3,
      fingerprint,
    }),
  };
}

/**
 * banParticipant: directly bans a participant by fingerprint.
 * Creates/updates BAN#fingerprint item with isBanned=true.
 * Broadcasts PARTICIPANT_BANNED.
 */
export async function handleBanParticipant(args: BanParticipantArgs): Promise<SessionUpdate> {
  const { sessionSlug, hostSecretHash, fingerprint } = args;
  await verifyHostSecret(sessionSlug, hostSecretHash);

  const now = Math.floor(Date.now() / 1000);
  const banTTL = now + 86400; // 24h

  await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: {
        PK: `SESSION#${sessionSlug}`,
        SK: `BAN#${fingerprint}`,
      },
      UpdateExpression:
        "SET isBanned = :true, fingerprint = if_not_exists(fingerprint, :fp), bannedPostCount = if_not_exists(bannedPostCount, :zero), #ttl = :ttl",
      ExpressionAttributeNames: {
        "#ttl": "TTL",
      },
      ExpressionAttributeValues: {
        ":true": true,
        ":fp": fingerprint,
        ":zero": 0,
        ":ttl": banTTL,
      },
    })
  );

  return {
    eventType: "PARTICIPANT_BANNED" as SessionEventType,
    sessionSlug,
    payload: JSON.stringify({ fingerprint }),
  };
}

/**
 * downvoteQuestion: adds/removes a downvote.
 * When adding: removes upvote if present (mutual exclusivity), increments downvoteCount.
 * Auto-hides when downvotes >= 50% of total votes.
 * Broadcasts QUESTION_UPDATED.
 */
export async function handleDownvoteQuestion(args: DownvoteQuestionArgs): Promise<SessionUpdate> {
  const { sessionSlug, questionId, fingerprint, remove } = args;

  let result;
  try {
    if (remove) {
      // Retract downvote: decrement downvoteCount, remove from downvoters
      result = await docClient.send(
        new UpdateCommand({
          TableName: tableName(),
          Key: {
            PK: `SESSION#${sessionSlug}`,
            SK: `QUESTION#${questionId}`,
          },
          UpdateExpression: "ADD downvoteCount :negOne DELETE downvoters :fpSet",
          ConditionExpression: "contains(downvoters, :fp)",
          ExpressionAttributeValues: {
            ":negOne": -1,
            ":fp": fingerprint,
            ":fpSet": new Set([fingerprint]),
          },
          ReturnValues: "ALL_NEW",
        })
      );
    } else {
      // Add downvote: remove from upvoters (mutual exclusivity), add to downvoters
      // ADD upvoteCount :negOne is a no-op if voter wasn't in voters set (DELETE on non-existent member is safe)
      result = await docClient.send(
        new UpdateCommand({
          TableName: tableName(),
          Key: {
            PK: `SESSION#${sessionSlug}`,
            SK: `QUESTION#${questionId}`,
          },
          UpdateExpression:
            "ADD downvoteCount :one, upvoteCount :negOne DELETE voters :fpSet ADD downvoters :fpSet",
          ConditionExpression: "NOT contains(downvoters, :fp) OR attribute_not_exists(downvoters)",
          ExpressionAttributeValues: {
            ":one": 1,
            ":negOne": -1,
            ":fp": fingerprint,
            ":fpSet": new Set([fingerprint]),
          },
          ReturnValues: "ALL_NEW",
        })
      );
    }
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new Error("VOTE_CONFLICT");
    }
    throw err;
  }

  const attrs = result.Attributes ?? {};
  const downvoteCount = (attrs.downvoteCount as number) ?? 0;
  const upvoteCount = (attrs.upvoteCount as number) ?? 0;
  const totalVotes = upvoteCount + downvoteCount;
  const currentIsHidden = (attrs.isHidden as boolean) ?? false;

  // Auto-hide if downvotes >= 50% of total votes (and there are votes)
  const shouldHide = totalVotes > 0 && downvoteCount / totalVotes >= 0.5;

  if (shouldHide !== currentIsHidden) {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: {
          PK: `SESSION#${sessionSlug}`,
          SK: `QUESTION#${questionId}`,
        },
        UpdateExpression: "SET isHidden = :hidden",
        ExpressionAttributeValues: {
          ":hidden": shouldHide,
        },
      })
    );
  }

  return {
    eventType: "QUESTION_UPDATED" as SessionEventType,
    sessionSlug,
    payload: JSON.stringify({
      questionId,
      downvoteCount,
      upvoteCount,
      isHidden: shouldHide,
    }),
  };
}

/**
 * restoreQuestion: unhides a question (overrides community auto-hide).
 * Broadcasts QUESTION_UPDATED.
 */
export async function handleRestoreQuestion(args: RestoreQuestionArgs): Promise<SessionUpdate> {
  const { sessionSlug, hostSecretHash, questionId } = args;
  await verifyHostSecret(sessionSlug, hostSecretHash);

  const result = await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: {
        PK: `SESSION#${sessionSlug}`,
        SK: `QUESTION#${questionId}`,
      },
      UpdateExpression: "SET isHidden = :false",
      ExpressionAttributeValues: {
        ":false": false,
      },
      ReturnValues: "ALL_NEW",
    })
  );

  const attrs = result.Attributes ?? {};

  return {
    eventType: "QUESTION_UPDATED" as SessionEventType,
    sessionSlug,
    payload: JSON.stringify({
      questionId,
      isHidden: attrs.isHidden ?? false,
    }),
  };
}

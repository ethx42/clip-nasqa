import { GetCommand, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { ulid } from "ulid";
import { docClient } from "./index";
import type { AddQuestionArgs, UpvoteQuestionArgs, AddReplyArgs, FocusQuestionArgs, SessionUpdate, SessionEventType } from "@nasqa/core";

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

export async function addQuestion(args: AddQuestionArgs): Promise<SessionUpdate> {
  const { sessionSlug, text, fingerprint } = args;

  if (text.length > 500) {
    throw new Error("Question text exceeds 500 character limit");
  }

  const id = ulid();
  const now = Math.floor(Date.now() / 1000);
  const ttl = now + 24 * 60 * 60;

  const question = {
    PK: `SESSION#${sessionSlug}`,
    SK: `QUESTION#${id}`,
    id,
    sessionSlug,
    text,
    fingerprint,
    upvoteCount: 0,
    downvoteCount: 0,
    isHidden: false,
    isFocused: false,
    isBanned: false,
    createdAt: now,
    TTL: ttl,
  };

  await docClient.send(
    new PutCommand({
      TableName: tableName(),
      Item: question,
    })
  );

  return {
    eventType: "QUESTION_ADDED" as SessionEventType,
    sessionSlug,
    payload: JSON.stringify({ id, sessionSlug, text, fingerprint, upvoteCount: 0, downvoteCount: 0, isHidden: false, isFocused: false, isBanned: false, createdAt: now, TTL: ttl }),
  };
}

export async function upvoteQuestion(args: UpvoteQuestionArgs): Promise<SessionUpdate> {
  const { sessionSlug, questionId, fingerprint, remove } = args;

  const upvoteDelta = remove ? -1 : 1;
  const incrementValue = remove ? -1 : 1;

  // Conditional update: voter must not already have voted (or must have voted if removing)
  const conditionExpression = remove
    ? "contains(voters, :fp)"
    : "NOT contains(voters, :fp) OR attribute_not_exists(voters)";

  const updateExpression = remove
    ? "ADD upvoteCount :delta DELETE voters :fpSet"
    : "ADD upvoteCount :delta, voters :fpSet";

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: {
          PK: `SESSION#${sessionSlug}`,
          SK: `QUESTION#${questionId}`,
        },
        UpdateExpression: updateExpression,
        ConditionExpression: conditionExpression,
        ExpressionAttributeValues: {
          ":delta": incrementValue,
          ":fp": fingerprint,
          ":fpSet": new Set([fingerprint]),
        },
      })
    );
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new Error("VOTE_CONFLICT");
    }
    throw err;
  }

  return {
    eventType: "QUESTION_UPDATED" as SessionEventType,
    sessionSlug,
    payload: JSON.stringify({ questionId, upvoteDelta }),
  };
}

export async function addReply(args: AddReplyArgs): Promise<SessionUpdate> {
  const { sessionSlug, questionId, text, fingerprint, isHostReply } = args;

  if (text.length > 500) {
    throw new Error("Reply text exceeds 500 character limit");
  }

  const id = ulid();
  const now = Math.floor(Date.now() / 1000);
  const ttl = now + 24 * 60 * 60;

  const reply = {
    PK: `SESSION#${sessionSlug}`,
    SK: `REPLY#${id}`,
    id,
    questionId,
    sessionSlug,
    text,
    isHostReply,
    fingerprint,
    createdAt: now,
    TTL: ttl,
  };

  await docClient.send(
    new PutCommand({
      TableName: tableName(),
      Item: reply,
    })
  );

  return {
    eventType: "REPLY_ADDED" as SessionEventType,
    sessionSlug,
    payload: JSON.stringify({ id, questionId, sessionSlug, text, isHostReply, fingerprint, createdAt: now, TTL: ttl }),
  };
}

export async function focusQuestion(args: FocusQuestionArgs): Promise<SessionUpdate> {
  const { sessionSlug, hostSecretHash, questionId } = args;
  await verifyHostSecret(sessionSlug, hostSecretHash);

  // Find all currently focused questions and unfocus them
  const queryResult = await docClient.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      FilterExpression: "isFocused = :true",
      ExpressionAttributeValues: {
        ":pk": `SESSION#${sessionSlug}`,
        ":prefix": "QUESTION#",
        ":true": true,
      },
    })
  );

  // Unfocus all currently focused questions
  const unfocusPromises = (queryResult.Items ?? []).map((item) =>
    docClient.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { PK: item.PK, SK: item.SK },
        UpdateExpression: "SET isFocused = :false",
        ExpressionAttributeValues: { ":false": false },
      })
    )
  );
  await Promise.all(unfocusPromises);

  // If questionId provided, focus the target question
  if (questionId) {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: {
          PK: `SESSION#${sessionSlug}`,
          SK: `QUESTION#${questionId}`,
        },
        UpdateExpression: "SET isFocused = :true",
        ExpressionAttributeValues: { ":true": true },
      })
    );
  }

  return {
    eventType: "QUESTION_UPDATED" as SessionEventType,
    sessionSlug,
    payload: JSON.stringify({ questionId: questionId ?? null, isFocused: !!questionId }),
  };
}

import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";

import type {
  AddQuestionArgs,
  AddReplyArgs,
  DeleteQuestionArgs,
  DeleteReplyArgs,
  EditQuestionArgs,
  EditReplyArgs,
  FocusQuestionArgs,
  SessionEventType,
  SessionUpdate,
  UpvoteQuestionArgs,
} from "@nasqa/core";

import { docClient } from "./index";
import { checkNotBanned, checkRateLimit } from "./rate-limit";
import { verifyHostSecret } from "./shared";

function tableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error("TABLE_NAME environment variable is not set");
  return name;
}

export async function addQuestion(args: AddQuestionArgs): Promise<SessionUpdate> {
  const { sessionCode, text, fingerprint, authorName, isHostQuestion } = args;

  // Enforce ban and rate limit before any write
  await checkNotBanned(sessionCode, fingerprint);
  await checkRateLimit(fingerprint, 3, 60);

  if (text.length > 500) {
    throw new Error("Question text exceeds 500 character limit");
  }

  const id = ulid();
  const now = Math.floor(Date.now() / 1000);
  const ttl = now + 24 * 60 * 60;

  const question: Record<string, unknown> = {
    PK: `SESSION#${sessionCode}`,
    SK: `QUESTION#${id}`,
    id,
    sessionCode,
    text,
    fingerprint,
    isHostQuestion: !!isHostQuestion,
    upvoteCount: 0,
    downvoteCount: 0,
    isHidden: false,
    isFocused: false,
    isBanned: false,
    createdAt: now,
    TTL: ttl,
  };

  if (authorName) {
    question.authorName = authorName;
  }

  await docClient.send(
    new PutCommand({
      TableName: tableName(),
      Item: question,
    }),
  );

  return {
    eventType: "QUESTION_ADDED" as SessionEventType,
    sessionCode,
    payload: JSON.stringify({
      id,
      sessionCode,
      text,
      fingerprint,
      authorName: authorName ?? null,
      isHostQuestion: !!isHostQuestion,
      upvoteCount: 0,
      downvoteCount: 0,
      isHidden: false,
      isFocused: false,
      isBanned: false,
      createdAt: now,
      TTL: ttl,
    }),
  };
}

export async function upvoteQuestion(args: UpvoteQuestionArgs): Promise<SessionUpdate> {
  const { sessionCode, questionId, fingerprint, remove } = args;

  const upvoteDelta = remove ? -1 : 1;
  const incrementValue = remove ? -1 : 1;

  // Conditional update: voter must not already have voted (or must have voted if removing)
  const conditionExpression = remove
    ? "contains(voters, :fp)"
    : "NOT contains(voters, :fp) OR attribute_not_exists(voters)";

  const updateExpression = remove
    ? "ADD upvoteCount :delta DELETE voters :fpSet"
    : "ADD upvoteCount :delta, voters :fpSet";

  let newUpvoteCount: number;
  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: {
          PK: `SESSION#${sessionCode}`,
          SK: `QUESTION#${questionId}`,
        },
        UpdateExpression: updateExpression,
        ConditionExpression: conditionExpression,
        ExpressionAttributeValues: {
          ":delta": incrementValue,
          ":fp": fingerprint,
          ":fpSet": new Set([fingerprint]),
        },
        ReturnValues: "ALL_NEW",
      }),
    );
    newUpvoteCount = (result.Attributes?.upvoteCount as number) ?? 0;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new Error("VOTE_CONFLICT");
    }
    throw err;
  }

  // suppress unused variable warning
  void upvoteDelta;

  return {
    eventType: "QUESTION_UPDATED" as SessionEventType,
    sessionCode,
    payload: JSON.stringify({ questionId, upvoteCount: newUpvoteCount }),
  };
}

export async function addReply(args: AddReplyArgs): Promise<SessionUpdate> {
  const { sessionCode, questionId, text, fingerprint, isHostReply, authorName } = args;

  // Enforce ban before any write (no rate limit on replies per requirements)
  await checkNotBanned(sessionCode, fingerprint);

  if (text.length > 500) {
    throw new Error("Reply text exceeds 500 character limit");
  }

  const id = ulid();
  const now = Math.floor(Date.now() / 1000);
  const ttl = now + 24 * 60 * 60;

  const reply: Record<string, unknown> = {
    PK: `SESSION#${sessionCode}`,
    SK: `REPLY#${id}`,
    id,
    questionId,
    sessionCode,
    text,
    isHostReply,
    fingerprint,
    createdAt: now,
    TTL: ttl,
  };

  if (authorName) {
    reply.authorName = authorName;
  }

  await docClient.send(
    new PutCommand({
      TableName: tableName(),
      Item: reply,
    }),
  );

  return {
    eventType: "REPLY_ADDED" as SessionEventType,
    sessionCode,
    payload: JSON.stringify({
      id,
      questionId,
      sessionCode,
      text,
      isHostReply,
      fingerprint,
      authorName: authorName ?? null,
      createdAt: now,
      TTL: ttl,
    }),
  };
}

export async function editQuestion(args: EditQuestionArgs): Promise<SessionUpdate> {
  const { sessionCode, questionId, text, fingerprint, hostSecretHash } = args;

  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: { PK: `SESSION#${sessionCode}`, SK: `QUESTION#${questionId}` },
    }),
  );

  if (!result.Item) throw new Error("Question not found");

  const item = result.Item;
  const now = Math.floor(Date.now() / 1000);

  if (hostSecretHash) {
    // Host superuser path — verify host, no time restriction
    await verifyHostSecret(sessionCode, hostSecretHash);
  } else if (fingerprint) {
    // Participant path — verify fingerprint + 5-minute window
    if (item.fingerprint !== fingerprint) throw new Error("Unauthorized");
    if (now - (item.createdAt as number) > 300) throw new Error("EDIT_WINDOW_EXPIRED");
  } else {
    throw new Error("Unauthorized");
  }

  if (text.length > 500) throw new Error("Question text exceeds 500 character limit");

  await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { PK: `SESSION#${sessionCode}`, SK: `QUESTION#${questionId}` },
      UpdateExpression: "SET #text = :text, editedAt = :editedAt",
      ExpressionAttributeNames: { "#text": "text" },
      ExpressionAttributeValues: { ":text": text, ":editedAt": now },
    }),
  );

  return {
    eventType: "QUESTION_EDITED" as SessionEventType,
    sessionCode,
    payload: JSON.stringify({ questionId, text, editedAt: now }),
  };
}

export async function deleteQuestion(args: DeleteQuestionArgs): Promise<SessionUpdate> {
  const { sessionCode, questionId, fingerprint, hostSecretHash } = args;

  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: { PK: `SESSION#${sessionCode}`, SK: `QUESTION#${questionId}` },
    }),
  );

  if (!result.Item) throw new Error("Question not found");

  const item = result.Item;
  const now = Math.floor(Date.now() / 1000);

  if (hostSecretHash) {
    await verifyHostSecret(sessionCode, hostSecretHash);
  } else if (fingerprint) {
    if (item.fingerprint !== fingerprint) throw new Error("Unauthorized");
    if (now - (item.createdAt as number) > 300) throw new Error("EDIT_WINDOW_EXPIRED");
  } else {
    throw new Error("Unauthorized");
  }

  await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { PK: `SESSION#${sessionCode}`, SK: `QUESTION#${questionId}` },
      UpdateExpression: "SET deletedAt = :now",
      ExpressionAttributeValues: { ":now": now },
    }),
  );

  return {
    eventType: "QUESTION_DELETED" as SessionEventType,
    sessionCode,
    payload: JSON.stringify({ questionId }),
  };
}

export async function editReply(args: EditReplyArgs): Promise<SessionUpdate> {
  const { sessionCode, replyId, text, fingerprint, hostSecretHash } = args;

  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: { PK: `SESSION#${sessionCode}`, SK: `REPLY#${replyId}` },
    }),
  );

  if (!result.Item) throw new Error("Reply not found");

  const item = result.Item;
  const now = Math.floor(Date.now() / 1000);

  if (hostSecretHash) {
    await verifyHostSecret(sessionCode, hostSecretHash);
  } else if (fingerprint) {
    if (item.fingerprint !== fingerprint) throw new Error("Unauthorized");
    if (now - (item.createdAt as number) > 300) throw new Error("EDIT_WINDOW_EXPIRED");
  } else {
    throw new Error("Unauthorized");
  }

  if (text.length > 500) throw new Error("Reply text exceeds 500 character limit");

  await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { PK: `SESSION#${sessionCode}`, SK: `REPLY#${replyId}` },
      UpdateExpression: "SET #text = :text, editedAt = :editedAt",
      ExpressionAttributeNames: { "#text": "text" },
      ExpressionAttributeValues: { ":text": text, ":editedAt": now },
    }),
  );

  return {
    eventType: "REPLY_EDITED" as SessionEventType,
    sessionCode,
    payload: JSON.stringify({ replyId, text, editedAt: now }),
  };
}

export async function deleteReply(args: DeleteReplyArgs): Promise<SessionUpdate> {
  const { sessionCode, replyId, fingerprint, hostSecretHash } = args;

  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: { PK: `SESSION#${sessionCode}`, SK: `REPLY#${replyId}` },
    }),
  );

  if (!result.Item) throw new Error("Reply not found");

  const item = result.Item;
  const now = Math.floor(Date.now() / 1000);

  if (hostSecretHash) {
    await verifyHostSecret(sessionCode, hostSecretHash);
  } else if (fingerprint) {
    if (item.fingerprint !== fingerprint) throw new Error("Unauthorized");
    if (now - (item.createdAt as number) > 300) throw new Error("EDIT_WINDOW_EXPIRED");
  } else {
    throw new Error("Unauthorized");
  }

  await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { PK: `SESSION#${sessionCode}`, SK: `REPLY#${replyId}` },
      UpdateExpression: "SET deletedAt = :now",
      ExpressionAttributeValues: { ":now": now },
    }),
  );

  return {
    eventType: "REPLY_DELETED" as SessionEventType,
    sessionCode,
    payload: JSON.stringify({ replyId }),
  };
}

export async function focusQuestion(args: FocusQuestionArgs): Promise<SessionUpdate> {
  const { sessionCode, hostSecretHash, questionId } = args;
  await verifyHostSecret(sessionCode, hostSecretHash);

  // Find all currently focused questions and unfocus them
  const queryResult = await docClient.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      FilterExpression: "isFocused = :true",
      ExpressionAttributeValues: {
        ":pk": `SESSION#${sessionCode}`,
        ":prefix": "QUESTION#",
        ":true": true,
      },
    }),
  );

  // Unfocus all currently focused questions
  const unfocusPromises = (queryResult.Items ?? []).map((item) =>
    docClient.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { PK: item.PK, SK: item.SK },
        UpdateExpression: "SET isFocused = :false",
        ExpressionAttributeValues: { ":false": false },
      }),
    ),
  );
  await Promise.all(unfocusPromises);

  // If questionId provided, focus the target question
  if (questionId) {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: {
          PK: `SESSION#${sessionCode}`,
          SK: `QUESTION#${questionId}`,
        },
        UpdateExpression: "SET isFocused = :true",
        ExpressionAttributeValues: { ":true": true },
      }),
    );
  }

  return {
    eventType: "QUESTION_UPDATED" as SessionEventType,
    sessionCode,
    payload: JSON.stringify({ questionId: questionId ?? null, isFocused: !!questionId }),
  };
}

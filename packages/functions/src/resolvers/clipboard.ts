import {
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";

import type {
  ClearClipboardArgs,
  DeleteSnippetArgs,
  EditSnippetArgs,
  PushSnippetArgs,
  SessionEventType,
  SessionUpdate,
} from "@nasqa/core";

import { docClient } from "./index";
import { checkRateLimit } from "./rate-limit";
import { verifyHostSecret } from "./shared";

function tableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error("TABLE_NAME environment variable is not set");
  return name;
}

export async function pushSnippet(args: PushSnippetArgs): Promise<SessionUpdate> {
  const { sessionCode, hostSecretHash, content, type, language } = args;
  await verifyHostSecret(sessionCode, hostSecretHash);

  // Rate limit: 10 snippets per minute per hostSecretHash
  await checkRateLimit(hostSecretHash, 10, 60);

  const id = ulid();
  const now = Math.floor(Date.now() / 1000);
  const ttl = now + 24 * 60 * 60; // 24 hours

  const snippet = {
    PK: `SESSION#${sessionCode}`,
    SK: `SNIPPET#${id}`,
    id,
    sessionCode,
    type,
    content,
    language: language ?? null,
    createdAt: now,
    TTL: ttl,
  };

  await docClient.send(
    new PutCommand({
      TableName: tableName(),
      Item: snippet,
    }),
  );

  return {
    eventType: "SNIPPET_ADDED" as SessionEventType,
    sessionCode,
    payload: JSON.stringify({
      id,
      sessionCode,
      type,
      content,
      language: language ?? null,
      createdAt: now,
      TTL: ttl,
    }),
  };
}

export async function deleteSnippet(args: DeleteSnippetArgs): Promise<SessionUpdate> {
  const { sessionCode, hostSecretHash, snippetId } = args;
  await verifyHostSecret(sessionCode, hostSecretHash);

  await docClient.send(
    new DeleteCommand({
      TableName: tableName(),
      Key: {
        PK: `SESSION#${sessionCode}`,
        SK: `SNIPPET#${snippetId}`,
      },
    }),
  );

  return {
    eventType: "SNIPPET_DELETED" as SessionEventType,
    sessionCode,
    payload: JSON.stringify({ snippetId }),
  };
}

export async function clearClipboard(args: ClearClipboardArgs): Promise<SessionUpdate> {
  const { sessionCode, hostSecretHash } = args;
  await verifyHostSecret(sessionCode, hostSecretHash);

  // Query all SNIPPET# items for this session
  const queryResult = await docClient.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": `SESSION#${sessionCode}`,
        ":prefix": "SNIPPET#",
      },
    }),
  );

  const items = queryResult.Items ?? [];

  // BatchWrite in chunks of 25 (DynamoDB limit)
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName()]: chunk.map((item) => ({
            DeleteRequest: {
              Key: { PK: item.PK, SK: item.SK },
            },
          })),
        },
      }),
    );
  }

  return {
    eventType: "CLIPBOARD_CLEARED" as SessionEventType,
    sessionCode,
    payload: JSON.stringify({}),
  };
}

export async function editSnippet(args: EditSnippetArgs): Promise<SessionUpdate> {
  const { sessionCode, snippetId, content, language, hostSecretHash } = args;

  // Host-only mutation — always requires verifyHostSecret; no time window
  await verifyHostSecret(sessionCode, hostSecretHash);

  const now = Math.floor(Date.now() / 1000);

  // Build update expression conditionally for optional language field
  const updateParts = ["#content = :content", "editedAt = :editedAt"];
  const expressionAttributeNames: Record<string, string> = { "#content": "content" };
  const expressionAttributeValues: Record<string, unknown> = {
    ":content": content,
    ":editedAt": now,
  };

  if (language !== undefined) {
    updateParts.push("#language = :language");
    expressionAttributeNames["#language"] = "language";
    expressionAttributeValues[":language"] = language;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { PK: `SESSION#${sessionCode}`, SK: `SNIPPET#${snippetId}` },
      UpdateExpression: `SET ${updateParts.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }),
  );

  return {
    eventType: "SNIPPET_EDITED" as SessionEventType,
    sessionCode,
    payload: JSON.stringify({ snippetId, content, language: language ?? null, editedAt: now }),
  };
}

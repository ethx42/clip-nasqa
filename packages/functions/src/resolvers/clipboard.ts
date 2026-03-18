import {
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";

import type {
  ClearClipboardArgs,
  DeleteSnippetArgs,
  PushSnippetArgs,
  SessionEventType,
  SessionUpdate,
} from "@nasqa/core";

import { docClient } from "./index";
import { checkRateLimit } from "./rate-limit";

function tableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error("TABLE_NAME environment variable is not set");
  return name;
}

async function verifyHostSecret(sessionCode: string, hostSecretHash: string): Promise<void> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: {
        PK: `SESSION#${sessionCode}`,
        SK: `SESSION#${sessionCode}`,
      },
    }),
  );
  if (!result.Item || result.Item.hostSecretHash !== hostSecretHash) {
    throw new Error("Unauthorized");
  }
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

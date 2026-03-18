import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

import type { AppSyncResolverContext, GetSessionDataArgs } from "@nasqa/core";
import { EMOJI_KEYS } from "@nasqa/core";

import { clearClipboard, deleteSnippet, editSnippet, pushSnippet } from "./clipboard";
import { logger } from "./logger";
import {
  handleBanParticipant,
  handleBanQuestion,
  handleDownvoteQuestion,
  handleRestoreQuestion,
} from "./moderation";
import {
  addQuestion,
  addReply,
  deleteQuestion,
  deleteReply,
  editQuestion,
  editReply,
  focusQuestion,
  upvoteQuestion,
} from "./qa";
import { handleReact } from "./reactions";

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" });
export const docClient = DynamoDBDocumentClient.from(client);

function tableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error("TABLE_NAME environment variable is not set");
  return name;
}

/** Deduplicate reactionOrder keeping first occurrence, filter to emojis with count > 0 */
function deduplicateReactionOrder(rawOrder: string[], counts: Record<string, number>): string[] {
  const seen = new Set<string>();
  return rawOrder.filter((k) => {
    if (seen.has(k)) return false;
    seen.add(k);
    return (counts[k] ?? 0) > 0;
  });
}

async function getSessionData(args: GetSessionDataArgs) {
  const { sessionCode } = args;

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `SESSION#${sessionCode}`,
      },
    }),
  );

  const now = Math.floor(Date.now() / 1000);
  const items = (result.Items ?? []).filter(
    (item) => (!item.TTL || item.TTL > now) && !item.deletedAt,
  );

  const snippets = items
    .filter((item) => (item.SK as string).startsWith("SNIPPET#"))
    .map((item) => ({
      id: item.id,
      sessionCode: item.sessionCode,
      type: item.type,
      content: item.content,
      language: item.language ?? null,
      createdAt: item.createdAt,
      TTL: item.TTL,
      editedAt: item.editedAt ?? null,
    }));

  const questions = items
    .filter((item) => (item.SK as string).startsWith("QUESTION#"))
    .map((item) => ({
      id: item.id,
      sessionCode: item.sessionCode,
      text: item.text,
      fingerprint: item.fingerprint,
      authorName: item.authorName ?? null,
      upvoteCount: item.upvoteCount ?? 0,
      downvoteCount: item.downvoteCount ?? 0,
      isHidden: item.isHidden ?? false,
      isFocused: item.isFocused ?? false,
      isBanned: item.isBanned ?? false,
      reactionCounts: JSON.stringify(
        Object.fromEntries(
          EMOJI_KEYS.map((key) => [key, Math.max(0, (item[`rxn_${key}_count`] as number) ?? 0)]),
        ),
      ),
      reactionOrder: JSON.stringify(
        deduplicateReactionOrder(
          (item.reactionOrder as string[] | undefined) ?? [],
          EMOJI_KEYS.reduce(
            (acc, key) => {
              acc[key] = Math.max(0, (item[`rxn_${key}_count`] as number) ?? 0);
              return acc;
            },
            {} as Record<string, number>,
          ),
        ),
      ),
      createdAt: item.createdAt,
      TTL: item.TTL,
      editedAt: item.editedAt ?? null,
    }));

  const replies = items
    .filter((item) => (item.SK as string).startsWith("REPLY#"))
    .map((item) => ({
      id: item.id,
      questionId: item.questionId,
      sessionCode: item.sessionCode,
      text: item.text,
      isHostReply: item.isHostReply ?? false,
      fingerprint: item.fingerprint,
      reactionCounts: JSON.stringify(
        Object.fromEntries(
          EMOJI_KEYS.map((key) => [key, Math.max(0, (item[`rxn_${key}_count`] as number) ?? 0)]),
        ),
      ),
      reactionOrder: JSON.stringify(
        deduplicateReactionOrder(
          (item.reactionOrder as string[] | undefined) ?? [],
          EMOJI_KEYS.reduce(
            (acc, key) => {
              acc[key] = Math.max(0, (item[`rxn_${key}_count`] as number) ?? 0);
              return acc;
            },
            {} as Record<string, number>,
          ),
        ),
      ),
      createdAt: item.createdAt,
      TTL: item.TTL,
      editedAt: item.editedAt ?? null,
    }));

  return { snippets, questions, replies };
}

// AppSync Lambda resolver handler
// fieldName is the mutation/query field being resolved
export const handler = async (event: AppSyncResolverContext): Promise<unknown> => {
  const fieldName = (event as unknown as { info: { fieldName: string } }).info?.fieldName;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args = event.arguments as any;

  const log = logger.child({
    operation: fieldName,
    sessionCode: args?.sessionCode ?? "unknown",
  });

  const start = Date.now();

  try {
    let result: unknown;

    switch (fieldName) {
      case "pushSnippet":
        result = await pushSnippet(args);
        break;
      case "deleteSnippet":
        result = await deleteSnippet(args);
        break;
      case "clearClipboard":
        result = await clearClipboard(args);
        break;
      case "addQuestion":
        result = await addQuestion(args);
        break;
      case "upvoteQuestion":
        result = await upvoteQuestion(args);
        break;
      case "addReply":
        result = await addReply(args);
        break;
      case "focusQuestion":
        result = await focusQuestion(args);
        break;
      case "banQuestion":
        result = await handleBanQuestion(args);
        break;
      case "banParticipant":
        result = await handleBanParticipant(args);
        break;
      case "downvoteQuestion":
        result = await handleDownvoteQuestion(args);
        break;
      case "restoreQuestion":
        result = await handleRestoreQuestion(args);
        break;
      case "react":
        result = await handleReact(args);
        break;
      case "editQuestion":
        result = await editQuestion(args);
        break;
      case "deleteQuestion":
        result = await deleteQuestion(args);
        break;
      case "editReply":
        result = await editReply(args);
        break;
      case "deleteReply":
        result = await deleteReply(args);
        break;
      case "editSnippet":
        result = await editSnippet(args);
        break;
      case "getSessionData":
        result = await getSessionData(args);
        break;
      default:
        throw new Error(`Unhandled field: ${fieldName}`);
    }

    log.info({ durationMs: Date.now() - start }, "resolver success");
    return result;
  } catch (err) {
    log.error({ durationMs: Date.now() - start, err }, "resolver error");
    throw err;
  }
};

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { AppSyncResolverContext, GetSessionDataArgs } from "@nasqa/core";
import { pushSnippet, deleteSnippet, clearClipboard } from "./clipboard";
import { addQuestion, upvoteQuestion, addReply, focusQuestion } from "./qa";
import { handleBanQuestion, handleBanParticipant, handleDownvoteQuestion, handleRestoreQuestion } from "./moderation";

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? "us-east-1" });
export const docClient = DynamoDBDocumentClient.from(client);

function tableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error("TABLE_NAME environment variable is not set");
  return name;
}

async function getSessionData(args: GetSessionDataArgs) {
  const { sessionSlug } = args;

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName(),
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `SESSION#${sessionSlug}`,
      },
    })
  );

  const now = Math.floor(Date.now() / 1000);
  const items = (result.Items ?? []).filter((item) => !item.TTL || item.TTL > now);

  const snippets = items.filter((item) => (item.SK as string).startsWith("SNIPPET#")).map((item) => ({
    id: item.id,
    sessionSlug: item.sessionSlug,
    type: item.type,
    content: item.content,
    language: item.language ?? null,
    createdAt: item.createdAt,
    TTL: item.TTL,
  }));

  const questions = items.filter((item) => (item.SK as string).startsWith("QUESTION#")).map((item) => ({
    id: item.id,
    sessionSlug: item.sessionSlug,
    text: item.text,
    fingerprint: item.fingerprint,
    authorName: item.authorName ?? null,
    upvoteCount: item.upvoteCount ?? 0,
    downvoteCount: item.downvoteCount ?? 0,
    isHidden: item.isHidden ?? false,
    isFocused: item.isFocused ?? false,
    isBanned: item.isBanned ?? false,
    createdAt: item.createdAt,
    TTL: item.TTL,
  }));

  const replies = items.filter((item) => (item.SK as string).startsWith("REPLY#")).map((item) => ({
    id: item.id,
    questionId: item.questionId,
    sessionSlug: item.sessionSlug,
    text: item.text,
    isHostReply: item.isHostReply ?? false,
    fingerprint: item.fingerprint,
    createdAt: item.createdAt,
    TTL: item.TTL,
  }));

  return { snippets, questions, replies };
}

// AppSync Lambda resolver handler
// fieldName is the mutation/query field being resolved
export const handler = async (event: AppSyncResolverContext): Promise<unknown> => {
  const fieldName = (event as unknown as { info: { fieldName: string } }).info?.fieldName;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const args = event.arguments as any;

  switch (fieldName) {
    case "pushSnippet": return pushSnippet(args);
    case "deleteSnippet": return deleteSnippet(args);
    case "clearClipboard": return clearClipboard(args);
    case "addQuestion": return addQuestion(args);
    case "upvoteQuestion": return upvoteQuestion(args);
    case "addReply": return addReply(args);
    case "focusQuestion": return focusQuestion(args);
    case "banQuestion": return handleBanQuestion(args);
    case "banParticipant": return handleBanParticipant(args);
    case "downvoteQuestion": return handleDownvoteQuestion(args);
    case "restoreQuestion": return handleRestoreQuestion(args);
    case "getSessionData": return getSessionData(args);
    default:
      throw new Error(`Unhandled field: ${fieldName}`);
  }
};

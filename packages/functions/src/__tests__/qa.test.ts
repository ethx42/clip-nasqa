import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it } from "vitest";

// Import resolvers after mock setup
import { addQuestion, addReply, upvoteQuestion } from "../resolvers/qa";

// Set TABLE_NAME before importing resolvers (Pitfall 6)
process.env.TABLE_NAME = "test-table";

// Mock BEFORE importing resolvers (Pitfall 1)
const ddbMock = mockClient(DynamoDBDocumentClient);

const VALID_FINGERPRINT = "123e4567-e89b-12d3-a456-426614174000";

beforeEach(() => {
  ddbMock.reset();
  // Default: pass ban check, pass rate limit, pass writes
  ddbMock.on(GetCommand).resolves({ Item: undefined });
  ddbMock.on(UpdateCommand).resolves({ Attributes: { upvoteCount: 1 } });
  ddbMock.on(PutCommand).resolves({});
});

describe("addQuestion", () => {
  it("returns QUESTION_ADDED event with correct shape", async () => {
    const result = await addQuestion({
      sessionSlug: "test-slug",
      text: "What is this?",
      fingerprint: VALID_FINGERPRINT,
    });

    expect(result.eventType).toBe("QUESTION_ADDED");
    expect(result.sessionSlug).toBe("test-slug");

    const payload = JSON.parse(result.payload as string);
    expect(payload.text).toBe("What is this?");
    expect(payload.fingerprint).toBe(VALID_FINGERPRINT);
    expect(payload.upvoteCount).toBe(0);
    expect(payload.downvoteCount).toBe(0);
    expect(payload.isHidden).toBe(false);
    expect(payload.isFocused).toBe(false);
    expect(payload.isBanned).toBe(false);
    expect(typeof payload.id).toBe("string");
    expect(payload.id.length).toBeGreaterThan(0);
  });

  it("includes optional authorName in payload", async () => {
    const result = await addQuestion({
      sessionSlug: "test-slug",
      text: "Question with author",
      fingerprint: VALID_FINGERPRINT,
      authorName: "Alice",
    });

    const payload = JSON.parse(result.payload as string);
    expect(payload.authorName).toBe("Alice");
  });

  it("sets authorName to null when not provided", async () => {
    const result = await addQuestion({
      sessionSlug: "test-slug",
      text: "Anonymous question",
      fingerprint: VALID_FINGERPRINT,
    });

    const payload = JSON.parse(result.payload as string);
    expect(payload.authorName).toBeNull();
  });

  it("throws when text exceeds 500 chars", async () => {
    await expect(
      addQuestion({
        sessionSlug: "test-slug",
        text: "a".repeat(501),
        fingerprint: VALID_FINGERPRINT,
      }),
    ).rejects.toThrow("Question text exceeds 500 character limit");
  });

  it("throws PARTICIPANT_BANNED when fingerprint is banned", async () => {
    // Override GetCommand to return a banned item for ban check
    ddbMock.on(GetCommand).resolves({ Item: { isBanned: true, fingerprint: VALID_FINGERPRINT } });

    await expect(
      addQuestion({
        sessionSlug: "test-slug",
        text: "Banned user question",
        fingerprint: VALID_FINGERPRINT,
      }),
    ).rejects.toThrow("PARTICIPANT_BANNED");
  });

  it("throws RATE_LIMIT_EXCEEDED when rate limited", async () => {
    // GetCommand (ban check) passes, but UpdateCommand (rate limit) is over limit
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    ddbMock.on(UpdateCommand).rejects(
      new ConditionalCheckFailedException({
        message: "The conditional request failed",
        $metadata: {},
      }),
    );

    await expect(
      addQuestion({
        sessionSlug: "test-slug",
        text: "Rate limited question",
        fingerprint: VALID_FINGERPRINT,
      }),
    ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
  });

  it("writes question to DynamoDB", async () => {
    await addQuestion({
      sessionSlug: "test-slug",
      text: "Written to DB?",
      fingerprint: VALID_FINGERPRINT,
    });

    expect(ddbMock).toHaveReceivedCommand(PutCommand);
  });
});

describe("upvoteQuestion", () => {
  it("returns QUESTION_UPDATED event when adding upvote", async () => {
    ddbMock.on(UpdateCommand).resolves({ Attributes: { upvoteCount: 1 } });

    const result = await upvoteQuestion({
      sessionSlug: "test-slug",
      questionId: "q-id-123",
      fingerprint: VALID_FINGERPRINT,
      remove: false,
    });

    expect(result.eventType).toBe("QUESTION_UPDATED");
    expect(result.sessionSlug).toBe("test-slug");

    const payload = JSON.parse(result.payload as string);
    expect(payload.questionId).toBe("q-id-123");
    expect(typeof payload.upvoteCount).toBe("number");
  });

  it("returns QUESTION_UPDATED event when removing upvote", async () => {
    ddbMock.on(UpdateCommand).resolves({ Attributes: { upvoteCount: 0 } });

    const result = await upvoteQuestion({
      sessionSlug: "test-slug",
      questionId: "q-id-123",
      fingerprint: VALID_FINGERPRINT,
      remove: true,
    });

    expect(result.eventType).toBe("QUESTION_UPDATED");
    const payload = JSON.parse(result.payload as string);
    expect(payload.upvoteCount).toBe(0);
  });

  it("throws VOTE_CONFLICT on duplicate vote (ConditionalCheckFailedException)", async () => {
    ddbMock.on(UpdateCommand).rejects(
      new ConditionalCheckFailedException({
        message: "The conditional request failed",
        $metadata: {},
      }),
    );

    await expect(
      upvoteQuestion({
        sessionSlug: "test-slug",
        questionId: "q-id-123",
        fingerprint: VALID_FINGERPRINT,
        remove: false,
      }),
    ).rejects.toThrow("VOTE_CONFLICT");
  });
});

describe("addReply", () => {
  it("returns REPLY_ADDED event with correct shape", async () => {
    const result = await addReply({
      sessionSlug: "test-slug",
      questionId: "q-id-123",
      text: "Great question!",
      fingerprint: VALID_FINGERPRINT,
      isHostReply: false,
    });

    expect(result.eventType).toBe("REPLY_ADDED");
    expect(result.sessionSlug).toBe("test-slug");

    const payload = JSON.parse(result.payload as string);
    expect(payload.questionId).toBe("q-id-123");
    expect(payload.text).toBe("Great question!");
    expect(payload.isHostReply).toBe(false);
    expect(payload.fingerprint).toBe(VALID_FINGERPRINT);
    expect(typeof payload.id).toBe("string");
  });

  it("marks host reply when isHostReply is true", async () => {
    const result = await addReply({
      sessionSlug: "test-slug",
      questionId: "q-id-123",
      text: "Host answer",
      fingerprint: VALID_FINGERPRINT,
      isHostReply: true,
    });

    const payload = JSON.parse(result.payload as string);
    expect(payload.isHostReply).toBe(true);
  });

  it("includes optional authorName when provided", async () => {
    const result = await addReply({
      sessionSlug: "test-slug",
      questionId: "q-id-123",
      text: "Reply with author",
      fingerprint: VALID_FINGERPRINT,
      isHostReply: false,
      authorName: "Bob",
    });

    const payload = JSON.parse(result.payload as string);
    expect(payload.authorName).toBe("Bob");
  });

  it("throws when text exceeds 500 chars", async () => {
    await expect(
      addReply({
        sessionSlug: "test-slug",
        questionId: "q-id-123",
        text: "a".repeat(501),
        fingerprint: VALID_FINGERPRINT,
        isHostReply: false,
      }),
    ).rejects.toThrow("Reply text exceeds 500 character limit");
  });

  it("throws PARTICIPANT_BANNED when fingerprint is banned", async () => {
    ddbMock.on(GetCommand).resolves({ Item: { isBanned: true } });

    await expect(
      addReply({
        sessionSlug: "test-slug",
        questionId: "q-id-123",
        text: "Banned reply",
        fingerprint: VALID_FINGERPRINT,
        isHostReply: false,
      }),
    ).rejects.toThrow("PARTICIPANT_BANNED");
  });
});

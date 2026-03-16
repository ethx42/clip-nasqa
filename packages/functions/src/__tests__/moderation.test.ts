import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it } from "vitest";

// Import resolvers after mock setup
import { handleBanParticipant, handleBanQuestion } from "../resolvers/moderation";

// Set TABLE_NAME before importing resolvers (Pitfall 6)
process.env.TABLE_NAME = "test-table";

// Mock BEFORE importing resolvers (Pitfall 1)
const ddbMock = mockClient(DynamoDBDocumentClient);

const VALID_HOST_SECRET_HASH = "abc123hostsecret";
const VALID_FINGERPRINT = "fp-test-user-001";

beforeEach(() => {
  ddbMock.reset();
  // Default: host secret verification passes, question exists
  ddbMock
    .on(GetCommand, {
      Key: {
        PK: "SESSION#test-session",
        SK: "SESSION#test-session",
      },
    })
    .resolves({
      Item: {
        PK: "SESSION#test-session",
        SK: "SESSION#test-session",
        hostSecretHash: VALID_HOST_SECRET_HASH,
      },
    });

  // Default: question lookup succeeds
  ddbMock
    .on(GetCommand, {
      Key: {
        PK: "SESSION#test-session",
        SK: "QUESTION#q-id-123",
      },
    })
    .resolves({
      Item: {
        PK: "SESSION#test-session",
        SK: "QUESTION#q-id-123",
        id: "q-id-123",
        fingerprint: VALID_FINGERPRINT,
      },
    });

  // Default: UpdateCommands succeed
  ddbMock.on(UpdateCommand).resolves({
    Attributes: {
      questionId: "q-id-123",
      isBanned: true,
      isHidden: true,
    },
  });
});

describe("handleBanQuestion", () => {
  it("returns QUESTION_UPDATED event when host secret matches", async () => {
    // BAN item update returns bannedPostCount < 3
    ddbMock
      .on(UpdateCommand)
      .resolvesOnce({ Attributes: { isBanned: true, isHidden: true } }) // question update
      .resolvesOnce({ Attributes: { bannedPostCount: 1, isBanned: false } }); // ban item update

    const result = await handleBanQuestion({
      sessionSlug: "test-session",
      hostSecretHash: VALID_HOST_SECRET_HASH,
      questionId: "q-id-123",
    });

    expect(result.eventType).toBe("QUESTION_UPDATED");
    expect(result.sessionSlug).toBe("test-session");
  });

  it("includes correct fields in payload", async () => {
    ddbMock
      .on(UpdateCommand)
      .resolvesOnce({ Attributes: { isBanned: true, isHidden: true } })
      .resolvesOnce({ Attributes: { bannedPostCount: 1, isBanned: false } });

    const result = await handleBanQuestion({
      sessionSlug: "test-session",
      hostSecretHash: VALID_HOST_SECRET_HASH,
      questionId: "q-id-123",
    });

    const payload = JSON.parse(result.payload as string);
    expect(payload.questionId).toBe("q-id-123");
    expect(payload.isBanned).toBe(true);
    expect(payload.isHidden).toBe(true);
    expect(payload.fingerprint).toBe(VALID_FINGERPRINT);
  });

  it("throws Unauthorized when host secret does not match", async () => {
    ddbMock
      .on(GetCommand, {
        Key: {
          PK: "SESSION#test-session",
          SK: "SESSION#test-session",
        },
      })
      .resolves({
        Item: {
          hostSecretHash: "different-hash",
        },
      });

    await expect(
      handleBanQuestion({
        sessionSlug: "test-session",
        hostSecretHash: VALID_HOST_SECRET_HASH,
        questionId: "q-id-123",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws Unauthorized when session item not found", async () => {
    ddbMock
      .on(GetCommand, {
        Key: {
          PK: "SESSION#test-session",
          SK: "SESSION#test-session",
        },
      })
      .resolves({ Item: undefined });

    await expect(
      handleBanQuestion({
        sessionSlug: "test-session",
        hostSecretHash: VALID_HOST_SECRET_HASH,
        questionId: "q-id-123",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when question not found", async () => {
    ddbMock
      .on(GetCommand, {
        Key: {
          PK: "SESSION#test-session",
          SK: "QUESTION#q-missing",
        },
      })
      .resolves({ Item: undefined });

    await expect(
      handleBanQuestion({
        sessionSlug: "test-session",
        hostSecretHash: VALID_HOST_SECRET_HASH,
        questionId: "q-missing",
      }),
    ).rejects.toThrow("Question not found");
  });

  it("sets autoBanned=true when bannedPostCount reaches 3", async () => {
    ddbMock
      .on(UpdateCommand)
      .resolvesOnce({ Attributes: { isBanned: true, isHidden: true } }) // question update
      .resolvesOnce({ Attributes: { bannedPostCount: 3, isBanned: true } }) // ban item update
      .resolvesOnce({}); // auto-ban update

    const result = await handleBanQuestion({
      sessionSlug: "test-session",
      hostSecretHash: VALID_HOST_SECRET_HASH,
      questionId: "q-id-123",
    });

    const payload = JSON.parse(result.payload as string);
    expect(payload.autoBanned).toBe(true);
  });
});

describe("handleBanParticipant", () => {
  it("returns PARTICIPANT_BANNED event", async () => {
    const result = await handleBanParticipant({
      sessionSlug: "test-session",
      hostSecretHash: VALID_HOST_SECRET_HASH,
      fingerprint: VALID_FINGERPRINT,
    });

    expect(result.eventType).toBe("PARTICIPANT_BANNED");
    expect(result.sessionSlug).toBe("test-session");
  });

  it("includes fingerprint in payload", async () => {
    const result = await handleBanParticipant({
      sessionSlug: "test-session",
      hostSecretHash: VALID_HOST_SECRET_HASH,
      fingerprint: VALID_FINGERPRINT,
    });

    const payload = JSON.parse(result.payload as string);
    expect(payload.fingerprint).toBe(VALID_FINGERPRINT);
  });

  it("throws Unauthorized when host secret does not match", async () => {
    ddbMock
      .on(GetCommand, {
        Key: {
          PK: "SESSION#test-session",
          SK: "SESSION#test-session",
        },
      })
      .resolves({
        Item: { hostSecretHash: "wrong-hash" },
      });

    await expect(
      handleBanParticipant({
        sessionSlug: "test-session",
        hostSecretHash: VALID_HOST_SECRET_HASH,
        fingerprint: VALID_FINGERPRINT,
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("writes BAN item to DynamoDB with isBanned=true", async () => {
    await handleBanParticipant({
      sessionSlug: "test-session",
      hostSecretHash: VALID_HOST_SECRET_HASH,
      fingerprint: VALID_FINGERPRINT,
    });

    expect(ddbMock).toHaveReceivedCommandWith(UpdateCommand, {
      Key: {
        PK: "SESSION#test-session",
        SK: `BAN#${VALID_FINGERPRINT}`,
      },
    });
  });
});

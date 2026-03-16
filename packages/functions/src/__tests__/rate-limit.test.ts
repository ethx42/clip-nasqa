import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it } from "vitest";

// Import resolvers after mock setup
import { checkNotBanned, checkRateLimit } from "../resolvers/rate-limit";

// Set TABLE_NAME before importing resolvers (Pitfall 6)
process.env.TABLE_NAME = "test-table";

// Mock BEFORE importing resolvers (Pitfall 1)
const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe("checkRateLimit", () => {
  it("passes when under rate limit (no existing count)", async () => {
    ddbMock.on(UpdateCommand).resolves({});
    await expect(checkRateLimit("fp-test-1", 3, 60)).resolves.toBeUndefined();
    expect(ddbMock).toHaveReceivedCommand(UpdateCommand);
  });

  it("passes on the third request within limit", async () => {
    ddbMock.on(UpdateCommand).resolves({});
    await expect(checkRateLimit("fp-test-2", 3, 60)).resolves.toBeUndefined();
  });

  it("throws RATE_LIMIT_EXCEEDED when ConditionalCheckFailedException is thrown", async () => {
    ddbMock.on(UpdateCommand).rejects(
      new ConditionalCheckFailedException({
        message: "The conditional request failed",
        $metadata: {},
      }),
    );
    await expect(checkRateLimit("fp-over-limit", 3, 60)).rejects.toThrow("RATE_LIMIT_EXCEEDED");
  });

  it("re-throws unknown errors", async () => {
    ddbMock.on(UpdateCommand).rejects(new Error("Network failure"));
    await expect(checkRateLimit("fp-network-err", 3, 60)).rejects.toThrow("Network failure");
  });
});

describe("checkNotBanned", () => {
  it("passes for clean fingerprint (no BAN item found)", async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    await expect(checkNotBanned("test-session", "fp-clean")).resolves.toBeUndefined();
    expect(ddbMock).toHaveReceivedCommand(GetCommand);
  });

  it("passes when BAN item exists but isBanned is false", async () => {
    ddbMock.on(GetCommand).resolves({ Item: { isBanned: false, fingerprint: "fp-not-banned" } });
    await expect(checkNotBanned("test-session", "fp-not-banned")).resolves.toBeUndefined();
  });

  it("throws PARTICIPANT_BANNED for banned fingerprint", async () => {
    ddbMock.on(GetCommand).resolves({ Item: { isBanned: true, fingerprint: "fp-banned" } });
    await expect(checkNotBanned("test-session", "fp-banned")).rejects.toThrow("PARTICIPANT_BANNED");
  });

  it("queries with correct key structure", async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });
    await checkNotBanned("my-session", "my-fingerprint");
    expect(ddbMock).toHaveReceivedCommandWith(GetCommand, {
      Key: {
        PK: "SESSION#my-session",
        SK: "BAN#my-fingerprint",
      },
    });
  });
});

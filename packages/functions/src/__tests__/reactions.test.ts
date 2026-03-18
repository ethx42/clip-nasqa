import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it } from "vitest";

import { handleReact } from "../resolvers/reactions";

// Set TABLE_NAME before importing resolvers (mirrors qa.test.ts Pitfall 6 pattern)
process.env.TABLE_NAME = "test-table";

// Mock BEFORE importing resolvers (mirrors qa.test.ts Pitfall 1 pattern)
const ddbMock = mockClient(DynamoDBDocumentClient);

const VALID_FINGERPRINT = "123e4567-e89b-12d3-a456-426614174000";

// Realistic ALL_NEW attributes returned after a toggle-on for thumbsup
const TOGGLE_ON_ATTRIBUTES = {
  rxn_thumbsup_count: 1,
  rxn_thumbsup_reactors: new Set([VALID_FINGERPRINT]),
  rxn_heart_count: 0,
  rxn_heart_reactors: new Set<string>(),
  rxn_party_count: 0,
  rxn_party_reactors: new Set<string>(),
  rxn_laugh_count: 0,
  rxn_laugh_reactors: new Set<string>(),
  rxn_thinking_count: 0,
  rxn_thinking_reactors: new Set<string>(),
  rxn_eyes_count: 0,
  rxn_eyes_reactors: new Set<string>(),
};

// Attributes after toggle-off — count drops back to 0, fingerprint removed
const TOGGLE_OFF_ATTRIBUTES = {
  rxn_thumbsup_count: 0,
  rxn_thumbsup_reactors: new Set<string>(),
  rxn_heart_count: 0,
  rxn_heart_reactors: new Set<string>(),
  rxn_party_count: 0,
  rxn_party_reactors: new Set<string>(),
  rxn_laugh_count: 0,
  rxn_laugh_reactors: new Set<string>(),
  rxn_thinking_count: 0,
  rxn_thinking_reactors: new Set<string>(),
  rxn_eyes_count: 0,
  rxn_eyes_reactors: new Set<string>(),
};

beforeEach(() => {
  ddbMock.reset();
  // Default: ban check passes (no Item returned), UpdateCommand resolves with toggle-on attributes
  ddbMock.on(GetCommand).resolves({ Item: undefined });
  ddbMock.on(UpdateCommand).resolves({ Attributes: TOGGLE_ON_ATTRIBUTES });
});

describe("handleReact — toggle on", () => {
  it("returns REACTION_UPDATED event type and correct sessionCode", async () => {
    const result = await handleReact({
      sessionCode: "482913",
      targetId: "q-123",
      targetType: "QUESTION",
      emoji: "thumbsup",
      fingerprint: VALID_FINGERPRINT,
    });

    expect(result.eventType).toBe("REACTION_UPDATED");
    expect(result.sessionCode).toBe("482913");
  });

  it("payload contains counts object with all 6 emoji keys", async () => {
    const result = await handleReact({
      sessionCode: "482913",
      targetId: "q-123",
      targetType: "QUESTION",
      emoji: "thumbsup",
      fingerprint: VALID_FINGERPRINT,
    });

    const payload = JSON.parse(result.payload as string);
    expect(payload.counts).toBeDefined();
    expect(typeof payload.counts.thumbsup).toBe("number");
    expect(typeof payload.counts.heart).toBe("number");
    expect(typeof payload.counts.party).toBe("number");
    expect(typeof payload.counts.laugh).toBe("number");
    expect(typeof payload.counts.thinking).toBe("number");
    expect(typeof payload.counts.eyes).toBe("number");
  });

  it("payload contains reactedByMe with toggled emoji set to true", async () => {
    const result = await handleReact({
      sessionCode: "482913",
      targetId: "q-123",
      targetType: "QUESTION",
      emoji: "thumbsup",
      fingerprint: VALID_FINGERPRINT,
    });

    const payload = JSON.parse(result.payload as string);
    expect(payload.reactedByMe).toBeDefined();
    expect(payload.reactedByMe.thumbsup).toBe(true);
  });

  it("payload contains targetId, targetType, and emoji", async () => {
    const result = await handleReact({
      sessionCode: "482913",
      targetId: "q-123",
      targetType: "QUESTION",
      emoji: "thumbsup",
      fingerprint: VALID_FINGERPRINT,
    });

    const payload = JSON.parse(result.payload as string);
    expect(payload.targetId).toBe("q-123");
    expect(payload.targetType).toBe("QUESTION");
    expect(payload.emoji).toBe("thumbsup");
  });

  it("works for targetType QUESTION — SK is QUESTION#id", async () => {
    await handleReact({
      sessionCode: "482913",
      targetId: "q-abc",
      targetType: "QUESTION",
      emoji: "heart",
      fingerprint: VALID_FINGERPRINT,
    });

    // Find the reaction item UpdateCommand — PK starts with SESSION# (not RATELIMIT#)
    const calls = ddbMock.commandCalls(UpdateCommand);
    const reactionCall = calls.find((c) => {
      const pk = c.args[0].input.Key?.PK as string | undefined;
      return pk?.startsWith("SESSION#");
    });
    expect(reactionCall).toBeDefined();
    expect(reactionCall!.args[0].input.Key?.SK).toBe("QUESTION#q-abc");
  });

  it("works for targetType REPLY — SK is REPLY#id", async () => {
    await handleReact({
      sessionCode: "482913",
      targetId: "r-xyz",
      targetType: "REPLY",
      emoji: "party",
      fingerprint: VALID_FINGERPRINT,
    });

    // Find the reaction item UpdateCommand — PK starts with SESSION# (not RATELIMIT#)
    const calls = ddbMock.commandCalls(UpdateCommand);
    const reactionCall = calls.find((c) => {
      const pk = c.args[0].input.Key?.PK as string | undefined;
      return pk?.startsWith("SESSION#");
    });
    expect(reactionCall).toBeDefined();
    expect(reactionCall!.args[0].input.Key?.SK).toBe("REPLY#r-xyz");
  });
});

describe("handleReact — toggle off", () => {
  it("when toggle-on throws ConditionalCheckFailedException, sends toggle-off UpdateCommand", async () => {
    // UpdateCommand call order:
    //   1. rate limit check (resolves OK)
    //   2. toggle-on attempt (CCF → triggers toggle-off)
    //   3. toggle-off (resolves OK)
    ddbMock
      .on(UpdateCommand)
      .resolvesOnce({}) // rate limit passes
      .rejectsOnce(new ConditionalCheckFailedException({ message: "cond", $metadata: {} }))
      .resolvesOnce({ Attributes: TOGGLE_OFF_ATTRIBUTES });

    await handleReact({
      sessionCode: "482913",
      targetId: "q-123",
      targetType: "QUESTION",
      emoji: "thumbsup",
      fingerprint: VALID_FINGERPRINT,
    });

    // Should have received exactly 3 UpdateCommands: rate-limit + toggle-on attempt + toggle-off
    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(3);

    // Third call is toggle-off — expression uses DELETE
    const toggleOffInput = updateCalls[2].args[0].input;
    expect(toggleOffInput.UpdateExpression).toContain("DELETE");
  });

  it("toggle-off result has reactedByMe[emoji] set to false", async () => {
    ddbMock
      .on(UpdateCommand)
      .resolvesOnce({}) // rate limit passes
      .rejectsOnce(new ConditionalCheckFailedException({ message: "cond", $metadata: {} }))
      .resolvesOnce({ Attributes: TOGGLE_OFF_ATTRIBUTES });

    const result = await handleReact({
      sessionCode: "482913",
      targetId: "q-123",
      targetType: "QUESTION",
      emoji: "thumbsup",
      fingerprint: VALID_FINGERPRINT,
    });

    const payload = JSON.parse(result.payload as string);
    expect(payload.reactedByMe.thumbsup).toBe(false);
  });

  it("when toggle-off also throws CCF (race condition no-op), returns without error", async () => {
    // Call order: rate-limit (OK), toggle-on (CCF), toggle-off (CCF) → idempotent no-op
    ddbMock
      .on(UpdateCommand)
      .resolvesOnce({}) // rate limit passes
      .rejectsOnce(new ConditionalCheckFailedException({ message: "cond", $metadata: {} }))
      .rejectsOnce(new ConditionalCheckFailedException({ message: "cond", $metadata: {} }));

    // Should resolve without throwing
    const result = await handleReact({
      sessionCode: "482913",
      targetId: "q-123",
      targetType: "QUESTION",
      emoji: "thumbsup",
      fingerprint: VALID_FINGERPRINT,
    });

    expect(result.eventType).toBe("REACTION_UPDATED");
    const payload = JSON.parse(result.payload as string);
    // No-op: reactedByMe for toggled emoji is false
    expect(payload.reactedByMe.thumbsup).toBe(false);
  });
});

describe("handleReact — validation", () => {
  it("rejects invalid emoji key with INVALID_EMOJI error", async () => {
    await expect(
      handleReact({
        sessionCode: "482913",
        targetId: "q-123",
        targetType: "QUESTION",
        emoji: "fire",
        fingerprint: VALID_FINGERPRINT,
      }),
    ).rejects.toThrow("INVALID_EMOJI");
  });

  it("rejects banned participant with PARTICIPANT_BANNED error", async () => {
    ddbMock.on(GetCommand).resolves({ Item: { isBanned: true } });

    await expect(
      handleReact({
        sessionCode: "482913",
        targetId: "q-123",
        targetType: "QUESTION",
        emoji: "thumbsup",
        fingerprint: VALID_FINGERPRINT,
      }),
    ).rejects.toThrow("PARTICIPANT_BANNED");
  });

  it("rate limit call uses reaction# namespace — UpdateCommand PK contains RATELIMIT#reaction#", async () => {
    // Make the rate limit UpdateCommand fail to capture it before the actual reaction update
    // The rate limit UpdateCommand fires before the reaction-item UpdateCommand
    // We capture all UpdateCommand calls and verify the first one (rate limit) uses correct PK
    ddbMock.on(UpdateCommand).resolves({ Attributes: TOGGLE_ON_ATTRIBUTES });

    await handleReact({
      sessionCode: "482913",
      targetId: "q-123",
      targetType: "QUESTION",
      emoji: "thumbsup",
      fingerprint: VALID_FINGERPRINT,
    });

    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    // First UpdateCommand is the rate limit check
    const rateLimitCall = updateCalls[0];
    const pk = rateLimitCall.args[0].input.Key?.PK as string;
    expect(pk).toContain("RATELIMIT#reaction#");
    expect(pk).toContain(VALID_FINGERPRINT);
  });
});

describe("handleReact — privacy", () => {
  it("response payload does not contain any key matching 'reactors' or 'rxn_*_reactors'", async () => {
    const result = await handleReact({
      sessionCode: "482913",
      targetId: "q-123",
      targetType: "QUESTION",
      emoji: "thumbsup",
      fingerprint: VALID_FINGERPRINT,
    });

    const payloadStr = result.payload as string;
    // The serialized payload string must not contain "reactors" key references
    const payloadObj = JSON.parse(payloadStr);
    const payloadKeys = Object.keys(payloadObj);
    expect(payloadKeys).not.toContain("reactors");
    // No rxn_*_reactors flat attributes in payload
    const hasReactorKey = payloadKeys.some((k) => k.endsWith("_reactors"));
    expect(hasReactorKey).toBe(false);
    // The raw JSON string should not expose reactors Set data
    expect(payloadStr).not.toContain("_reactors");
  });

  it("counts values are non-negative (Math.max guard)", async () => {
    // Return negative count to verify Math.max(0, ...) guard
    ddbMock.on(UpdateCommand).resolves({
      Attributes: {
        ...TOGGLE_ON_ATTRIBUTES,
        rxn_thumbsup_count: -1, // Simulates data integrity issue
      },
    });

    const result = await handleReact({
      sessionCode: "482913",
      targetId: "q-123",
      targetType: "QUESTION",
      emoji: "thumbsup",
      fingerprint: VALID_FINGERPRINT,
    });

    const payload = JSON.parse(result.payload as string);
    // Math.max(0, -1) = 0
    expect(payload.counts.thumbsup).toBeGreaterThanOrEqual(0);
  });
});

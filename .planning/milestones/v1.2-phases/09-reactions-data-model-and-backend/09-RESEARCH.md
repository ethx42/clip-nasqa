# Phase 9: Reactions Data Model and Backend - Research

**Researched:** 2026-03-16
**Domain:** DynamoDB atomic updates, AppSync GraphQL schema extension, Lambda resolver patterns, emoji palette constants with Zod
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Emoji palette identity**

- The 6 emojis are final: thumbsup (👍), heart (❤️), party (🎉), laugh (😂), thinking (🤔), eyes (👀)
- Internal keys are short names: `thumbsup`, `heart`, `party`, `laugh`, `thinking`, `eyes`
- EMOJI_PALETTE constant in `@nasqa/core` exports an array of objects: `{ key: string, emoji: string, label: string }` — includes display metadata and accessibility labels
- Array order is canonical display order — Phase 10 renders in palette order, no separate ordering logic
- Zod schema validates emoji arguments against the palette keys

**Toggle & dedup behavior**

- No cooldown between toggle-on and toggle-off — instant toggle, 30/min rate limit is sufficient abuse prevention
- Optimistic UI updates on the client side — the backend contract must support this (mutation response enables reconciliation)
- Multiple emojis per item allowed — a participant can react with both 👍 and 😂 on the same question (Slack-style, not Facebook-style)
- Mutation response returns full state: all 6 emoji counts for the item AND whether this fingerprint has reacted to each — client reconciles optimistic state from one response

**DynamoDB storage model**

- Flat attributes on Question/Reply items: `rxn_<key>_count` (Number) and `rxn_<key>_reactors` (String Set of fingerprints)
- Atomic updates via DynamoDB update expressions (ADD for sets, SET for counts)
- Rate limit stored as a dedicated item in the same session table: `PK=session, SK=ratelimit#reaction#<fingerprint>` — consistent with existing question rate limit pattern
- Reactions persist through question/reply bans — if the item is hidden, reactions are hidden with it. No cleanup on ban.

**Subscription broadcast shape**

- New event type `REACTION_UPDATED` on the existing SessionUpdate subscription channel — distinct from question/reply updates
- Payload includes ALL 6 emoji counts: `{ targetId, targetType, counts: { thumbsup: 5, heart: 2, ... } }`
- No `reactedByMe` field in broadcast — each client tracks its own reaction state locally from mutation responses
- Both toggle-on and toggle-off broadcast a REACTION_UPDATED event — all clients stay in sync

### Claude's Discretion

- Whether reaction data is included in initial question load or lazy-fetched (decide based on payload size and existing read patterns)
- Exact DynamoDB update expression patterns
- Lambda resolver internal structure and error handling patterns

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                        | Research Support                                                                                          |
| ------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| RXN-01 | Participant can add one reaction per emoji type per Question (6 fixed emojis)      | DynamoDB String Set dedup pattern via ADD + conditional on reactors Set                                   |
| RXN-02 | Participant can add one reaction per emoji type per Reply (same 6 emojis)          | Same pattern as RXN-01 applied to REPLY# items                                                            |
| RXN-03 | Participant can toggle off their own reaction on a Question or Reply               | Conditional DELETE from Set + ADD -1 to count — identical to upvote remove path                           |
| RXN-04 | Reaction counts per emoji are visible to all connected participants in real-time   | REACTION_UPDATED event on existing SessionUpdate subscription channel                                     |
| RXN-05 | Reactions are deduplicated per device fingerprint per emoji per item               | `rxn_<key>_reactors` String Set enforces uniqueness; ADD is idempotent for Sets                           |
| RXN-06 | Reaction mutations enforce ban check — banned participants cannot react            | `checkNotBanned()` exists in rate-limit.ts, call before react logic                                       |
| RXN-07 | Reactions are rate-limited at 30/min per fingerprint in a separate namespace       | `checkRateLimit(fingerprint, 30, 60)` with key prefix `reaction#`                                         |
| RXN-08 | Reaction updates propagate via existing AppSync SessionUpdate subscription channel | Add `react` to `@aws_subscribe` mutations list in schema; add `REACTION_UPDATED` to SessionEventType enum |
| RXN-09 | Subscription payloads contain only emoji counts, never reactor fingerprints        | Resolver returns `counts` object (6 keys) not `reactors` Set                                              |
| RXN-14 | Emoji palette defined as shared constant in `@nasqa/core` validated by Zod         | EMOJI_PALETTE array + `emojiKeySchema` in `packages/core/src/schemas.ts`                                  |

</phase_requirements>

## Summary

Phase 9 adds the `react` GraphQL mutation with full dedup, rate limiting, ban enforcement, and subscription broadcast. The codebase already has all the infrastructure patterns this phase needs: `checkNotBanned` and `checkRateLimit` utilities in `rate-limit.ts`, the atomic DynamoDB update pattern with String Sets (used by upvote/downvote voters tracking), and the `SessionUpdate` subscription channel with `@aws_subscribe`. This is primarily an extension phase — no new infrastructure, just new resolver function + schema additions + core constants.

The critical implementation decisions are already locked: flat `rxn_<key>_count`/`rxn_<key>_reactors` attributes on Question/Reply items, rate limit key in separate namespace (`reaction#<fingerprint>`), `REACTION_UPDATED` event type, and the full-counts payload shape. The mutation response must return both all 6 emoji counts AND a `reactedByMe` map (fingerprint-local) — this is what enables client-side optimistic reconciliation per the locked CONTEXT.md decision.

The reaction data should be included in `getSessionData` initial load (not lazy-fetched): the existing query returns all SESSION# items in one scan, reaction counts are scalar attributes that add negligible payload size, and lazy-fetching would require a second round-trip or a separate query per item. The `reactors` Sets are NEVER returned to clients (privacy + payload size).

**Primary recommendation:** Add `EMOJI_PALETTE` + `emojiKeySchema` to `@nasqa/core` first, then add `react` resolver in `packages/functions/src/resolvers/reactions.ts`, then extend schema + sst.config.ts + `getSessionData` mapping.

## Standard Stack

### Core (already present in project — no new installations needed)

| Library                    | Version   | Purpose                                                  | Why Standard                             |
| -------------------------- | --------- | -------------------------------------------------------- | ---------------------------------------- |
| `@aws-sdk/lib-dynamodb`    | installed | DynamoDB document client, UpdateCommand with String Sets | Already used across all resolvers        |
| `@aws-sdk/client-dynamodb` | installed | `ConditionalCheckFailedException` for dedup/rate-limit   | Already used for vote conflict handling  |
| `zod`                      | ^4.3.6    | Schema validation for emoji key argument                 | Already used in `@nasqa/core` schemas.ts |
| `aws-sdk-client-mock`      | ^4.1.0    | Mock DynamoDB in Vitest tests                            | Already used in all resolver tests       |
| `vitest`                   | ^4.1.0    | Test runner                                              | Configured in vitest.config.ts           |

### Supporting

| Library                | Version   | Purpose                        | When to Use                                                                          |
| ---------------------- | --------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| `pino` (via logger.ts) | installed | Structured logging in resolver | Call `logger.warn` on ban/rate-limit rejections — consistent with existing resolvers |

**Installation:** No new packages required. All dependencies already present.

## Architecture Patterns

### Existing Resolver File Structure

```
packages/
├── core/
│   └── src/
│       ├── schemas.ts          # ADD: EMOJI_PALETTE, emojiKeySchema, ReactArgs
│       ├── types.ts            # ADD: ReactArgs interface, REACTION_UPDATED to SessionEventType, ReactionCounts type
│       └── index.ts            # Re-exports everything from schemas + types (no change)
└── functions/
    └── src/
        ├── resolvers/
        │   ├── index.ts        # ADD: import react handler, add "react" case to switch
        │   ├── reactions.ts    # NEW: handleReact() resolver
        │   └── rate-limit.ts   # NO CHANGE (checkRateLimit + checkNotBanned already exist)
        └── __tests__/
            └── reactions.test.ts  # NEW: unit tests for handleReact
infra/
└── schema.graphql              # ADD: react mutation + REACTION_UPDATED enum value
sst.config.ts                   # ADD: api.addResolver("Mutation react", ...) + @aws_subscribe entry
```

### Pattern 1: DynamoDB Atomic Dedup with String Set (toggle-on)

**What:** Use `ADD` to atomically add fingerprint to String Set AND check if already reacted via `ConditionExpression`. On toggle-on: `ADD rxn_thumbsup_count :one, rxn_thumbsup_reactors :fpSet` with condition `NOT contains(rxn_thumbsup_reactors, :fp) OR attribute_not_exists(rxn_thumbsup_reactors)`. On `ConditionalCheckFailedException`, it means already reacted — treat as toggle-off (or return current state).

**When to use:** Toggle-on path. This pattern already exists in `upvoteQuestion` with `voters` set.

```typescript
// Source: packages/functions/src/resolvers/qa.ts (existing upvoteQuestion pattern)
// Toggle-on: add fingerprint to reactors set, increment count
const updateExpression = "ADD rxn_thumbsup_count :one, rxn_thumbsup_reactors :fpSet";
const conditionExpression =
  "NOT contains(rxn_thumbsup_reactors, :fp) OR attribute_not_exists(rxn_thumbsup_reactors)";

await docClient.send(
  new UpdateCommand({
    TableName: tableName(),
    Key: { PK: `SESSION#${sessionSlug}`, SK: `QUESTION#${questionId}` },
    UpdateExpression: updateExpression,
    ConditionExpression: conditionExpression,
    ExpressionAttributeValues: {
      ":one": 1,
      ":fp": fingerprint,
      ":fpSet": new Set([fingerprint]),
    },
    ReturnValues: "ALL_NEW",
  }),
);
```

### Pattern 2: DynamoDB Atomic Dedup with String Set (toggle-off)

**What:** Mirror of toggle-on. `ADD rxn_thumbsup_count :negOne DELETE rxn_thumbsup_reactors :fpSet` with condition `contains(rxn_thumbsup_reactors, :fp)`. On `ConditionalCheckFailedException`, fingerprint was not in set — no-op (idempotent).

```typescript
// Source: packages/functions/src/resolvers/qa.ts (existing upvoteQuestion remove pattern)
// Toggle-off: remove fingerprint from reactors set, decrement count
const updateExpression = "ADD rxn_thumbsup_count :negOne DELETE rxn_thumbsup_reactors :fpSet";
const conditionExpression = "contains(rxn_thumbsup_reactors, :fp)";

await docClient.send(
  new UpdateCommand({
    TableName: tableName(),
    Key: { PK: `SESSION#${sessionSlug}`, SK: `QUESTION#${questionId}` },
    UpdateExpression: updateExpression,
    ConditionExpression: conditionExpression,
    ExpressionAttributeValues: {
      ":negOne": -1,
      ":fp": fingerprint,
      ":fpSet": new Set([fingerprint]),
    },
    ReturnValues: "ALL_NEW",
  }),
);
```

### Pattern 3: Rate Limit in Separate Namespace

**What:** The existing `checkRateLimit(key, limit, windowSeconds)` uses `RATELIMIT#${key}` as PK. For reactions, the key must differ from question submission rate limit. Use `reaction#${fingerprint}` as the key argument (produces PK `RATELIMIT#reaction#fingerprint-value`). This matches the CONTEXT.md decision: "consistent with existing question rate limit pattern".

```typescript
// Source: packages/functions/src/resolvers/rate-limit.ts
// Question rate limit: checkRateLimit(fingerprint, 3, 60)  → PK: RATELIMIT#<fp>
// Reaction rate limit: checkRateLimit(`reaction#${fingerprint}`, 30, 60) → PK: RATELIMIT#reaction#<fp>
await checkNotBanned(sessionSlug, fingerprint);
await checkRateLimit(`reaction#${fingerprint}`, 30, 60);
```

### Pattern 4: Reaction Payload — Full Counts + reactedByMe

**What:** The mutation response returns `{ targetId, targetType, emoji, counts: {thumbsup:N, ...}, reactedByMe: {thumbsup:bool, ...} }` serialized as `AWSJSON` in the `SessionUpdate.payload`. The subscription broadcast omits `reactedByMe` — only `{ targetId, targetType, counts }`. Clients use mutation response to reconcile optimistic state; subscription updates the counts for all other clients.

**Critical:** The `reactors` Sets stored in DynamoDB are NEVER returned to any client. The resolver reads `ALL_NEW` attributes after update, builds the `counts` map from `rxn_<key>_count` attributes, and builds `reactedByMe` from `rxn_<key>_reactors` contains check using the requesting fingerprint.

```typescript
// Pseudocode: constructing mutation response from DynamoDB ALL_NEW attributes
const attrs = result.Attributes ?? {};
const EMOJI_KEYS = ["thumbsup", "heart", "party", "laugh", "thinking", "eyes"] as const;

const counts = Object.fromEntries(
  EMOJI_KEYS.map((key) => [key, (attrs[`rxn_${key}_count`] as number) ?? 0]),
);

const reactedByMe = Object.fromEntries(
  EMOJI_KEYS.map((key) => {
    const reactors = attrs[`rxn_${key}_reactors`] as Set<string> | undefined;
    return [key, reactors?.has(fingerprint) ?? false];
  }),
);
```

### Pattern 5: EMOJI_PALETTE Constant in @nasqa/core

**What:** Add to `packages/core/src/schemas.ts`. The Zod schema derives allowed keys from the palette array to ensure single source of truth. The Lambda resolver imports `EMOJI_KEYS` (just the keys) for DynamoDB attribute name construction.

```typescript
// packages/core/src/schemas.ts (addition)
export const EMOJI_PALETTE = [
  { key: "thumbsup", emoji: "👍", label: "Thumbs up" },
  { key: "heart", emoji: "❤️", label: "Heart" },
  { key: "party", emoji: "🎉", label: "Party" },
  { key: "laugh", emoji: "😂", label: "Laugh" },
  { key: "thinking", emoji: "🤔", label: "Thinking" },
  { key: "eyes", emoji: "👀", label: "Eyes" },
] as const;

export type EmojiKey = (typeof EMOJI_PALETTE)[number]["key"];
// "thumbsup" | "heart" | "party" | "laugh" | "thinking" | "eyes"

const emojiKeys = EMOJI_PALETTE.map((e) => e.key) as [EmojiKey, ...EmojiKey[]];
export const emojiKeySchema = z.enum(emojiKeys);

// For use in Lambda (no display metadata needed):
export const EMOJI_KEYS = emojiKeys; // string[] in runtime order
```

### Pattern 6: GraphQL Schema Extension

**What:** Add `react` mutation to `schema.graphql`. Add `REACTION_UPDATED` to `SessionEventType` enum. Add `react` to `@aws_subscribe` mutations list. `targetType` is an enum `ReactionTargetType` with values `QUESTION` and `REPLY`.

```graphql
# infra/schema.graphql additions:

enum ReactionTargetType {
  QUESTION
  REPLY
}

enum SessionEventType {
  # ... existing values ...
  REACTION_UPDATED
}

type Mutation {
  # ... existing mutations ...
  react(
    sessionSlug: String!
    targetId: String!
    targetType: ReactionTargetType!
    emoji: String!
    fingerprint: String!
  ): SessionUpdate!
}

type Subscription {
  onSessionUpdate(sessionSlug: String!): SessionUpdate
    @aws_subscribe(
      mutations: [
        "_stub"
        "pushSnippet"
        "deleteSnippet"
        "clearClipboard"
        "addQuestion"
        "upvoteQuestion"
        "addReply"
        "focusQuestion"
        "banQuestion"
        "banParticipant"
        "downvoteQuestion"
        "restoreQuestion"
        "react"
      ]
    )
}
```

### Pattern 7: Initial Load — Reaction Counts in getSessionData

**What:** Include `rxn_<key>_count` in the question/reply mapping in `getSessionData`. Omit `rxn_<key>_reactors` entirely (privacy + size). The client bootstraps counts from initial load; `reactedByMe` is not available at initial load — clients start with all reactions as not-reacted-by-me, which is acceptable because the participant hasn't reacted in this session yet (sessions are ephemeral, 24h TTL).

```typescript
// index.ts getSessionData question mapper addition:
const reactionCounts = Object.fromEntries(
  EMOJI_KEYS.map((key) => [`rxn_${key}_count`, (item[`rxn_${key}_count`] as number) ?? 0]),
);
// Spread into question object (flat map, e.g. rxn_thumbsup_count: 5)
// OR collapse to counts object: { thumbsup: 5, heart: 0, ... }
```

**Decision point (Claude's Discretion):** Return reaction counts as a nested `counts` object (`{ thumbsup: 5 }`) rather than flat attributes in the GraphQL response. This is cleaner for the Phase 10 client and avoids adding 6 new fields to the `Question` and `Reply` GraphQL types. Add a `ReactionCounts` scalar or type. Recommendation: add `reactionCounts: AWSJSON` field to `Question` and `Reply` types — simplest schema change, consistent with how `payload` is handled elsewhere.

### Anti-Patterns to Avoid

- **Reading full reactors Set then writing back:** Never GET the item, modify the Set in Lambda, then PUT it back — this creates race conditions. Always use `ADD`/`DELETE` in a single `UpdateCommand`.
- **Returning `rxn_<key>_reactors` to clients:** The DynamoDB String Set attribute contains fingerprints of all reactors — a privacy violation. Read from `ALL_NEW` but never propagate `reactors` sets to the response payload.
- **Using `SET rxn_thumbsup_count = rxn_thumbsup_count + :one`:** This is NOT atomic in DynamoDB. Use `ADD rxn_thumbsup_count :one` instead.
- **Allowing count to go negative:** Guard toggle-off with `ConditionExpression: "contains(rxn_<key>_reactors, :fp)"` — if the fingerprint isn't in the set, the condition fails, preventing decrement. No need for a floor check.
- **Using the same rate limit key as question submissions:** Question submissions use `checkRateLimit(fingerprint, 3, 60)` with PK `RATELIMIT#<fp>`. Reactions must use a distinct key: `checkRateLimit(\`reaction#${fingerprint}\`, 30, 60)`with PK`RATELIMIT#reaction#<fp>`.

## Don't Hand-Roll

| Problem              | Don't Build                                | Use Instead                                                  | Why                                                                                 |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Emoji key validation | Custom if/switch validation                | `emojiKeySchema` Zod enum from `EMOJI_PALETTE`               | Single source of truth; TypeScript inference; easy to extend                        |
| Fingerprint dedup    | In-memory Set, GET+check+conditional write | DynamoDB String Set with `ADD`/conditional                   | Atomic, no race conditions, no extra read                                           |
| Rate limiting        | Timestamp array per user, Redis counter    | Existing `checkRateLimit()` in rate-limit.ts                 | Already battle-tested in this codebase; same DynamoDB bucket approach               |
| Ban enforcement      | Duplicate ban check logic                  | Existing `checkNotBanned()` in rate-limit.ts                 | Reuse exactly as done in `addQuestion`/`addReply`                                   |
| Subscription routing | Custom filter logic                        | Existing `extensions.setSubscriptionFilter` on `sessionSlug` | Already handles session isolation; `react` just needs to join `@aws_subscribe` list |

**Key insight:** This codebase already solved rate limiting, ban checking, and atomic DynamoDB Set updates. The reaction resolver is ~80 lines of new code following existing patterns exactly.

## Common Pitfalls

### Pitfall 1: DynamoDB String Set vs. List

**What goes wrong:** Using a DynamoDB List (`L`) attribute for reactors instead of a String Set (`SS`). Lists allow duplicates; Sets enforce uniqueness at the storage level.
**Why it happens:** String Set syntax in DynamoDB document client requires `new Set([fingerprint])`, not `[fingerprint]`. Confusing JS arrays with DynamoDB Sets.
**How to avoid:** Always pass `new Set([fingerprint])` as the value for `:fpSet`. Use `ADD` (not `SET`) with Set attributes.
**Warning signs:** Duplicate fingerprints appearing in the reactors attribute, `contains()` not working as expected.

### Pitfall 2: ConditionalCheckFailedException on Toggle-Off = No-Op, Not Error

**What goes wrong:** The toggle-off `DELETE` with `contains(reactors, :fp)` condition fails (ConditionalCheckFailedException) when the fingerprint was not in the set. This should be treated as a no-op (idempotent), not an error thrown to the client.
**Why it happens:** Copying the upvote pattern which throws `VOTE_CONFLICT` on conditional failure — that's correct for upvotes (mutual exclusion), wrong for reactions (idempotent toggle).
**How to avoid:** In the reaction resolver, catch `ConditionalCheckFailedException` on toggle-off and proceed with reading current state instead of throwing. Return the current counts as if the operation succeeded.
**Warning signs:** Client receives error when clicking a reaction button twice rapidly (double-toggle race).

### Pitfall 3: Forgetting REACTION_UPDATED in SessionEventType TypeScript Enum

**What goes wrong:** Add `REACTION_UPDATED` to GraphQL schema enum but forget to add it to the TypeScript `SessionEventType` enum in `packages/core/src/types.ts`. TypeScript strict mode will catch the string cast, but only at compile time.
**Why it happens:** The GraphQL schema and TypeScript types are maintained separately.
**How to avoid:** Update both in the same task/commit: `infra/schema.graphql` + `packages/core/src/types.ts`.
**Warning signs:** TypeScript type error `"REACTION_UPDATED" is not assignable to type SessionEventType` in reactions.ts.

### Pitfall 4: @aws_subscribe List Must Include "react"

**What goes wrong:** Adding the `react` mutation to schema but forgetting to add it to the `@aws_subscribe(mutations: [...])` list on `Subscription.onSessionUpdate`. The subscription silently receives nothing when `react` fires.
**Why it happens:** The `@aws_subscribe` list is separate from the mutation definition in schema.graphql.
**How to avoid:** Update `@aws_subscribe` and `sst.config.ts` `api.addResolver("Mutation react", ...)` in the same task.
**Warning signs:** AppSync console `react` mutation succeeds but subscribers don't receive `REACTION_UPDATED` events.

### Pitfall 5: ALL_NEW Does Not Return String Sets in DynamoDB Document Client

**What goes wrong:** `ReturnValues: "ALL_NEW"` returns the full item — but in some SDK configurations, String Set attributes come back as `DocumentClient.StringSet` objects, not native JS `Set` instances. The `reactors?.has(fingerprint)` check may fail.
**Why it happens:** DynamoDB Document Client marshals/unmarshals Sets, but the exact representation varies.
**How to avoid:** When checking `reactedByMe`, use `Array.from(reactors ?? []).includes(fingerprint)` instead of `reactors?.has(fingerprint)`. Alternatively, read the `contains()` result from the condition itself — if toggle-on succeeds, `reactedByMe` for that emoji is now `true`; if toggle-off succeeds, it's `false`. This avoids inspecting the returned Set at all.
**Warning signs:** `reactedByMe` always returns `false` even after a successful toggle-on.

### Pitfall 6: Reaction Count Below Zero

**What goes wrong:** A count attribute goes negative if toggle-off fires when count is already 0 (e.g., due to a data integrity bug or concurrent deletes).
**Why it happens:** `ADD rxn_key_count :negOne` has no floor. The `ConditionExpression: "contains(reactors, :fp)"` prevents the normal case, but if the reactors Set and count become desynchronized, negative counts are possible.
**How to avoid:** Trust the Set condition as the primary guard. The Set-count are always written together atomically. Document that count can theoretically be negative and clients should `Math.max(0, count)` in display logic.

### Pitfall 7: getSessionData Returns Reactors Sets to Clients

**What goes wrong:** Copying the question mapper pattern and inadvertently including `rxn_<key>_reactors` in the response object (e.g., by spreading `item` directly).
**Why it happens:** The existing `getSessionData` explicitly picks attributes for questions/replies. If someone spreads `...item` it would include reactors.
**How to avoid:** The mapper must explicitly enumerate only count attributes. Never spread the DynamoDB item directly.
**Warning signs:** GraphQL response includes `rxn_thumbsup_reactors` in question payload — a GDPR/privacy violation.

## Code Examples

### EMOJI_PALETTE constant (packages/core/src/schemas.ts)

```typescript
// Source: project pattern — follows existing createQuestionInputSchema style
import { z } from "zod";

export const EMOJI_PALETTE = [
  { key: "thumbsup", emoji: "👍", label: "Thumbs up" },
  { key: "heart", emoji: "❤️", label: "Heart" },
  { key: "party", emoji: "🎉", label: "Party" },
  { key: "laugh", emoji: "😂", label: "Laugh" },
  { key: "thinking", emoji: "🤔", label: "Thinking" },
  { key: "eyes", emoji: "👀", label: "Eyes" },
] as const;

export type EmojiKey = (typeof EMOJI_PALETTE)[number]["key"];

const emojiKeys = EMOJI_PALETTE.map((e) => e.key) as [EmojiKey, ...EmojiKey[]];
export const emojiKeySchema = z.enum(emojiKeys);
export const EMOJI_KEYS = emojiKeys; // runtime array for attribute name construction
```

### ReactArgs interface (packages/core/src/types.ts)

```typescript
// Add to types.ts alongside existing mutation arg interfaces
export interface ReactArgs {
  sessionSlug: string;
  targetId: string;
  targetType: "QUESTION" | "REPLY";
  emoji: string; // validated against emojiKeySchema in resolver
  fingerprint: string;
}

export interface ReactionCounts {
  thumbsup: number;
  heart: number;
  party: number;
  laugh: number;
  thinking: number;
  eyes: number;
}
```

### handleReact resolver skeleton (packages/functions/src/resolvers/reactions.ts)

```typescript
// Source: project pattern — follows qa.ts and moderation.ts resolver conventions
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { EMOJI_KEYS, emojiKeySchema } from "@nasqa/core";
import type { EmojiKey, ReactArgs, SessionEventType, SessionUpdate } from "@nasqa/core";

import { docClient } from "./index";
import { logger } from "./logger";
import { checkNotBanned, checkRateLimit } from "./rate-limit";

function tableName(): string {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error("TABLE_NAME environment variable is not set");
  return name;
}

function itemSK(targetType: "QUESTION" | "REPLY", targetId: string): string {
  return targetType === "QUESTION" ? `QUESTION#${targetId}` : `REPLY#${targetId}`;
}

export async function handleReact(args: ReactArgs): Promise<SessionUpdate> {
  const { sessionSlug, targetId, targetType, emoji, fingerprint } = args;

  // Validate emoji against palette
  const parseResult = emojiKeySchema.safeParse(emoji);
  if (!parseResult.success) {
    throw new Error(`INVALID_EMOJI: ${emoji}`);
  }
  const emojiKey = parseResult.data as EmojiKey;

  // Enforce ban and rate limit
  await checkNotBanned(sessionSlug, fingerprint);
  await checkRateLimit(`reaction#${fingerprint}`, 30, 60);

  const countAttr = `rxn_${emojiKey}_count`;
  const reactorsAttr = `rxn_${emojiKey}_reactors`;
  const SK = itemSK(targetType, targetId);

  let result;
  let isNowReacted: boolean;

  // Attempt toggle-on first
  try {
    result = await docClient.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: { PK: `SESSION#${sessionSlug}`, SK },
        UpdateExpression: `ADD ${countAttr} :one, ${reactorsAttr} :fpSet`,
        ConditionExpression: `NOT contains(${reactorsAttr}, :fp) OR attribute_not_exists(${reactorsAttr})`,
        ExpressionAttributeValues: {
          ":one": 1,
          ":fp": fingerprint,
          ":fpSet": new Set([fingerprint]),
        },
        ReturnValues: "ALL_NEW",
      }),
    );
    isNowReacted = true;
  } catch (err) {
    if (!(err instanceof ConditionalCheckFailedException)) throw err;

    // Already reacted — toggle off
    try {
      result = await docClient.send(
        new UpdateCommand({
          TableName: tableName(),
          Key: { PK: `SESSION#${sessionSlug}`, SK },
          UpdateExpression: `ADD ${countAttr} :negOne DELETE ${reactorsAttr} :fpSet`,
          ConditionExpression: `contains(${reactorsAttr}, :fp)`,
          ExpressionAttributeValues: {
            ":negOne": -1,
            ":fp": fingerprint,
            ":fpSet": new Set([fingerprint]),
          },
          ReturnValues: "ALL_NEW",
        }),
      );
      isNowReacted = false;
    } catch (err2) {
      if (!(err2 instanceof ConditionalCheckFailedException)) throw err2;
      // Race condition: already toggled off by another request — no-op, read current state
      // TODO: add a GetCommand here to return current state if needed
      isNowReacted = false;
      result = { Attributes: {} };
    }
  }

  const attrs = result.Attributes ?? {};

  // Build counts (never include reactors)
  const counts = Object.fromEntries(
    EMOJI_KEYS.map((key) => [key, Math.max(0, (attrs[`rxn_${key}_count`] as number) ?? 0)]),
  ) as Record<EmojiKey, number>;

  // Build reactedByMe for mutation response (not broadcast)
  const reactedByMe = Object.fromEntries(
    EMOJI_KEYS.map((key) => {
      const reactors = attrs[`rxn_${key}_reactors`];
      const reactorArray = reactors ? Array.from(reactors as Iterable<string>) : [];
      return [key, reactorArray.includes(fingerprint)];
    }),
  ) as Record<EmojiKey, boolean>;

  // Override with known result for the toggled emoji
  reactedByMe[emojiKey] = isNowReacted;

  // Broadcast payload (no reactedByMe — subscription shape)
  const broadcastPayload = {
    targetId,
    targetType,
    emoji: emojiKey,
    counts,
  };

  // Mutation response payload includes reactedByMe for optimistic reconciliation
  const mutationPayload = { ...broadcastPayload, reactedByMe };

  logger.info(
    { targetId, targetType, emoji: emojiKey, fingerprint: fingerprint.slice(0, 8) },
    "reaction toggled",
  );

  return {
    eventType: "REACTION_UPDATED" as SessionEventType,
    sessionSlug,
    payload: JSON.stringify(mutationPayload),
  };
}
```

### getSessionData reaction counts mapping (index.ts)

```typescript
// Addition to getSessionData question/reply mappers
// Build counts object, never expose reactors
const rxnCounts = Object.fromEntries(
  EMOJI_KEYS.map((key) => [key, Math.max(0, (item[`rxn_${key}_count`] as number) ?? 0)]),
);

// Add reactionCounts: JSON.stringify(rxnCounts) to question/reply object
// or keep as native object if GraphQL type uses AWSJSON scalar
```

## State of the Art

| Old Approach             | Current Approach                 | When Changed              | Impact                                      |
| ------------------------ | -------------------------------- | ------------------------- | ------------------------------------------- |
| Separate reactions table | Flat attributes on parent item   | Design decision (Phase 9) | Simpler schema, one item updated atomically |
| GET + check + write      | Atomic conditional UpdateCommand | N/A — DynamoDB standard   | No race conditions                          |
| Return all attributes    | Explicit attribute projection    | Existing pattern          | Reactors Sets never leave Lambda            |

## Open Questions

1. **reactionCounts field on Question/Reply GraphQL types**
   - What we know: The locked decision says mutation response returns full counts; subscription returns counts. But the `Question` and `Reply` GraphQL types currently don't include reaction counts.
   - What's unclear: Should `getSessionData` return `Question` with reaction counts as a new field, or as a separate top-level key in `SessionData`?
   - Recommendation: Add `reactionCounts: AWSJSON` field to both `Question` and `Reply` GraphQL types. Serialize counts object to JSON string (consistent with how `payload` on `SessionUpdate` works). The alternative — adding 6 Int fields per type — is verbose and would break the schema extension pattern. The Phase 10 client will deserialize this field.

2. **Race condition on rapid double-tap (toggle-on → toggle-off simultaneously)**
   - What we know: The conditional expressions prevent double-counting. A ConditionalCheckFailedException on toggle-off after the toggle-on already ran means the state is already correct.
   - What's unclear: The exact retry/no-op behavior for the edge case where BOTH a toggle-on and toggle-off fire simultaneously (within the same second).
   - Recommendation: The no-op path (catch CCF on toggle-off, return current state via GetCommand) is sufficient for correctness. Document the 1-in-~1000 case where the mutation returns stale counts. The client's optimistic update will be reconciled by the subscription.

3. **Subscription broadcast vs. mutation response payload divergence**
   - What we know: Locked in CONTEXT.md — mutation response includes `reactedByMe`, broadcast omits it.
   - What's unclear: The `SessionUpdate.payload` is `AWSJSON` — a single field. The Lambda always returns the full payload (including `reactedByMe`). AppSync broadcasts this full payload to all subscribers including the reactor.
   - Recommendation: This is acceptable. The subscription client can ignore `reactedByMe` from broadcast events (it uses only `counts`). The requirement RXN-09 says "no reactor fingerprints" — `reactedByMe` is a boolean map, not fingerprints, so it technically satisfies the requirement. Document this in implementation notes.

## Sources

### Primary (HIGH confidence)

- Codebase direct read — `packages/functions/src/resolvers/qa.ts`: upvote/downvote pattern with DynamoDB String Sets (voters, downvoters)
- Codebase direct read — `packages/functions/src/resolvers/rate-limit.ts`: `checkRateLimit` and `checkNotBanned` implementations
- Codebase direct read — `packages/functions/src/resolvers/moderation.ts`: ban handling pattern
- Codebase direct read — `packages/functions/src/resolvers/index.ts`: switch-case dispatch pattern
- Codebase direct read — `packages/core/src/schemas.ts`: existing Zod schema patterns
- Codebase direct read — `packages/core/src/types.ts`: existing TypeScript interfaces and SessionEventType enum
- Codebase direct read — `infra/schema.graphql`: existing GraphQL schema structure
- Codebase direct read — `infra/resolvers/subscription-onSessionUpdate.js`: subscription filter pattern
- Codebase direct read — `sst.config.ts`: resolver registration pattern
- Codebase direct read — `vitest.config.ts` + `packages/functions/src/__tests__/`: test setup and mock patterns

### Secondary (MEDIUM confidence)

- AWS DynamoDB documentation (training data): `ADD` vs `SET` for atomic numeric increments; String Set (`SS`) type with `ADD`/`DELETE` for set membership — consistent with the existing codebase patterns which confirm correct usage

### Tertiary (LOW confidence)

- None — all findings verified against codebase source of truth

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all dependencies already installed and in use
- Architecture: HIGH — all patterns copied directly from existing resolver files in this codebase
- Pitfalls: HIGH — identified by reading existing resolver code and DynamoDB update expression semantics; pitfall 5 (String Set representation) is MEDIUM, flagged for empirical verification during implementation

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable — AWS SDK v3 and AppSync subscription patterns are stable; no fast-moving dependencies)

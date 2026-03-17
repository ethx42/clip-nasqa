---
phase: 09-reactions-data-model-and-backend
verified: 2026-03-16T21:15:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 9: Reactions Data Model and Backend Verification Report

**Phase Goal:** The `react` GraphQL mutation is live — participants can add and toggle emoji reactions on Questions and Replies, counts are deduplicated per device fingerprint, rate limiting and ban enforcement are active, and reaction updates broadcast to all connected clients via the existing subscription channel
**Verified:** 2026-03-16T21:15:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                               | Status   | Evidence                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | EMOJI_PALETTE constant exports 6 emoji objects with key, emoji, and label fields    | VERIFIED | `packages/core/src/schemas.ts` lines 31-38: 6-entry `as const` array with all three fields                                                                                  |
| 2   | emojiKeySchema validates only the 6 allowed emoji keys and rejects others           | VERIFIED | `schemas.ts` lines 42-45: `z.enum` derived from palette keys; 11 schema tests pass including invalid key cases                                                              |
| 3   | handleReact toggles a reaction on when fingerprint is not in reactors set           | VERIFIED | `reactions.ts` lines 43-58: `ADD ... NOT contains(...)` conditional; test "toggle on" suite (6 tests) passes                                                                |
| 4   | handleReact toggles a reaction off when fingerprint is already in reactors set      | VERIFIED | `reactions.ts` lines 62-85: CCF catch triggers DELETE conditional; toggle-off suite (3 tests) passes                                                                        |
| 5   | handleReact rejects banned participants with PARTICIPANT_BANNED error               | VERIFIED | `reactions.ts` line 32: `checkNotBanned` called before any DynamoDB write; ban test passes                                                                                  |
| 6   | handleReact enforces 30/min rate limit in reaction# namespace                       | VERIFIED | `reactions.ts` line 33: `checkRateLimit("reaction#" + fingerprint, 30, 60)`; rate-limit namespace test passes                                                               |
| 7   | handleReact returns counts for all 6 emojis plus reactedByMe map                    | VERIFIED | `reactions.ts` lines 90-101: `EMOJI_KEYS.map` builds both `counts` and `reactedByMe`; payload shape test passes                                                             |
| 8   | handleReact never returns reactor fingerprints in the response                      | VERIFIED | `reactions.ts` lines 118-128: payload contains only `counts`, `reactedByMe`, `targetId`, `targetType`, `emoji`; privacy test asserts `_reactors` absent from payload string |
| 9   | react mutation is registered in GraphQL schema and accepts all 5 required arguments | VERIFIED | `infra/schema.graphql` line 99: `react(sessionSlug, targetId, targetType, emoji, fingerprint): SessionUpdate!`                                                              |
| 10  | REACTION_UPDATED events broadcast via onSessionUpdate subscription                  | VERIFIED | `schema.graphql` line 104: `"react"` in `@aws_subscribe(mutations: [...])` list                                                                                             |
| 11  | getSessionData returns reaction counts for each question and reply                  | VERIFIED | `resolvers/index.ts` lines 68-72 and 86-90: `reactionCounts: JSON.stringify(...)` in both mappers                                                                           |
| 12  | Reactor fingerprints are never included in getSessionData responses                 | VERIFIED | `grep "reactors" resolvers/index.ts` returns no matches; no `rxn_*_reactors` attributes in either mapper                                                                    |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact                                             | Expected                                                       | Status   | Details                                                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `packages/core/src/schemas.ts`                       | EMOJI_PALETTE, EmojiKey, emojiKeySchema, EMOJI_KEYS            | VERIFIED | All 4 exports present; 49 lines; `as const`, Zod enum, runtime array all substantive                    |
| `packages/core/src/types.ts`                         | ReactArgs, ReactionCounts, REACTION_UPDATED                    | VERIFIED | `ReactArgs` at line 206, `ReactionCounts` at line 215, `REACTION_UPDATED` in enum at line 110           |
| `packages/functions/src/resolvers/reactions.ts`      | handleReact resolver function                                  | VERIFIED | 129 lines; full atomic toggle, ban, rate-limit, privacy logic; no stubs                                 |
| `infra/schema.graphql`                               | react mutation, ReactionTargetType, REACTION_UPDATED           | VERIFIED | All additions confirmed: enum, field on Question/Reply, mutation, subscription wiring                   |
| `sst.config.ts`                                      | Mutation react resolver registration                           | VERIFIED | Line 92: `api.addResolver("Mutation react", { dataSource: lambdaDS.name })`                             |
| `packages/functions/src/resolvers/index.ts`          | react case in handler switch, reactionCounts in getSessionData | VERIFIED | `handleReact` imported line 16, dispatched at `case "react"` line 150; `reactionCounts` in both mappers |
| `packages/functions/src/__tests__/reactions.test.ts` | handleReact unit tests (80+ lines)                             | VERIFIED | 322 lines; 14 tests across 4 describe blocks (toggle-on, toggle-off, validation, privacy)               |
| `packages/core/src/__tests__/schemas.test.ts`        | EMOJI_PALETTE and emojiKeySchema tests (20+ lines)             | VERIFIED | 220 lines total; 11 new reaction-specific tests added to existing suite                                 |

### Key Link Verification

| From                                | To                                    | Via                                         | Status | Details                                                                               |
| ----------------------------------- | ------------------------------------- | ------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| `resolvers/reactions.ts`            | `@nasqa/core` schemas                 | `import EMOJI_KEYS, emojiKeySchema`         | WIRED  | Line 4: `import { EMOJI_KEYS, emojiKeySchema } from "@nasqa/core"`                    |
| `resolvers/reactions.ts`            | `resolvers/rate-limit.ts`             | `checkRateLimit("reaction#" + fingerprint)` | WIRED  | Line 33: rate limit called with `reaction#` prefix; namespace test passes             |
| `sst.config.ts`                     | `infra/schema.graphql`                | `addResolver Mutation react`                | WIRED  | Line 92 in sst.config.ts; `react` mutation present in schema.graphql line 99          |
| `resolvers/index.ts`                | `resolvers/reactions.ts`              | `import handleReact`, dispatch in switch    | WIRED  | Line 16 imports; line 150 dispatches `case "react": result = await handleReact(args)` |
| `infra/schema.graphql` subscription | `infra/schema.graphql` react mutation | `"react"` in `@aws_subscribe` list          | WIRED  | Line 104: `"react"` present in the mutations array after `"restoreQuestion"`          |
| `reactions.test.ts`                 | `resolvers/reactions.ts`              | `import handleReact`                        | WIRED  | Line 6: `import { handleReact } from "../resolvers/reactions"`                        |

### Requirements Coverage

| Requirement | Source Plan         | Description                                                                | Status    | Evidence                                                                                                           |
| ----------- | ------------------- | -------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| RXN-01      | 09-01, 09-03        | Participant can add one reaction per emoji type per Question               | SATISFIED | `handleReact` handles `targetType: "QUESTION"`; QUESTION SK targeting tested                                       |
| RXN-02      | 09-01, 09-03        | Participant can add one reaction per emoji type per Reply                  | SATISFIED | `handleReact` handles `targetType: "REPLY"`; REPLY SK targeting tested                                             |
| RXN-03      | 09-01, 09-03        | Participant can toggle off their own reaction                              | SATISFIED | CCF catch triggers DELETE conditional; toggle-off tests (3 cases) pass                                             |
| RXN-04      | 09-02               | Reaction counts visible to all in real-time; getSessionData returns counts | SATISFIED | `reactionCounts` in both question/reply mappers; `"react"` in subscription list                                    |
| RXN-05      | 09-01, 09-03        | Reactions deduplicated per device fingerprint per emoji per item           | SATISFIED | `NOT contains(reactors, :fp)` condition on toggle-on; String Set atomic operation                                  |
| RXN-06      | 09-01, 09-03        | Ban check — banned participants cannot react                               | SATISFIED | `checkNotBanned` called first in `handleReact`; ban test passes                                                    |
| RXN-07      | 09-01, 09-03        | Rate limited at 30/min in separate namespace from question limits          | SATISFIED | `checkRateLimit("reaction#" + fingerprint, 30, 60)`; namespace test passes                                         |
| RXN-08      | 09-02               | Reaction updates propagate via existing AppSync subscription channel       | SATISFIED | `"react"` in `@aws_subscribe` mutations list; `sst.config.ts` registers resolver                                   |
| RXN-09      | 09-01, 09-02, 09-03 | Payload contains only counts, never reactor fingerprints                   | SATISFIED | Payload fields limited to counts/reactedByMe; privacy test asserts no `_reactors`; no reactors in `getSessionData` |
| RXN-14      | 09-01, 09-03        | Emoji palette defined as shared constant in `@nasqa/core` with Zod schema  | SATISFIED | `EMOJI_PALETTE` in `schemas.ts`; `EmojiKey` and `emojiKeySchema` derived from it                                   |

**Out-of-scope requirements (Phase 10):** RXN-10, RXN-11, RXN-12, RXN-13 — frontend components, not claimed by any Phase 9 plan.

**Not in scope for any milestone:** RXN-15, RXN-16 — future milestones per REQUIREMENTS.md.

No orphaned requirements: all 10 Phase 9 IDs are accounted for in plans.

### Anti-Patterns Found

None. All modified files are free of TODO/FIXME/placeholder comments, empty returns, and stub implementations.

### Human Verification Required

**1. AppSync subscription broadcast end-to-end**

**Test:** Open two browser sessions on the same session URL. From session A call the `react` mutation via the GraphQL API. Observe session B's subscription.
**Expected:** Session B receives a `REACTION_UPDATED` event with `payload` containing `targetId`, `targetType`, `emoji`, `counts`, and `reactedByMe`, without any `_reactors` keys.
**Why human:** The `@aws_subscribe` wiring is schema-level; correctness of AppSync event fan-out to all subscribers requires a live AppSync endpoint.

**2. DynamoDB String Set toggle atomicity under concurrent load**

**Test:** Concurrently call `react` with the same fingerprint and same emoji from two clients.
**Expected:** Exactly one of the two calls succeeds as toggle-on and the other either also succeeds (idempotent no-op via second CCF) or the second CCF race condition path is hit — neither should throw an uncaught error.
**Why human:** Mock-based unit tests cannot simulate true DynamoDB conditional expression race conditions; requires a live DynamoDB table.

## Verification Commits

| Commit  | Description                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| cb4d295 | feat(09-01): add EMOJI_PALETTE, emojiKeySchema, and reaction types to @nasqa/core                                  |
| 010bd19 | feat(09-01): implement handleReact resolver with atomic DynamoDB toggle                                            |
| 7f61b97 | test(09-03): add EMOJI_PALETTE, emojiKeySchema, and EMOJI_KEYS unit tests (also includes schema.graphql additions) |
| 6465109 | test(09-03): add handleReact resolver unit tests                                                                   |
| fddf929 | feat(09-02): wire react resolver in SST config, Lambda dispatch, getSessionData                                    |

All 5 commits verified present in git history.

## Test Results

**Full suite:** 98 tests across 7 test files — all pass, zero regressions.

Reaction-specific coverage:

- 11 schema tests: EMOJI_PALETTE structure, emojiKeySchema accept/reject, EMOJI_KEYS order
- 14 resolver tests: toggle-on (6), toggle-off (3), validation + ban + rate-limit (3), privacy (2)

---

_Verified: 2026-03-16T21:15:00Z_
_Verifier: Claude (gsd-verifier)_

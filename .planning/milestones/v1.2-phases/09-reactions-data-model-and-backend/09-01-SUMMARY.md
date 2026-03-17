---
phase: 09-reactions-data-model-and-backend
plan: "01"
subsystem: backend
tags: [reactions, dynamodb, emoji, rate-limiting, ban-check, zod]
dependency_graph:
  requires: []
  provides:
    [
      EMOJI_PALETTE,
      emojiKeySchema,
      EmojiKey,
      EMOJI_KEYS,
      ReactArgs,
      ReactionCounts,
      REACTION_UPDATED,
      handleReact,
    ]
  affects: [packages/core, packages/functions/resolvers]
tech_stack:
  added: []
  patterns:
    [atomic-dynamodb-set-toggle, conditional-update-toggle-off-noop, rate-limit-namespace-prefix]
key_files:
  created:
    - packages/functions/src/resolvers/reactions.ts
  modified:
    - packages/core/src/schemas.ts
    - packages/core/src/types.ts
decisions:
  - "emojiKeySchema derived from EMOJI_PALETTE map — single source of truth; no manual key list"
  - "Array.from() used for reactors Set inspection to avoid DocumentClient StringSet representation ambiguity (Pitfall 5)"
  - "reactedByMe toggled emoji overridden with known isNowReacted flag — avoids reading back the Set for the just-modified key"
  - "ConditionalCheckFailedException on toggle-off treated as no-op (idempotent), not an error"
  - "reaction# namespace prefix for rate limit key separates from question submission rate limit"
metrics:
  duration: "~8 min"
  completed: "2026-03-16"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 9 Plan 01: Reactions Data Model and Backend Summary

EMOJI_PALETTE constant and Zod schema added to `@nasqa/core`; `handleReact` resolver implemented with atomic DynamoDB String Set toggle, dedup via conditional expressions, `reaction#` namespace rate limiting at 30/min, ban enforcement, and `counts + reactedByMe` response that never exposes reactor fingerprints.

## Tasks Completed

| Task | Name                                                                                   | Commit  | Files                                                    |
| ---- | -------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------- |
| 1    | Add EMOJI_PALETTE, Zod schema, and reaction types to @nasqa/core                       | cb4d295 | packages/core/src/schemas.ts, packages/core/src/types.ts |
| 2    | Implement handleReact resolver with atomic toggle, dedup, rate limiting, and ban check | 010bd19 | packages/functions/src/resolvers/reactions.ts            |

## What Was Built

### @nasqa/core additions (schemas.ts)

- `EMOJI_PALETTE` — `as const` array of 6 objects `{ key, emoji, label }` in canonical display order: thumbsup, heart, party, laugh, thinking, eyes
- `EmojiKey` — TypeScript union type derived from palette: `"thumbsup" | "heart" | "party" | "laugh" | "thinking" | "eyes"`
- `emojiKeySchema` — Zod enum derived from palette keys, validates mutation arguments and rejects invalid emoji keys
- `EMOJI_KEYS` — runtime array of keys for DynamoDB attribute name construction (`rxn_thumbsup_count`, etc.)

### @nasqa/core additions (types.ts)

- `ReactArgs` interface — `{ sessionSlug, targetId, targetType: "QUESTION" | "REPLY", emoji, fingerprint }`
- `ReactionCounts` interface — `{ thumbsup, heart, party, laugh, thinking, eyes }` (all numbers)
- `REACTION_UPDATED` added to `SessionEventType` enum

### handleReact resolver (reactions.ts)

1. Validate `emoji` via `emojiKeySchema.safeParse()` — throws `INVALID_EMOJI:{emoji}` on failure
2. `checkNotBanned(sessionSlug, fingerprint)` — throws `PARTICIPANT_BANNED` if banned
3. `checkRateLimit("reaction#" + fingerprint, 30, 60)` — 30/min in separate namespace
4. Toggle-on: `ADD rxn_{key}_count :one, rxn_{key}_reactors :fpSet` with `NOT contains() OR attribute_not_exists()` condition
5. Toggle-off on CCF: `ADD rxn_{key}_count :negOne DELETE rxn_{key}_reactors :fpSet` with `contains()` condition
6. Second CCF (race condition): no-op, `isNowReacted = false`, empty attrs
7. Build `counts` from `ALL_NEW` attrs via `EMOJI_KEYS.map`, guarded with `Math.max(0, ...)`
8. Build `reactedByMe` via `Array.from(reactors).includes(fingerprint)` — avoids DynamoDB DocumentClient Set representation issues
9. Override toggled emoji in `reactedByMe` with `isNowReacted` (authoritative, avoids re-reading)
10. Return `SessionUpdate` with `eventType: "REACTION_UPDATED"`, `payload: JSON.stringify({ targetId, targetType, emoji, counts, reactedByMe })`

## Decisions Made

- **EMOJI_PALETTE as single source of truth:** `EmojiKey` type and `emojiKeySchema` both derived from `EMOJI_PALETTE.map(e => e.key)` — extending the palette automatically updates validation and TypeScript types
- **Array.from() over Set.has() for reactors inspection:** DynamoDB DocumentClient may return StringSet as a custom object rather than a native JS `Set`; `Array.from().includes()` is safe regardless
- **reactedByMe override for toggled emoji:** After a successful toggle, the result for the toggled key is known (`isNowReacted`) without needing to inspect the returned Set — eliminates one source of ambiguity
- **Second CCF = no-op:** Race condition where two concurrent requests toggle off simultaneously is handled as idempotent; client reconciles via subscription event
- **reaction# namespace:** Rate limit key `reaction#${fingerprint}` produces DynamoDB PK `RATELIMIT#reaction#<fp>` — isolated from question submission limit `RATELIMIT#<fp>` (3/min)

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit -p packages/core/tsconfig.json` — PASS
- `npx tsc --noEmit -p packages/functions/tsconfig.json` — PASS
- `packages/core/src/schemas.ts` exports `EMOJI_PALETTE` with exactly 6 entries — VERIFIED
- `packages/functions/src/resolvers/reactions.ts` exports `handleReact` — VERIFIED
- No `rxn_*_reactors` appears in return/response path of handleReact — VERIFIED (reactors only read internally to build boolean `reactedByMe` map)

## Self-Check: PASSED

- [x] `packages/core/src/schemas.ts` — modified, exists
- [x] `packages/core/src/types.ts` — modified, exists
- [x] `packages/functions/src/resolvers/reactions.ts` — created, exists
- [x] Commit cb4d295 — exists (Task 1)
- [x] Commit 010bd19 — exists (Task 2)
- [x] TypeScript compilation clean for both packages

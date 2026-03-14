---
phase: 04-moderation-identity-and-polish
plan: 01
subsystem: backend-moderation
tags: [moderation, rate-limiting, ban, downvote, graphql, dynamodb, lambda]
dependency_graph:
  requires: []
  provides: [ban-question, ban-participant, downvote-question, restore-question, rate-limiting, ban-enforcement]
  affects: [packages/functions/src/resolvers, infra/schema.graphql, sst.config.ts, packages/core/src/types.ts]
tech_stack:
  added: []
  patterns:
    - DynamoDB minute-bucket rate limiting (RATELIMIT#key / BUCKET#epoch pattern)
    - BAN#fingerprint item with bannedPostCount auto-ban at threshold 3
    - Mutual exclusivity for upvote/downvote via DynamoDB SET operations
    - 50% downvote threshold auto-hide with ReturnValues ALL_NEW
key_files:
  created:
    - packages/functions/src/resolvers/moderation.ts
    - packages/functions/src/resolvers/rate-limit.ts
  modified:
    - infra/schema.graphql
    - packages/core/src/types.ts
    - packages/functions/src/resolvers/index.ts
    - packages/functions/src/resolvers/qa.ts
    - packages/functions/src/resolvers/clipboard.ts
    - sst.config.ts
decisions:
  - BAN item uses if_not_exists(isBanned, false) so first bannedPostCount increment does not immediately ban
  - downvoteQuestion removes from voters set (upvoters) atomically in same UpdateCommand — DELETE on non-existent set member is a no-op in DynamoDB
  - Auto-hide check done with second UpdateCommand only when shouldHide differs from current isHidden to minimize write amplification
  - checkNotBanned called before checkRateLimit in addQuestion — banned users get clear error rather than burning rate limit quota
  - authorName added to addQuestion and addReply DynamoDB items conditionally (only written if truthy) to avoid null pollution
metrics:
  duration: 3 min
  completed: 2026-03-14
  tasks_completed: 2
  files_modified: 8
---

# Phase 4 Plan 01: Moderation Backend Summary

**One-liner:** DynamoDB-backed moderation API with ban/downvote/auto-hide/auto-ban mutations and minute-bucket rate limiting enforced before question and snippet writes.

## What Was Built

### Task 1: GraphQL Schema + Moderation Resolver Handlers + SST Wiring

Four new GraphQL mutations were added to `infra/schema.graphql`:
- `banQuestion` — marks question isBanned=true, isHidden=true; increments BAN item bannedPostCount; auto-bans participant at 3 strikes
- `banParticipant` — directly sets isBanned=true on BAN#fingerprint item
- `downvoteQuestion` — mutual exclusivity with upvotes (removes from voters set), 50% auto-hide threshold
- `restoreQuestion` — host override to unhide auto-hidden questions

`authorName` optional argument added to `addQuestion` and `addReply` mutations.

`@aws_subscribe` list on `onSessionUpdate` updated to include all four new mutations.

`packages/core/src/types.ts` extended with `BanQuestionArgs`, `BanParticipantArgs`, `DownvoteQuestionArgs`, `RestoreQuestionArgs`, `BanItem`, and `authorName` on `AddQuestionArgs`/`AddReplyArgs`.

`packages/functions/src/resolvers/moderation.ts` created with four handler functions following the existing pattern (return `{ eventType, sessionSlug, payload: JSON.stringify(...) }`).

Lambda dispatcher `index.ts` routes four new field names to moderation handlers. `sst.config.ts` registers four resolver mappings to `lambdaDS`.

`addQuestion` and `addReply` in `qa.ts` updated to write `authorName` to DynamoDB items.

### Task 2: Rate Limiting Utility + Ban Enforcement

`packages/functions/src/resolvers/rate-limit.ts` created with two exports:
- `checkRateLimit(key, limit, windowSeconds?)` — DynamoDB minute-bucket pattern, throws `RATE_LIMIT_EXCEEDED` via `ConditionalCheckFailedException`
- `checkNotBanned(sessionSlug, fingerprint)` — GetCommand on BAN item, throws `PARTICIPANT_BANNED` if `isBanned === true`

`qa.ts` `addQuestion` now calls `checkNotBanned` then `checkRateLimit(fingerprint, 3, 60)` before the PutCommand.

`qa.ts` `addReply` now calls `checkNotBanned` before the PutCommand.

`clipboard.ts` `pushSnippet` now calls `checkRateLimit(hostSecretHash, 10, 60)` after host auth verification.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

Files created/modified:
- FOUND: packages/functions/src/resolvers/moderation.ts
- FOUND: packages/functions/src/resolvers/rate-limit.ts
- FOUND: infra/schema.graphql (updated)
- FOUND: packages/core/src/types.ts (updated)
- FOUND: packages/functions/src/resolvers/index.ts (updated)
- FOUND: packages/functions/src/resolvers/qa.ts (updated)
- FOUND: packages/functions/src/resolvers/clipboard.ts (updated)
- FOUND: sst.config.ts (updated)

Commits:
- 87a946d: feat(04-01): GraphQL schema extensions + moderation resolver handlers + SST wiring
- 1862d76: feat(04-01): rate limiting utility + ban enforcement in existing resolvers

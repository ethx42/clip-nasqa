---
phase: 09-reactions-data-model-and-backend
plan: "02"
subsystem: backend
tags: [reactions, graphql, appsync, lambda, dynamodb, resolver-wiring]
dependency_graph:
  requires: [09-01]
  provides:
    [
      react-mutation-graphql,
      ReactionTargetType-enum,
      REACTION_UPDATED-schema,
      reactionCounts-getSessionData,
      Mutation-react-resolver-registration,
    ]
  affects: [infra/schema.graphql, sst.config.ts, packages/functions/resolvers/index.ts]
tech_stack:
  added: []
  patterns:
    [graphql-schema-extension, appsync-resolver-registration, getSessionData-reaction-counts]
key_files:
  created: []
  modified:
    - infra/schema.graphql
    - sst.config.ts
    - packages/functions/src/resolvers/index.ts
decisions:
  - "reactionCounts included in initial getSessionData load (not lazy-fetched) — single scan returns all SESSION# items, reaction counts add negligible payload, avoids separate round-trip per item"
  - "reactionCounts serialized as JSON string via AWSJSON scalar — consistent with SessionUpdate.payload pattern; Phase 10 client JSON.parse()s it"
  - "Math.max(0, count ?? 0) guard in getSessionData mapper — defensive against count-reactors desync (Pitfall 6)"
metrics:
  duration: "~5 min"
  completed: "2026-03-16"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 9 Plan 02: GraphQL Schema Wiring and Resolver Registration Summary

React mutation wired end-to-end: GraphQL schema extended with `ReactionTargetType` enum, `REACTION_UPDATED` event type, `reactionCounts: AWSJSON` on `Question`/`Reply` types, `react` mutation, and `"react"` in `@aws_subscribe`; SST config registers the Lambda resolver; handler dispatches to `handleReact`; `getSessionData` returns reaction counts in initial load without exposing reactor fingerprints.

## Tasks Completed

| Task | Name                                                                                                | Commit  | Files                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------- |
| 1    | Extend GraphQL schema with react mutation and REACTION_UPDATED event type                           | 7f61b97 | infra/schema.graphql (included in prior 09-03 test commit — schema was already in HEAD) |
| 2    | Wire react resolver in SST config and Lambda handler dispatch, add reactionCounts to getSessionData | fddf929 | sst.config.ts, packages/functions/src/resolvers/index.ts                                |

## What Was Built

### infra/schema.graphql additions

- `ReactionTargetType` enum — `QUESTION | REPLY`; used as `targetType` argument in the `react` mutation
- `REACTION_UPDATED` added to `SessionEventType` enum — broadcast event type for all reaction toggle operations
- `reactionCounts: AWSJSON` field on `Question` type — JSON-serialized `{ thumbsup: N, heart: N, ... }` object
- `reactionCounts: AWSJSON` field on `Reply` type — same shape as Question
- `react(sessionSlug, targetId, targetType, emoji, fingerprint): SessionUpdate!` mutation — all 5 required args
- `"react"` appended to `@aws_subscribe(mutations: [...])` list on `Subscription.onSessionUpdate`

### sst.config.ts changes

- `api.addResolver("Mutation react", { dataSource: lambdaDS.name })` — routes react mutation to existing Lambda resolver

### packages/functions/src/resolvers/index.ts changes

- `import { EMOJI_KEYS } from "@nasqa/core"` — runtime key array for attribute name construction
- `import { handleReact } from "./reactions"` — imports the resolver implemented in 09-01
- `case "react": result = await handleReact(args); break;` — dispatch case added before `default`
- `reactionCounts: JSON.stringify(Object.fromEntries(EMOJI_KEYS.map(...)))` in questions mapper — builds `{ thumbsup: N, ... }` from `rxn_<key>_count` DynamoDB attributes; guarded with `Math.max(0, ...)`
- Same `reactionCounts` field added to replies mapper
- No `rxn_*_reactors` attributes included in either mapper (privacy enforcement, RXN-09)

## Decisions Made

- **reactionCounts in initial load:** The existing `getSessionData` scan already fetches all `SESSION#` items in one QueryCommand. Adding 6 scalar count attributes per question/reply adds negligible payload size. Lazy-fetching would require a separate round-trip per item or a separate batched query — unnecessary complexity for static data that's already present in DynamoDB.
- **AWSJSON scalar for reactionCounts:** Using a single `AWSJSON` field rather than adding 6 separate `Int` fields (`thumbsupCount`, `heartCount`, etc.) keeps the schema lean and follows the existing pattern of `SessionUpdate.payload`. Phase 10 client calls `JSON.parse(question.reactionCounts)` to get a typed `ReactionCounts` object.
- **Math.max(0, count ?? 0) guard:** Defensive measure against potential count-reactors desync (Pitfall 6 from research). Counts are always non-negative in the UI even if DynamoDB data integrity is compromised.

## Deviations from Plan

### Auto-fixed Issues

None.

### Noteworthy

The schema changes (Task 1) were already present in HEAD before this plan executed — they had been included in a prior commit (`7f61b97 test(09-03): add EMOJI_PALETTE, emojiKeySchema, and EMOJI_KEYS unit tests`) alongside the core schemas tests. No re-commit was needed; the schema was already correct and TypeScript-clean. Task 1 is recorded as done with that commit hash.

## Verification

- `npx tsc --noEmit -p packages/functions/tsconfig.json` — PASS
- `grep "Mutation react" sst.config.ts` — FOUND (resolver registration confirmed)
- `grep "handleReact" packages/functions/src/resolvers/index.ts` — FOUND (import + dispatch confirmed)
- `grep "reactionCounts" packages/functions/src/resolvers/index.ts` — FOUND x2 (questions + replies mappers)
- `grep "reactors" packages/functions/src/resolvers/index.ts` — NO MATCHES (privacy check PASS)

## Self-Check: PASSED

- [x] `infra/schema.graphql` — modified, contains `react(`, `REACTION_UPDATED`, `ReactionTargetType`, `reactionCounts` (x2), `"react"` in @aws_subscribe
- [x] `sst.config.ts` — modified, contains `api.addResolver("Mutation react", ...)`
- [x] `packages/functions/src/resolvers/index.ts` — modified, contains `handleReact` import + dispatch + reactionCounts in both mappers
- [x] Commit 7f61b97 — exists (schema changes in HEAD, included in prior 09-03 test commit)
- [x] Commit fddf929 — exists (Task 2 resolver wiring)
- [x] TypeScript compilation clean for functions package

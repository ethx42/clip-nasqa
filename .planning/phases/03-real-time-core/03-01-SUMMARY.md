---
phase: 03-real-time-core
plan: 01
subsystem: api
tags: [appsync, graphql, dynamodb, lambda, amplify, aws-amplify]

# Dependency graph
requires:
  - phase: 01-infrastructure
    provides: AppSync API, DynamoDB table, Lambda data source, sst.config.ts resolver pattern
  - phase: 02-session-and-view-shell
    provides: core/types.ts DynamoDB item interfaces and SessionUpdate type
provides:
  - 8 GraphQL mutations defined in schema and routed through Lambda resolver
  - getSessionData query for SSR hydration
  - Lambda handlers for clipboard (pushSnippet, deleteSnippet, clearClipboard) and Q&A (addQuestion, upvoteQuestion, addReply, focusQuestion)
  - Subscription @aws_subscribe wired to all real mutations for fan-out
  - Frontend Amplify client configured with AppSync endpoint and API key
  - GraphQL mutation, query, and subscription strings exported for client-side use
affects:
  - 03-02 (SubscriptionProvider uses appsyncClient and ON_SESSION_UPDATE string)
  - 03-03 (ClipboardPanel uses PUSH_SNIPPET, DELETE_SNIPPET, CLEAR_CLIPBOARD mutations)
  - 03-04 (QAPanel uses ADD_QUESTION, UPVOTE_QUESTION, ADD_REPLY, FOCUS_QUESTION mutations)

# Tech tracking
tech-stack:
  added: [aws-amplify (frontend)]
  patterns:
    - "All mutations return SessionUpdate tagged union for subscription fan-out"
    - "verifyHostSecret helper reads DynamoDB session item and compares hostSecretHash"
    - "ULID for ordered unique IDs in all DynamoDB items"
    - "Amplify.configure called once at module evaluation in appsync-client.ts with ssr:true"
    - "GraphQL strings in separate lib/graphql/ files, not generated types"

key-files:
  created:
    - infra/schema.graphql (updated: 8 mutations, getSessionData query, SessionData type, full @aws_subscribe)
    - packages/functions/src/resolvers/clipboard.ts
    - packages/functions/src/resolvers/qa.ts
    - packages/frontend/src/lib/appsync-client.ts
    - packages/frontend/src/lib/graphql/mutations.ts
    - packages/frontend/src/lib/graphql/subscriptions.ts
  modified:
    - packages/functions/src/resolvers/index.ts
    - packages/core/src/types.ts
    - packages/frontend/src/components/providers.tsx
    - sst.config.ts

key-decisions:
  - "Double-cast event.arguments through any for resolver dispatch — avoids Record<string,unknown> vs specific interface overlap TS error"
  - "aws-amplify full package installed (not just @aws-amplify/api-graphql) for Amplify.configure SSR mode access"
  - "GraphQL strings as plain string constants (not codegen) — simpler, sufficient for this project scale"
  - "voters stored as DynamoDB Set, conditional expression uses contains/NOT contains for duplicate-vote prevention"

patterns-established:
  - "Lambda resolver dispatches via switch on fieldName, casts arguments through any"
  - "All mutation handlers accept typed *Args interface from @nasqa/core"
  - "All mutation handlers verify host secret via GetCommand before writing"
  - "SessionUpdate payload is JSON.stringify() of the relevant entity fields"

requirements-completed: [INFRA-02, INFRA-03, INFRA-07]

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 3 Plan 01: Mutation Layer and Amplify Client Summary

**8 GraphQL mutations routed through Lambda resolvers with DynamoDB writes, subscription fan-out via @aws_subscribe, and Amplify client configured for AppSync in Next.js SSR mode**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T00:51:58Z
- **Completed:** 2026-03-14T00:54:52Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- GraphQL schema now has all 8 mutations (pushSnippet, deleteSnippet, clearClipboard, addQuestion, upvoteQuestion, addReply, focusQuestion), the getSessionData query, SessionData type, and subscription wired to all real mutations
- Lambda resolver handles every mutation field, clipboard operations verify host secret, Q&A operations include duplicate-vote protection via DynamoDB conditional expressions
- Frontend has Amplify configured in SSR mode, appsyncClient singleton exported, and all GraphQL operation strings ready for use in subsequent plans

## Task Commits

1. **Task 1: GraphQL schema mutations + Lambda resolver handlers** - `318e653` (feat)
2. **Task 2: Frontend Amplify client configuration and GraphQL strings** - `4bcf69a` (feat)

## Files Created/Modified

- `infra/schema.graphql` - Expanded with 8 mutations, getSessionData query, SessionData type, full @aws_subscribe list
- `packages/functions/src/resolvers/clipboard.ts` - pushSnippet, deleteSnippet, clearClipboard Lambda handlers
- `packages/functions/src/resolvers/qa.ts` - addQuestion, upvoteQuestion, addReply, focusQuestion Lambda handlers
- `packages/functions/src/resolvers/index.ts` - Updated to import and route all handlers, added getSessionData
- `packages/core/src/types.ts` - Added 8 typed *Args interfaces for mutation arguments
- `packages/frontend/src/lib/appsync-client.ts` - Amplify.configure with SSR mode, appsyncClient singleton
- `packages/frontend/src/lib/graphql/mutations.ts` - GraphQL mutation strings for all 8 operations + GET_SESSION_DATA
- `packages/frontend/src/lib/graphql/subscriptions.ts` - ON_SESSION_UPDATE subscription string
- `packages/frontend/src/components/providers.tsx` - Side-effect import of appsync-client for Amplify init
- `sst.config.ts` - Resolver mappings for all mutations/queries, AppSync env vars passed to NasqaSite

## Decisions Made

- Used double-cast through `any` for resolver dispatch: `event.arguments as any`. The TypeScript type `Record<string, unknown>` is not assignable to specific argument interfaces even with `as`, requiring an intermediate cast. This is safe at runtime since AppSync guarantees argument shape per field.
- Installed `aws-amplify` full package rather than using the already-installed `@aws-amplify/api-graphql` directly, as `Amplify.configure` with `{ ssr: true }` mode is only available through the top-level `aws-amplify` package.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- TypeScript error on `event.arguments as PushSnippetArgs`: `Record<string, unknown>` to specific interface cast requires intermediate `unknown` cast. Resolved by casting through `any` in the switch block (Rule 1 auto-fix).
- `aws-amplify` was not in the project's dependencies despite `@aws-amplify/api-graphql` being present. Installed via `npm install aws-amplify`.

## Next Phase Readiness

- All mutation infrastructure is in place; Plans 02-05 can build real-time hooks and UI panels
- sst.config.ts resolver mappings are registered — deploying will activate all mutations
- appsyncClient and GraphQL strings are ready for SubscriptionProvider (Plan 02) and feature panels

## Self-Check: PASSED

All 6 key files confirmed present. Both task commits (318e653, 4bcf69a) verified in git history.

---
*Phase: 03-real-time-core*
*Completed: 2026-03-14*

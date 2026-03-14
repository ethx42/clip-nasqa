---
phase: 01-infrastructure
plan: "01"
subsystem: infra
tags: [appsync, graphql, dynamodb, zod, typescript, ulid, amplify, qrcode]

# Dependency graph
requires: []
provides:
  - Full GraphQL schema with Session, Snippet, Question, Reply types
  - SessionUpdate tagged union with AWSJSON payload for subscriptions
  - onSessionUpdate subscription with @aws_subscribe(mutations: ["_stub"])
  - TypeScript interfaces for DynamoDB items and application-level entities
  - SessionEventType enum (7 variants) matching GraphQL schema
  - AppSyncResolverContext<TArgs> for API key auth resolvers
  - Zod input schemas: createSessionInput, createSnippetInput, createQuestionInput
  - ulid installed in packages/functions for sortable ULID generation
  - @aws-amplify/api-graphql installed in packages/frontend for subscription client
  - qrcode + @types/qrcode installed in packages/frontend for QR generation
affects:
  - 01-02 (SST IaC needs complete schema at infra/schema.graphql)
  - 01-03 (Lambda resolvers need ulid and @nasqa/core types)
  - Phase 2 (frontend QR generation via qrcode)
  - Phase 3 (subscription client via @aws-amplify/api-graphql)

# Tech tracking
tech-stack:
  added:
    - ulid@^3.0.2 (packages/functions)
    - "@aws-amplify/api-graphql@^4.8.5 (packages/frontend)"
    - qrcode@^1.5.4 (packages/frontend)
    - "@types/qrcode@^1.5.6 (packages/frontend devDependencies)"
  patterns:
    - Tagged union SessionUpdate with AWSJSON payload (not native GraphQL union) for AppSync subscription compatibility
    - API key auth at AppSync API level — no @aws_api_key directives on individual types
    - DynamoDB item interfaces (PK/SK/TTL) separate from application interfaces (clean resolver output)
    - Zod schemas co-located in packages/core for shared validation between Lambda and frontend

key-files:
  created:
    - infra/schema.graphql
    - packages/core/src/types.ts
    - packages/core/src/schemas.ts
  modified:
    - packages/functions/package.json
    - packages/frontend/package.json
    - package-lock.json

key-decisions:
  - "Tagged union SessionUpdate {eventType, sessionSlug, payload: AWSJSON} over native GraphQL union — AppSync native union support in subscriptions is inconsistent"
  - "Subscription uses @aws_subscribe(mutations: [\"_stub\"]) placeholder — real mutation names added in Phase 3, ensures schema compiles without real mutations"
  - "ulid ships its own TypeScript declarations (index.d.ts) — @types/ulid not needed"
  - "DynamoDB item interfaces (SessionItem etc.) separated from application interfaces (Session etc.) — keeps resolver output clean of PK/SK internals"

patterns-established:
  - "Pattern 1: GraphQL types use AWSTimestamp (Unix epoch int) for time fields — matches DynamoDB storage format"
  - "Pattern 2: ID fields are String type (ULIDs) throughout schema — consistent sortable IDs"
  - "Pattern 3: AppSyncResolverContext<TArgs> generic — typed resolver arguments, identity: null for API key auth"
  - "Pattern 4: Workspace-scoped package installs — each package declares only its own dependencies, never root package.json"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03, INFRA-09]

# Metrics
duration: 8min
completed: 2026-03-14
---

# Phase 1 Plan 01: Schema, Types, and Package Setup Summary

**Full GraphQL schema with SessionUpdate tagged-union subscription, typed DynamoDB/application interfaces in packages/core, and three workspace-scoped packages installed (ulid, @aws-amplify/api-graphql, qrcode)**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-14T00:07:27Z
- **Completed:** 2026-03-14T00:15:47Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Complete infra/schema.graphql with all entity types, SessionEventType enum, SessionUpdate tagged union, and onSessionUpdate subscription ready for AppSync
- packages/core fully typed with DynamoDB item interfaces, application interfaces, SessionEventType enum, AppSyncResolverContext, and three Zod input schemas — typecheck passes clean
- Three packages installed into their correct workspaces: ulid (functions), @aws-amplify/api-graphql + qrcode (frontend)

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand GraphQL schema to full type set** - `6e2c362` (feat)
2. **Task 2: Update core TypeScript types and Zod schemas** - `9225ba8` (feat)
3. **Task 3: Install missing packages into their workspaces** - `fe51539` (chore)

## Files Created/Modified
- `infra/schema.graphql` - Full AppSync schema: Session, Snippet, Question, Reply, SessionEventType, SessionUpdate, onSessionUpdate subscription
- `packages/core/src/types.ts` - DynamoDB item interfaces + application interfaces + SessionEventType enum + AppSyncResolverContext
- `packages/core/src/schemas.ts` - Zod schemas for createSession, createSnippet, createQuestion inputs with inferred types
- `packages/functions/package.json` - Added ulid dependency
- `packages/frontend/package.json` - Added @aws-amplify/api-graphql, qrcode, @types/qrcode
- `package-lock.json` - Updated lockfile

## Decisions Made
- Used tagged union `SessionUpdate { eventType, sessionSlug, payload: AWSJSON }` over native GraphQL union — AppSync subscription native union support is inconsistent across SDK versions
- Subscription placeholder `@aws_subscribe(mutations: ["_stub"])` allows schema to compile in Phase 1 before real mutations are defined in Phase 3
- ulid ships its own TypeScript declarations — no @types/ulid needed
- Separated DynamoDB item interfaces (with PK/SK/TTL) from application interfaces (clean output) to keep resolver return values tidy

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- infra/schema.graphql is complete and ready for Plan 02 to point AppSync at via SST IaC
- @nasqa/core exports all types Lambda resolvers will need in Plan 03
- ulid available in packages/functions for ULID generation in resolvers
- No blockers for Plan 02

---
*Phase: 01-infrastructure*
*Completed: 2026-03-14*

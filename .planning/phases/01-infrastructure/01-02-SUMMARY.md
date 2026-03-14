---
phase: 01-infrastructure
plan: "02"
subsystem: infra
tags: [sst, appsync, dynamodb, lambda, graphql, typescript]

# Dependency graph
requires:
  - phase: 01-infrastructure/01-01
    provides: "GraphQL schema (infra/schema.graphql), core types (@nasqa/core), package workspace setup"
provides:
  - "sst.config.ts IaC: NasqaTable (DynamoDB PAY_PER_REQUEST + TTL), NasqaApi (AppSync), lambdaDS, dynamoDS, subscription + query resolvers"
  - "infra/resolvers/subscription-onSessionUpdate.js: AppSync JS resolver with setSubscriptionFilter for session isolation"
  - "infra/resolvers/query-stub.js: stub resolver for Query._empty (schema health)"
  - "packages/functions/src/resolvers/index.ts: Lambda handler entry point with DynamoDB client"
  - "npm run deploy: lint + typecheck + region-locked sst deploy"
affects: [03-mutations, 04-frontend]

# Tech tracking
tech-stack:
  added: ["@aws-sdk/client-dynamodb", "@aws-sdk/lib-dynamodb", "sst.aws.Dynamo", "sst.aws.AppSync"]
  patterns:
    - "Single-table DynamoDB with PK/SK via SST Ion sst.aws.Dynamo"
    - "AppSync APPSYNC_JS runtime resolvers (not VTL) for subscriptions"
    - "Enhanced subscription filter via extensions.setSubscriptionFilter prevents null-slug bypass"
    - "Lambda data source wired with link:[table] for automatic IAM grants"

key-files:
  created:
    - sst.config.ts
    - infra/resolvers/subscription-onSessionUpdate.js
    - infra/resolvers/query-stub.js
    - packages/functions/src/resolvers/index.ts
    - packages/functions/src/index.ts
  modified:
    - package.json
    - packages/functions/tsconfig.json
    - packages/functions/src/resolvers/example.ts

key-decisions:
  - "NONE data source for subscription resolver — not wired to DynamoDB or Lambda, relies on setSubscriptionFilter only"
  - "Removed rootDir from functions tsconfig to allow cross-package imports of @nasqa/core types"
  - "npm run deploy enforces lint + typecheck gate before sst deploy, with AWS_REGION=us-east-1 hardcoded"

patterns-established:
  - "All AppSync resolvers use APPSYNC_JS runtime (ES module syntax, import from @aws-appsync/utils)"
  - "Lambda resolver handler uses switch on fieldName — each Phase 3 mutation adds a case"
  - "query-stub.js exists only for schema health — never called in production"

requirements-completed: [INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-09]

# Metrics
duration: 2min
completed: 2026-03-14
---

# Phase 1 Plan 02: SST IaC — DynamoDB, AppSync, Lambda, subscription resolver wired together

**SST Ion IaC defining NasqaTable (single-table DynamoDB PAY_PER_REQUEST) and NasqaApi (AppSync) with Lambda + DynamoDB data sources, APPSYNC_JS subscription resolver using setSubscriptionFilter for session isolation, and region-locked npm run deploy script.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-14T05:32:06Z
- **Completed:** 2026-03-14T05:33:47Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- sst.config.ts run() fully defined: NasqaTable (PAY_PER_REQUEST, TTL="TTL"), NasqaApi (infra/schema.graphql), two data sources, two resolvers
- Subscription resolver with enhanced setSubscriptionFilter — sessionSlug null guard prevents unauthorized cross-session event leakage
- Lambda handler entry point stubbed and typechecking clean, ready for Phase 3 mutation routing
- Root npm run deploy enforces lint + typecheck before deploying, with us-east-1 region lock

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AppSync JavaScript resolver files** - `ee562cd` (feat)
2. **Task 2: Implement Lambda resolver handler and wire sst.config.ts** - `81385e0` (feat)
3. **Task 3: Add root deploy and typecheck scripts to package.json** - `9a6bdff` (chore)

**Plan metadata:** (docs commit — see final_commit step)

## Files Created/Modified
- `sst.config.ts` - Complete IaC: DynamoDB table, AppSync API, two data sources, two resolvers, outputs apiUrl + tableName
- `infra/resolvers/subscription-onSessionUpdate.js` - APPSYNC_JS resolver with setSubscriptionFilter + sessionSlug null guard
- `infra/resolvers/query-stub.js` - Stub DynamoDB resolver for Query._empty schema health check
- `packages/functions/src/resolvers/index.ts` - Lambda handler with DynamoDB client, stub switch for Phase 3 mutations
- `packages/functions/src/index.ts` - Re-exports handler and docClient
- `package.json` - Added typecheck and deploy scripts
- `packages/functions/tsconfig.json` - Removed rootDir restriction to allow @nasqa/core cross-package imports
- `packages/functions/src/resolvers/example.ts` - Fixed broken AppSyncContext import (renamed to AppSyncResolverContext)

## Decisions Made
- NONE data source for subscription resolver: the subscription uses APPSYNC_JS setSubscriptionFilter without any backing DB or Lambda. This is the correct SST Ion pattern — pass `"NONE"` as the dataSource string.
- Removed `rootDir: "./src"` from functions tsconfig: the cross-package workspace import of `@nasqa/core` resolves to `packages/core/src`, which lives outside `src`. TypeScript's rootDir constraint prevented this. Removing rootDir (while keeping `include: ["src"]`) is the correct fix for monorepo workspaces.
- npm run deploy gates on lint + typecheck before any AWS call, enforcing the "no broken deploys" policy from CONTEXT.md.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed rootDir constraint from functions tsconfig**
- **Found during:** Task 2 (typecheck after implementing resolver handler)
- **Issue:** `tsconfig.json` in packages/functions had `rootDir: "./src"` — this prevented TypeScript from resolving `@nasqa/core` cross-package imports, causing 3 TS6059 errors
- **Fix:** Removed the `rootDir` field from packages/functions/tsconfig.json (rootDir: "./src" is already implied by `include: ["src"]` but blocks cross-package path mapping)
- **Files modified:** packages/functions/tsconfig.json
- **Verification:** `npm run typecheck --workspace=packages/functions` exits 0
- **Committed in:** 81385e0 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed broken AppSyncContext import in example.ts**
- **Found during:** Task 2 (typecheck)
- **Issue:** packages/functions/src/resolvers/example.ts imported `AppSyncContext` from `@nasqa/core` — that type doesn't exist; the correct name is `AppSyncResolverContext`
- **Fix:** Updated import and handler signature to use `AppSyncResolverContext`
- **Files modified:** packages/functions/src/resolvers/example.ts
- **Verification:** typecheck passes
- **Committed in:** 81385e0 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2x Rule 1 - Bug)
**Impact on plan:** Both fixes required for typecheck to pass — which is a plan success criterion. No scope creep.

## Issues Encountered
- Node.js v24 treats `!` in `-e` strings as shell history expansion, breaking the inline verify commands from the plan. Used heredoc-style `--input-type=commonjs` for all verification scripts.

## User Setup Required
None - no external service configuration required. AWS credentials needed at deploy time (not during IaC authoring).

## Next Phase Readiness
- `npm run deploy` can now provision the full AWS backend from a single command
- Lambda handler is stub-ready for Phase 3 mutation routing (switch on fieldName)
- Subscription resolver is production-ready (setSubscriptionFilter with null guard)
- Phase 2 (WAF / rate limiting) can proceed independently — DynamoDB table name will be available as SST output

---
*Phase: 01-infrastructure*
*Completed: 2026-03-14*

## Self-Check: PASSED

All created files verified on disk. All commits verified in git log (ee562cd, 81385e0, 9a6bdff).

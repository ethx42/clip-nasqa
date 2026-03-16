---
phase: 06-testing-and-ci
plan: 01
subsystem: testing
tags: [vitest, aws-sdk-client-mock, zod, dynamodb, lambda, unit-tests]

# Dependency graph
requires:
  - phase: 03-real-time-core
    provides: Lambda resolvers (qa.ts, moderation.ts, rate-limit.ts) under test
  - phase: 01-infrastructure
    provides: core Zod schemas in packages/core/src/schemas.ts
provides:
  - Vitest 4.x configured with three monorepo projects (core, functions, frontend)
  - 58 passing unit tests covering Zod schemas and Lambda resolvers
  - DynamoDB mocking pattern using aws-sdk-client-mock v4 + aws-sdk-client-mock-vitest v7
  - npm test script using vitest run (CI-safe, no watch mode)
affects: [06-02, cicd]

# Tech tracking
tech-stack:
  added:
    - vitest@^4.1.0
    - "@vitejs/plugin-react@^6.0.1"
    - jsdom@^29.0.0
    - "@testing-library/react@^16.3.2"
    - "@testing-library/dom@^10.4.1"
    - "@testing-library/user-event@^14.6.1"
    - "@testing-library/jest-dom@^6.9.1"
    - vite-tsconfig-paths@^6.1.1
    - aws-sdk-client-mock@^4.1.0
    - aws-sdk-client-mock-vitest@^7.0.1
  patterns:
    - "Root vitest.config.ts with test.projects inline (not deprecated workspace file)"
    - "aws-sdk-client-mock-vitest v7 requires /extend import in setupFiles (not bare import)"
    - "process.env.TABLE_NAME set at module level before resolver imports to avoid tableName() throw"
    - "mockClient(DynamoDBDocumentClient) called before resolver imports — prototype patch must precede singleton construction"
    - "beforeEach ddbMock.reset() + default mock setup for pass-through cases"

key-files:
  created:
    - vitest.config.ts
    - packages/core/src/__tests__/schemas.test.ts
    - packages/functions/src/__tests__/qa.test.ts
    - packages/functions/src/__tests__/moderation.test.ts
    - packages/functions/src/__tests__/rate-limit.test.ts
    - packages/functions/src/__tests__/setup.ts
  modified:
    - package.json (added test script)

key-decisions:
  - "aws-sdk-client-mock-vitest v7 uses /extend subpath import in setupFiles — bare import no longer works"
  - "functions project needs setupFiles in vitest.config.ts to register custom matchers globally"
  - "vitest run (not just vitest) prevents watch mode hang in CI"
  - "test.projects API (not deprecated vitest.workspace.ts) used for monorepo config"

patterns-established:
  - "Pattern: DynamoDB mock setup — mockClient before imports, process.env before imports, ddbMock.reset() in beforeEach"
  - "Pattern: Zod test structure — valid input, empty/missing, max-length boundary, unknown field stripping"

requirements-completed: [TEST-01, TEST-02, TEST-03]

# Metrics
duration: 3min
completed: 2026-03-15
---

# Phase 6 Plan 01: Testing and CI Summary

**Vitest 4 monorepo configured with 58 passing unit tests covering all three Zod schemas and four Lambda resolvers (addQuestion, upvoteQuestion, addReply, banQuestion, checkRateLimit, checkNotBanned) using aws-sdk-client-mock — zero real AWS credentials needed**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T22:55:59Z
- **Completed:** 2026-03-15T22:59:14Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Vitest 4.x installed and configured with three inline projects (core/node, functions/node, frontend/jsdom) using the current test.projects API
- 25 schema tests covering all three exported Zod schemas with valid/invalid/boundary/type-coercion cases
- 33 resolver tests covering addQuestion, upvoteQuestion, addReply, handleBanQuestion, handleBanParticipant, checkRateLimit, checkNotBanned with fully mocked DynamoDB
- npm test script added to root package.json using vitest run (CI-safe)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Vitest toolchain and configure monorepo projects** - `3e7ae01` (chore)
2. **Task 2: Write core schema tests and Lambda resolver tests** - `348b65f` (feat)

## Files Created/Modified

- `vitest.config.ts` - Root Vitest config with three inline project definitions (core, functions, frontend)
- `package.json` - Added `"test": "vitest run"` script
- `packages/core/src/__tests__/schemas.test.ts` - 25 tests for createSessionInputSchema, createSnippetInputSchema, createQuestionInputSchema
- `packages/functions/src/__tests__/qa.test.ts` - 14 tests for addQuestion, upvoteQuestion, addReply
- `packages/functions/src/__tests__/moderation.test.ts` - 9 tests for handleBanQuestion, handleBanParticipant
- `packages/functions/src/__tests__/rate-limit.test.ts` - 8 tests for checkRateLimit, checkNotBanned
- `packages/functions/src/__tests__/setup.ts` - Registers aws-sdk-client-mock-vitest v7 matchers via /extend subpath

## Decisions Made

- **aws-sdk-client-mock-vitest v7 /extend import**: The research doc referenced the older bare import pattern (`import "aws-sdk-client-mock-vitest"`). v7 requires `import "aws-sdk-client-mock-vitest/extend"` in a setup file. Added `packages/functions/src/__tests__/setup.ts` and wired it into vitest.config.ts.
- **functions project setupFiles**: Added `setupFiles` to the functions project definition in vitest.config.ts so custom matchers (toHaveReceivedCommand, toHaveReceivedCommandWith) are available in all resolver test files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] aws-sdk-client-mock-vitest v7 requires /extend subpath import**

- **Found during:** Task 2 (Write resolver tests)
- **Issue:** Research doc specified `import "aws-sdk-client-mock-vitest"` for registering matchers. Installed version 7.0.1 changed the API — bare import no longer registers matchers; tests failed with "Invalid Chai property: toHaveReceivedCommand"
- **Fix:** Created `packages/functions/src/__tests__/setup.ts` with `import "aws-sdk-client-mock-vitest/extend"` and added `setupFiles` to the functions project in vitest.config.ts
- **Files modified:** packages/functions/src/**tests**/setup.ts (created), vitest.config.ts (updated)
- **Verification:** All 5 previously-failing matcher assertions now pass
- **Committed in:** 348b65f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: wrong import for newer package version)
**Impact on plan:** Required fix — without it zero toHaveReceivedCommand assertions would pass. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Test infrastructure fully operational; pattern documented for future resolver tests
- Frontend project configured in vitest.config.ts but no test files written yet (Phase 6 Plan 02 scope)
- `npm test` exits 0 from repo root covering core and functions packages
- Blocker from STATE.md: SST Ion + GitHub Actions OIDC IAM permissions (Phase 6 Plan 03 scope) — not a blocker for this plan

---

_Phase: 06-testing-and-ci_
_Completed: 2026-03-15_

## Self-Check: PASSED

- vitest.config.ts: FOUND
- packages/core/src/**tests**/schemas.test.ts: FOUND
- packages/functions/src/**tests**/qa.test.ts: FOUND
- packages/functions/src/**tests**/moderation.test.ts: FOUND
- packages/functions/src/**tests**/rate-limit.test.ts: FOUND
- Commit 3e7ae01: FOUND
- Commit 348b65f: FOUND

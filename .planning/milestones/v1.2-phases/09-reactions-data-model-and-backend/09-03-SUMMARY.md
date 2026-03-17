---
phase: 09-reactions-data-model-and-backend
plan: 03
subsystem: testing
tags: [vitest, aws-sdk-client-mock, dynamodb, reactions, emoji, zod]

# Dependency graph
requires:
  - phase: 09-01
    provides: handleReact resolver, EMOJI_PALETTE, emojiKeySchema, EMOJI_KEYS in @nasqa/core

provides:
  - Unit tests for handleReact resolver (toggle-on, toggle-off, validation, privacy)
  - Unit tests for EMOJI_PALETTE structure and emojiKeySchema Zod validation
  - Unit tests for EMOJI_KEYS array

affects:
  - 09-02 (schema wiring — test coverage now complete for phase 09 backend)
  - 10-reactions-frontend (can ship with confidence that backend is verified)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rate-limit UpdateCommand is call #1 — mock sequences must account for rate-limit UpdateCommand before reaction UpdateCommand"
    - "SESSION# PK filter distinguishes reaction UpdateCommand from RATELIMIT# UpdateCommand in mock call inspection"

key-files:
  created:
    - packages/functions/src/__tests__/reactions.test.ts
  modified:
    - packages/core/src/__tests__/schemas.test.ts

key-decisions:
  - "Rate limit UpdateCommand fires before the reaction item UpdateCommand — mock sequences must provide rate-limit resolve as call #1, then toggle-on CCF as call #2, then toggle-off as call #3"
  - "SK verification uses PK.startsWith('SESSION#') filter instead of UpdateExpression parsing — cleaner and immune to expression wording changes"

patterns-established:
  - "Pattern: toggle-off test setup — resolvesOnce({}) for rate limit, rejectsOnce(CCF) for toggle-on, resolvesOnce({Attributes}) for toggle-off"
  - "Pattern: privacy assertion — check JSON payload string does not contain _reactors substring"

requirements-completed: [RXN-01, RXN-02, RXN-03, RXN-05, RXN-06, RXN-07, RXN-09, RXN-14]

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 9 Plan 03: Reactions Test Suite Summary

**Vitest unit tests for handleReact resolver and emoji schema constants — 14 resolver tests + 11 schema tests covering toggle-on/off, dedup, ban, rate-limit namespace, and reactor privacy**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-17T02:07:58Z
- **Completed:** 2026-03-17T02:10:28Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- 11 new schema tests for EMOJI_PALETTE (structure, order, non-empty), emojiKeySchema (accept/reject by validity and case), and EMOJI_KEYS (length, order) in `packages/core/src/__tests__/schemas.test.ts`
- 14 new resolver tests for handleReact across 4 describe blocks (toggle-on, toggle-off, validation, privacy) in `packages/functions/src/__tests__/reactions.test.ts`
- Full test suite passes — 98 tests across 7 test files, zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add EMOJI_PALETTE and emojiKeySchema unit tests** - `7f61b97` (test)
2. **Task 2: Add handleReact resolver unit tests** - `6465109` (test)
3. **Task 3: Run full test suite** - no commit (verification-only task, zero file changes)

## Files Created/Modified

- `packages/core/src/__tests__/schemas.test.ts` — added EMOJI_PALETTE, emojiKeySchema, EMOJI_KEYS describe blocks (11 tests added to existing 24)
- `packages/functions/src/__tests__/reactions.test.ts` — created from scratch; 14 tests in 4 describe blocks

## Decisions Made

- Rate-limit UpdateCommand fires before the reaction item UpdateCommand — toggle-off mock sequences must provide a rate-limit resolve as call #1, CCF as call #2 (toggle-on), then toggle-off resolve as call #3. The initial approach of only mocking 2 calls caused the rate-limit UpdateCommand to consume the CCF rejection, failing the test.
- SK verification uses `PK.startsWith('SESSION#')` filter to isolate the reaction UpdateCommand from rate-limit UpdateCommand (`PK=RATELIMIT#...`) — cleaner than parsing UpdateExpression strings.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected toggle-off mock call count from 2 to 3**

- **Found during:** Task 2 (handleReact resolver unit tests)
- **Issue:** Plan's mock setup for toggle-off tests specified `rejectsOnce(CCF).resolvesOnce(attrs)` (2 calls) — but rate-limit `checkRateLimit` issues its own `UpdateCommand` as call #1, consuming the first rejection before the toggle-on attempt received it. Tests failed with `RATE_LIMIT_EXCEEDED` instead of proceeding to toggle-off.
- **Fix:** Added `resolvesOnce({})` as call #1 (rate limit pass), then CCF as call #2, then toggle-off resolve as call #3. Updated all 3 toggle-off tests.
- **Files modified:** `packages/functions/src/__tests__/reactions.test.ts`
- **Verification:** All 3 toggle-off tests pass
- **Committed in:** `6465109` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed SK inspection to use PK filter instead of UpdateExpression parsing**

- **Found during:** Task 2 (QUESTION/REPLY SK targeting tests)
- **Issue:** Original filter searched UpdateExpression for `ADD` without `negOne` — but the rate-limit UpdateCommand also uses `ADD` in its expression. The filter matched the rate-limit call (SK = `BUCKET#...`) instead of the reaction call (SK = `QUESTION#q-abc`), causing assertion failure.
- **Fix:** Changed filter to `PK.startsWith('SESSION#')` which unambiguously identifies the reaction UpdateCommand.
- **Files modified:** `packages/functions/src/__tests__/reactions.test.ts`
- **Verification:** Both QUESTION and REPLY SK tests pass
- **Committed in:** `6465109` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — bugs in test setup logic)
**Impact on plan:** Both fixes were in test mock structure, not in the resolver under test. No scope creep.

## Issues Encountered

None beyond the two auto-fixed test setup bugs above.

## Next Phase Readiness

- Phase 9 backend is fully tested: handleReact resolver, EMOJI_PALETTE constants, and emojiKeySchema validation all have comprehensive test coverage
- Phase 10 (reactions frontend) can proceed with confidence that the backend contract is correct and verified
- No blockers

---

_Phase: 09-reactions-data-model-and-backend_
_Completed: 2026-03-17_

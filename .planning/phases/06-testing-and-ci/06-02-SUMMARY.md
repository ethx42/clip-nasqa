---
phase: 06-testing-and-ci
plan: 02
subsystem: testing
tags: [vitest, react-testing-library, next-intl, jest-dom, bundle-size, zlib]

# Dependency graph
requires:
  - phase: 06-testing-and-ci/06-01
    provides: Vitest 4.x configured with frontend jsdom project and RTL dependencies installed
  - phase: 03-real-time-core
    provides: QuestionCard and QAInput components under test
provides:
  - 16 passing frontend component tests for QuestionCard (8) and QAInput (8)
  - jsdom test setup with @testing-library/jest-dom matchers and RTL afterEach cleanup
  - Bundle size regression guard script (scripts/check-bundle-size.mjs) with gzipped size table
  - npm check-bundle-size script in root package.json
affects: [06-03, cicd]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Component tests wrap in NextIntlClientProvider with real messages/en.json — no useTranslations mocks"
    - "renderCard/renderInput helper functions for repeated component setup with vi.fn() callbacks"
    - "Bundle size: readFileSync + gzipSync pattern for computing gzipped sizes without running a server"

key-files:
  created:
    - packages/frontend/src/__tests__/setup.ts
    - packages/frontend/src/__tests__/question-card.test.tsx
    - packages/frontend/src/__tests__/qa-input.test.tsx
    - scripts/check-bundle-size.mjs
  modified:
    - package.json (added check-bundle-size script)

key-decisions:
  - "Real next-intl messages used in tests (no mocks) — wrapping in NextIntlClientProvider with locale=en and messages=en.json catches translation key mismatches"
  - "Bundle size script uses rootMainFiles + polyfillFiles from build-manifest.json as initial JS set — these are always loaded regardless of route"
  - "156.7kB baseline documented; budget violation is expected (aws-amplify ~68kB alone); CI will use continue-on-error until aws-amplify is replaced"
  - "scripts/check-bundle-size.mjs paths are relative to repo root (NEXT_DIR=packages/frontend/.next) so the script runs from any directory via npm run"

patterns-established:
  - "Pattern: Frontend component test — renderHelper wraps in NextIntlClientProvider, returns vi.fn() callbacks for assertion"
  - "Pattern: Test fixture — baseQuestion object spread with Partial<Question> overrides per test case"
  - "Pattern: Bundle guard — read build-manifest.json, gzip each chunk, sum sizes, compare to budget, exit 1 on failure"

requirements-completed: [TEST-04, TEST-05]

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 6 Plan 02: Component Tests and Bundle Size Guard Summary

**16 React component tests using real next-intl translations via NextIntlClientProvider, plus gzipped bundle size regression guard script showing 156.7kB initial JS baseline (76.7kB over 80kB budget due to aws-amplify)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T04:02:23Z
- **Completed:** 2026-03-16T04:06:22Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- setup.ts with @testing-library/jest-dom/vitest matchers and afterEach RTL cleanup
- question-card.test.tsx: 8 tests covering text content, upvote count display, upvote click handler, "You" badge, author name formatting (Santiago T.), banned tombstone, reply thread toggle, anonymous display
- qa-input.test.tsx: 8 tests covering placeholder text, disabled submit on empty, submit calls onSubmit with trimmed text, clears on submit, character counter appears at 400+ chars, banned state shows block message, whitespace-only submit disabled
- scripts/check-bundle-size.mjs: reads build-manifest.json, gzips each initial chunk, prints sorted table, exits 1 if over 80kB; all 74 tests pass across core, functions, and frontend projects

## Task Commits

Each task was committed atomically:

1. **Task 1: Create frontend test setup and component tests** - `c7b33e1` (test)
2. **Task 2: Create bundle size regression guard script** - `438e6a2` (feat)

## Files Created/Modified

- `packages/frontend/src/__tests__/setup.ts` - Registers jest-dom matchers and RTL afterEach cleanup
- `packages/frontend/src/__tests__/question-card.test.tsx` - 8 QuestionCard tests with real en.json translations
- `packages/frontend/src/__tests__/qa-input.test.tsx` - 8 QAInput tests with real en.json translations
- `scripts/check-bundle-size.mjs` - Bundle size guard: reads build-manifest, gzips chunks, prints table, exits 1 if over 80kB
- `package.json` - Added `check-bundle-size` npm script

## Decisions Made

- **Real translations pattern**: Wrapping every component render in `NextIntlClientProvider locale="en" messages={messages}` where messages is the imported en.json. This catches translation key mismatches and ensures component behavior is tested with actual text.
- **Test fixture approach**: Single `baseQuestion` object spread with `Partial<Question>` overrides per test keeps tests readable without repeating the full Question shape.
- **Bundle guard path format**: build-manifest.json `rootMainFiles` entries are relative to `.next/` (e.g., `static/chunks/abc.js`), not `/_next/static/chunks/abc.js`. Script joins them directly with NEXT_DIR.
- **Budget overage documented**: 156.7kB exceeds 80kB budget. aws-amplify subscription library is the primary contributor (~68kB). Script exits 1 correctly; CI job should use `continue-on-error: true` to track regressions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test for "shows author name" — viewer fingerprint collision**

- **Found during:** Task 1 (QuestionCard tests)
- **Issue:** Initial test used `fingerprint: "fp-other"` for both the question's author and the viewer. Since `isOwn = question.fingerprint === fingerprint`, the component showed "You" instead of the formatted author name, causing the test to fail.
- **Fix:** Changed the test to use distinct fingerprints: question fingerprint `"fp-author"`, viewer fingerprint `"fp-viewer"`.
- **Files modified:** packages/frontend/src/**tests**/question-card.test.tsx
- **Verification:** Test now passes — `Santiago T.` renders correctly.
- **Committed in:** c7b33e1 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: fingerprint collision in test fixture)
**Impact on plan:** Minor test fixture correction, no scope creep.

## Issues Encountered

None beyond the auto-fixed deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 74 tests pass across all three projects (core: 25, functions: 33, frontend: 16)
- Bundle size baseline documented: 156.7kB — CI can track regressions from this baseline
- Phase 6 Plan 03 (GitHub Actions CI pipeline) can wire both `npm test` and `npm run check-bundle-size` into CI jobs
- Known: bundle size check exits 1 — CI job must use `continue-on-error: true` or adjust budget

---

_Phase: 06-testing-and-ci_
_Completed: 2026-03-16_

## Self-Check: PASSED

- packages/frontend/src/**tests**/setup.ts: FOUND
- packages/frontend/src/**tests**/question-card.test.tsx: FOUND
- packages/frontend/src/**tests**/qa-input.test.tsx: FOUND
- scripts/check-bundle-size.mjs: FOUND
- .planning/phases/06-testing-and-ci/06-02-SUMMARY.md: FOUND
- Commit c7b33e1: FOUND
- Commit 438e6a2: FOUND

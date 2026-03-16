---
phase: 07-error-handling-and-observability
plan: "03"
subsystem: ui
tags: [next-intl, server-actions, error-handling, toast, react, typescript]

# Dependency graph
requires:
  - phase: 07-error-handling-and-observability
    provides: ActionResult type and toast error handling infrastructure from plan 02

provides:
  - safeAction wrapper that converts network-level fetch failures into ActionResult errors
  - All 15 server action call sites in session components wrapped with network error protection
  - Landing page empty title validation routes through server action (toast, not browser native)

affects: [08-accessibility-and-seo, 11-hook-extraction, 12-component-surgery]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "safeAction(action, networkErrorMessage): wraps any Promise<R extends {success: boolean}> to catch network-level exceptions"
    - "noValidate + no required attribute: form defers all validation to server action for consistent toast UX"
    - "tErrors = useTranslations('actionErrors'): pre-translate network error message at component level, pass to utility"

key-files:
  created:
    - packages/frontend/src/lib/safe-action.ts
  modified:
    - packages/frontend/src/app/[locale]/page.tsx
    - packages/frontend/src/components/session/session-live-host-page.tsx
    - packages/frontend/src/components/session/session-live-page.tsx
    - packages/frontend/src/components/session/host-input.tsx
    - packages/frontend/messages/en.json
    - packages/frontend/messages/es.json
    - packages/frontend/messages/pt.json

key-decisions:
  - "safeAction uses R extends {success: boolean} instead of ActionResult<T> — accommodates upvoteQuestionAction returning VOTE_CONFLICT literal union type"
  - "networkErrorMessage passed as parameter to safeAction — keeps utility free of useTranslations (not a React component)"
  - "noValidate on form + remove required attribute — lets server action handle empty title, unifying all validation to ActionResult/toast path"

patterns-established:
  - "safeAction pattern: wrap all server action calls to prevent network exceptions from escaping as unhandled promise rejections"

requirements-completed: [ERR-04]

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 7 Plan 03: Gap Closure Summary

**safeAction wrapper + noValidate form close two UAT gaps: empty title and network failures now show toast notifications instead of browser native validation or unhandled promise rejections**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T17:07:28Z
- **Completed:** 2026-03-16T17:11:24Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Landing page form uses `noValidate` so empty title submission routes to server action returning `ActionResult`, displayed via toast
- `safeAction` generic wrapper created that catches network-level fetch failures and converts them to `{ success: false, error: string }`
- All 15 server action call sites in 3 components (session-live-host-page, session-live-page, host-input) now wrapped with network error protection
- `actionErrors.networkError` translation key added in en/es/pt

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix landing page empty title validation path** - `0c40347` (fix)
2. **Task 2: Create safeAction wrapper and protect all server action calls** - `669c0a7` (feat)

## Files Created/Modified

- `packages/frontend/src/lib/safe-action.ts` - Generic async wrapper that catches network fetch exceptions and returns ActionResult-shaped error
- `packages/frontend/src/app/[locale]/page.tsx` - Added noValidate, removed required attribute from title input
- `packages/frontend/src/components/session/session-live-host-page.tsx` - Added safeAction wrapping for 10 handler functions (deleteSnippet, clearClipboard, focusQuestion, upvote, addQuestion, addReply, downvote, banQuestion, banParticipant, restoreQuestion)
- `packages/frontend/src/components/session/session-live-page.tsx` - Added safeAction wrapping for 4 handler functions (upvote, addQuestion, addReply, downvote)
- `packages/frontend/src/components/session/host-input.tsx` - Added safeAction wrapping for pushSnippetAction; added tErrors to useCallback deps
- `packages/frontend/messages/en.json` - Added actionErrors.networkError key
- `packages/frontend/messages/es.json` - Added actionErrors.networkError key
- `packages/frontend/messages/pt.json` - Added actionErrors.networkError key

## Decisions Made

- `safeAction` uses `R extends { success: boolean }` type parameter instead of `ActionResult<T>` because `upvoteQuestionAction` returns a union type `ActionResult | { success: false; error: "VOTE_CONFLICT" }` which is not assignable to `ActionResult<unknown>`. The broader constraint accommodates the VOTE_CONFLICT literal type without requiring changes to the action signature.
- `networkErrorMessage` is a parameter rather than using `useTranslations` inside `safeAction` — keeps the utility pure (non-React function) and avoids hook rules violations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added tErrors to useCallback dependency array in host-input.tsx**

- **Found during:** Task 2 (wrapping server action calls)
- **Issue:** ESLint react-hooks/exhaustive-deps and React Compiler both flagged `tErrors` as missing from `handlePush` useCallback deps after adding it to the component. Commit pre-hook failed.
- **Fix:** Added `tErrors` to the dependency array `[value, isPushing, activeLang, sessionSlug, hostSecretHash, onSnippetPushed, tErrors]`
- **Files modified:** packages/frontend/src/components/session/host-input.tsx
- **Verification:** ESLint passed, commit hook passed
- **Committed in:** 669c0a7 (Task 2 commit)

**2. [Rule 1 - Bug] Widened safeAction type signature from ActionResult<T> to R extends {success: boolean}**

- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** `upvoteQuestionAction` returns `Promise<ActionResult | { success: false; error: "VOTE_CONFLICT" }>` which is not assignable to `Promise<ActionResult<unknown>>` because `{ success: true }` lacks the `data` property required by `ActionResult<unknown>`
- **Fix:** Changed type parameter from `<T>` with `Promise<ActionResult<T>>` to `<R extends { success: boolean }>` with `Promise<R>`
- **Files modified:** packages/frontend/src/lib/safe-action.ts
- **Verification:** TypeScript compiles with no errors in modified files
- **Committed in:** 669c0a7 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 - Bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

Pre-existing TypeScript error in `packages/frontend/src/__tests__/qa-input.test.tsx` (Mock type mismatch) — out of scope, not introduced by this plan's changes. Logged for awareness.

## Next Phase Readiness

- ERR-04 requirement fully satisfied: all server action failures surface as structured ActionResult errors via toast
- Phase 7 gap closure complete — UAT issues 1 and 2 resolved
- Phase 8 (Accessibility and SEO) can proceed without dependencies on this plan

---

_Phase: 07-error-handling-and-observability_
_Completed: 2026-03-16_

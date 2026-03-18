---
phase: 11-shared-utilities-and-hook-extraction
plan: "02"
subsystem: ui
tags: [react, hooks, optimistic-updates, stale-closure, mutations]

# Dependency graph
requires:
  - phase: 03-real-time-core
    provides: session state management (useSessionState, SessionAction types, reducers)
  - phase: 04-moderation-identity-and-polish
    provides: moderation actions (banQuestion, banParticipant, restoreQuestion, downvote)
provides:
  - useSessionMutations hook — shared upvote/downvote/addQuestion/reply with internal optimistic rollback
  - useHostMutations hook — host-only deleteSnippet/clearClipboard/focusQuestion/banQuestion/banParticipant/restoreQuestion
  - Refactored SessionLivePage (participant) — zero inline handlers, thin shell
  - Refactored SessionLiveHostPage (host) — zero inline handlers, thin shell
affects: [12-animations-and-motion, 13-polish-and-final-qa]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - questionsRef pattern — useRef + useEffect to sync current questions array, avoiding stale closures in async callbacks
    - Mutation hook composition — page orchestrators delegate all async mutation logic to dedicated hooks
    - Internal error handling — toast.error and optimistic rollback fully encapsulated inside hooks

key-files:
  created:
    - packages/frontend/src/hooks/use-session-mutations.ts
    - packages/frontend/src/hooks/use-host-mutations.ts
  modified:
    - packages/frontend/src/components/session/session-live-page.tsx
    - packages/frontend/src/components/session/session-live-host-page.tsx

key-decisions:
  - "Used useRef + useEffect for questionsRef (not useEffectEvent) — more broadly compatible with current React version, same correctness guarantees for async rollback handlers"
  - "authorName typed as string | undefined in UseSessionMutationsParams to match useIdentity hook's return type (avoids type narrowing in callers)"
  - "Optional onSubmitSuccess/onReplySuccess callbacks added per prior user decision — called only on success path, not on error"

patterns-established:
  - "questionsRef pattern: const questionsRef = useRef(state.questions); useEffect(() => { questionsRef.current = state.questions; }, [state.questions]) — use in any async handler that reads questions after an await"
  - "Mutation hooks: all optimistic dispatch + safeAction + rollback logic lives inside hooks; page components contain only hook composition + JSX"

requirements-completed:
  - STRUC-02

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 11 Plan 02: Mutation Hook Extraction Summary

**Two focused hooks (useSessionMutations, useHostMutations) extract all inline async mutation handlers from page orchestrators, fixing a stale closure bug in concurrent vote rollbacks via a questionsRef pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-17T14:13:15Z
- **Completed:** 2026-03-17T14:17:01Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `useSessionMutations` encapsulates upvote, downvote, addQuestion, reply with optimistic updates and internal toast-error rollback
- `useHostMutations` encapsulates deleteSnippet, clearClipboard, focusQuestion, banQuestion, banParticipant, restoreQuestion with the same pattern
- Stale closure bug eliminated: rollback handlers now read `questionsRef.current` instead of captured `state.questions` snapshots
- SessionLivePage reduced from ~275 lines to ~130; SessionLiveHostPage from ~370 lines to ~135
- All handlers wrapped in `useCallback` with correct dependency arrays

## Task Commits

1. **Task 1: Create useSessionMutations and useHostMutations hooks** - `5729dde` (feat)
2. **Task 2: Refactor page orchestrators to consume hooks** - `1f333a1` (refactor)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `packages/frontend/src/hooks/use-session-mutations.ts` — New: shared mutations for participant and host (upvote, downvote, addQuestion, reply)
- `packages/frontend/src/hooks/use-host-mutations.ts` — New: host-only mutations (deleteSnippet, clearClipboard, focusQuestion, banQuestion, banParticipant, restoreQuestion)
- `packages/frontend/src/components/session/session-live-page.tsx` — Refactored: all inline handlers replaced by useSessionMutations, questionsRef pattern added
- `packages/frontend/src/components/session/session-live-host-page.tsx` — Refactored: all inline handlers replaced by useSessionMutations + useHostMutations, questionsRef pattern added

## Decisions Made

- Used `useRef + useEffect` for `questionsRef` rather than the experimental `useEffectEvent` — broadly compatible with the current React version and provides equivalent correctness guarantees for async rollback handlers.
- Typed `authorName` as `string | undefined` in `UseSessionMutationsParams` to match the `useIdentity` hook's return type (`name: string | undefined`), keeping call sites clean without forced non-null assertions.
- `onSubmitSuccess` and `onReplySuccess` optional callbacks are called only on the success path (consistent with prior user decision to support them per useSessionMutations spec).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed authorName type in UseSessionMutationsParams**

- **Found during:** Task 2 (refactoring page orchestrators)
- **Issue:** `useIdentity` returns `name: string | undefined` but the hook param was declared as `string`, causing a TypeScript error when passing `authorName` directly.
- **Fix:** Changed `authorName: string` to `authorName: string | undefined` in the interface — matches the `@nasqa/core` `Question.authorName?: string` field and the existing action signatures which already accept `authorName?: string`.
- **Files modified:** `packages/frontend/src/hooks/use-session-mutations.ts`
- **Verification:** TypeScript compiles with zero new errors.
- **Committed in:** `1f333a1` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — type correctness bug)
**Impact on plan:** Single-line type fix, no behavioral change. No scope creep.

## Issues Encountered

Pre-existing failures (out of scope, logged for awareness):

- `packages/frontend/src/__tests__/qa-input.test.tsx` has a TypeScript error (Mock type mismatch) — pre-dates this plan.
- `packages/functions/src/__tests__/reactions.test.ts` has 3 failing tests (toggle-off path in reactions resolver) — pre-dates this plan.

Both were confirmed by stashing this plan's changes and re-running checks.

## Next Phase Readiness

- Both hooks are ready for consumption by any future component that needs the same mutations (e.g., a modal-based Q&A flow).
- The `questionsRef` pattern is documented and ready for reuse in Phase 12 (animations) if any animated callbacks need live question data.
- Phase 12 (animations and motion) can proceed — page orchestrators are now thin shells that compose smoothly with AnimatePresence without mutation logic interference.

## Self-Check: PASSED

- FOUND: `packages/frontend/src/hooks/use-session-mutations.ts`
- FOUND: `packages/frontend/src/hooks/use-host-mutations.ts`
- FOUND: commit `5729dde` (Task 1)
- FOUND: commit `1f333a1` (Task 2)

---

_Phase: 11-shared-utilities-and-hook-extraction_
_Completed: 2026-03-17_

---
phase: 15-mutation-path-and-client-utilities
plan: "01"
subsystem: api
tags: [appsync, graphql, react-hooks, typescript, i18n, sonner, nextjs]

# Dependency graph
requires:
  - phase: 14-infrastructure-and-url-routing
    provides: session pages and routing that participant mutations are called from
provides:
  - graphqlMutation() typed utility in appsync-client.ts — direct AppSync HTTP POST from browser
  - safeClientMutation() wrapper in safe-action.ts — 1-retry + error classification + toast
  - ParticipantMutationName compile-time type guard preventing host mutation names
  - AuthConfig union type for API key / JWT swap without rewrite
  - All 5 participant mutations (addQuestion, upvoteQuestion, downvoteQuestion, addReply, react) call AppSync directly
  - QAInput pending state (Loader2 spinner) and input text restoration on failure
affects: [16-performance-and-shiki, any-phase-touching-qa-mutations, any-phase-touching-reactions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "graphqlMutation() enforces participant-only mutations at compile time via ParticipantMutationName union"
    - "safeClientMutation() wraps fn with 1-second silent retry then localized toast on both failures"
    - "callVoteMutation() helper for upvote/downvote: catches VOTE_CONFLICT silently, retries once on other errors"
    - "Optimistic UI with REMOVE_OPTIMISTIC rollback on failure; setRestoredText preserves failed input"
    - "useReactionState uses graphqlMutation directly with silent failure (no toast)"

key-files:
  created: []
  modified:
    - packages/frontend/src/lib/appsync-client.ts
    - packages/frontend/src/lib/safe-action.ts
    - packages/frontend/src/hooks/use-session-mutations.ts
    - packages/frontend/src/hooks/use-reaction-state.ts
    - packages/frontend/src/components/session/qa-input.tsx
    - packages/frontend/src/components/session/qa-panel.tsx
    - packages/frontend/src/components/session/session-live-page.tsx
    - packages/frontend/src/components/session/session-live-host-page.tsx
    - packages/frontend/src/actions/moderation.ts
    - packages/frontend/src/hooks/use-host-mutations.ts
    - packages/frontend/messages/en.json
    - packages/frontend/messages/es.json
    - packages/frontend/messages/pt.json

key-decisions:
  - "VOTE_CONFLICT errors handled silently via dedicated callVoteMutation() helper outside safeClientMutation — avoids overcomplicating the shared utility for one edge case"
  - "isPending/restoredText threaded through QAPanel props (not internal state) to keep QAPanel stateless"
  - "focusQuestionAction moved from actions/qa.ts to actions/moderation.ts so qa.ts could be deleted entirely"
  - "downvotedIds param in useSessionMutations kept in interface but prefixed _ since hook never reads it directly (downvote logic reads questionsRef)"

patterns-established:
  - "Participant mutations: graphqlMutation() or safeClientMutation(graphqlMutation()) — no Server Action"
  - "Host mutations: Server Actions with safeAction() — unchanged, hostSecretHash stays server-side"
  - "Rate-limit toasts: Sonner id deduplication prevents stacking"
  - "Failed input recovery: setRestoredText(text) + useEffect in QAInput restores without re-triggering"

requirements-completed: [MUT-01, MUT-02, MUT-03, MUT-04]

# Metrics
duration: 20min
completed: 2026-03-18
---

# Phase 15 Plan 01: Mutation Path and Client Utilities Summary

**Direct AppSync HTTP POST for all 5 participant mutations, eliminating Netlify Server Action round-trip latency, with typed graphqlMutation() guard, retry-with-toast safeClientMutation(), spinner pending state, and input text restoration on failure**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-18T14:48:00Z
- **Completed:** 2026-03-18T15:08:39Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Participant mutations (addQuestion, upvoteQuestion, downvoteQuestion, addReply, react) now bypass Netlify Server Actions and POST directly to AppSync from the browser
- `graphqlMutation()` export with `ParticipantMutationName` type guard — passing host mutation names is a compile-time error
- `safeClientMutation()` wraps any graphqlMutation call with 1-second silent retry, error classification (rate-limit / banned / network / server), localized toast output, and Sonner ID deduplication for rate-limit toasts
- QAInput shows Loader2 spinner on send button during pending state and restores failed submission text via `restoredText` prop
- Old `actions/qa.ts` and `actions/reactions.ts` deleted entirely; `focusQuestionAction` consolidated into `actions/moderation.ts`

## Task Commits

1. **Task 1: Create graphqlMutation() and safeClientMutation() utilities** - `93ee752` (feat)
2. **Task 2: Migrate hooks to client mutations, update QAInput and QAPanel, delete old Server Actions** - `83d992c` (feat)

## Files Created/Modified

- `packages/frontend/src/lib/appsync-client.ts` — Added `graphqlMutation()`, `AuthConfig`, `ParticipantMutationName`
- `packages/frontend/src/lib/safe-action.ts` — Added `safeClientMutation()`, `MutationErrorType`, `SafeClientMutationOptions`
- `packages/frontend/src/hooks/use-session-mutations.ts` — Rewritten to use `graphqlMutation` + `safeClientMutation`; added `isPending` and `restoredText` state
- `packages/frontend/src/hooks/use-reaction-state.ts` — Replace `reactAction` with direct `graphqlMutation('react', ...)` call; silent failure
- `packages/frontend/src/components/session/qa-input.tsx` — Added `isPending` (Loader2 spinner), `restoredText` (useEffect restore), both disable input
- `packages/frontend/src/components/session/qa-panel.tsx` — Added `isMutationPending` and `restoredInputText` props, pass through to QAInput
- `packages/frontend/src/components/session/session-live-page.tsx` — Destructure `isPending`/`restoredText` from hook, pass to QAPanel
- `packages/frontend/src/components/session/session-live-host-page.tsx` — Same as session-live-page
- `packages/frontend/src/actions/moderation.ts` — Added `focusQuestionAction`; removed `downvoteQuestionAction`
- `packages/frontend/src/hooks/use-host-mutations.ts` — Updated `focusQuestionAction` import to `@/actions/moderation`
- `packages/frontend/messages/en.json` — Added `clientRateLimited`, `clientBanned`, `clientNetworkOffline`, `clientFailedQuestion/Upvote/Downvote/Reply`
- `packages/frontend/messages/es.json` — Same keys in Spanish
- `packages/frontend/messages/pt.json` — Same keys in Portuguese
- `packages/frontend/src/actions/qa.ts` — **DELETED**
- `packages/frontend/src/actions/reactions.ts` — **DELETED**

## Decisions Made

- VOTE_CONFLICT silent handling kept in a dedicated `callVoteMutation()` helper rather than adding special-case logic to `safeClientMutation`, keeping the shared utility clean
- `isPending` and `restoredText` threaded through `QAPanel` as props (not internal state in QAPanel) — QAPanel stays stateless for the mutation path; parent pages hold the hook
- `focusQuestionAction` moved to `actions/moderation.ts` rather than a new file, since it's a host moderation action that shares the same Server Action pattern
- `downvotedIds` parameter kept in the `UseSessionMutationsParams` interface with `_` prefix — removing it would break all callers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added eslint disable comment for setState in useEffect**

- **Found during:** Task 2 commit (pre-commit hook ran ESLint)
- **Issue:** ESLint `react-hooks/set-state-in-effect` flagged `setText(restoredText)` in the restore useEffect in QAInput — this pattern is intentional (restoring failed submission text)
- **Fix:** Added `// eslint-disable-next-line react-hooks/set-state-in-effect -- restoring failed submission text from parent prop change` following project convention
- **Files modified:** `packages/frontend/src/components/session/qa-input.tsx`
- **Committed in:** `83d992c` (Task 2 commit)

**2. [Rule 1 - Bug] Prefixed unused `downvotedIds` parameter**

- **Found during:** Task 2 commit (ESLint warning `@typescript-eslint/no-unused-vars`)
- **Issue:** `downvotedIds` param in hook destructuring was accepted but never read in the function body
- **Fix:** Renamed to `_downvotedIds` to suppress lint warning while preserving the public interface
- **Files modified:** `packages/frontend/src/hooks/use-session-mutations.ts`
- **Committed in:** `83d992c` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 eslint disable comment, 1 unused param prefix)
**Impact on plan:** Both trivial fixes required by pre-commit hooks. No scope creep.

## Issues Encountered

None beyond the two auto-fixed lint issues caught by the pre-commit hook.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 5 participant mutations now call AppSync directly from the browser — ready for latency measurement
- Host mutations remain as Server Actions with `safeAction()` — no changes needed
- `graphqlMutation()` and `safeClientMutation()` utilities available for any future client-side mutations
- Phase 15 Plan 02 (if any) can build on the established mutation pattern

## Self-Check: PASSED

- All 7 key files verified present
- Both deleted files (actions/qa.ts, actions/reactions.ts) confirmed removed
- Both task commits (93ee752, 83d992c) confirmed in git log
- TypeScript: zero errors
- No dead imports of deleted functions

---

_Phase: 15-mutation-path-and-client-utilities_
_Completed: 2026-03-18_

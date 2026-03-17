---
phase: 10-reactions-frontend-state-and-ui
plan: 01
subsystem: ui
tags: [react, graphql, appsync, i18n, typescript, next-intl, state-management]

# Dependency graph
requires:
  - phase: 09-reactions-backend
    provides: "react mutation, REACTION_UPDATED subscription event, reactionCounts AWSJSON field on Question/Reply"
provides:
  - "reactionCounts?: string on Question and Reply TypeScript interfaces in @nasqa/core"
  - "REACT mutation string exported from graphql/mutations.ts"
  - "reactionCounts included in GET_SESSION_DATA query for SSR hydration"
  - "reactAction server action for calling the react mutation"
  - "REACTION_UPDATED action variant in SessionAction union type"
  - "REACTION_UPDATED case in sessionReducer updating targeted question/reply reactionCounts"
  - "REACTION_UPDATED dispatch in useSessionUpdates subscription handler (counts only)"
  - "reactions i18n namespace in en, es, pt with ICU plural forms"
affects: [10-02-reactions-ui-components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AWSJSON reactionCounts stored as string, parsed by consumers (JSON.parse)"
    - "Subscription handler dispatches counts only — reactedByMe tracked locally per client"
    - "Server actions use unknown-cast for interface-to-Record<string, unknown> compatibility"

key-files:
  created:
    - packages/frontend/src/actions/reactions.ts
  modified:
    - packages/core/src/types.ts
    - packages/frontend/src/lib/graphql/mutations.ts
    - packages/frontend/src/hooks/use-session-state.ts
    - packages/frontend/src/hooks/use-session-updates.ts
    - packages/frontend/messages/en.json
    - packages/frontend/messages/es.json
    - packages/frontend/messages/pt.json

key-decisions:
  - "reactAction returns { success: boolean } with silent failure — no toast on error, UI reverts optimistically"
  - "REACTION_UPDATED subscription handler dispatches counts only, never reactedByMe — prevents cross-client highlight corruption"
  - "reactionCounts stored as AWSJSON string in state, mirrors backend storage pattern"

patterns-established:
  - "Server action interface cast: use (args as unknown as Record<string, unknown>) for appsyncMutation compatibility"
  - "Reducer REACTION_UPDATED: JSON.stringify(counts) before storing in state to maintain AWSJSON string contract"

requirements-completed: [RXN-12, RXN-13]

# Metrics
duration: 4min
completed: 2026-03-17
---

# Phase 10 Plan 01: Reactions Data Layer Summary

**reactionCounts field wired end-to-end: TypeScript types, GET_SESSION_DATA query, REACT mutation, reactAction server action, REACTION_UPDATED reducer case, subscription dispatch, and i18n keys in three locales**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-17T04:09:02Z
- **Completed:** 2026-03-17T04:12:36Z
- **Tasks:** 2
- **Files modified:** 7 (+ 1 created)

## Accomplishments

- Extended `Question` and `Reply` interfaces in `@nasqa/core` with `reactionCounts?: string` (AWSJSON)
- Added `reactionCounts` to `GET_SESSION_DATA` query for both questions and replies, enabling SSR hydration
- Created `REACT` mutation string and `reactAction` server action with silent failure semantics
- Wired `REACTION_UPDATED` through the full state pipeline: subscription handler → reducer → targeted question/reply update
- Added `reactions` i18n namespace (8 keys each) with ICU plural forms in en, es, and pt

## Task Commits

Each task was committed atomically:

1. **Task 1: Type updates, GraphQL queries, and server action** - `2918c7f` (feat)
2. **Task 2: Reducer, subscription handler, and i18n keys** - `dbff8e3` (feat)

## Files Created/Modified

- `packages/core/src/types.ts` - Added `reactionCounts?: string` to Question and Reply interfaces
- `packages/frontend/src/lib/graphql/mutations.ts` - Added REACT mutation, reactionCounts to GET_SESSION_DATA
- `packages/frontend/src/actions/reactions.ts` - New reactAction server action (created)
- `packages/frontend/src/hooks/use-session-state.ts` - REACTION_UPDATED action type and reducer case
- `packages/frontend/src/hooks/use-session-updates.ts` - REACTION_UPDATED subscription dispatch
- `packages/frontend/messages/en.json` - reactions namespace with ICU plural forms
- `packages/frontend/messages/es.json` - reactions namespace (Spanish with proper accents)
- `packages/frontend/messages/pt.json` - reactions namespace (Portuguese with proper accents)

## Decisions Made

- `reactAction` returns `{ success: boolean }` with silent failure (no toast) — UI components are expected to revert optimistic state on `{ success: false }` per CONTEXT.md decision
- `REACTION_UPDATED` subscription handler dispatches only `counts` — never `reactedByMe` — to prevent cross-client highlight corruption (each client tracks its own active emoji state locally)
- `reactionCounts` stored as AWSJSON string in state to maintain consistency with backend storage contract; Plan 02 components will `JSON.parse()` it when rendering

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript cast for appsyncMutation interface argument**

- **Found during:** Task 1 (server action creation)
- **Issue:** `appsyncMutation` expects `Record<string, unknown>`, but a typed interface (`ReactArgs`) cannot be directly cast — TypeScript requires double-cast via `unknown`
- **Fix:** Used `args as unknown as Record<string, unknown>` pattern consistent with other action files that use `appsyncMutation` with typed interfaces
- **Files modified:** packages/frontend/src/actions/reactions.ts
- **Verification:** `npx tsc --noEmit` passes on frontend package
- **Committed in:** `2918c7f` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type compatibility bug)
**Impact on plan:** Minimal — single-line fix required by TypeScript strict mode. No scope creep.

## Issues Encountered

- Pre-existing TypeScript error in `packages/frontend/src/__tests__/qa-input.test.tsx` (vitest Mock type incompatibility) — confirmed pre-existing via `git stash` verification, out of scope per deviation rules, logged to deferred items.

## Next Phase Readiness

- Full data pipeline is ready: reactionCounts flows from SSR hydration → state → subscription updates
- `reactAction` is ready to be called from Plan 02 UI components
- i18n keys are in place for all three locales
- Plan 02 components need to `JSON.parse(reactionCounts)` to get the `ReactionCounts` object

---

_Phase: 10-reactions-frontend-state-and-ui_
_Completed: 2026-03-17_

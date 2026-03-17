---
phase: 10-reactions-frontend-state-and-ui
plan: 02
subsystem: ui
tags: [react, hooks, optimistic-ui, i18n, accessibility, localStorage, typescript]

# Dependency graph
requires:
  - phase: 10-01
    provides: "reactAction server action, REACTION_UPDATED reducer, i18n reactions namespace, reactionCounts on Question/Reply"
provides:
  - "useReactionState hook: per-item optimistic toggle with 300ms debounce, localStorage persistence, silent rollback"
  - "parseReactionCounts helper: exported from use-reaction-state.ts for AWSJSON → ReactionCounts conversion"
  - "ReactionBar component: Slack-style pills, inline emoji picker, ARIA labels, 44px touch targets, neutral gray active state"
  - "QuestionCard updated with ReactionBar in card footer (normal/expanded state only)"
  - "ReplyList updated with ReactionBar per reply, accepts sessionSlug and fingerprint props"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optimistic count management: localOverrideCounts overlays serverCounts; cleared on subscription event (serverCounts prop change)"
    - "Debounce with rollback: preToggleRef captures pre-toggle snapshot; silent revert on { success: false } with no toast"
    - "Inline emoji picker: flex-flow expansion, not a floating popover — auto-closes after selection"
    - "parseReactionCounts double-cast: Object.fromEntries needs as unknown as ReactionCounts for strict TypeScript"

key-files:
  created:
    - packages/frontend/src/hooks/use-reaction-state.ts
    - packages/frontend/src/components/session/reaction-bar.tsx
  modified:
    - packages/frontend/src/components/session/question-card.tsx
    - packages/frontend/src/components/session/reply-list.tsx

key-decisions:
  - "Active reaction pills use bg-muted (neutral gray) not brand indigo — consistent with CONTEXT.md anti-patterns"
  - "Inline emoji picker renders in flex flow (not popover) for calm, non-intrusive UX"
  - "preToggleRef captures snapshot before each toggle for per-debounce rollback accuracy"

patterns-established:
  - "ReplyList now requires sessionSlug and fingerprint — callers must pass both (enforced by TypeScript)"

requirements-completed: [RXN-10, RXN-11, RXN-12, RXN-13]

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 10 Plan 02: Reactions UI Components Summary

**ReactionBar with Slack-style pills, inline emoji picker, optimistic toggle, localStorage persistence, and full ARIA accessibility integrated into QuestionCard and ReplyList**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-17T04:15:10Z
- **Completed:** 2026-03-17T04:18:04Z
- **Tasks:** 2
- **Files modified:** 2 (+ 2 created)

## Accomplishments

- Created `useReactionState` hook: per-item optimistic toggle with 300ms debounce, localStorage persistence (key: `reactions:{slug}:{id}`), silent rollback via `preToggleRef` snapshot, server count override cleared on `serverCounts` prop change
- Exported `parseReactionCounts` helper: merges AWSJSON string over zero-filled `ReactionCounts` default with try/catch
- Created `ReactionBar` component: active pills (count > 0 only), `SmilePlus` add-reaction trigger, inline flex-flow emoji picker (auto-close on selection), ARIA labels using ICU plural forms from i18n, `aria-pressed` for active state, `aria-expanded` on picker trigger, 44px minimum touch targets (`min-h-11 min-w-11`), `bg-muted` neutral gray active highlight
- Updated `QuestionCard`: adds `ReactionBar` after action row in normal/expanded state only — banned tombstone and community-hidden collapsed states are untouched
- Updated `ReplyList`: adds `sessionSlug` and `fingerprint` props (TypeScript-enforced), renders `ReactionBar` per reply after reply text

## Task Commits

Each task was committed atomically:

1. **Task 1: useReactionState hook and ReactionBar component** - `1d31165` (feat)
2. **Task 2: Integrate ReactionBar into QuestionCard and ReplyList** - `0cedfb7` (feat)

## Files Created/Modified

- `packages/frontend/src/hooks/use-reaction-state.ts` - New hook + parseReactionCounts helper (created)
- `packages/frontend/src/components/session/reaction-bar.tsx` - New ReactionBar component (created)
- `packages/frontend/src/components/session/question-card.tsx` - ReactionBar import and render in card footer
- `packages/frontend/src/components/session/reply-list.tsx` - New props + ReactionBar per reply

## Decisions Made

- Active reaction pills use `bg-muted` (neutral gray) rather than brand indigo — per CONTEXT.md anti-patterns and Dieter Rams restraint principle
- Emoji picker is inline (flex flow) rather than a floating popover — Bret Victor's direct manipulation principle applied to keep interactions in place and avoid layer complexity
- `preToggleRef` stores the pre-toggle activeEmojis snapshot before each debounce window, ensuring rollback accuracy even when multiple toggles fire in quick succession

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Double-cast for Object.fromEntries result in parseReactionCounts**

- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** `Object.fromEntries(EMOJI_KEYS.map(...)) as ReactionCounts` fails TypeScript strict mode — `{ [k: string]: number }` doesn't overlap sufficiently with the named-property interface `ReactionCounts`
- **Fix:** Added `as unknown as ReactionCounts` double-cast, consistent with the same pattern used in Task 1 of Plan 01 for `appsyncMutation` argument types
- **Files modified:** packages/frontend/src/hooks/use-reaction-state.ts
- **Verification:** `npx tsc --noEmit` passes for core and functions packages; frontend-only pre-existing test error in `qa-input.test.tsx` (vitest Mock type incompatibility) confirmed as pre-existing
- **Committed in:** `1d31165` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript strict mode cast)
**Impact on plan:** Minimal — single-line fix, no scope change.

## Issues Encountered

- Pre-existing TypeScript error in `packages/frontend/src/__tests__/qa-input.test.tsx` (vitest Mock type incompatibility) — confirmed pre-existing in Plan 01 SUMMARY.md, out of scope per deviation rules.

## Verification Results

All plan verification steps pass:

1. `npx tsc --noEmit -p packages/frontend/tsconfig.json` — only pre-existing error, no new errors
2. `npm test` — 7 test files, 98 tests, all passed
3. `grep -c "ReactionBar" question-card.tsx` → 2
4. `grep -c "ReactionBar" reply-list.tsx` → 2
5. `grep "min-h-11" reaction-bar.tsx` → present on all 3 button variants (pill, trigger, picker)
6. `grep "aria-pressed" reaction-bar.tsx` → present on reaction pills
7. `grep "aria-label" reaction-bar.tsx` → present on pills, trigger, and picker buttons
8. `grep "bg-muted" reaction-bar.tsx` → active state uses `bg-muted`, not indigo

## Next Phase Readiness

- Full reactions feature is complete: data layer (Plan 01) + UI components (Plan 02)
- Phase 10 milestone (Reactions) is now fully implemented
- The `isHost` prop on ReplyList is destructured but unused (the plan noted it — hosts don't have special reaction behavior)

---

_Phase: 10-reactions-frontend-state-and-ui_
_Completed: 2026-03-17_

---
phase: 12-component-decomposition
plan: "03"
subsystem: frontend/question-card
tags: [component-split, variant-pattern, framer-motion, composition, moderation]
dependency_graph:
  requires: [12-01]
  provides:
    [question-card-host, question-card-participant, question-card-shared, question-card-facade]
  affects: [qa-panel, question-card]
tech_stack:
  added: []
  patterns: [composition-over-inheritance, variant-facade, animate-presence-keyed-states]
key_files:
  created:
    - packages/frontend/src/components/session/question-card-shared.tsx
    - packages/frontend/src/components/session/question-card-host.tsx
    - packages/frontend/src/components/session/question-card-participant.tsx
  modified:
    - packages/frontend/src/components/session/question-card.tsx
    - packages/frontend/src/__tests__/question-card.test.tsx
decisions:
  - "[12-03] AnimatePresence mode=wait with single string key (banned/hidden/normal) avoids compound key issue under rapid state transitions — one child renders at a time"
  - "[12-03] Facade pattern in question-card.tsx preserves backward compatibility — QAPanel and all existing consumers unchanged"
  - "[12-03] QuestionCardParticipant props Omit host-only callbacks (onFocus/onBanQuestion/onBanParticipant/onRestore) at the type level — no dead props"
metrics:
  duration: "~4 min"
  completed: "2026-03-17"
  tasks: 1
  files: 5
---

# Phase 12 Plan 03: QuestionCard Host/Participant Split Summary

**One-liner:** Monolithic 433-line QuestionCard split into three files — shared base (VoteColumn, BannedTombstone, HiddenCollapsed, formatDisplayName), host variant with moderation toolbar + ban dialog, participant variant with no moderation controls — wired via thin facade with AnimatePresence state transitions.

## Tasks Completed

| Task | Name                                                      | Commit  | Files                                                                                                           |
| ---- | --------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| 1    | Create shared base module and split QuestionCard variants | 6f80f7a | question-card-shared.tsx, question-card-host.tsx, question-card-participant.tsx, question-card.tsx, \*.test.tsx |

## What Was Built

**`question-card-shared.tsx`** — shared primitives imported by both variants:

- `formatDisplayName` — pure display name formatter ("Santiago Torres" → "Santiago T.")
- `VoteColumn` — upvote/downvote button column with aria-labels and active state styling
- `BannedTombstone` — minimal tombstone card for banned questions
- `HiddenCollapsed` — collapsed row for community-hidden questions, with optional host restore button
- `REPLY_CHAR_LIMIT` / `REPLY_COUNTER_THRESHOLD` — shared constants
- `QuestionCardBaseProps` — common props interface

**`question-card-host.tsx`** — `QuestionCardHost` with full moderation surface:

- Host inline moderation toolbar in the author row: focus toggle (●/○), ban question (ShieldX), ban participant (Ban)
- Ban participant confirmation `Dialog.Root` from `@base-ui/react` — self-contained, outside AnimatePresence
- Restore button visible in HiddenCollapsed state

**`question-card-participant.tsx`** — `QuestionCardParticipant` with no moderation controls:

- No Ban, ShieldX imports from lucide — not in bundle at all for participant builds
- Props type uses `Omit` to exclude host-only callbacks at the type level

**`question-card.tsx`** — thin facade (22 lines):

- `QuestionCard({ isHost, ...props })` routes to `QuestionCardHost` or `QuestionCardParticipant`
- Zero changes required in QAPanel or any existing consumer

**State transition animations:**

- `AnimatePresence mode="wait"` wraps three conditional `motion.div` blocks keyed by `"banned"` / `"hidden"` / `"normal"`
- Each animates `height: 0 → auto` + `opacity 0 → 1` on enter, reversed on exit
- 200ms `ease-out` transitions — resolves the "validate AnimatePresence compound key" concern from STATE.md blockers

## Test Coverage

10 tests passing (2 new):

- `shows moderation controls when isHost is true` — verifies "Remove question" and "Ban participant" buttons present
- `does not show moderation controls when isHost is false` — verifies neither button appears

All 44 frontend tests pass.

## Decisions Made

**AnimatePresence single-key approach** — Each variant uses `<AnimatePresence mode="wait">` with three conditionally rendered `<motion.div key="banned|hidden|normal">` children. Only one renders at a time, so rapid state transitions don't produce stale exit animations. Resolves the concern logged in STATE.md.

**Facade preserves backward compatibility** — `question-card.tsx` is a 22-line re-export facade. QAPanel, tests, and any future consumers keep importing from `./question-card` without modification.

**Omit at the type level** — `QuestionCardParticipantProps` uses `Omit<QuestionCardBaseProps, "isHost" | "onFocus" | "onBanQuestion" | "onBanParticipant" | "onRestore">` so callers cannot accidentally pass host-only props to the participant variant.

## Deviations from Plan

**Auto-fixed: test aria-label mismatch**

- Found during: Task 1 verification
- Issue: Test used `/ban question/i` but the English translation for `banQuestion` key is "Remove question"
- Fix: Updated test to use `/remove question/i` to match actual rendered aria-label
- Files modified: `question-card.test.tsx`
- Rule: Rule 1 (bug fix)

## Self-Check: PASSED

- [x] `packages/frontend/src/components/session/question-card-shared.tsx` — exists (119 lines)
- [x] `packages/frontend/src/components/session/question-card-host.tsx` — exists, exports `QuestionCardHost`
- [x] `packages/frontend/src/components/session/question-card-participant.tsx` — exists, exports `QuestionCardParticipant`
- [x] `packages/frontend/src/components/session/question-card.tsx` — facade, imports isHost routing
- [x] Commit 6f80f7a — exists
- [x] 10/10 question-card tests pass
- [x] 44/44 frontend tests pass
- [x] No Ban/ShieldX lucide imports in question-card-participant.tsx
- [x] TypeScript: zero new errors (pre-existing qa-input.test.tsx error unchanged)

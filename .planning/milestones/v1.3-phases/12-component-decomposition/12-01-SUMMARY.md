---
phase: 12-component-decomposition
plan: "01"
subsystem: frontend/qa-panel
tags: [sort-utility, tdd, pure-function, refactor]
dependency_graph:
  requires: []
  provides: [sort-questions-utility]
  affects: [qa-panel]
tech_stack:
  added: []
  patterns: [pure-utility-extraction, tdd-red-green, debounce-stays-in-consumer]
key_files:
  created:
    - packages/frontend/src/lib/sort-questions.ts
    - packages/frontend/src/__tests__/sort-questions.test.ts
  modified:
    - packages/frontend/src/components/session/qa-panel.tsx
decisions:
  - "[12-01] Debounce logic stays in QAPanel: sortQuestions receives synthetic question objects with debounced upvoteCount/isFocused values merged in by the consumer — utility remains a pure function"
metrics:
  duration: "~2 min"
  completed: "2026-03-17"
  tasks: 2
  files: 3
---

# Phase 12 Plan 01: Sort-Questions Pure Utility Extraction Summary

**One-liner:** Pure `sortQuestions` utility extracted from QAPanel inline comparator — focused-first, upvotes-desc, recency-desc — with 7 TDD unit tests and zero React dependency.

## Tasks Completed

| Task | Name                                                           | Commit  | Files                                     |
| ---- | -------------------------------------------------------------- | ------- | ----------------------------------------- |
| 1    | TDD — Create sortQuestions pure utility                        | b21626e | sort-questions.ts, sort-questions.test.ts |
| 2    | Replace inline sort logic in QAPanel with sortQuestions import | 4e728cb | qa-panel.tsx                              |

## What Was Built

`packages/frontend/src/lib/sort-questions.ts` — a single exported function `sortQuestions(questions: Question[]): Question[]` that:

- Sorts focused questions to the top (regardless of vote count)
- Then sorts by `upvoteCount` descending
- Breaks ties by `createdAt` descending (newer first)
- Returns a new array — never mutates the input
- Has zero React imports — safe to call from any context

`QAPanel` was refactored to use the utility. The debounce approach was preserved: QAPanel builds synthetic question objects by merging debounced `upvoteCount`/`isFocused` values onto the latest questions, then passes that array to `sortQuestions`. This keeps debounce concern in the consumer and the utility pure.

## Test Coverage

7 unit tests covering all specified cases:

1. Empty array returns empty array
2. Single-item array returns unchanged
3. Focused question sorts first regardless of vote count
4. Non-focused questions sort by `upvoteCount` descending
5. Equal upvoteCount breaks tie by `createdAt` descending
6. Multiple focused questions maintain vote/recency order among themselves
7. Input array is not mutated

## Decisions Made

**Debounce stays in consumer** — `sortQuestions` accepts plain `Question[]` and applies the canonical sort. `QAPanel` creates synthetic objects with debounced ordering fields before calling it. This keeps the utility a pure function and the debounce complexity where it belongs (the one consumer that needs it).

## Deviations from Plan

None — plan executed exactly as written.

## Deferred Issues

**Pre-existing TypeScript error in `qa-input.test.tsx`** (line 17): `Mock<Procedure | Constructable>` not assignable to `(text: string) => void`. This error existed before this plan's changes and is out of scope.

## Self-Check: PASSED

- [x] `packages/frontend/src/lib/sort-questions.ts` — exists
- [x] `packages/frontend/src/__tests__/sort-questions.test.ts` — exists
- [x] `packages/frontend/src/components/session/qa-panel.tsx` — modified
- [x] Commit b21626e — exists
- [x] Commit 4e728cb — exists
- [x] 7 tests pass
- [x] Zero inline `.sort()` calls in qa-panel.tsx
- [x] `sortQuestions` imported and used in qa-panel.tsx (3 occurrences)

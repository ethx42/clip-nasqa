---
phase: 11-shared-utilities-and-hook-extraction
plan: "01"
subsystem: frontend/lib
tags: [refactor, utilities, i18n, tdd, formatting]
dependency_graph:
  requires: []
  provides:
    - packages/frontend/src/lib/format-relative-time.ts
  affects:
    - packages/frontend/src/components/session/question-card.tsx
    - packages/frontend/src/components/session/reply-list.tsx
    - packages/frontend/src/components/session/clipboard-panel.tsx
    - packages/frontend/src/components/session/snippet-card.tsx
    - packages/frontend/src/components/session/snippet-hero.tsx
tech_stack:
  added: []
  patterns:
    - Overloaded function signatures for dual-mode utility (short-token vs i18n)
    - TDD with vi.useFakeTimers for deterministic time-based tests
key_files:
  created:
    - packages/frontend/src/lib/format-relative-time.ts
    - packages/frontend/src/__tests__/format-relative-time.test.ts
  modified:
    - packages/frontend/src/components/session/question-card.tsx
    - packages/frontend/src/components/session/reply-list.tsx
    - packages/frontend/src/components/session/clipboard-panel.tsx
    - packages/frontend/src/components/session/snippet-card.tsx
    - packages/frontend/src/components/session/snippet-hero.tsx
    - packages/frontend/messages/en.json
    - packages/frontend/messages/es.json
    - packages/frontend/messages/pt.json
decisions:
  - "Two overloaded signatures: short-token mode (no t) for Server Components, i18n mode (with t) for Client Components"
  - "Week bucket added at >=7d threshold per user decision; existing code only went to days"
  - "createdAt is Unix epoch seconds throughout — canonical function matches codebase convention"
metrics:
  duration_minutes: 5
  tasks_completed: 2
  files_created: 2
  files_modified: 8
  completed_date: "2026-03-17"
---

# Phase 11 Plan 01: formatRelativeTime Extraction Summary

Single canonical `formatRelativeTime` module extracted from five duplicate component-level implementations, with TDD coverage and a new week-bucket per user decision.

## What Was Built

**`packages/frontend/src/lib/format-relative-time.ts`** — Overloaded utility function with two call modes:

- `formatRelativeTime(createdAt)` — returns short tokens ("now", "2m", "1h", "3d", "1w") for Server Components
- `formatRelativeTime(createdAt, t)` — delegates to i18n translator for Client Components

Buckets: `<60s` = now, `1-59m`, `1-23h`, `1-6d`, `≥7d` = weeks (week bucket is new — existing implementations only went to days).

**19 unit tests** covering all 13 time buckets in short-token mode and 6 i18n delegation checks using `vi.useFakeTimers`.

## Tasks Completed

| Task | Name                                       | Commit  | Files                                                 |
| ---- | ------------------------------------------ | ------- | ----------------------------------------------------- |
| 1    | TDD — Create formatRelativeTime with tests | e5483bc | format-relative-time.ts, format-relative-time.test.ts |
| 2    | Replace all five duplicate implementations | 1ad6736 | 5 components + 3 i18n JSON files                      |

## Verification

- `grep -r "function formatRelativeTime" packages/frontend/src/components/` — 0 matches
- `grep -r "from.*format-relative-time" packages/frontend/src/components/` — 5 matches (one per component)
- All 35 frontend tests pass
- TypeScript: no errors in changed files (pre-existing `.next/dev/types` error is unrelated)

## Deviations from Plan

None — plan executed exactly as written.

## Notes

The `clipboard-panel.tsx` had a subtly different local implementation (computed `diffMs` directly in milliseconds rather than using epoch seconds). The canonical function uses epoch seconds consistently — same semantics, confirmed by examining `createdAt * 1000` usage in the old local implementation.

The 3 failing tests in `packages/functions/src/__tests__/reactions.test.ts` are pre-existing, unrelated to this plan (they test `handleReact` in a Lambda resolver).

## Self-Check: PASSED

- [x] `packages/frontend/src/lib/format-relative-time.ts` — FOUND
- [x] `packages/frontend/src/__tests__/format-relative-time.test.ts` — FOUND
- [x] Commit e5483bc — FOUND
- [x] Commit 1ad6736 — FOUND
- [x] Zero local `formatRelativeTime` definitions in components — VERIFIED
- [x] Five canonical imports in components — VERIFIED
- [x] 35 frontend tests pass — VERIFIED

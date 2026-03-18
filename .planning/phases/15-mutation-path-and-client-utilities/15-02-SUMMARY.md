---
phase: 15-mutation-path-and-client-utilities
plan: "02"
subsystem: server-actions
tags: [performance, i18n, server-actions, lazy-loading]
dependency_graph:
  requires: ["15-01"]
  provides: ["lazy-getTranslations-pattern"]
  affects: []
tech_stack:
  added: []
  patterns: ["lazy i18n resolution — getTranslations deferred to error paths only"]
key_files:
  created: []
  modified:
    - packages/frontend/src/actions/snippet.ts
    - packages/frontend/src/actions/session.ts
    - packages/frontend/src/actions/moderation.ts
key_decisions:
  - "getTranslations moved into catch blocks (and error guards) for all 8 Server Action functions — happy path never touches i18n resolution"
metrics:
  duration: "~2 min"
  completed: "2026-03-18"
  tasks_completed: 2
  files_modified: 3
---

# Phase 15 Plan 02: Lazy getTranslations in Server Actions Summary

**One-liner:** Deferred `getTranslations()` to error paths only in all 8 surviving host Server Actions — happy path mutations now skip i18n resolution entirely.

## What Was Built

Moved `const t = await getTranslations("actionErrors")` from the top of each Server Action function into the catch block (or error guard) where `t` is first needed. This ensures the >99% happy-path execution of host mutations never incurs the overhead of i18n resolution.

### Functions updated

**snippet.ts (3 functions):**

- `pushSnippetAction` — `getTranslations` moved inside `catch`
- `deleteSnippetAction` — `getTranslations` moved inside `catch`
- `clearClipboardAction` — `getTranslations` moved inside `catch`

**session.ts (1 function, 3 call sites):**

- `createSession` — `getTranslations` deferred to three error paths:
  1. `if (!title)` validation guard
  2. DynamoDB `catch` for unexpected errors
  3. Post-loop `if (!redirectUrl)` code-exhaustion guard
- The happy path (valid title + successful DynamoDB write + redirect) never calls `getTranslations`

**moderation.ts (4 functions):**

- `banQuestionAction` — `getTranslations` moved inside `catch`
- `banParticipantAction` — `getTranslations` moved inside `catch`
- `focusQuestionAction` — `getTranslations` moved inside `catch`
- `restoreQuestionAction` — `getTranslations` moved inside `catch`

### Verification

- `npx tsc --noEmit` — zero errors across all packages
- Grep confirms all 10 `getTranslations` call sites are indented inside error paths (no function-scope top-level calls remain)
- `getTranslations` import retained in all three files (still used, just deferred)
- Error message quality unchanged — same `parseRateLimitOrBan` pattern, same localization keys

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `packages/frontend/src/actions/snippet.ts` — modified, committed (2de2e8e)
- `packages/frontend/src/actions/session.ts` — modified, committed (2de2e8e)
- `packages/frontend/src/actions/moderation.ts` — modified, committed (b092221)

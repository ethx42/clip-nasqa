---
phase: 07-error-handling-and-observability
plan: "02"
subsystem: frontend-actions, client-error-handling
tags: [error-handling, i18n, server-actions, toast, react-19, action-result]
dependency_graph:
  requires: [07-01]
  provides: [action-result-type, i18n-error-messages, toast-error-display]
  affects: [session-actions, qa-actions, moderation-actions, snippet-actions, landing-page, session-live-page, session-live-host-page]
tech_stack:
  added: []
  patterns: [ActionResult discriminated union, useActionState (React 19), RATE_LIMIT_EXCEEDED:{seconds} parsing, PARTICIPANT_BANNED parsing]
key_files:
  created:
    - packages/frontend/src/lib/action-result.ts
  modified:
    - packages/frontend/src/actions/session.ts
    - packages/frontend/src/actions/qa.ts
    - packages/frontend/src/actions/moderation.ts
    - packages/frontend/src/actions/snippet.ts
    - packages/frontend/src/app/[locale]/page.tsx
    - packages/frontend/src/components/session/host-input.tsx
    - packages/frontend/src/components/session/session-live-host-page.tsx
    - packages/frontend/src/components/session/session-live-page.tsx
    - packages/frontend/messages/en.json
    - packages/frontend/messages/es.json
    - packages/frontend/messages/pt.json
decisions:
  - "Landing page converted to client component using useActionState (React 19) to handle createSession returning ActionResult"
  - "VOTE_CONFLICT kept as string control code in upvoteQuestionAction return type — not localized, consumed by client as dedup signal"
  - "Unused tCommon/useTranslations removed from session-live-page and session-live-host-page after ok->success migration"
metrics:
  duration: "~8 min"
  completed_date: "2026-03-16"
  tasks_completed: 2
  files_created: 1
  files_modified: 11
---

# Phase 7 Plan 02: Server Action Standardization and Toast Error Handling Summary

Unified all server actions under a single `ActionResult<T>` discriminated union type with i18n error messages via `getTranslations('actionErrors')`, and wired client components to display localized toast notifications with 5s auto-dismiss for all action failures including rate limit cooldown.

## Tasks Completed

| #   | Task                                                 | Commit  | Files                                                                         |
| --- | ---------------------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| 1   | ActionResult type and server action i18n refactoring | fb06238 | action-result.ts, session.ts, qa.ts, moderation.ts, snippet.ts, en/es/pt.json |
| 2   | Client-side error handling with toast notifications  | 3bc13d9 | page.tsx, host-input.tsx, session-live-host-page.tsx, session-live-page.tsx   |

## What Was Built

### Task 1: ActionResult Type and Server Action Refactoring

- **`lib/action-result.ts`** — Exports `ActionResult<T>` discriminated union: `{ success: true } | { success: true; data: T } | { success: false; error: string }`. Unified contract for all server actions.

- **`actions/session.ts`** — `createSession` now returns `ActionResult | never`. On validation failure (`!title`): returns `{ success: false, error: t('titleRequired') }`. On slug generation exhaustion: returns `{ success: false, error: t('slugGenerationFailed') }`. On unexpected DynamoDB error: returns `{ success: false, error: t('unexpectedError') }`. `redirect()` call remains outside try/catch (throws `NEXT_REDIRECT`).

- **`actions/qa.ts`** — All four functions (`addQuestionAction`, `upvoteQuestionAction`, `addReplyAction`, `focusQuestionAction`) return `ActionResult`. Inline validation uses `t('questionTooLong')`, `t('questionEmpty')`, etc. Catch blocks parse `RATE_LIMIT_EXCEEDED:(\d+)` regex → `t('rateLimited', { seconds })`, `PARTICIPANT_BANNED` → `t('banned')`, otherwise → specific fail key. `upvoteQuestionAction` preserves `{ success: false, error: "VOTE_CONFLICT" }` as control code.

- **`actions/moderation.ts`** — All four moderation actions use same pattern. `ok` → `success`, `console.error` → `reportError`, catch blocks with rate limit/ban parsing.

- **`actions/snippet.ts`** — `pushSnippetAction`, `deleteSnippetAction`, `clearClipboardAction` migrated to `ActionResult`. `renderHighlight` left unchanged (returns `string`). Imports sorted by prettier.

- **Translation files** — Added `actionErrors` namespace to `en.json`, `es.json`, and `pt.json` with 21 keys covering all error cases including rate limiting with `{seconds}` interpolation.

### Task 2: Client-Side Error Handling

- **`app/[locale]/page.tsx`** — Converted from Server Component to Client Component. Uses `useActionState<ActionResult | null, FormData>` (React 19) to wrap `createSession`. On `{ success: false }`: `useEffect` fires `toast.error(state.error, { duration: 5000 })`. Submit button shows `disabled` with `isPending` state during submission.

- **`components/session/host-input.tsx`** — `result.ok` → `result.success`. `toast.error(result.error ?? ...)` → `toast.error(result.error, { duration: 5000 })`. Error string is now always defined on failure (from i18n).

- **`components/session/session-live-host-page.tsx`** — All 9 handler functions updated from `.ok` to `.success`. Each failure case calls `toast.error(result.error, { duration: 5000 })`. Upvote rollback checks `result.error !== "VOTE_CONFLICT"` before rolling back and showing toast. Removed unused `tCommon` and `useTranslations` import.

- **`components/session/session-live-page.tsx`** — Same updates as host page for participant-facing handlers (upvote, add question, reply, downvote). Removed unused `tCommon` and `useTranslations` import.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated session-live-page.tsx (not listed in plan)**

- **Found during:** Task 2 TypeScript check
- **Issue:** `session-live-page.tsx` (participant view) also used `.ok` checks on the same action functions, causing TypeScript errors
- **Fix:** Applied identical `ok` → `success` migration + toast error display + removed unused `tCommon`
- **Files modified:** `packages/frontend/src/components/session/session-live-page.tsx`
- **Commit:** 3bc13d9

**2. [Rule 2 - Missing] Removed unused imports after migration**

- **Found during:** Task 2 — after removing `tCommon` usage, `useTranslations` import became unused in both live page components
- **Fix:** Removed `useTranslations` import from `session-live-page.tsx` and `session-live-host-page.tsx`
- **Files modified:** Both session live page files
- **Commit:** 3bc13d9

## Deferred Items

**Pre-existing TypeScript test error** — `src/__tests__/qa-input.test.tsx:17` has a vitest `vi.fn()` mock type mismatch with `(text: string) => void`. This error pre-dates plan 07-02 and is not caused by any changes here. All 74 tests pass at runtime. Logged for cleanup.

## Self-Check

- [x] `/packages/frontend/src/lib/action-result.ts` — exists, exports `ActionResult`
- [x] `packages/frontend/src/actions/session.ts` — contains `success`, `getTranslations`
- [x] `packages/frontend/src/actions/qa.ts` — contains `ActionResult`, `getTranslations`, no `ok:`
- [x] `packages/frontend/src/actions/moderation.ts` — contains `ActionResult`, `getTranslations`, no `ok:`
- [x] `packages/frontend/src/actions/snippet.ts` — contains `ActionResult`, `getTranslations`, no `ok:`
- [x] `packages/frontend/src/app/[locale]/page.tsx` — contains `useActionState`, `toast.error`
- [x] Translation files have `actionErrors` namespace in en/es/pt — verified
- [x] `fb06238` commit exists — verified
- [x] `3bc13d9` commit exists — verified
- [x] TypeScript compiles (no errors beyond pre-existing test file) — verified
- [x] `npx next build` succeeds — verified
- [x] All 74 tests pass — verified

## Self-Check: PASSED

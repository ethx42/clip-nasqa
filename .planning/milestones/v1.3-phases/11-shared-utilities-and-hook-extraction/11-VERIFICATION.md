---
phase: 11-shared-utilities-and-hook-extraction
verified: 2026-03-17T09:52:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 11: Shared Utilities and Hook Extraction — Verification Report

**Phase Goal:** All shared logic lives in canonical locations — formatRelativeTime has one implementation consumed everywhere it is used, and useSessionMutations is a single hook that gives both page orchestrators their mutation handlers
**Verified:** 2026-03-17T09:52:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                            | Status   | Evidence                                                                                                                                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | All five timestamp locations format identically — changing the rounding rule in one file updates every timestamp                 | VERIFIED | Zero local `formatRelativeTime` definitions in components; all 5 import from `@/lib/format-relative-time`                                                                                                                                            |
| 2   | SessionLivePage contains zero inline mutation handlers — all callbacks imported from useSessionMutations                         | VERIFIED | 0 matches for `async function handle` in session-live-page.tsx; destructures from `useSessionMutations` at line 72                                                                                                                                   |
| 3   | SessionLiveHostPage contains zero inline mutation handlers — shared from useSessionMutations, host-only from useHostMutations    | VERIFIED | 0 matches for `async function handle` in session-live-host-page.tsx; destructures from both hooks at lines 70 and 85                                                                                                                                 |
| 4   | Stale closure bugs under concurrent vote events are eliminated — rollback handlers read questionsRef.current, not captured state | VERIFIED | `questionsRef.current` used in downvote optimistic dispatch (line 104), downvote rollback (line 137) in use-session-mutations; `for (const q of questionsRef.current)` in use-host-mutations line 77; no `state.questions` references in either hook |

**Score:** 4/4 observable truths verified

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact                                                       | Expected                             | Status   | Details                                                                                   |
| -------------------------------------------------------------- | ------------------------------------ | -------- | ----------------------------------------------------------------------------------------- |
| `packages/frontend/src/lib/format-relative-time.ts`            | Canonical formatRelativeTime utility | VERIFIED | 51 lines; exports overloaded function with both short-token and i18n modes; all 5 buckets |
| `packages/frontend/src/__tests__/format-relative-time.test.ts` | Unit tests for all time buckets      | VERIFIED | 114 lines, 19 tests covering all 13 short-token cases and 6 i18n delegation cases         |

### Plan 02 Artifacts

| Artifact                                               | Expected                                                    | Status   | Details                                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| `packages/frontend/src/hooks/use-session-mutations.ts` | Shared mutation hook (upvote, downvote, addQuestion, reply) | VERIFIED | 233 lines; exports `useSessionMutations`; questionsRef pattern implemented    |
| `packages/frontend/src/hooks/use-host-mutations.ts`    | Host-only mutation hook (6 handlers)                        | VERIFIED | 150 lines; exports `useHostMutations`; all 6 handlers with optimistic updates |

---

## Key Link Verification

### Plan 01 — formatRelativeTime consumers

| From                  | To                            | Via                             | Status | Details                                                                                         |
| --------------------- | ----------------------------- | ------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `question-card.tsx`   | `lib/format-relative-time.ts` | `import { formatRelativeTime }` | WIRED  | Import at line 10; called with `(question.createdAt, tSession)` at line 246                     |
| `reply-list.tsx`      | `lib/format-relative-time.ts` | `import { formatRelativeTime }` | WIRED  | Import at line 7; called with `(reply.createdAt, t)` at line 39                                 |
| `clipboard-panel.tsx` | `lib/format-relative-time.ts` | `import { formatRelativeTime }` | WIRED  | Import at line 13; called with `(snippet.createdAt, t)` at line 52                              |
| `snippet-card.tsx`    | `lib/format-relative-time.ts` | `import { formatRelativeTime }` | WIRED  | Import at line 3; called with `(snippet.createdAt)` at line 22 — short-token (Server Component) |
| `snippet-hero.tsx`    | `lib/format-relative-time.ts` | `import { formatRelativeTime }` | WIRED  | Import at line 3; called with `(snippet.createdAt)` at line 24 — short-token (Server Component) |

### Plan 02 — Page orchestrators to hooks

| From                         | To                               | Via                              | Status | Details                                                    |
| ---------------------------- | -------------------------------- | -------------------------------- | ------ | ---------------------------------------------------------- |
| `session-live-page.tsx`      | `hooks/use-session-mutations.ts` | `import { useSessionMutations }` | WIRED  | Import at line 14; called at line 72; `isHostReply: false` |
| `session-live-host-page.tsx` | `hooks/use-session-mutations.ts` | `import { useSessionMutations }` | WIRED  | Import at line 14; called at line 70; `isHostReply: true`  |
| `session-live-host-page.tsx` | `hooks/use-host-mutations.ts`    | `import { useHostMutations }`    | WIRED  | Import at line 12; called at line 92                       |

---

## Requirements Coverage

| Requirement | Source Plan | Description                                                    | Status    | Evidence                                                                                                                             |
| ----------- | ----------- | -------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| STRUC-01    | Plan 01     | Shared `formatRelativeTime` utility extracted to common module | SATISFIED | `lib/format-relative-time.ts` exists; 19 tests pass; 5 components import it; 0 local definitions remain                              |
| STRUC-02    | Plan 02     | `useSessionMutations` hook extracted from session-shell        | SATISFIED | Hook exists with 4 handlers; both page orchestrators consume it; `useHostMutations` also extracted; 0 inline handlers in either page |

Both requirements claimed by their respective plan frontmatter are satisfied. No orphaned requirements found for Phase 11 in REQUIREMENTS.md.

---

## Anti-Patterns Found

None. No TODOs, FIXMEs, placeholders, empty returns, or stub implementations detected in any of the phase's created or modified files.

---

## Test Results

- **format-relative-time.test.ts:** 19/19 passing (verified by running `vitest run` on test file)
- All time buckets covered: now, 1m–59m, 1h–23h, 1d–6d, 1w+ (week bucket is new behavior)
- Both overloads tested: short-token mode and i18n delegation mode

---

## Human Verification Required

None. All success criteria are programmatically verifiable and have been verified.

---

## Summary

Phase 11 goal is fully achieved. Both deliverables exist, are substantive, and are correctly wired:

**STRUC-01 (formatRelativeTime):** The canonical utility at `lib/format-relative-time.ts` is the single source of truth for timestamp formatting. All five timestamp locations (question-card, reply-list, clipboard-panel, snippet-card, snippet-hero) import from it — three using the i18n overload with a translator function, two using the short-token overload for Server Components. Zero local definitions remain anywhere in `components/session/`. The week-bucket threshold (>=7d) is new behavior added per user decision. 19 unit tests confirm all bucket boundaries.

**STRUC-02 (useSessionMutations / useHostMutations):** Both page orchestrators are thin shells. SessionLivePage (~130 lines) and SessionLiveHostPage (~135 lines) contain no inline async mutation handlers. All 4 shared mutation callbacks (upvote, downvote, addQuestion, reply) come from `useSessionMutations`; all 6 host-only callbacks (deleteSnippet, clearClipboard, focusQuestion, banQuestion, banParticipant, restoreQuestion) come from `useHostMutations`.

**Stale closure fix confirmed:** The `questionsRef.current` pattern is used in both the optimistic dispatch and the rollback path of `handleDownvote` (lines 104, 137 of use-session-mutations.ts) and in `handleFocusQuestion`'s unfocus-all path (line 77 of use-host-mutations.ts). Neither hook references `state.questions` directly — the stale closure vector is eliminated.

---

_Verified: 2026-03-17T09:52:00Z_
_Verifier: Claude (gsd-verifier)_

---
phase: 15-mutation-path-and-client-utilities
verified: 2026-03-18T18:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 15: Mutation Path and Client Utilities Verification Report

**Phase Goal:** Participant mutations bypass the Netlify Server Action layer entirely — `addQuestion`, `upvoteQuestion`, `downvoteQuestion`, `react`, and `addReply` call AppSync directly from the browser via shared typed utilities, and surviving Server Actions no longer call `getTranslations()` on every request.

**Verified:** 2026-03-18T18:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                           | Status     | Evidence                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Participant submitting a question triggers a direct AppSync HTTP POST (no Netlify Server Action in Network tab) | ✓ VERIFIED | `use-session-mutations.ts` calls `safeClientMutation(() => graphqlMutation("addQuestion", ...))` — no Server Action import                                               |
| 2   | Participant upvoting/downvoting triggers a direct AppSync HTTP POST                                             | ✓ VERIFIED | `callVoteMutation(() => graphqlMutation("upvoteQuestion"/"downvoteQuestion", ...))` in `use-session-mutations.ts`                                                        |
| 3   | Participant adding a reply triggers a direct AppSync HTTP POST                                                  | ✓ VERIFIED | `safeClientMutation(() => graphqlMutation("addReply", ...))` in `use-session-mutations.ts`                                                                               |
| 4   | Participant reacting triggers a direct AppSync HTTP POST                                                        | ✓ VERIFIED | `graphqlMutation("react", REACT, ...)` called directly in `use-reaction-state.ts` toggle callback                                                                        |
| 5   | Rate-limit errors show a static localized toast (no countdown, no stacking)                                     | ✓ VERIFIED | `safeClientMutation` calls `toast.error(rateLimitMessage, { id: toastId, duration: 4000 })` — Sonner id deduplication confirmed                                          |
| 6   | Ban errors show a localized toast on each attempt                                                               | ✓ VERIFIED | `toast.error(bannedMessage, { duration: 4000 })` — no id, fires on every banned failure                                                                                  |
| 7   | Network errors show action-specific connectivity-aware toast                                                    | ✓ VERIFIED | `parseErrorType` checks `err instanceof TypeError` and `navigator.onLine`; `networkMessage` passed per-mutation                                                          |
| 8   | Failed question/reply submission preserves input text for retry                                                 | ✓ VERIFIED | On `!result.success`: `setRestoredText(text)` + `onSubmitSuccess()` not called; `QAInput` restores via `useEffect`                                                       |
| 9   | Submit button disables with spinner while awaiting AppSync response                                             | ✓ VERIFIED | `isPending` state in hook; `QAInput` renders `<Loader2 className="h-5 w-5 animate-spin" />` when `isPending=true`; textarea and button disabled                          |
| 10  | Host mutation names cause a TypeScript compile error if passed to graphqlMutation                               | ✓ VERIFIED | `ParticipantMutationName` union in `appsync-client.ts` = only `'addQuestion' \| 'upvoteQuestion' \| 'downvoteQuestion' \| 'addReply' \| 'react'`; TypeScript zero errors |
| 11  | Successful host mutations do not call `getTranslations()` — only error paths load i18n                          | ✓ VERIFIED | All 3 action files: every `getTranslations` call is inside a `catch` block or an explicit error guard (`if (!title)`) — confirmed by code read and grep                  |
| 12  | Error messages in surviving Server Actions remain correctly localized                                           | ✓ VERIFIED | Same `parseRateLimitOrBan` pattern; `t` resolved inside catch before use — unchanged behavior                                                                            |
| 13  | `createSession` success path does not call `getTranslations()`                                                  | ✓ VERIFIED | `getTranslations` deferred to: validation guard, DynamoDB catch, code-exhaustion guard — happy path hits only `redirect()`                                               |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact                                                | Expected                                                                     | Status     | Details                                                                                                                        |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `packages/frontend/src/lib/appsync-client.ts`           | `graphqlMutation()`, `AuthConfig`, `ParticipantMutationName` exports         | ✓ VERIFIED | All 3 exports present; fetch POST with proper auth header switching; GraphQL error parsing                                     |
| `packages/frontend/src/lib/safe-action.ts`              | `safeClientMutation()`, `safeAction` exports; retry + toast                  | ✓ VERIFIED | Both exports present; 1-second silent retry; error classification; Sonner toast with id dedup                                  |
| `packages/frontend/src/hooks/use-session-mutations.ts`  | Hook calling `safeClientMutation` directly, not Server Actions               | ✓ VERIFIED | Zero Server Action imports; uses `graphqlMutation` + `safeClientMutation`; `isPending`/`restoredText` in return                |
| `packages/frontend/src/hooks/use-reaction-state.ts`     | Hook calling `graphqlMutation('react', ...)` directly                        | ✓ VERIFIED | No `reactAction` import; direct `graphqlMutation("react", REACT, ...)` call with silent catch                                  |
| `packages/frontend/src/components/session/qa-input.tsx` | `isPending` (Loader2 spinner), `restoredText` (useEffect restore)            | ✓ VERIFIED | Both props wired; Loader2 conditional on `isPending`; `isEffectivelyDisabled` includes `isPending`; `useEffect` restores text  |
| `packages/frontend/src/components/session/qa-panel.tsx` | Passes `isMutationPending` + `restoredInputText` to QAInput                  | ✓ VERIFIED | Props accepted and forwarded: `isPending={isMutationPending}` and `restoredText={restoredInputText}`                           |
| `packages/frontend/src/actions/snippet.ts`              | Lazy `getTranslations` — only in catch blocks                                | ✓ VERIFIED | 3 functions: all `getTranslations` calls are inside `catch` blocks (lines 68, 86, 103)                                         |
| `packages/frontend/src/actions/session.ts`              | Lazy `getTranslations` — only in error guards                                | ✓ VERIFIED | 3 call sites: `if (!title)` guard, DynamoDB catch, code-exhaustion guard                                                       |
| `packages/frontend/src/actions/moderation.ts`           | Lazy `getTranslations` — only in catch blocks; `focusQuestionAction` present | ✓ VERIFIED | 4 functions; all 4 `getTranslations` calls inside catch blocks (lines 46, 61, 76, 91); `focusQuestionAction` confirmed present |
| `packages/frontend/src/actions/qa.ts`                   | DELETED                                                                      | ✓ VERIFIED | File does not exist in `src/actions/`                                                                                          |
| `packages/frontend/src/actions/reactions.ts`            | DELETED                                                                      | ✓ VERIFIED | File does not exist in `src/actions/`                                                                                          |

---

### Key Link Verification

| From                         | To                      | Via                                               | Status  | Details                                                                                             |
| ---------------------------- | ----------------------- | ------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `use-session-mutations.ts`   | `safe-action.ts`        | `safeClientMutation()` calls                      | ✓ WIRED | Import confirmed; used for `addQuestion` and `addReply`                                             |
| `safe-action.ts`             | `appsync-client.ts`     | wraps `graphqlMutation()`                         | ✓ WIRED | `fn: () => Promise<T>` pattern; caller passes `graphqlMutation` lambda                              |
| `use-reaction-state.ts`      | `appsync-client.ts`     | direct `graphqlMutation('react', ...)` call       | ✓ WIRED | Import present; called inside debounced `setTimeout` async block                                    |
| `qa-panel.tsx`               | `qa-input.tsx`          | `isPending` and `restoredText` props              | ✓ WIRED | `<QAInput isPending={isMutationPending} restoredText={restoredInputText} />`                        |
| `session-live-page.tsx`      | `qa-panel.tsx`          | destructures `isPending`/`restoredText` from hook | ✓ WIRED | `isPending: isMutationPending`, `restoredText: restoredInputText` confirmed at lines 77-78, 132-133 |
| `session-live-host-page.tsx` | `qa-panel.tsx`          | same prop threading                               | ✓ WIRED | Lines 75-76, 150-151 confirmed                                                                      |
| `use-host-mutations.ts`      | `actions/moderation.ts` | `focusQuestionAction` import                      | ✓ WIRED | Import from `@/actions/moderation` at line 14 — not the deleted `@/actions/qa`                      |
| `snippet.ts` catch blocks    | `next-intl/server`      | `getTranslations` only inside catch               | ✓ WIRED | All 3 `getTranslations` calls confirmed inside catch blocks                                         |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                                                                                      | Status      | Evidence                                                                                                                                  |
| ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| MUT-01      | 15-01       | Participant mutations (addQuestion, upvoteQuestion, addReply, downvoteQuestion, react) execute directly from client to AppSync without Netlify Server Action hop | ✓ SATISFIED | All 5 mutations confirmed using `graphqlMutation()` from browser; no Server Action in call chain                                          |
| MUT-02      | 15-01       | Host mutations remain as Server Actions for hostSecretHash security                                                                                              | ✓ SATISFIED | pushSnippet, deleteSnippet, clearClipboard, focusQuestion, banQuestion, banParticipant, restoreQuestion all remain in Server Action files |
| MUT-03      | 15-01       | Shared `graphqlMutation()` client utility handles AppSync HTTP POST with error parsing                                                                           | ✓ SATISFIED | `graphqlMutation()` exported from `appsync-client.ts`; fetch POST, header auth, GraphQL error parsing                                     |
| MUT-04      | 15-01       | `safeClientMutation()` wrapper provides consistent error handling with toast feedback                                                                            | ✓ SATISFIED | `safeClientMutation()` exported from `safe-action.ts`; 1-retry, error classification, Sonner toast                                        |
| MUT-05      | 15-02       | Remaining Server Actions lazy-load `getTranslations()` only in error paths                                                                                       | ✓ SATISFIED | All 8 functions in snippet.ts (3), moderation.ts (4), session.ts (1) confirmed lazy                                                       |

All 5 requirements satisfied. No orphaned requirements.

---

### Anti-Patterns Found

None detected. Scanning key modified files:

- No `TODO/FIXME/PLACEHOLDER` comments in any modified file
- No `return null` or empty implementation stubs
- No Server Action imports in participant mutation path
- ESLint disable for `react-hooks/set-state-in-effect` in `qa-input.tsx` is intentional and documented inline — not a gap
- `_downvotedIds` prefix in `use-session-mutations.ts` is intentional (interface compatibility) — not a gap

---

### Human Verification Required

The following behaviors cannot be verified programmatically and require a browser test if desired:

**1. AppSync network call visible in DevTools**

Test: Open a session as a participant, open DevTools Network tab, submit a question.
Expected: A POST request appears directly to the AppSync endpoint (not a `/_next/action` Netlify URL).
Why human: Network call destination cannot be verified by static analysis.

**2. Spinner appears on send button during submission**

Test: Submit a question on a slow network (DevTools throttle to Slow 3G).
Expected: Send button shows spinning Loader2 icon; input is disabled until the response arrives.
Why human: Requires runtime rendering and timing observation.

**3. Input text restored after simulated failure**

Test: Block AppSync requests in DevTools (block request URL), submit a question, observe input.
Expected: Input text is preserved; a toast appears with "Failed to submit question".
Why human: Requires network interception at runtime.

**4. Rate-limit toast deduplication**

Test: Trigger multiple rapid submissions that return RATE_LIMIT_EXCEEDED errors.
Expected: Only one toast is visible at a time (Sonner id deduplication prevents stacking).
Why human: Requires actual rate-limit response from AppSync or mock.

---

### Gaps Summary

No gaps. All 13 observable truths are verified against actual code. All 5 requirement IDs are fully satisfied. Both deleted files (`actions/qa.ts`, `actions/reactions.ts`) are confirmed absent. TypeScript compiles with zero errors. All `getTranslations` calls in surviving Server Actions are confirmed inside error paths only.

---

_Verified: 2026-03-18T18:00:00Z_
_Verifier: Claude (gsd-verifier)_

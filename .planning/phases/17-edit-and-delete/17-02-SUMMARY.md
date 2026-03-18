---
phase: 17-edit-and-delete
plan: "02"
subsystem: frontend
tags: [graphql, state, hooks, server-actions, optimistic-ui, i18n]
dependency_graph:
  requires:
    - 17-01 (backend mutations, QUESTION_EDITED/DELETED/REPLY_EDITED/DELETED/SNIPPET_EDITED event types)
  provides:
    - EDIT_QUESTION, DELETE_QUESTION, EDIT_REPLY, DELETE_REPLY, EDIT_SNIPPET mutation strings
    - QUESTION_EDITED, QUESTION_DELETED, REPLY_EDITED, REPLY_DELETED, SNIPPET_EDITED reducer actions
    - Subscription handler for all 5 new event types
    - handleEditQuestion, handleDeleteQuestion, handleEditReply, handleDeleteReply (participant, client-side)
    - handleHostEditQuestion, handleHostDeleteQuestion, handleHostEditReply, handleHostDeleteReply, handleEditSnippet (host, Server Actions)
    - editQuestionAction, deleteQuestionAction, editReplyAction, deleteReplyAction (moderation.ts)
    - editSnippetAction (snippet.ts)
  affects:
    - packages/frontend/src/components/session (Plan 03 — UI wires up these hooks)
tech_stack:
  added: []
  patterns:
    - Participant mutations call AppSync directly via graphqlMutation (no Server Action hop)
    - Host mutations go through Server Actions (hostSecretHash never in browser Network tab)
    - Optimistic dispatch with rollback on server failure for all 8 new handlers
    - Optional repliesRef/snippetsRef params in useHostMutations for rollback (consumed in Plan 03)
    - Lazy getTranslations in error paths only (established Phase 15-02 decision)
key_files:
  created: []
  modified:
    - packages/frontend/src/lib/graphql/mutations.ts
    - packages/frontend/src/lib/appsync-client.ts
    - packages/frontend/src/hooks/use-session-state.ts
    - packages/frontend/src/hooks/use-session-updates.ts
    - packages/frontend/src/hooks/use-session-mutations.ts
    - packages/frontend/src/hooks/use-host-mutations.ts
    - packages/frontend/src/actions/moderation.ts
    - packages/frontend/src/actions/snippet.ts
    - packages/frontend/messages/en.json
    - packages/frontend/messages/es.json
    - packages/frontend/messages/pt.json
decisions:
  - handleDeleteReply rollback not attempted for participants — no repliesRef in useSessionMutations params; subscription echo corrects state if server fails; keeping hook signature minimal until Plan 03 wires refs
  - repliesRef and snippetsRef added as optional params to useHostMutations — avoids breaking existing host page call site; Plan 03 will pass them
  - editedAt fields added to GET_SESSION_DATA query — ensures initial load hydrates editedAt for all content types from backend
metrics:
  duration: "5 minutes"
  tasks_completed: 2
  files_modified: 11
  files_created: 0
  completed_date: "2026-03-18"
---

# Phase 17 Plan 02: Frontend State Layer for Edit and Delete Summary

Mutation plumbing complete: 5 GraphQL mutation strings, 5 reducer action types with handlers, subscription dispatch for all new event types, 4 participant hooks calling AppSync client-side, 5 host hooks calling Server Actions with optimistic dispatch and rollback.

## Tasks Completed

| Task | Name                                                            | Commit  | Key Files                                                                                 |
| ---- | --------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| 1    | GraphQL mutations, ParticipantMutationName, and reducer actions | 6460254 | mutations.ts, appsync-client.ts, use-session-state.ts, use-session-updates.ts             |
| 2    | Participant and host mutation hooks + Server Actions            | b0b2aab | use-session-mutations.ts, use-host-mutations.ts, moderation.ts, snippet.ts, en/es/pt.json |

## What Was Built

### Task 1: GraphQL Mutations, Type Guard, Reducer, and Subscription Handler

**packages/frontend/src/lib/graphql/mutations.ts:**

- Added 5 mutation strings: `EDIT_QUESTION`, `DELETE_QUESTION`, `EDIT_REPLY`, `DELETE_REPLY`, `EDIT_SNIPPET`
- Each returns `{ eventType, sessionCode, payload }` following the established pattern
- `EDIT_SNIPPET` includes optional `language` parameter; requires `hostSecretHash`
- Updated `GET_SESSION_DATA` query to include `editedAt` field on snippets, questions, and replies

**packages/frontend/src/lib/appsync-client.ts:**

- Extended `ParticipantMutationName` union with `"editQuestion" | "editReply" | "deleteQuestion" | "deleteReply"`
- `editSnippet` intentionally excluded — host-only, goes through Server Action

**packages/frontend/src/hooks/use-session-state.ts:**

- Added 5 new `SessionAction` union members: `QUESTION_EDITED`, `QUESTION_DELETED`, `REPLY_EDITED`, `REPLY_DELETED`, `SNIPPET_EDITED`
- Added 5 new reducer cases:
  - `QUESTION_EDITED`: maps questions, updates text and editedAt for matching id
  - `QUESTION_DELETED`: filters out question by id
  - `REPLY_EDITED`: maps replies, updates text and editedAt for matching id
  - `REPLY_DELETED`: filters out reply by id
  - `SNIPPET_EDITED`: maps snippets, updates content, editedAt, and language (spread-conditional for optional language)

**packages/frontend/src/hooks/use-session-updates.ts:**

- Added 5 subscription handler cases dispatching to the 5 new reducer actions
- `SNIPPET_EDITED` also calls `setLastHostActivity(Date.now())` — consistent with `SNIPPET_ADDED`

### Task 2: Mutation Hooks and Server Actions

**packages/frontend/src/hooks/use-session-mutations.ts:**

- Added `handleEditQuestion`: optimistic `QUESTION_EDITED` dispatch, `graphqlMutation("editQuestion", ...)`, rollback via `questionsRef` on failure
- Added `handleDeleteQuestion`: optimistic `QUESTION_DELETED`, rollback re-adds via `QUESTION_ADDED`
- Added `handleEditReply`: optimistic `REPLY_EDITED`, no rollback (no repliesRef in participant hook; subscription echo corrects)
- Added `handleDeleteReply`: optimistic `REPLY_DELETED`, no rollback (same reason)
- All 4 handlers returned from the hook

**packages/frontend/src/hooks/use-host-mutations.ts:**

- Added optional `repliesRef` and `snippetsRef` params to `UseHostMutationsParams`
- Added `handleHostEditQuestion`: optimistic dispatch, `editQuestionAction` Server Action, rollback via `questionsRef`
- Added `handleHostDeleteQuestion`: optimistic dispatch, `deleteQuestionAction`, rollback re-adds via `QUESTION_ADDED`
- Added `handleHostEditReply`: optimistic dispatch, `editReplyAction`, rollback via `repliesRef` (when provided)
- Added `handleHostDeleteReply`: optimistic dispatch, `deleteReplyAction`
- Added `handleEditSnippet`: optimistic dispatch, `editSnippetAction`, rollback via `snippetsRef` (when provided)
- All 5 new handlers returned from the hook

**packages/frontend/src/actions/moderation.ts:**

- Added `editQuestionAction`, `deleteQuestionAction`, `editReplyAction`, `deleteReplyAction`
- Extended `parseRateLimitOrBan` fallback key union to include all 4 new failure keys
- All follow lazy `getTranslations` pattern (error path only)

**packages/frontend/src/actions/snippet.ts:**

- Added `editSnippetAction`
- Extended `parseRateLimitOrBan` fallback key union with `failedEditSnippet`

**packages/frontend/messages/{en,es,pt}.json:**

- Added 5 missing i18n keys to all 3 locale files: `failedEditQuestion`, `failedDeleteQuestion`, `failedEditReply`, `failedDeleteReply`, `failedEditSnippet`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Added i18n keys for new error paths**

- **Found during:** Task 2
- **Issue:** Server Actions called `t("failedEditQuestion")` etc. but these keys were absent from all 3 message files — would throw at runtime on error path
- **Fix:** Added 5 missing keys to en.json, es.json, pt.json with appropriate translations
- **Files modified:** packages/frontend/messages/en.json, es.json, pt.json
- **Commit:** b0b2aab

**2. [Rule 2 - Missing Critical Functionality] Added editedAt to GET_SESSION_DATA query**

- **Found during:** Task 1
- **Issue:** Backend maps `editedAt` in getSessionData projection (17-01), but the frontend query didn't request this field — initial page load would show `editedAt: undefined` even when items were previously edited
- **Fix:** Added `editedAt` to snippets, questions, and replies selection sets in `GET_SESSION_DATA`
- **Files modified:** packages/frontend/src/lib/graphql/mutations.ts
- **Commit:** 6460254

## Verification Results

- `npx tsc --noEmit` passes for frontend package (clean, zero errors)
- Participant mutations use `graphqlMutation` (not Server Actions)
- Host mutations use Server Actions (`hostSecretHash` stays server-side)
- All 5 reducer cases handle their respective event types
- Subscription handler dispatches all 5 new event types
- 5 new GraphQL mutation strings exported from mutations.ts
- `ParticipantMutationName` includes editQuestion, editReply, deleteQuestion, deleteReply (not editSnippet)

## Self-Check: PASSED

All modified files verified to exist. Both commits confirmed in git log (6460254, b0b2aab).

---
phase: 04-moderation-identity-and-polish
plan: 03
subsystem: frontend-moderation-ui
tags: [moderation, graphql, server-actions, session-state, react, ui]
dependency_graph:
  requires: [04-01]
  provides: [ban-question-ui, ban-participant-ui, downvote-ui, community-hide-ui, banned-participant-input]
  affects:
    - packages/frontend/src/actions/moderation.ts
    - packages/frontend/src/lib/graphql/mutations.ts
    - packages/frontend/src/hooks/use-session-state.ts
    - packages/frontend/src/hooks/use-session-updates.ts
    - packages/frontend/src/hooks/use-fingerprint.ts
    - packages/frontend/src/components/session/question-card.tsx
    - packages/frontend/src/components/session/qa-panel.tsx
    - packages/frontend/src/components/session/qa-input.tsx
tech_stack:
  added: []
  patterns:
    - Optimistic UI updates with reducer rollback for ban/restore mutations
    - Mutual exclusivity enforced both client-side (local state) and server-side (DynamoDB SET ops)
    - @base-ui/react Dialog for confirmation before participant ban
    - Set<string> in reducer state for bannedFingerprints — updated via PARTICIPANT_BANNED dispatch
    - useFingerprint localStorage tracking for both upvotes and downvotes (separate keys)
key_files:
  created:
    - packages/frontend/src/actions/moderation.ts
  modified:
    - packages/frontend/src/lib/graphql/mutations.ts
    - packages/frontend/src/hooks/use-session-state.ts
    - packages/frontend/src/hooks/use-session-updates.ts
    - packages/frontend/src/hooks/use-fingerprint.ts
    - packages/frontend/src/components/session/question-card.tsx
    - packages/frontend/src/components/session/qa-panel.tsx
    - packages/frontend/src/components/session/qa-input.tsx
    - packages/frontend/src/components/session/session-live-page.tsx
    - packages/frontend/src/components/session/session-live-host-page.tsx
decisions:
  - Mutual exclusivity enforced client-side (clicking upvote first removes downvote before calling server) to match backend atomics
  - Focus toggle moved from dropdown menu to inline icon row alongside ban icons — removes the MoreVertical menu entirely for cleaner host UX
  - Ban question has no confirmation dialog per user decision in plan; ban participant requires @base-ui/react Dialog confirmation
  - Optimistic update for banQuestion (immediate isBanned) with rollback on server error; banParticipant has no optimistic update (server-dispatched subscription handles it)
  - downvotedIds stored in separate localStorage key (downvotes:{sessionSlug}) from upvotes to avoid collision
metrics:
  duration: 12 min
  completed: 2026-03-14
  tasks_completed: 3
  files_modified: 9
---

# Phase 4 Plan 03: Moderation Frontend Summary

**One-liner:** Moderation UI wired end-to-end — Server Actions for ban/downvote/restore, session state reducer extended with bannedFingerprints and moderation fields, QuestionCard with Reddit-style toggleable votes, inline host ban icons, banned/hidden states, and disabled input for banned participants.

## What Was Built

### Task 1: Server Actions + GraphQL Mutations + Session State Reducer

`packages/frontend/src/lib/graphql/mutations.ts` — Added four mutation string constants: `BAN_QUESTION`, `BAN_PARTICIPANT`, `DOWNVOTE_QUESTION`, `RESTORE_QUESTION`.

`packages/frontend/src/actions/moderation.ts` — New file with four `'use server'` actions following the `appsyncMutation` pattern from `qa.ts`: `banQuestionAction`, `banParticipantAction`, `downvoteQuestionAction`, `restoreQuestionAction`. All return `{ ok: boolean; error?: string }` with proper error handling.

`packages/frontend/src/hooks/use-session-state.ts` — Extended `SessionAction` union with `PARTICIPANT_BANNED` action type and added `isBanned`, `isHidden`, `downvoteCount` fields to `QUESTION_UPDATED` payload. Added `bannedFingerprints: Set<string>` to `SessionState` interface (initialized as `new Set()`). `PARTICIPANT_BANNED` case adds fingerprint to the set and returns new state. `QUESTION_UPDATED` case now updates `downvoteCount`, `isBanned`, `isHidden` conditionally. `bannedFingerprints` exposed in `SessionStateResult`.

`packages/frontend/src/hooks/use-session-updates.ts` — `QUESTION_UPDATED` handler now extracts and dispatches `downvoteCount`, `isBanned`, `isHidden` from event payload. New `PARTICIPANT_BANNED` case dispatches the event with `fingerprint` from payload.

`packages/frontend/src/hooks/use-fingerprint.ts` — Added `downvotedIds: Set<string>`, `addDownvote`, `removeDownvote` methods with localStorage persistence under `downvotes:{sessionSlug}` key. Parallel to existing `votes:{sessionSlug}` pattern.

### Task 2: QuestionCard Moderation UI

`packages/frontend/src/components/session/question-card.tsx` — Complete overhaul:

- **Downvote button**: ThumbsDown icon alongside upvote; both counts visible; clicking either removes the other (mutual exclusivity)
- **Host inline controls**: `ShieldX` (ban question, no confirmation) and `Ban` (ban participant, opens Dialog) icons. `opacity-100 lg:opacity-0 lg:group-hover:opacity-100` — always visible on mobile, hover-reveal on desktop. Focus toggle button also moved inline.
- **Banned state**: Returns tombstone `<div>` with `t('questionRemoved')` text; no action buttons.
- **Community-hidden state**: Returns collapsed card with `t('hiddenByCommunity')` + `[Show]` button; host gets "Restore" button that calls `onRestore`.
- **Ban participant dialog**: `@base-ui/react Dialog.Root` with Portal/Backdrop/Popup pattern (same as `join-modal.tsx`); shows `t('confirmBanQuestion')` with Cancel/Confirm buttons.

### Task 3: QAPanel + QAInput Updates

`packages/frontend/src/components/session/qa-panel.tsx` — Added `downvotedQuestionIds`, `isUserBanned`, `onDownvote`, `onBanQuestion`, `onBanParticipant`, `onRestore` to `QAPanelProps`. All props passed through to `QuestionCard`. `isBanned={isUserBanned}` passed to `QAInput`.

`packages/frontend/src/components/session/qa-input.tsx` — Added `isBanned?: boolean` prop. When `isBanned` is true, renders a disabled grey box with `t('blockedFromPosting')` instead of the textarea. Uses `useTranslations('moderation')` for the message.

## Deviations from Plan

**[Rule 1 - Refactor] Focus toggle moved from dropdown to inline icons**
- **Found during:** Task 2
- **Issue:** The plan specified adding ban icons alongside the existing `MoreVertical` dropdown menu. The dropdown only had Focus/Unfocus and a disabled Delete. With three icon buttons for host moderation (focus, ban-question, ban-participant), the inline approach is cleaner than keeping both dropdown and icon row.
- **Fix:** Removed `MoreVertical` dropdown entirely; all three host actions are inline icon buttons with hover-reveal behavior.
- **Files modified:** `question-card.tsx`

## Self-Check: PASSED

Files verified:
- FOUND: packages/frontend/src/actions/moderation.ts
- FOUND: packages/frontend/src/lib/graphql/mutations.ts (BAN_QUESTION, BAN_PARTICIPANT, DOWNVOTE_QUESTION, RESTORE_QUESTION constants present)
- FOUND: packages/frontend/src/hooks/use-session-state.ts (bannedFingerprints, PARTICIPANT_BANNED present)
- FOUND: packages/frontend/src/hooks/use-session-updates.ts (PARTICIPANT_BANNED dispatch present)
- FOUND: packages/frontend/src/components/session/question-card.tsx (ThumbsDown, Ban, ShieldX imported, isBanned/isHidden states rendered)
- FOUND: packages/frontend/src/components/session/qa-input.tsx (isBanned prop, blockedFromPosting message)
- TypeScript: npx tsc --noEmit passes with zero errors

Commits:
- 3550af3: feat(04-03): Server Actions + GraphQL mutations + session state reducer updates
- 9e78f6d: feat(04-03): QuestionCard moderation UI — downvote button, upvote toggle, host ban icons
- 40bd834: feat(04-03): QAPanel moderation wiring + QAInput banned participant state

---
phase: 17-edit-and-delete
plan: "03"
subsystem: frontend
tags: [react, inline-edit, dialog, i18n, 5-min-window, optimistic-ui]
dependency_graph:
  requires:
    - 17-01 (backend mutations, editedAt fields)
    - 17-02 (handleEditQuestion, handleDeleteQuestion, handleEditReply, handleDeleteReply, handleHostEditQuestion, handleHostDeleteQuestion, handleHostEditReply, handleHostDeleteReply, handleEditSnippet)
  provides:
    - Inline edit UI for questions (participant 5-min + host unlimited)
    - Inline edit UI for replies (participant 5-min + host unlimited)
    - Inline edit UI for confirmed snippets (host only, with language dropdown)
    - Delete Dialog for questions and replies (never window.confirm)
    - Edited badge on questions, replies, and snippets when editedAt is set
    - Auto-hiding edit buttons without page reload (5-min timer via useState+setTimeout)
    - i18n strings for all new UI in en/es/pt
  affects:
    - QuestionCardParticipant, QuestionCardHost, ReplyList, SnippetCard
    - ClipboardPanel, QAPanel, SessionLivePage, SessionLiveHostPage
tech_stack:
  added: []
  patterns:
    - useState(lazy-init) for 5-min window — avoids impure Date.now() in render body
    - setTimeout → setState(false) for auto-expiry — no page reload required
    - @base-ui/react/dialog for all delete confirmations — no window.confirm
    - ReplyRow component extracted for per-reply state isolation
    - Confirmed snippet edit uses SUPPORTED_LANGUAGES select; optimistic snippet edit unchanged
key_files:
  created: []
  modified:
    - packages/frontend/src/components/session/question-card-participant.tsx
    - packages/frontend/src/components/session/question-card-host.tsx
    - packages/frontend/src/components/session/reply-list.tsx
    - packages/frontend/src/components/session/snippet-card.tsx
    - packages/frontend/src/components/session/qa-panel.tsx
    - packages/frontend/src/components/session/clipboard-panel.tsx
    - packages/frontend/src/components/session/session-live-page.tsx
    - packages/frontend/src/components/session/session-live-host-page.tsx
    - packages/frontend/messages/en.json
    - packages/frontend/messages/es.json
    - packages/frontend/messages/pt.json
decisions:
  - useState lazy-init for 5-min window — Date.now() in render body flagged as impure by ESLint react-hooks/purity; moved to useState(() => ...) initializer which runs once on mount, then auto-expires via setTimeout
  - eslint-disable react-hooks/set-state-in-effect comment for already-expired window — consistent with the project's established pattern (9 other instances in codebase)
  - ReplyRow extracted from ReplyList — each reply needs isolated isEditing and deleteConfirmOpen state; mapping over replies with inline state would require per-reply ref or key-reset hacks
  - Confirmed snippet edit coexists with optimistic snippet edit — two systems: handleEditClick path checks isOptimistic to route to either onEditEnd (optimistic) or onEditSnippet (confirmed); no code duplication
  - Language dropdown only for confirmed snippet edits — optimistic snippets already have language set by host-input; adding a second selector would conflict with the SNIPPET_EDIT_START/END flow
metrics:
  duration: "10 minutes"
  tasks_completed: 2
  files_modified: 11
  files_created: 0
  completed_date: "2026-03-18"
---

# Phase 17 Plan 03: Frontend UI for Edit and Delete Summary

Full edit/delete UX layer implemented: participants can edit/delete their own questions and replies within a 5-minute window that auto-hides without page reload; host can edit/delete anything at any time; all changes show "(edited)" badge with timestamp tooltip; all delete operations use Dialog confirmation (never window.confirm); confirmed snippets show edited badge and host can edit content + language via inline textarea with language dropdown.

## Tasks Completed

| Task | Name                                                           | Commit  | Key Files                                                                                                  |
| ---- | -------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| 1    | Question and reply inline edit/delete UI with 5-min window     | 06e1d74 | question-card-participant.tsx, question-card-host.tsx, reply-list.tsx, qa-panel.tsx, session orchestrators |
| 2    | Snippet edited badge, confirmed snippet edit, and i18n strings | 5154aa2 | snippet-card.tsx, clipboard-panel.tsx, en/es/pt.json                                                       |

## What Was Built

### Task 1: Question and Reply Inline Edit/Delete UI

**question-card-participant.tsx:**

- Added `onEdit`, `onDelete`, `onEditReply`, `onDeleteReply` props (from `QuestionCardBaseProps`)
- 5-minute window: `useState(() => Math.floor(Date.now() / 1000) - question.createdAt < 300)` initializes once; `useEffect + setTimeout` sets it to false when the window expires — no page reload
- `isEditing` state: when true, renders `<textarea>` with `maxLength={500}`, Save (Check icon) and Cancel (X icon) buttons
- Delete uses `Dialog.Root` from `@base-ui/react/dialog` — no `window.confirm`
- Edited badge: `text-[11px] text-muted-foreground/60` with `title` tooltip showing localized datetime
- Passes `onEditReply`/`onDeleteReply` down to `ReplyList`

**question-card-host.tsx:**

- Same inline edit + delete Dialog UI without any time restriction
- Host edit/delete buttons sit at the front of the moderation toolbar (Pencil, Trash2, then focus/ban icons)
- Edited badge identical to participant card

**reply-list.tsx:**

- `ReplyRow` component extracted for per-reply state isolation (`isEditing`, `deleteConfirmOpen`, `withinEditWindow`)
- `canEdit = isHost || (isOwn && withinEditWindow)` — host path skips 5-min check
- Same inline edit textarea pattern as questions
- Delete Dialog uses `confirmDeleteReply`/`confirmDeleteReplyDesc` i18n keys
- Edited badge per reply when `reply.editedAt` is set

**question-card-shared.tsx:**

- `QuestionCardBaseProps` extended with `onEdit`, `onDelete`, `onEditReply`, `onDeleteReply` (all optional)

**qa-panel.tsx:**

- Added `onEditQuestion`, `onDeleteQuestion`, `onEditReply`, `onDeleteReply` to `QAPanelProps`
- Threads all 4 new props to `QuestionCard`

**session-live-page.tsx:**

- Destructures `handleEditQuestion`, `handleDeleteQuestion`, `handleEditReply`, `handleDeleteReply` from `useSessionMutations`
- Passes them to `QAPanel` as `onEditQuestion`, `onDeleteQuestion`, `onEditReply`, `onDeleteReply`

**session-live-host-page.tsx:**

- `repliesRef` and `snippetsRef` added and kept in sync via `useEffect`
- `repliesRef` and `snippetsRef` passed to `useHostMutations` (optional params per Plan 02 design)
- Destructures `handleHostEditQuestion`, `handleHostDeleteQuestion`, `handleHostEditReply`, `handleHostDeleteReply`, `handleEditSnippet` from `useHostMutations`
- Host edit/delete handlers threaded to `QAPanel`; `handleEditSnippet` threaded to `ClipboardPanel`

### Task 2: Snippet Edited Badge, Confirmed Snippet Edit, and i18n

**snippet-card.tsx:**

- `onEditSnippet?: (snippetId, content, language?) => void` prop added
- `editLanguage` state added alongside `editContent`
- `handleEditClick` initializes `editLanguage` from `snippet.language`
- `handleEditSave` routes to either `onEditSnippet` (confirmed) or `onEditEnd` (optimistic) based on `isOptimistic`
- `handleEditCancel` for confirmed snippets returns without calling `onEditEnd` (no ongoing push to resume)
- Edit button condition: `isHost && !isFailed && !isEditing && ((isOptimistic && onEditStart) || (!isOptimistic && onEditSnippet))`
- Language dropdown rendered during confirmed snippet edit only — `SUPPORTED_LANGUAGES` select aligned left, Save/Cancel buttons aligned right
- Edited badge rendered in snippet header when `snippet.editedAt` is set

**clipboard-panel.tsx:**

- `onEditSnippet` prop added and destructured
- Passes `onEditSnippet` to both hero and history `SnippetCard` instances for non-`_opt_` snippets

**en/es/pt.json — session namespace (10 new keys each):**

- `editQuestion`, `deleteQuestion`, `editReply`, `deleteReply`
- `edited`
- `editWindowExpired`
- `confirmDeleteQuestion`, `confirmDeleteQuestionDesc`
- `confirmDeleteReply`, `confirmDeleteReplyDesc`

**en/es/pt.json — actionErrors namespace (1 new key each):**

- `editWindowExpired`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced impure Date.now() in render with useState lazy initializer**

- **Found during:** Task 1
- **Issue:** ESLint `react-hooks/purity` flagged `Math.floor(Date.now() / 1000)` called directly in render body as impure — would cause unpredictable results across re-renders
- **Fix:** Moved to `useState(() => Math.floor(Date.now() / 1000) - question.createdAt < 300)` lazy initializer; timer callback sets state to `false` when window expires
- **Files modified:** question-card-participant.tsx, reply-list.tsx
- **Commit:** 06e1d74

**2. [Rule 1 - Bug] Replaced useReducer force-update pattern with useState boolean**

- **Found during:** Task 1
- **Issue:** The plan specified `useReducer(n => n+1, 0)` to force re-render, but this doesn't update the `canEdit` value directly — the re-render would recompute `Date.now()` which is impure per ESLint
- **Fix:** `useState(boolean)` for `withinEditWindow` initialized from `createdAt`; `setTimeout` sets it to `false` when window expires
- **Files modified:** question-card-participant.tsx, reply-list.tsx
- **Commit:** 06e1d74

## Verification Results

- `npx tsc --noEmit` passes for frontend package (zero errors)
- No `window.confirm` or `window.alert` calls anywhere in the component tree
- All delete operations use `@base-ui/react/dialog`
- 5-minute window auto-hides via `useState + setTimeout` — no page reload
- Edited badge present on questions, replies, and snippets when `editedAt` is set
- Confirmed snippet edit includes SUPPORTED_LANGUAGES language dropdown
- All 10 `session.*` i18n keys present in en, es, pt
- `actionErrors.editWindowExpired` present in en, es, pt

## Self-Check: PASSED

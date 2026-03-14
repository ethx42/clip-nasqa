---
phase: 03-real-time-core
plan: 04
subsystem: frontend
tags: [appsync, subscription, state-management, useReducer, optimistic-updates, fingerprint, localStorage, real-time]

# Dependency graph
requires:
  - phase: 03-real-time-core
    plan: 01
    provides: appsyncClient, ON_SESSION_UPDATE subscription, all GraphQL mutation strings
  - phase: 03-real-time-core
    plan: 02
    provides: ClipboardPanel, pushSnippetAction, renderHighlight
  - phase: 03-real-time-core
    plan: 03
    provides: QAPanel, QuestionCard, QAInput, qa.ts Server Actions

provides:
  - useFingerprint: localStorage UUID + per-session voted-IDs (addVote/removeVote)
  - useSessionState: useReducer with 9 action types, optimistic update support, sortedQuestions derived selector
  - useSessionUpdates: AppSync subscription hook dispatching parsed events to state reducer
  - getSessionData: DynamoDB QueryCommand for SSR hydration of snippets/questions/replies
  - hashSecret: Web Crypto SubtleCrypto SHA-256 hash for client-side secret derivation
  - SessionLivePage: participant client wrapper with full real-time wiring
  - SessionLiveHostPage: host client wrapper with URL hash secret, host mutation handlers
  - deleteSnippetAction + clearClipboardAction Server Actions

affects:
  - 03-05 (reconnection banner uses useSessionUpdates connection status hook)
  - 03-06 (downvote threshold wiring reads upvoteCount from state)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useReducer for session state — single source of truth for snippets/questions/replies"
    - "Optimistic dispatch immediately, subscription event replaces optimistic item by id"
    - "URL hash fragment (#secret=...) for host secret — never sent to server, hashed client-side"
    - "SSR Server Component fetches initial data via DynamoDB Query; client mounts subscription on top"
    - "ClipboardPanel and QAPanel receive state via props — pure rendering components"

key-files:
  created:
    - packages/frontend/src/hooks/use-fingerprint.ts
    - packages/frontend/src/hooks/use-session-state.ts
    - packages/frontend/src/hooks/use-session-updates.ts
    - packages/frontend/src/lib/hash-secret.ts
    - packages/frontend/src/components/session/session-live-page.tsx
    - packages/frontend/src/components/session/session-live-host-page.tsx
  modified:
    - packages/frontend/src/lib/session.ts (added getSessionData)
    - packages/frontend/src/actions/snippet.ts (added deleteSnippetAction, clearClipboardAction)
    - packages/frontend/src/components/session/clipboard-panel.tsx (added onDeleteSnippet, onClearClipboard callbacks)
    - packages/frontend/src/components/session/session-shell.tsx (added liveIndicator slot, sessionSlug prop)
    - packages/frontend/src/app/[locale]/session/[slug]/page.tsx (rewritten to SSR + SessionLivePage wrapper)
    - packages/frontend/src/app/[locale]/session/[slug]/host/page.tsx (rewritten to SSR + SessionLiveHostPage wrapper)

key-decisions:
  - "useReducer preferred over useState array for session state — single dispatch point, easier to test, avoids stale closure issues with subscription callback"
  - "Subscription events use JSON.parse(payload) — AppSync payload is AWSJSON (serialized string)"
  - "Optimistic items prefixed _opt_ — reducer checks for this prefix when replacing with confirmed server data"
  - "REPLY_ADDED optimistic replay included in REMOVE_OPTIMISTIC — replies array filtered by id alongside snippets/questions"
  - "SessionLiveHostPage reads URL hash on mount via window.location.hash — never transmitted to server"
  - "getSessionData uses a single QueryCommand (PK = SESSION#slug) and partitions by SK prefix — no GSI required"

# Metrics
duration: 4min
completed: 2026-03-14
---

# Phase 3 Plan 04: Real-Time State Wiring Summary

**useReducer session state with 9 action types, AppSync subscription hook, localStorage fingerprint, SSR-hydrated session pages wired to live real-time state**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T16:06:26Z
- **Completed:** 2026-03-14T16:10:25Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- `useFingerprint(sessionSlug)` generates and persists a UUIDv4 in localStorage, tracks voted question IDs per session via `votes:{slug}` key, exposes `addVote`/`removeVote` callbacks
- `useSessionState` wraps `useReducer` with all 9 action types: SNIPPET_ADDED/DELETED/CLIPBOARD_CLEARED, QUESTION_ADDED/UPDATED, REPLY_ADDED, ADD_SNIPPET_OPTIMISTIC, ADD_QUESTION_OPTIMISTIC, REMOVE_OPTIMISTIC. Provides `sortedQuestions` derived selector (focused first → upvoteCount desc → createdAt desc) and `repliesByQuestion` callback
- `useSessionUpdates` subscribes to AppSync `OnSessionUpdate` for the session, switches on `eventType`, parses AWSJSON payload, and dispatches to the reducer. Cleans up via `sub.unsubscribe()` on unmount
- `getSessionData` queries DynamoDB with `PK = SESSION#slug`, partitions items by SK prefix (SNIPPET#, QUESTION#, REPLY#), filters expired TTLs, and returns sorted initial data for SSR
- `hashSecret` uses `crypto.subtle.digest('SHA-256', ...)` to derive the host secret hash client-side from the URL hash fragment
- `SessionLivePage` (participant) and `SessionLiveHostPage` (host) are `'use client'` wrappers that compose all three hooks, provide optimistic mutation handlers with rollback, and pass live state to ClipboardPanel and QAPanel
- Server Components `page.tsx` and `host/page.tsx` now call `getSessionData` for SSR hydration and render the appropriate client wrapper
- `ClipboardPanel` gained `onDeleteSnippet`/`onClearClipboard` callbacks; "Clear All" button now calls the callback on confirmation
- `SessionShell` gained optional `liveIndicator` slot (rendered next to title) and `sessionSlug` prop

## Task Commits

1. **Task 1: Session state reducer, subscription hook, fingerprint hook** - `a5f4cbc` (feat)
2. **Task 2: Wire session pages to real-time state and components** - `c481c54` (feat)

## Files Created/Modified

- `packages/frontend/src/hooks/use-fingerprint.ts` - localStorage UUID + voted-IDs per session
- `packages/frontend/src/hooks/use-session-state.ts` - useReducer with 9 action types + derived selectors
- `packages/frontend/src/hooks/use-session-updates.ts` - AppSync subscription dispatching parsed events
- `packages/frontend/src/lib/hash-secret.ts` - Web Crypto SHA-256 hex hash
- `packages/frontend/src/components/session/session-live-page.tsx` - Participant client wrapper
- `packages/frontend/src/components/session/session-live-host-page.tsx` - Host client wrapper with URL hash secret
- `packages/frontend/src/lib/session.ts` - Added getSessionData (QueryCommand + SK prefix partitioning)
- `packages/frontend/src/actions/snippet.ts` - Added deleteSnippetAction + clearClipboardAction
- `packages/frontend/src/components/session/clipboard-panel.tsx` - Added onDeleteSnippet, onClearClipboard callbacks
- `packages/frontend/src/components/session/session-shell.tsx` - Added liveIndicator slot + sessionSlug prop
- `packages/frontend/src/app/[locale]/session/[slug]/page.tsx` - Rewritten: SSR + SessionLivePage
- `packages/frontend/src/app/[locale]/session/[slug]/host/page.tsx` - Rewritten: SSR + SessionLiveHostPage

## Decisions Made

- Used `useReducer` over individual `useState` calls for session state. A single reducer handles all 9 action types cleanly and avoids stale closure issues that arise when subscription callbacks capture initial `useState` values.
- AppSync subscription payload arrives as an AWSJSON string (not a parsed object). The `useSessionUpdates` hook wraps each `JSON.parse(payload)` call in a try/catch to handle malformed events gracefully.
- Optimistic items are tagged with `_opt_` prefix IDs. The `SNIPPET_ADDED` and `QUESTION_ADDED` reducers check `optimisticId` to replace the placeholder rather than appending a duplicate.
- The `REMOVE_OPTIMISTIC` reducer filters both `snippets` and `questions` arrays in one pass — replies optimistic rollback also uses this action to remove temp reply IDs.
- Host secret is read from `window.location.hash` (`#secret=...`) on mount in `SessionLiveHostPage` and immediately hashed via `crypto.subtle` — the raw secret is never stored in React state.
- `getSessionData` issues a single `QueryCommand` with `PK = SESSION#slug` (no begin_with filter needed) and partitions by SK prefix client-side. This avoids multiple requests and is fast enough for typical session sizes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added deleteSnippetAction and clearClipboardAction Server Actions**
- **Found during:** Task 2 (implementing handleDeleteSnippet and handleClearClipboard in SessionLiveHostPage)
- **Issue:** Host handler functions called `deleteSnippetAction` and `clearClipboardAction` but these did not exist in `snippet.ts` — only `pushSnippetAction` was present
- **Fix:** Added both actions to `packages/frontend/src/actions/snippet.ts` using the existing DELETE_SNIPPET and CLEAR_CLIPBOARD mutation strings
- **Files modified:** `packages/frontend/src/actions/snippet.ts`
- **Commit:** c481c54

**2. [Rule 2 - Missing functionality] Added onDeleteSnippet/onClearClipboard callbacks to ClipboardPanel**
- **Found during:** Task 2 (SessionLiveHostPage passing host handlers to ClipboardPanel)
- **Issue:** ClipboardPanel's "Clear All" button had a stub `window.confirm()` with no callback; host page needed to wire the actual action
- **Fix:** Added optional `onDeleteSnippet` and `onClearClipboard` props to `ClipboardPanel`; updated the "Clear All" button to call `onClearClipboard?.()` on confirmation
- **Files modified:** `packages/frontend/src/components/session/clipboard-panel.tsx`
- **Commit:** c481c54

## Self-Check: PASSED

All 6 created files confirmed present. Task commits a5f4cbc and c481c54 verified in git log.

---
*Phase: 03-real-time-core*
*Completed: 2026-03-14*

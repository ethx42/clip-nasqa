---
phase: 16-optimistic-snippet-push-and-client-shiki
plan: "01"
subsystem: clipboard
tags: [optimistic-ui, state-management, ux, real-time]
dependency_graph:
  requires: []
  provides: [useHostSnippetPush, optimistic-snippet-push, snippet-numbering, pill-banner]
  affects: [session-live-host-page, clipboard-panel, host-input, snippet-card]
tech_stack:
  added: []
  patterns: [optimistic-ui, deferred-server-push, content-fingerprint-dedup, reducer-extension]
key_files:
  created:
    - packages/frontend/src/hooks/use-host-snippet-push.ts
  modified:
    - packages/frontend/src/hooks/use-session-state.ts
    - packages/frontend/src/components/session/host-input.tsx
    - packages/frontend/src/components/session/snippet-card.tsx
    - packages/frontend/src/components/session/clipboard-panel.tsx
    - packages/frontend/src/components/session/new-content-banner.tsx
    - packages/frontend/src/components/session/session-live-host-page.tsx
    - packages/frontend/messages/en.json
    - packages/frontend/messages/es.json
    - packages/frontend/messages/pt.json
decisions:
  - "Deferred push via editingSnippetIds Set check in executeServerPush — if snippet is being edited when push fires, store in pendingPushes ref and return; push fires when handleEditEnd is called with final content"
  - "Content-fingerprint dedup in SNIPPET_ADDED matches on sessionCode + content + language + type without optimisticId — mirrors QUESTION_ADDED pattern; auto-removes matched _opt_ ID from failedSnippetIds"
  - "HostInput removes isPushing state entirely — optimistic push is instant, no spinner, no disabled state"
  - "NewContentBanner always rendered (opacity-based show/hide) so CSS transition works; scroll container is relative to anchor the absolute pill"
  - "snippetNumber computed oldest-first via sort on createdAt; display order is newest-first from reducer so highest number naturally appears at top"
metrics:
  duration: "6 min"
  completed: 2026-03-18
  tasks_completed: 2
  files_changed: 10
---

# Phase 16 Plan 01: Optimistic Snippet Push + Snippet State Management Summary

Optimistic snippet push with 0ms perceived latency, failure state management with retry/dismiss, inline-editable optimistic snippets with deferred server push, persistent creation-order numbering, and compact new-content pill.

## Tasks Completed

| #   | Task                                                                             | Commit  | Key Files                                                                                                 |
| --- | -------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Reducer extensions + optimistic push hook with deferred push                     | 841bb23 | use-session-state.ts, use-host-snippet-push.ts (new)                                                      |
| 2   | Wire optimistic push into HostInput + SnippetCard + ClipboardPanel + pill banner | f4c5302 | host-input.tsx, snippet-card.tsx, clipboard-panel.tsx, new-content-banner.tsx, session-live-host-page.tsx |

## What Was Built

### `use-host-snippet-push.ts` (new hook)

Handles the full optimistic snippet push lifecycle:

- `handlePush`: generates `_opt_` tempId, dispatches `ADD_SNIPPET_OPTIMISTIC`, fires server push via `safeAction` with one silent retry; returns `{ success: true, tempId }` immediately
- `handleEditStart`: dispatches `SNIPPET_EDIT_START` to signal deferred-push guard
- `handleEditEnd`: dispatches `SNIPPET_EDIT_END`, updates `pendingPushes` ref, fires `executeServerPush` with final content
- `handleRetry`: clears failed state, retries server push once, re-dispatches `SNIPPET_PUSH_FAILED` if still failing
- `handleDismissFailed`: dispatches `REMOVE_OPTIMISTIC`, removes from `pendingPushes` ref
- `pendingPushes` ref tracks content for deferred/in-flight pushes

### `use-session-state.ts` (reducer extensions)

Four new action types: `SNIPPET_PUSH_FAILED`, `SNIPPET_RETRY`, `SNIPPET_EDIT_START`, `SNIPPET_EDIT_END`. Two new state fields: `failedSnippetIds: Set<string>` and `editingSnippetIds: Set<string>`. `REMOVE_OPTIMISTIC` cleans up both sets. `SNIPPET_ADDED` extended with content-fingerprint dedup (matches `sessionCode + content + language + type` for subscription-delivered snippets without `optimisticId`).

### `SnippetCard` (new props + states)

- `snippetNumber?: number` — renders `#N` mono badge in header
- `isFailed?: boolean` — red `border-destructive`, hides copy button, shows RefreshCw retry + X dismiss
- `isOptimistic?: boolean` + `onEditStart/onEditEnd` — shows pencil icon when optimistic and not failed; click enters `isEditing` mode with inline textarea, save (Check) and cancel (X) buttons
- On cancel, `onEditEnd` is still called with original content so the server push resumes

### `ClipboardPanel` (threading + snippet numbers)

- `snippetNumbers` via `useMemo`: sorts by `createdAt` ascending → `Map<id, number>` where oldest = 1
- Passes `snippetNumber`, `isFailed`, `isOptimistic`, `onRetry`, `onDismiss`, `onEditStart`, `onEditEnd` to each SnippetCard
- Scroll container is `relative` to anchor the absolute-positioned pill

### `HostInput` (simplified)

- Removed `isPushing` state, removed direct `pushSnippetAction` call, removed `tErrors` import
- Calls `onPush(content, lang)` from parent; clears textarea immediately
- SHIKI-07 fix: after `setValue("")`, resets `selectionStart/selectionEnd = 0` and re-focuses textarea to clear residual transparent highlight artifact

### `NewContentBanner` (pill redesign)

Changed from full-width sticky bar to `absolute top-2 left-1/2 -translate-x-1/2 rounded-full` pill with opacity transition. Always rendered; `pointer-events-none` + `opacity-0` when hidden so CSS transition works smoothly.

## Decisions Made

1. **Deferred push via editingSnippetIds check** — `executeServerPush` reads `editingSnippetIds.has(tempId)` at invocation time. If true, stores in `pendingPushes` ref and returns. `handleEditEnd` calls `executeServerPush` with final content. This ensures edited content — not original — reaches the server.

2. **Content-fingerprint dedup** — mirrors `QUESTION_ADDED` pattern. When subscription delivers a snippet without `optimisticId`, match by `sessionCode + content + language + type`. Replaces the `_opt_` entry in-place and removes it from `failedSnippetIds`. Prevents duplicates when `optimisticId` isn't threaded through the subscription path.

3. **No spinner / no isPushing** — per locked plan decision: optimistic push is instant. Button remains enabled throughout. Failed snippets stay in panel with retry affordance.

4. **NewContentBanner always rendered** — conditional `return null` breaks the CSS transition. Always render, toggle `opacity-0 pointer-events-none` vs `opacity-100`.

5. **Snippet numbering** — `useMemo` in ClipboardPanel sorts by `createdAt` ascending. The reducer sorts snippets newest-first, so display order is automatically reversed: highest number at top, descending to #1 at bottom.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing i18n keys] Added missing session namespace translation keys**

- **Found during:** Task 2 — snippet-card.tsx referenced `t("pushFailed")`, `t("editSnippet")`, `t("retryPush")`, `t("dismissFailed")`, `t("cancelEdit")`, `t("saveEdit")`, `t("cancel")`, `t("save")` which did not exist in the `session` namespace
- **Fix:** Added 8 new keys to the `session` section of all three locale files (en.json, es.json, pt.json)
- **Files modified:** packages/frontend/messages/en.json, es.json, pt.json
- **Commit:** f4c5302

## Self-Check: PASSED

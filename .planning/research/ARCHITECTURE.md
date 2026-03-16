# Architecture Research: Participant & Host UX Refactor (v1.3)

**Domain:** Decomposition of monolithic session components in a real-time Next.js + AppSync app
**Researched:** 2026-03-16
**Confidence:** HIGH — all findings derived directly from source code analysis of the existing codebase

---

## Context: What This Document Covers

This is integration-focused research for v1.3. It answers exactly three questions:

1. How should the existing session components be restructured?
2. What are the integration points between extracted hooks, decomposed components, and shared utilities?
3. In what order should the work be done?

It does not re-document base architecture already covered in `.planning/codebase/ARCHITECTURE.md`.

---

## Existing System: Diagnosis

Before prescribing the target structure, here is an accurate diagnosis of each problem component based on direct source code analysis.

### SessionLivePage + SessionLiveHostPage (God Orchestrators)

Both files share the same structural problem. They directly define 6-9 async mutation handlers inline, interleaving optimistic dispatch, fingerprint tracking, Server Action calls, and error rollback. The two files are nearly 50% duplicated — `handleUpvote`, `handleDownvote`, `handleAddQuestion`, and `handleReply` are copy-pasted between them with one line difference (`isHostReply: true/false`).

**Lines:** `session-live-page.tsx` ~260 lines, `session-live-host-page.tsx` ~335 lines.
**Duplication:** `handleUpvote` (28 lines × 2), `handleDownvote` (50 lines × 2), `handleAddQuestion` (26 lines × 2), `handleReply` (30 lines × 2).
**Root cause:** Mutation logic lives in the component instead of a dedicated hook.

### QAPanel: Duplicate Sorting

`QAPanel` re-implements the sorting + debouncing logic that `useSessionState` already owns. The hook exports `sortedQuestions`, but `QAPanel` ignores it and performs its own `useMemo` sort with a separate debounced snapshot (`debouncedQuestions`). This means sorting logic runs twice and lives in two places.

The debounced visual stability (cards don't jump on every vote) is a legitimate concern — but it belongs in the hook, not the panel. The panel should accept a pre-sorted list and own only scroll position + banner visibility.

### QuestionCard: Four Visual States in One Component

`QuestionCard` handles four distinct rendering paths with early returns:

1. **Banned:** Tombstone card (`question.isBanned`)
2. **Community-hidden (collapsed):** Dimmed expand prompt (`question.isHidden && !showHiddenContent`)
3. **Community-hidden (expanded):** Full card with amber "hidden" badge overlay
4. **Normal / focused:** Full card with optional focused glow

Each path has different markup, different action availability, and different host controls. They share only the outer container and the props signature. The 430-line result is hard to navigate and hard to test in isolation.

### formatRelativeTime: Duplicated in 5 Files

The function exists in 5 locations:

| File                  | Variant                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| `clipboard-panel.tsx` | Uses `Date.now()` in ms, converts to minutes                              |
| `snippet-card.tsx`    | Uses `Date.now()` in ms, hardcoded English strings ("just now", "1m ago") |
| `snippet-hero.tsx`    | Identical to `snippet-card.tsx`                                           |
| `question-card.tsx`   | Uses `Math.floor(Date.now() / 1000)` in seconds, uses `t()` for i18n      |
| `reply-list.tsx`      | Identical to `question-card.tsx`                                          |

The variants differ in two ways: unit (ms vs seconds) and i18n (hardcoded strings vs `t()` keys). The correct canonical form uses seconds and i18n keys — this is what `question-card.tsx` and `reply-list.tsx` use. The `snippet-card.tsx` and `snippet-hero.tsx` variants have already-stale hardcoded English.

### repliesByQuestion: Computed Without Memoization

`QAPanel` computes `repliesByQuestion` (Map grouping) inline on every render with a plain `for` loop — no `useMemo`. This runs on every re-render triggered by any state change (scroll events, vote updates, banner visibility). With 100 replies and high-frequency AppSync events during a live session, this is unnecessary allocation work.

`useSessionState` already exports a `repliesByQuestion` callback, but `QAPanel` ignores it and recalculates locally.

### SessionShell: Missing ARIA Semantics

The mobile tab bar uses `<button>` elements with custom styling but no `role="tablist"` / `role="tab"` / `aria-selected` semantics. Screen readers cannot identify this as a tab interface.

### SnippetCard: Embedded in clipboard-panel.tsx

The `SnippetCard` function component lives inside `clipboard-panel.tsx` (lines 49-139). It is not exported, not testable in isolation, and cannot be imported by other components. The `snippet-card.tsx` file that already exists in the session folder is a Server Component variant used in a different context — these need to be rationalized.

---

## Target Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PAGE LAYER (Server Components)                  │
│  app/[locale]/session/[slug]/page.tsx                                    │
│  app/[locale]/session/[slug]/host/page.tsx                               │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ passes initialData props
┌──────────────────────────────────▼──────────────────────────────────────┐
│                      COMPOSITION ROOT (Client Components)                │
│                                                                          │
│  SessionLivePage (participant)    SessionLiveHostPage (host)             │
│    - useSessionState              - useSessionState                      │
│    - useSessionUpdates            - useSessionUpdates                    │
│    - useFingerprint               - useFingerprint                       │
│    - useIdentity                  - useIdentity                          │
│    - useSessionMutations (NEW)    - useSessionMutations (NEW)            │
│    - ~40 lines of composition     - ~50 lines of composition             │
└──────────┬────────────────────────────────────────────────┬─────────────┘
           │                                                │
┌──────────▼────────────────┐                 ┌────────────▼──────────────┐
│       SessionShell        │                 │  (no additional layer)    │
│  - tab state              │                 │                           │
│  - ARIA tablist           │                 │                           │
│  - clipboardSlot / qaSlot │                 │                           │
└──────────┬────────────────┘                 └───────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼───┐   ┌────▼────┐
│Clip.  │   │QAPanel  │
│Panel  │   │         │
│       │   │ - scroll │
│ - scr │   │ - banner │
│ - ban │   │ - sorted │
│ - pag │   │   Qs     │
└───┬───┘   └────┬────┘
    │             │
┌───▼───┐   ┌────▼──────────┐
│Snippet│   │ QuestionCard  │
│Card   │   │ (split into   │
│(file) │   │  variants)    │
└───────┘   └───────────────┘
```

### Hook Layer: What Each Hook Owns

```
useSessionState     → reducer + sorted questions + repliesByQuestion (debounced)
useSessionUpdates   → AppSync subscription + connectionStatus + lastHostActivity
useFingerprint      → device identity + vote tracking (localStorage)
useIdentity         → optional display name + email (localStorage)
useSessionMutations → all async mutation handlers (NEW — extracted from both pages)
```

### Component Layer: What Each Component Owns

```
SessionLivePage / SessionLiveHostPage
  → composition only: wire hooks → panels → shell

SessionShell
  → tab bar with ARIA semantics, layout, badge counts

ClipboardPanel
  → scroll container, new-snippet banner, pagination sentinel
  → renders SnippetCard (imported, not embedded)

SnippetCard (own file, client component)
  → hero/compact variants, expand toggle, delete button, Shiki rendering

QAPanel
  → scroll container, new-question banner
  → receives pre-sorted questions from useSessionState
  → uses repliesByQuestion from useSessionState (memoized)
  → no sorting logic of its own

QuestionCardNormal      → full card: voting, replies, host controls
QuestionCardBanned      → tombstone card
QuestionCardHidden      → collapse/expand prompt + host restore
```

---

## Recommended Project Structure (delta from current)

```
packages/frontend/src/
├── hooks/
│   ├── use-session-state.ts        MODIFIED — add debounced sort, expose repliesByQuestion as memo
│   ├── use-session-updates.ts      unchanged
│   ├── use-fingerprint.ts          unchanged
│   ├── use-identity.ts             unchanged
│   └── use-session-mutations.ts    NEW — extracted mutation handlers
│
├── lib/
│   └── format-relative-time.ts     NEW — canonical shared utility
│
└── components/session/
    ├── session-live-page.tsx        MODIFIED — ~40 lines after extraction
    ├── session-live-host-page.tsx   MODIFIED — ~50 lines after extraction
    ├── session-shell.tsx            MODIFIED — ARIA tablist semantics
    ├── clipboard-panel.tsx          MODIFIED — remove embedded SnippetCard, import it
    ├── snippet-card-live.tsx        NEW — client SnippetCard extracted from clipboard-panel
    ├── qa-panel.tsx                 MODIFIED — remove sorting, accept sorted props
    ├── question-card.tsx            MODIFIED — routes to variant subcomponents
    ├── question-card-normal.tsx     NEW — full normal/focused card
    ├── question-card-banned.tsx     NEW — tombstone variant
    ├── question-card-hidden.tsx     NEW — community-hidden variant
    ├── qa-input.tsx                 MODIFIED — identity chip in input area
    ├── reply-list.tsx               MODIFIED — use shared formatRelativeTime
    ├── new-content-banner.tsx       MODIFIED — add aria-live="polite"
    └── [other files unchanged]
```

Note on naming: The existing `snippet-card.tsx` is a Server Component used in the initial page render. The new `snippet-card-live.tsx` is the Client Component currently embedded in `clipboard-panel.tsx`. Both serve different purposes and should not be merged.

---

## Architectural Patterns

### Pattern 1: Mutation Hook Extraction

**What:** Extract all async mutation handlers from a composition root component into a dedicated hook. The hook receives `dispatch`, `fingerprint`, `sessionSlug`, and `hostSecretHash` as parameters. It returns named handler functions. The component calls the hook and spreads or passes the handlers to child panels.

**When to use:** When a component's render method is dominated by non-render code (async functions, optimistic dispatch patterns, error toasts). The composition root should be ~40 lines of "wire A to B" not 300 lines of "implement A."

**Trade-offs:** Adds one indirection layer. Handlers in a hook cannot access component-local state unless passed as parameters — this is a feature, not a bug (forces explicit data flow).

**Shape:**

```typescript
// hooks/use-session-mutations.ts

interface UseSessionMutationsArgs {
  sessionSlug: string;
  dispatch: React.Dispatch<SessionAction>;
  fingerprint: string;
  authorName: string | undefined;
  votedIds: Set<string>;
  downvotedIds: Set<string>;
  addVote: (id: string) => void;
  removeVote: (id: string) => void;
  addDownvote: (id: string) => void;
  removeDownvote: (id: string) => void;
  // Host-only (optional):
  hostSecretHash?: string;
}

interface UseSessionMutationsResult {
  // Shared
  handleUpvote: (questionId: string, remove: boolean) => Promise<void>;
  handleDownvote: (questionId: string, remove: boolean) => Promise<void>;
  handleAddQuestion: (text: string) => Promise<void>;
  handleReply: (questionId: string, text: string) => Promise<void>;
  // Host-only (undefined when no hostSecretHash)
  handleDeleteSnippet?: (snippetId: string) => Promise<void>;
  handleClearClipboard?: () => Promise<void>;
  handleFocusQuestion?: (questionId: string | undefined) => Promise<void>;
  handleBanQuestion?: (questionId: string) => Promise<void>;
  handleBanParticipant?: (participantFingerprint: string) => Promise<void>;
  handleRestoreQuestion?: (questionId: string) => Promise<void>;
}
```

The participant page passes no `hostSecretHash` — host-only handlers remain `undefined` and are not passed to panels. This eliminates the need for the panels to conditionally check `isHost` for actions they should never call.

### Pattern 2: Debounced Sort in Hook, Not in Panel

**What:** Move the debounced sort (visual stability of card order under fast vote changes) out of `QAPanel` and into `useSessionState`. The hook's `sortedQuestions` return value already does an immediate sort; add a `debouncedSortedQuestions` alongside it that uses a 1-second debounce on order. Expose only `debouncedSortedQuestions` from the hook (rename to `sortedQuestions` — same API, better implementation location).

**Why this location:** The hook owns session state. Sort order is derived state from session state. Debouncing the sort is a refinement of that derivation. `QAPanel` should own scroll behavior, not data ordering.

**When to use:** When a panel re-implements derived data transformations that the upstream hook already conceptually owns.

**Implementation note:** The existing `QAPanel` debounce is correctly structured (debounce on questions array → stable orderMap → apply to latest questions). The logic should move verbatim; only the location changes.

### Pattern 3: repliesByQuestion Memoization

**What:** `QAPanel` currently builds `repliesByQuestion` (a `Map<string, Reply[]>`) on every render. Move to `useMemo` keyed on `state.replies`. The `useSessionState` hook already exports a `repliesByQuestion` callback — but it's a function, not a Map. Change it to return the pre-computed Map directly, computed once with `useMemo`.

**Current shape (keep as is — already correct pattern, just needs `useMemo`):**

```typescript
// In useSessionState:
const repliesByQuestion = useCallback(
  (questionId: string) => state.replies.filter(...).sort(...),
  [state.replies]
);
```

**Recommended change:**

```typescript
const repliesByQuestionMap = useMemo(() => {
  const map = new Map<string, Reply[]>();
  for (const reply of state.replies) {
    const existing = map.get(reply.questionId) ?? [];
    existing.push(reply);
    map.set(reply.questionId, existing);
  }
  // sort each group by createdAt asc
  for (const [id, replies] of map) {
    map.set(
      id,
      [...replies].sort((a, b) => a.createdAt - b.createdAt),
    );
  }
  return map;
}, [state.replies]);
```

`QAPanel` receives this Map as a prop and calls `repliesByQuestionMap.get(question.id) ?? []`.

### Pattern 4: QuestionCard Variant Decomposition

**What:** `QuestionCard` dispatches to four rendering paths. Extract each path into its own component. The parent `QuestionCard` (or the list renderer in `QAPanel`) acts as a discriminator that selects the right variant.

**Two valid approaches:**

**Approach A — Discriminator in QuestionCard (recommended):**

```typescript
// question-card.tsx (new role: discriminator)
export function QuestionCard(props: QuestionCardProps) {
  if (props.question.isBanned) return <QuestionCardBanned />;
  if (props.question.isHidden) return <QuestionCardHidden {...props} />;
  return <QuestionCardNormal {...props} />;
}
```

`QAPanel` continues to render `<QuestionCard>` with no awareness of variants. The discriminator is co-located with the type logic.

**Approach B — Discriminator in QAPanel:**

`QAPanel` selects the variant directly. More explicit, but couples the list renderer to the variant taxonomy.

Approach A is recommended because `QAPanel` does not need to know why a card looks different — it only needs to show a card. The variant is an implementation detail of the card.

**Props per variant:**

```typescript
// question-card-banned.tsx — minimal props
interface QuestionCardBannedProps {
  question: Pick<Question, "id">; // only id needed for key
}

// question-card-hidden.tsx
interface QuestionCardHiddenProps {
  question: Question;
  isHost: boolean;
  onRestore?: (questionId: string) => void;
}

// question-card-normal.tsx — full props (same as current QuestionCardProps minus isBanned/isHidden paths)
interface QuestionCardNormalProps {
  question: Question;
  replies: Reply[];
  isHost: boolean;
  fingerprint: string;
  votedQuestionIds: Set<string>;
  downvotedQuestionIds: Set<string>;
  onUpvote: (questionId: string, remove: boolean) => void;
  onDownvote: (questionId: string, remove: boolean) => void;
  onReply: (questionId: string, text: string) => void;
  onFocus?: (questionId: string | undefined) => void;
  onBanQuestion?: (questionId: string) => void;
  onBanParticipant?: (participantFingerprint: string) => void;
}
```

`QuestionCardNormal` will be roughly 250 lines — still large, but it has a single coherent rendering path and can be tested in isolation with a single state configuration.

### Pattern 5: Shared formatRelativeTime Utility

**What:** Create `packages/frontend/src/lib/format-relative-time.ts` with a single canonical implementation. All components import from this location.

**Canonical form (seconds-based + i18n):**

```typescript
// lib/format-relative-time.ts
type TFunction = (key: string, values?: Record<string, number>) => string;

export function formatRelativeTime(createdAtSeconds: number, t: TFunction): string {
  const now = Math.floor(Date.now() / 1000);
  const diffSeconds = now - createdAtSeconds;

  if (diffSeconds < 60) return t("timeJustNow");
  if (diffSeconds < 3600) return t("timeMinutesAgo", { count: Math.floor(diffSeconds / 60) });
  if (diffSeconds < 86400) return t("timeHoursAgo", { count: Math.floor(diffSeconds / 3600) });
  return t("timeDaysAgo", { count: Math.floor(diffSeconds / 86400) });
}
```

**Files to migrate:** `question-card.tsx`, `reply-list.tsx`, `clipboard-panel.tsx` (the embedded `SnippetCard`), `snippet-card.tsx`, `snippet-hero.tsx`.

The `snippet-card.tsx` and `snippet-hero.tsx` variants currently use hardcoded English strings. After migration they will use i18n keys — this is a breaking improvement (they gain localization support they currently lack).

**Note on the `t` parameter:** `snippet-card.tsx` and `snippet-hero.tsx` are Server Components that currently do not call `useTranslations`. After migration, they will need `const t = await getTranslations("session")` (the server-side equivalent). This is a minor addition, not a structural change.

---

## Data Flow

### Before: Mutation in Component

```
User action (click upvote)
    ↓
QuestionCard.handleUpvoteClick()
    ↓ calls
QAPanel.onUpvote(questionId, remove)  ← prop drilled from parent
    ↓ calls
SessionLivePage.handleUpvote(questionId, remove)  ← defined inline in component
    ↓
dispatch(QUESTION_UPDATED, optimistic delta)   ← optimistic
addVote(questionId) / removeVote(questionId)   ← fingerprint tracking
upvoteQuestionAction(...)                      ← Server Action
    ↓ on error
dispatch(QUESTION_UPDATED, rollback delta)
removeVote / addVote (revert)
toast.error(...)
```

### After: Mutation in Hook

```
User action (click upvote)
    ↓
QuestionCardNormal.handleUpvoteClick()
    ↓ calls
QAPanel.onUpvote(questionId, remove)  ← prop from parent (unchanged)
    ↓ calls
useSessionMutations.handleUpvote(questionId, remove)  ← hook result
    ↓
[same dispatch / fingerprint / Server Action / rollback pattern]
[now in one place, not duplicated across two page components]
```

### Subscription Flow (unchanged)

```
AppSync WebSocket event
    ↓
useSessionUpdates.subscribe (unchanged)
    ↓ dispatch(QUESTION_UPDATED | SNIPPET_ADDED | ...)
useSessionState reducer (unchanged)
    ↓ state update
sortedQuestions / repliesByQuestionMap recomputed (useMemo)
    ↓
QAPanel re-renders with new sorted list
QuestionCard re-renders with new reply list
```

---

## New vs. Modified: Explicit List

### NEW files

| File                                                                | Purpose                                                                |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `packages/frontend/src/hooks/use-session-mutations.ts`              | All async mutation handlers, shared between participant and host pages |
| `packages/frontend/src/lib/format-relative-time.ts`                 | Canonical i18n-aware relative time formatter                           |
| `packages/frontend/src/components/session/snippet-card-live.tsx`    | Client SnippetCard extracted from `clipboard-panel.tsx`                |
| `packages/frontend/src/components/session/question-card-normal.tsx` | Normal/focused question card variant                                   |
| `packages/frontend/src/components/session/question-card-banned.tsx` | Banned (tombstone) question card variant                               |
| `packages/frontend/src/components/session/question-card-hidden.tsx` | Community-hidden question card variant                                 |

### MODIFIED files

| File                                                                  | What Changes                                                                                               |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `packages/frontend/src/components/session/session-live-page.tsx`      | Remove all inline handlers; call `useSessionMutations`; pass returned handlers to panels; ~40 lines result |
| `packages/frontend/src/components/session/session-live-host-page.tsx` | Same as above + host-secret setup remains; ~50 lines result                                                |
| `packages/frontend/src/hooks/use-session-state.ts`                    | Add debounced sort (move from QAPanel); change `repliesByQuestion` from callback to `useMemo` Map          |
| `packages/frontend/src/components/session/qa-panel.tsx`               | Remove local sort + debounce; remove local repliesByQuestion; accept sorted questions + Map as props       |
| `packages/frontend/src/components/session/clipboard-panel.tsx`        | Remove embedded `SnippetCard` function; import `SnippetCardLive` instead                                   |
| `packages/frontend/src/components/session/question-card.tsx`          | Become discriminator: check isBanned/isHidden, delegate to variant components                              |
| `packages/frontend/src/components/session/session-shell.tsx`          | Add `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` to mobile tab buttons                 |
| `packages/frontend/src/components/session/new-content-banner.tsx`     | Add `aria-live="polite"` to the sticky banner container                                                    |
| `packages/frontend/src/components/session/qa-input.tsx`               | Add identity chip (avatar + name display, click to open IdentityEditor)                                    |
| `packages/frontend/src/components/session/reply-list.tsx`             | Import `formatRelativeTime` from `lib/format-relative-time.ts` instead of inline copy                      |
| `packages/frontend/src/components/session/snippet-card.tsx`           | Import `formatRelativeTime` from `lib/format-relative-time.ts`; add `getTranslations`                      |
| `packages/frontend/src/components/session/snippet-hero.tsx`           | Same as snippet-card.tsx                                                                                   |

### NOT modified

| File                                                           | Why untouched                                                          |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `packages/frontend/src/hooks/use-session-updates.ts`           | No changes to subscription behavior                                    |
| `packages/frontend/src/hooks/use-fingerprint.ts`               | No new tracking needed for this milestone                              |
| `packages/frontend/src/hooks/use-identity.ts`                  | No interface changes                                                   |
| `packages/frontend/src/components/session/host-input.tsx`      | No changes in scope                                                    |
| `packages/frontend/src/components/session/host-toolbar.tsx`    | No changes in scope                                                    |
| `packages/frontend/src/components/session/live-indicator.tsx`  | No changes in scope                                                    |
| `packages/frontend/src/components/session/identity-editor.tsx` | Already a standalone component; QAInput links to it, not the other way |
| All Server Actions (`/actions/*`)                              | Mutation handlers call them unchanged; no signature changes            |

---

## Build Order

Dependencies flow from the bottom of the call chain upward. Each step must be complete before the steps that depend on it.

```
STEP 1: Shared utility
  Create lib/format-relative-time.ts (canonical implementation).
  Why first: Everything that uses time display can be updated to import
  from here. No dependencies — pure function.
  Files: packages/frontend/src/lib/format-relative-time.ts (NEW)

STEP 2: Migrate formatRelativeTime consumers
  Update reply-list.tsx, question-card.tsx, clipboard-panel.tsx (its
  embedded SnippetCard), snippet-card.tsx, snippet-hero.tsx to import
  from step 1. Add getTranslations to the two Server Components.
  Why second: Before extracting SnippetCard from clipboard-panel in step 4,
  the embedded function should already be using the shared utility so the
  extracted file is clean from day one.
  Files: reply-list.tsx, question-card.tsx, snippet-card.tsx,
         snippet-hero.tsx (all MODIFIED)

STEP 3: useSessionState — debounced sort + memoized repliesByQuestion
  Move the debounced sort logic from QAPanel into useSessionState.
  Rename output to sortedQuestions (same name, different origin).
  Change repliesByQuestion from a callback to a useMemo Map.
  Why third: QAPanel (step 5) and both page components depend on this.
  If done after QAPanel, there is a temporary state where the hook and
  the panel both own sorting — worse than the current situation.
  Files: packages/frontend/src/hooks/use-session-state.ts (MODIFIED)

STEP 4: Extract SnippetCard from ClipboardPanel
  Move the embedded SnippetCard function to snippet-card-live.tsx.
  Update clipboard-panel.tsx to import it.
  Why fourth: Independent of mutation extraction. This is pure co-location
  cleanup with no behavioral change. Do it before mutation extraction
  to keep step 5's diff focused on logic, not component movement.
  Files: packages/frontend/src/components/session/snippet-card-live.tsx (NEW)
         packages/frontend/src/components/session/clipboard-panel.tsx (MODIFIED)

STEP 5: Extract useSessionMutations
  Create the hook. Move all mutation handlers from session-live-page.tsx
  and session-live-host-page.tsx into it. Start with the shared handlers
  (handleUpvote, handleDownvote, handleAddQuestion, handleReply), then add
  the host-only handlers (handleDeleteSnippet, handleClearClipboard,
  handleFocusQuestion, handleBanQuestion, handleBanParticipant,
  handleRestoreQuestion).
  Why fifth: Both page components (step 6) depend on this hook. The hook
  itself depends only on dispatch (from useSessionState, step 3) and
  fingerprint tracking (unchanged).
  Files: packages/frontend/src/hooks/use-session-mutations.ts (NEW)

STEP 6: Slim down page components
  Update session-live-page.tsx and session-live-host-page.tsx to call
  useSessionMutations and pass the returned handlers to panels.
  Remove all inline handler definitions.
  Why sixth: Depends on the hook from step 5. After this step,
  both pages should be composition-only: hook calls + JSX structure.
  Files: session-live-page.tsx (MODIFIED)
         session-live-host-page.tsx (MODIFIED)

STEP 7: Update QAPanel to remove sorting
  Remove the useMemo sort, the debounced state, and the inline
  repliesByQuestion Map construction from QAPanel. It now accepts
  sortedQuestions directly and uses the Map from useSessionState.
  Update props interface to reflect this.
  Why seventh: Step 3 must be complete first (the hook now provides
  these). Doing this before page components are slimmed is fine,
  but doing it before the hook is ready would break the app.
  Files: packages/frontend/src/components/session/qa-panel.tsx (MODIFIED)
         session-live-page.tsx (MODIFIED — update QAPanel props)
         session-live-host-page.tsx (MODIFIED — update QAPanel props)

STEP 8: Decompose QuestionCard into variants
  Create QuestionCardBanned, QuestionCardHidden, QuestionCardNormal.
  Update QuestionCard to be a discriminator that routes to variants.
  Why eighth: Depends on steps 2 (formatRelativeTime already migrated),
  step 7 (QAPanel already cleaned). The variant components do not depend
  on any of the hook changes from steps 3-6.
  Files: question-card-normal.tsx (NEW)
         question-card-banned.tsx (NEW)
         question-card-hidden.tsx (NEW)
         question-card.tsx (MODIFIED — becomes discriminator)

STEP 9: SessionShell ARIA semantics
  Add role="tablist", role="tab", aria-selected, aria-controls to
  the mobile tab buttons.
  Why ninth: Independent of all above steps. Can be done any time, but
  placing it last avoids merge conflicts with any other changes to the
  shell layout. It is a pure markup addition with no logic changes.
  Files: packages/frontend/src/components/session/session-shell.tsx (MODIFIED)

STEP 10: NewContentBanner aria-live + QAInput identity chip
  Add aria-live="polite" to NewContentBanner.
  Add identity chip to QAInput (avatar + name, click to edit).
  Why tenth: Both are self-contained UI changes. Placing them last
  avoids interfering with the structural changes in steps 1-9.
  The identity chip reads from useIdentity (unchanged hook) and
  opens IdentityEditor (unchanged component) — no new hook required.
  Files: new-content-banner.tsx (MODIFIED)
         qa-input.tsx (MODIFIED)
```

---

## Integration Points

### Internal Boundaries

| Boundary                                                                                                                                      | Communication                                                                                   | Notes                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `session-live-page.tsx` ↔ `use-session-mutations.ts`                                                                                          | Direct hook call                                                                                | Page passes dispatch, fingerprint, sessionSlug, authorName as args; receives handler functions back                |
| `session-live-host-page.tsx` ↔ `use-session-mutations.ts`                                                                                     | Same as above + hostSecretHash                                                                  | Host-only handlers only non-undefined when hostSecretHash is present                                               |
| `use-session-mutations.ts` ↔ `use-session-state.ts`                                                                                           | `dispatch` parameter                                                                            | Hook receives dispatch as a parameter, not via context — explicit dependency                                       |
| `use-session-mutations.ts` ↔ `use-fingerprint.ts`                                                                                             | `addVote`, `removeVote`, `addDownvote`, `removeDownvote`, `votedIds`, `downvotedIds` parameters | Fingerprint tracking stays in useFingerprint; mutation hook coordinates between fingerprint state and server calls |
| `qa-panel.tsx` ↔ `use-session-state.ts`                                                                                                       | Props: `sortedQuestions: Question[]`, `repliesByQuestionMap: Map<string, Reply[]>`              | Panel no longer owns derivation; hook owns it                                                                      |
| `question-card.tsx` ↔ variant components                                                                                                      | Direct JSX import                                                                               | Discriminator selects variant; QAPanel sees only QuestionCard                                                      |
| `clipboard-panel.tsx` ↔ `snippet-card-live.tsx`                                                                                               | Direct JSX import                                                                               | SnippetCardLive exported from its own file, imported into panel                                                    |
| `reply-list.tsx`, `question-card-normal.tsx`, `snippet-card-live.tsx`, `snippet-card.tsx`, `snippet-hero.tsx` ↔ `lib/format-relative-time.ts` | Named import                                                                                    | Single source of truth for relative time formatting                                                                |
| `qa-input.tsx` ↔ `use-identity.ts`                                                                                                            | `useIdentity()` call inside QAInput                                                             | QAInput reads identity to display chip; already used in session-live-page.tsx                                      |
| `qa-input.tsx` ↔ `identity-editor.tsx`                                                                                                        | State: `showEditor` boolean + render IdentityEditor inside/alongside                            | QAInput triggers editor open; editor manages its own form state                                                    |

### External Services

No changes to external service integration. All AppSync mutations, DynamoDB reads, and subscription patterns remain identical. This milestone is purely frontend restructuring.

---

## Scaling Considerations

| Concern             | Impact of Refactor                                                                            | Notes                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Re-render frequency | Improved — repliesByQuestion Map computed once per replies change, not per render             | At 100 questions + high-frequency vote events, this eliminates ~100 Map constructions per vote event |
| Sort stability      | Unchanged — debounced sort already exists, just moved to hook                                 | No behavioral change for participants                                                                |
| Bundle size         | Neutral to slightly better — extracted files enable better tree-shaking of variant components | `QuestionCardBanned` and `QuestionCardHidden` are much smaller than the monolithic card              |
| Test surface        | Improved — each variant testable in isolation with minimal props                              | `QuestionCardBanned` needs only `question.id` to render                                              |

---

## Anti-Patterns

### Anti-Pattern 1: Moving Logic Without Moving Tests

**What people do:** Extract `handleUpvote` into a hook, but leave test coverage gaps because the function "moved but wasn't changed."

**Why it's wrong:** The extraction changes the function's calling context. Edge cases around optimistic rollback (the `state.questions.find` pattern for downvote count) should be tested in the hook's unit tests, not assumed correct.

**Do this instead:** Write unit tests for `useSessionMutations` as part of step 5. The existing mutation logic is non-trivial (mutual exclusion between upvote/downvote, count floor at 0) and deserves isolated test coverage at the hook level.

### Anti-Pattern 2: Discriminator in the List Renderer

**What people do:** Put the isBanned/isHidden branching in `QAPanel`'s `.map()` call because "it's more explicit."

**Why it's wrong:** `QAPanel` should not need to import and know about `QuestionCardBanned`, `QuestionCardHidden`, and `QuestionCardNormal`. This couples the list renderer to the card's internal state taxonomy. If a new variant is added (e.g., a pinned/sponsored question type), `QAPanel` would need to change even though it renders cards, not decides what kind of card to show.

**Do this instead:** Discriminator in `QuestionCard` (Approach A from Pattern 4). `QAPanel` imports only `QuestionCard`. The card decides which variant to render.

### Anti-Pattern 3: Prop Drilling repliesByQuestionMap Through Page

**What people do:** Have the page component compute `repliesByQuestionMap` from `state.replies` and pass it through as a prop chain: `Page → QAPanel → QuestionCard`.

**Why it's wrong:** The page component is a composition root — it should not derive data. It should wire hooks to components. Derivation belongs in the hook.

**Do this instead:** `useSessionState` returns `repliesByQuestionMap` directly. `QAPanel` receives `sortedQuestions` and `repliesByQuestionMap` as props from the page. `QuestionCard` receives only its own `replies: Reply[]` slice. The Map lookup (`repliesByQuestionMap.get(question.id) ?? []`) happens in `QAPanel`, not in the page.

### Anti-Pattern 4: Creating a God Hook to Replace the God Component

**What people do:** Extract all mutation logic, state management, subscription handling, AND derived data into a single `useSession` hook that returns 20+ values.

**Why it's wrong:** Replaces one monolith with another. Any change to subscription handling would require touching the same file as vote mutation logic.

**Do this instead:** Keep the existing hook separation (`useSessionState`, `useSessionUpdates`, `useFingerprint`, `useIdentity`). Only extract `useSessionMutations` — it has a clear, bounded responsibility: async write operations with optimistic updates. The composition root calls all hooks and wires their outputs together. That's the composition root's job.

---

## Sources

All findings are HIGH confidence — derived from direct source code analysis of the existing codebase. No external sources required for a restructuring milestone.

- `packages/frontend/src/components/session/session-live-page.tsx` — duplicate mutation handlers (source of `useSessionMutations` extraction)
- `packages/frontend/src/components/session/session-live-host-page.tsx` — same pattern, host-specific handlers
- `packages/frontend/src/components/session/qa-panel.tsx` — duplicate sort + inline repliesByQuestion (source of hook migration)
- `packages/frontend/src/hooks/use-session-state.ts` — existing `repliesByQuestion` callback, existing sort; basis for memoized Map
- `packages/frontend/src/components/session/question-card.tsx` — four-state rendering paths documented at lines 141-172 (banned), 150-172 (hidden), 175+ (normal/focused)
- `packages/frontend/src/components/session/clipboard-panel.tsx` — embedded `SnippetCard` at lines 49-139
- `formatRelativeTime` duplication confirmed in: `clipboard-panel.tsx`, `snippet-card.tsx`, `snippet-hero.tsx`, `question-card.tsx`, `reply-list.tsx` (5 files, 2 divergent implementations)

---

_Architecture research for: Participant & Host UX Refactor — Nasqa Live v1.3_
_Researched: 2026-03-16_

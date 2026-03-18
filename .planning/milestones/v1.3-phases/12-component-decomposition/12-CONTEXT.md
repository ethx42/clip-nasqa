# Phase 12: Component Decomposition - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Split three monolithic display concerns at clean boundaries: SnippetCard is independently importable without ClipboardPanel, sort logic for the Q&A feed exists in exactly one place, and QuestionCard routes to distinct host and participant variants. No new features — this is structural decomposition only.

</domain>

<decisions>
## Implementation Decisions

### QuestionCard variant split

- Two separate files: `QuestionCardHost.tsx` and `QuestionCardParticipant.tsx`
- Shared base contains: card layout shell, vote column, content body, reply system
- Host variant adds: moderation toolbar (focus, ban question, ban participant) and ban confirmation dialog
- Participant variant is the clean version without moderation controls
- QAPanel selects the correct variant internally based on its existing `isHost` prop — no page-level changes needed
- Ban confirmation dialog stays inside QuestionCardHost (self-contained, one dialog per card)

### Sort logic extraction

- Pure function `sortQuestions()` in `lib/sort-questions.ts` — no React dependency
- Canonical sort order: focused first → upvotes descending → recency descending (current behavior preserved)
- Debounce logic stays in the consuming component (QAPanel), not in the utility
- Sort-only responsibility — visibility filtering (banned/hidden) remains separate in the consumer

### SnippetCard decoupling

- Consolidate the two existing SnippetCards into one: extract the richer inline version from `clipboard-panel.tsx` into its own file, remove the simpler server component in `snippet-card.tsx`
- Client component that calls `renderHighlight` on mount/expand (lazy highlighting, matches current behavior)
- Keep `variant` prop (`hero` | `compact`) on the single extracted component
- Delete confirmation stays in ClipboardPanel — SnippetCard fires `onDelete` callback, parent handles dialog and actual deletion
- SnippetCard must be importable and renderable in a Vitest component test without pulling in ClipboardPanel

### State transition animations

- Normal → hidden (community downvotes): card collapses smoothly in-place to the "Hidden by community" tombstone row — height reduction with fade, no position change
- Normal → banned (host action): same collapse-to-tombstone pattern as hidden — consistent mental model for content disappearing
- QAPanel owns list-level animations (AnimatePresence wrapping the question map) — enter/exit for items added/removed from the list
- QuestionCard variants own internal state transitions (normal ↔ hidden ↔ banned) but not list enter/exit
- Question reorder (upvote causes re-sort): animate position change via Framer Motion layout animation — the 1s debounce prevents constant jumping, smooth slide after debounce settles

### Claude's Discretion

- Exact file structure for shared base (composition pattern, render props, or simple function extraction)
- How to structure the shared base module that both variants import from
- Internal animation timing and easing curves for state transitions
- Whether to extract a shared animation config or keep motion values inline

</decisions>

<specifics>
## Specific Ideas

- The shared base between QuestionCard variants should be composition-based — shared pieces are imported components, not inherited
- SnippetCard consolidation should favor the clipboard-panel.tsx inline version as the source of truth (it has highlight logic, expand/collapse, hero/compact variants)
- Sort utility should be easily testable with plain arrays of Question objects — no mocking needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 12-component-decomposition_
_Context gathered: 2026-03-17_

# Project Research Summary

**Project:** Nasqa Live — v1.3 Participant & Host UX Refactor
**Domain:** Real-time session UI — component decomposition and interaction quality
**Researched:** 2026-03-16
**Confidence:** HIGH (all findings grounded in direct codebase analysis or official docs)

## Executive Summary

Nasqa Live is a real-time presentation tool (live clipboard + Q&A) built on a production stack of Next.js 16, React 19, AWS AppSync, and DynamoDB single-table design. The v1.3 milestone is a structural refactor of already-shipped session pages — not new feature development. The work has two goals: close the interaction quality gap against competitors (Slido, Vevox, Pigeonhole) and eliminate structural debt that prevents unit testing and maintenance. All required changes are scoped to frontend components and hooks; no backend, schema, or API changes are needed.

The recommended execution order follows the dependency chain from the inside out: extract shared utilities first, then move logic from components into dedicated hooks, then slim the composition roots, then decompose large components into variants, and finally apply accessibility and UX polish. Seven of the twelve targeted changes are low-complexity and can be landed in under an hour each. The two highest-value structural changes — `useSessionMutations` hook extraction and `QuestionCard` variant decomposition — require care around stale closures and Framer Motion key stability respectively, but both have well-documented prevention patterns.

The main risk in this milestone is partial application of optimizations. Adding `React.memo` without stabilizing callback props via `useCallback` produces silent regressions. Moving `AnimatePresence`-keyed wrappers into extracted child components silently breaks exit animations. The pitfalls research provides a specific "looks done but isn't" checklist for each structural change. Every structural step must be treated as atomic: the memo optimization only works when all three parts (memo, memoized data, stable callbacks) are applied together.

---

## Key Findings

### Recommended Stack

The production stack is fully installed and pinned. No new dependencies are required for v1.3.

**Core technologies already in place:**

- **Next.js 16 + React 19:** App Router with Server Components for initial render; Client Components for real-time feed. React 19's `useOptimistic` and `useEffectEvent` (stable in 19.2) enable the stale closure fix for extracted mutation handlers.
- **AWS AppSync + DynamoDB:** Single `onSessionUpdate` WebSocket channel per session, union-typed events. DynamoDB single-table with ULID keys; 24-hour TTL on all records. No changes needed.
- **Framer Motion 12:** Used for list animations (`AnimatePresence`, `layout`). Critical constraint: `motion.div` with `key={question.id}` must remain on the direct child of `AnimatePresence` in `QAPanel` — never absorbed into extracted variant components.
- **@base-ui/react + shadcn:** WAI-ARIA baked into Dialog, Popover primitives. Use Dialog components for confirmations, never `window.confirm`.
- **Vitest 4 + Playwright:** Vitest for unit/component tests (cannot test async RSCs); Playwright + axe-core for E2E and accessibility audits. Extracting `useSessionMutations` unblocks mutation-level unit tests that are currently impossible (handlers are anonymous closures).
- **next-intl 4:** All user-facing strings must go through `t()` / `getTranslations()`. The shared `formatRelativeTime` utility must accept a `t` function parameter — hooks cannot be called inside plain utility functions.

### Expected Features

The feature landscape for v1.3 is well-defined. All target features either already exist partially or are clearly scoped. This is an interaction quality and structural completeness milestone, not a ground-up build.

**Must ship (P1 — blocking quality and accessibility bar):**

- Vote button `active:scale-95` press animation + filled background on voted state — baseline interaction honesty; every competitor does this; Nasqa currently only changes icon color with no fill or scale feedback
- Identity chip inside `QAInput` (pixel avatar + name, click to edit) — participants must see their posting identity before submitting; currently the `IdentityEditor` is two taps away
- Auto-expand replies when `isFocused` prop changes while card is already mounted — this is a bug fix, not a feature; `useState(question.isFocused)` only reads the prop at mount time
- ARIA `role="tablist"` semantics on `SessionShell` mobile tab bar — WCAG 4.1.2 baseline; current buttons have no tablist/tab/aria-selected semantics
- `aria-live="polite"` on `NewContentBanner` — screen reader baseline; current banner has no live region

**Should ship (P2 — high value, low risk):**

- Thread `connectionStatus` to `QAPanel` for contextual empty state copy (participant vs host variant) — currently only `ClipboardPanel` receives this prop
- Own question left-border structural indicator — color text alone ("You" in emerald) fails spatial recognition; need a border accent strip
- Extract `useSessionMutations` hook from both page orchestrators — eliminates ~130 lines of duplication; enables unit testing of rollback logic
- Decompose `QuestionCard` into `Normal`, `Banned`, `Hidden` variants — 430-line monolith with four rendering paths
- Extract shared `formatRelativeTime` utility — currently duplicated in 5 files with two divergent implementations (ms-based vs seconds-based; hardcoded English vs i18n)
- Remove duplicate sort from `QAPanel` — sort runs twice per render; own only the debounce

**Explicitly deferred:**

- Emoji reactions — v1.2 scope; requires DynamoDB schema changes; do not conflate with v1.3 structural work
- Multi-level reply threading — permanently out of scope for this product
- Animated per-vote card reordering — anti-feature; the existing 1-second debounce is correct
- "My Questions" dedicated tab — anti-feature at current scale; structural own-question indicator is sufficient

**Protected differentiators (must not regress):**

- Separate upvote + downvote counts displayed independently (Slido hides this by default)
- Speaker reply emerald border + "Speaker" badge distinction
- Debounced question re-sorting with Framer Motion `layout` transitions

### Architecture Approach

The v1.3 architecture decomposes three monolithic problem areas. The God Orchestrator pages (`session-live-page.tsx` ~260 lines, `session-live-host-page.tsx` ~335 lines) have 50% mutation handler duplication between them. `QAPanel` re-implements sort and debounce logic that belongs in the hook. `QuestionCard` is a 430-line component with four entirely different rendering paths. The target is composition roots of ~40–50 lines that wire hooks to panels, with logic pushed into dedicated hooks and display paths pushed into variant components.

**Major components:**

1. `use-session-mutations.ts` (NEW hook) — all async mutation handlers, shared between participant and host pages; uses `useEffectEvent` for stale-closure-safe rollback
2. `question-card.tsx` (discriminator) + `question-card-normal.tsx`, `question-card-banned.tsx`, `question-card-hidden.tsx` (NEW variants) — each rendering path independently testable
3. `lib/format-relative-time.ts` (NEW utility) — canonical seconds-based + i18n implementation replacing 5 duplicated copies
4. `snippet-card-live.tsx` (NEW component) — client SnippetCard extracted from the embedded function inside `clipboard-panel.tsx`

**Key architecture rules:**

- `QAPanel` owns `AnimatePresence` and the keyed `motion.div` wrappers — variant components are pure presentation
- Discriminator lives in `question-card.tsx`, not in `QAPanel` — the list renderer does not know about variant taxonomy
- Sort and debounce logic stays in `QAPanel` (not moved to hook) — `useSessionState` returns unsorted questions; `focusedQuestion` is a separate selector
- `useSessionUpdates` must remain in the root orchestrator — never descend into panel components

**Build order (10 steps, dependencies must be respected):**

1. `lib/format-relative-time.ts` — no deps, everything imports from here
2. Migrate all 5 `formatRelativeTime` consumers — prepares for clean extraction
3. `useSessionState` — change `repliesByQuestion` to `useMemo` Map (do NOT move sort here)
4. Extract `SnippetCard` from `ClipboardPanel` — co-location cleanup before logic changes
5. Extract `useSessionMutations` hook — all async handlers; implement `useEffectEvent` rollback
6. Slim page orchestrators — call hook, pass handlers; both pages become ~40–50 lines
7. Slim `QAPanel` — remove local sort duplicate and local repliesByQuestion; accept sorted + Map props
8. Decompose `QuestionCard` — discriminator + three variant files; compound key on `motion.div`
9. `SessionShell` ARIA tablist — both panels stay in DOM via `hidden` attribute; arrow key navigation
10. `NewContentBanner` `aria-live` + `QAInput` identity chip — self-contained UX additions

### Critical Pitfalls

1. **AnimatePresence key stability on component extraction** — if `motion.div key={question.id}` is moved inside a variant component or wrapped in a Fragment, exit animations silently stop working (items pop instead of fade; no console error). Keep the keyed `motion.div` permanently in `QAPanel`'s `.map()` callback. Use compound key `${question.id}-${variant}` to force clean remount on state transitions (banned/hidden/normal). Phase: QuestionCard extraction (Step 8).

2. **Stale closure in `useSessionMutations` rollback** — `handleDownvote` reads `state.questions.find(...)` for rollback. When extracted to a hook with `useCallback`, omitting `state` from deps (correct — avoids rebuilding all handlers on every vote) means rollback uses counts from the render when the callback was first created. Under concurrent real-time vote events this produces wrong rollback values. Use React 19's `useEffectEvent` for the rollback calculation (stable in React 19.2.3, the installed version). Do NOT add `state` to `useCallback` deps. Phase: hook extraction (Step 5).

3. **`aria-live` announcement storm + DOM remount** — placing `aria-live` on the `NewContentBanner` element that conditionally returns `null` causes two problems: screen readers lose the live region when the DOM node unmounts, and high-frequency question arrivals (2–5/second during active sessions) queue continuous announcements NVDA/JAWS cannot interrupt. Solution: permanently-mounted, visually-hidden `<div aria-live="polite" className="sr-only">` in `QAPanel` or `SessionShell`, with text updated on a 2-second debounce. Phase: accessibility pass (Step 10).

4. **`React.memo` without stable callback props has zero effect** — memoizing `QuestionCard` only works when all three are applied atomically: `React.memo` on the component, `useMemo` for `repliesByQuestion`, and `useCallback` for every handler prop passed to the card. Partial application produces no profiler benefit; `memo` shallow-compares props and a new function reference on every render always fails the comparison. Phase: QuestionCard extraction (Step 8) — do not split these across separate tasks.

5. **Mobile tab switch unmounts panels, losing scroll position and violating ARIA** — the current `activeTab === "clipboard" ? clipboardSlot : qaSlot` conditional rendering destroys `QAPanel` scroll position and local state (`showNewBanner`, `newQuestionCount`, `debouncedQuestions`) on every tab switch. Adding `aria-controls` to tab buttons also requires both panel elements to exist in the DOM simultaneously per WAI-ARIA APG spec. Replace conditional rendering with `hidden` attribute on both panels. Phase: ARIA tablist / SessionShell (Step 9).

6. **`isFocused` desync on already-mounted cards** — `useState(question.isFocused)` only reads the prop at mount. Subscription events that change `isFocused` after mount never update `showReplies`, so the planned auto-expand feature silently fails for any card that was already mounted when the host focused a question. Fix: `useEffect(() => { if (question.isFocused) setShowReplies(true); }, [question.isFocused])`. Phase: QuestionCard variant extraction (Step 8).

---

## Implications for Roadmap

### Phase 1: Shared Infrastructure and Hook Extraction

**Rationale:** The `formatRelativeTime` utility and `useSessionMutations` hook are the foundation every other structural change depends on. Landing these first means all subsequent component work starts from a clean base. The hook extraction produces the unit-testable mutation surface that enables verification of the stale closure fix before the more complex component surgery begins.

**Delivers:** `lib/format-relative-time.ts` with all 5 consumer files migrated; `use-session-mutations.ts` with all handlers (shared + host-only) using `useEffectEvent` rollback; both page orchestrators slimmed to ~40–50 lines of composition-only code; `repliesByQuestion` memoized as Map in `useSessionState`.

**Implements:** Architecture Steps 1–6 plus Step 3 (`useSessionState` memoization)

**Addresses:** `formatRelativeTime` 5-file duplication with divergent implementations; mutation handler 50% duplication across page orchestrators; untestable anonymous closure handlers

**Avoids:** Pitfall 2 (stale closure in extracted hook) — implement `useEffectEvent` pattern here, write rollback unit tests immediately; Anti-Pattern 4 (god hook replacing god component) — only `useSessionMutations` is extracted; existing hook separation is preserved

### Phase 2: Component Decomposition and QAPanel Cleanup

**Rationale:** With the hook layer clean, restructure the component layer. `QAPanel` sort cleanup (Step 7) should be done before `QuestionCard` decomposition (Step 8) to ensure `QAPanel` is in its final state when variant components are introduced into it. `SnippetCard` extraction (Step 4) is independent and can be done in Phase 1 or Phase 2 — sequencing it in Phase 2 keeps the diff focused on component co-location surgery.

**Delivers:** `QuestionCardNormal`, `QuestionCardBanned`, `QuestionCardHidden` as independent testable components; `SnippetCardLive` extracted to its own file; `QAPanel` accepts pre-sorted questions and memoized `repliesByQuestion` Map; duplicate sort logic eliminated.

**Implements:** Architecture Steps 4, 7–8

**Addresses:** `QAPanel` duplicate sort (runs twice per render, two canonical locations); `QuestionCard` 430-line four-path monolith; `repliesByQuestion` O(n) rebuild on every render; `SnippetCard` embedded in `clipboard-panel.tsx` and not independently testable

**Avoids:** Pitfall 1 (AnimatePresence key stability) — keep `motion.div` in `QAPanel`, use compound key on state transitions; Pitfall 4 (memo without stable callbacks) — apply `React.memo` + `useCallback` + `useMemo` atomically; Pitfall 6 (`isFocused` desync) — add `useEffect` sync in `QuestionCardNormal`; Pitfall 7 (duplicate sort causing divergent ordering) — single canonical sort in `QAPanel`

### Phase 3: Accessibility and UX Polish

**Rationale:** `SessionShell` ARIA tablist and `NewContentBanner` `aria-live` are independent of the structural changes in Phases 1–2. Sequencing them last avoids merge conflicts during component surgery. The identity chip, own-question indicator, vote button animations, and contextual empty state are self-contained UX additions that sit on top of the cleaned structure.

**Delivers:** WCAG 4.1.2-compliant tab bar with keyboard arrow navigation and both panels permanently mounted; screen-reader-safe live region with 2-second debounced announcements; identity chip in `QAInput` (pixel avatar + name, click to open `IdentityEditor`); own-question left-border accent indicator; vote button `active:scale-95` press animation + filled voted state; contextual `QAPanel` empty state with connection awareness.

**Implements:** Architecture Steps 9–10; all P1 and P2 UX items from FEATURES.md

**Addresses:** All ARIA accessibility gaps; identity awareness before submission; own-question spatial recognition; vote interaction honesty

**Avoids:** Pitfall 3 (`aria-live` announcement storm) — permanently-mounted debounced live region; Pitfall 5 (tab switch panel remount) — `hidden` attribute replaces conditional rendering; UX pitfall of no tactile vote feedback

### Phase Ordering Rationale

- Hook extraction before component decomposition: mutation handlers are currently anonymous closures, making them untestable. Extracting them first means the stale closure fix can be verified with unit tests before the more complex component surgery in Phase 2.
- `QAPanel` cleanup before `QuestionCard` decomposition: ensures `QAPanel` is in its final state (accepting pre-sorted + Map props) when variant components are introduced. A `QAPanel` that still owns sorting would mask whether variant extraction introduced bugs.
- Accessibility pass last: the `hidden` attribute tab panel change (Pitfall 5 fix) is a mounting behavior change that the cleaned components in Phases 1–2 benefit from immediately — no rework needed.
- The three phases produce independently shippable slices: Phase 1 has no visible UI change; Phase 2 has no visible UI change; Phase 3 is the visible UX improvement layer.

### Research Flags

All three phases have well-documented implementation patterns from direct codebase analysis. No phase requires deeper `/gsd:research-phase`.

- **Phase 1 (Hook Extraction):** `useEffectEvent` is documented in React 19 official docs; three alternative solutions documented in PITFALLS.md. Mutation handler extraction follows established patterns.
- **Phase 2 (Component Decomposition):** AnimatePresence key rules are documented in Motion official docs; `React.memo` pairing requirements are documented in PITFALLS.md with specific warning signs. No unknowns.
- **Phase 3 (Accessibility + Polish):** WAI-ARIA APG Tabs pattern is the authoritative spec; debounced `aria-live` singleton pattern is documented. Vote button animation is a one-line CSS addition.

---

## Confidence Assessment

| Area         | Confidence  | Notes                                                                                                                                                       |
| ------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH        | All versions verified from installed `package.json` files in the live codebase; no version guessing                                                         |
| Features     | MEDIUM-HIGH | Competitor interaction patterns derived from help docs, community forums, and UX literature; existing codebase state is HIGH from direct component analysis |
| Architecture | HIGH        | All findings from direct source code analysis; exact line numbers and duplication confirmed                                                                 |
| Pitfalls     | HIGH        | Grounded in official React docs, Motion docs, WAI-ARIA APG spec, and direct codebase inspection                                                             |

**Overall confidence:** HIGH

### Gaps to Address

- **Sort canonical location conflict:** ARCHITECTURE.md Step 3 recommends moving the debounced sort into `useSessionState`. PITFALLS.md Pitfall 7 recommends keeping it in `QAPanel` with `useSessionState` returning unsorted questions. These conflict. Resolution: follow PITFALLS.md — `QAPanel` owns the single debounced sort; `useSessionState` returns raw `state.questions`; provide a separate `focusedQuestion` selector in the hook for the host toolbar use case.

- **Framer Motion `mode` under high load:** STACK.md notes to avoid `AnimatePresence` at list scale (50–500 items). PITFALLS.md notes `mode="sync"` as a fix for rapid subscription events missing exit animations. The correct `mode` value should be validated against load during Phase 2 testing. Low risk — changing `mode` after the fact is a one-line fix.

- **`useEffectEvent` vs `stateRef` vs reducer rollback:** Three valid solutions exist for Pitfall 2. `useEffectEvent` is recommended because it is the React 19 canonical answer and is stable in the installed version (19.2.3). The `stateRef` approach is the fallback if `useEffectEvent` has any unexpected behavior in the specific usage context. Confirm the chosen approach during Phase 1 implementation.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase analysis — `session-live-page.tsx`, `session-live-host-page.tsx`, `qa-panel.tsx`, `question-card.tsx`, `clipboard-panel.tsx`, `use-session-state.ts`, `new-content-banner.tsx`, `session-shell.tsx`
- [React `useEffectEvent` docs](https://react.dev/reference/react/useEffectEvent) — stable in React 19.2; stale closure solution
- [WAI-ARIA APG Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) — tab bar DOM structure and keyboard requirements
- [Motion docs: AnimatePresence](https://motion.dev/docs/react-animate-presence) — key prop rules and `mode` options
- [GetStream — livestream chat UX threads and replies](https://getstream.io/blog/exploring-livestream-chat-ux-threads-and-replies/) — collapsed-by-default replies pattern rationale
- [NNGroup — empty state interface design](https://www.nngroup.com/articles/empty-state-interface-design/) — connection-aware empty state rationale

### Secondary (MEDIUM confidence)

- Slido, Vevox, Pigeonhole, Mentimeter help documentation and community forums — competitor interaction pattern analysis (vote button states, ownership indicators, reply threading)
- [Sara Soueidan — accessible aria-live notifications Part 1 and Part 2](https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/) — debounced singleton announcer pattern
- [TkDodo — hooks, dependencies and stale closures](https://tkdodo.eu/blog/hooks-dependencies-and-stale-closures) — `useCallback` dependency rules
- [The Power of Keys in Framer Motion — nan.fyi](https://www.nan.fyi/keys-in-framer-motion) — key stability in decomposed components
- [developerway.com — how to use memo and useCallback](https://www.developerway.com/posts/how-to-use-memo-use-callback) — when `React.memo` has zero effect without stabilizing all props
- [k9n.dev — when your live region isn't live (2025)](https://k9n.dev/blog/2025-11-aria-live/) — React-specific live region pitfalls including element remounting

### Tertiary (LOW confidence)

- Competitor UX detail inferred from marketing pages (Pigeonhole Live, Mentimeter) — confirmed with multiple secondary sources where possible

---

_Research completed: 2026-03-16_
_Ready for roadmap: yes_

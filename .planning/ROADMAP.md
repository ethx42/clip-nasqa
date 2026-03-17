# Roadmap: Nasqa Live

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-14)
- ✅ **v1.1 Enterprise Hardening** — Phases 5-8 (shipped 2026-03-17)
- ✅ **v1.2 Reactions** — Phases 9-10 (shipped 2026-03-17)
- ⏳ **v1.3 Participant & Host UX Refactor** — Phases 11-13 (queued)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-03-14</summary>

- [x] **Phase 1: Infrastructure** — Provision DynamoDB, AppSync, Lambda resolvers, and SST Ion IaC (completed 2026-03-14)
- [x] **Phase 2: Session and View Shell** — Session creation, host auth, QR code, SSR participant view, theme system (completed 2026-03-14)
- [x] **Phase 3: Real-Time Core** — AppSync subscriptions, live clipboard with Shiki, Q&A with upvoting (completed 2026-03-14)
- [x] **Phase 4: Moderation, Identity, and Polish** — Community moderation, host ban, identity, i18n, rate limiting (completed 2026-03-14)

</details>

<details>
<summary>✅ v1.1 Enterprise Hardening (Phases 5-8) — SHIPPED 2026-03-17</summary>

- [x] **Phase 5: Code Quality Gates** — Pre-commit hooks, Prettier formatting, and TypeScript strict mode (completed 2026-03-15)
- [x] **Phase 6: Testing and CI** — Vitest test suite (74 tests), GitHub Actions CI with 4 parallel jobs (completed 2026-03-16)
- [x] **Phase 7: Error Handling and Observability** — Error boundaries, structured ActionResult errors, safeAction, pino logging (completed 2026-03-16)
- [x] **Phase 8: SEO and Accessibility** — Dynamic OG images, robots/sitemap, semantic HTML, ARIA, skip-to-content (completed 2026-03-17)

</details>

<details>
<summary>✅ v1.2 Reactions (Phases 9-10) — SHIPPED 2026-03-17</summary>

- [x] **Phase 9: Reactions Data Model and Backend** — EMOJI_PALETTE, handleReact resolver, rate limiting, ban enforcement, subscription broadcast (completed 2026-03-17)
- [x] **Phase 10: Reactions Frontend State and UI** — ReactionBar with Slack-style pills, optimistic toggle, ARIA labels, 44px touch targets (completed 2026-03-17)

</details>

### ⏳ v1.3 Participant & Host UX Refactor (Queued)

**Milestone Goal:** Decompose monolithic session components, eliminate code duplication, and implement interaction improvements across both participant and host views — making the interface honest, accessible, and structurally sound.

- [ ] **Phase 11: Shared Utilities and Hook Extraction** — `formatRelativeTime` utility replaces 5 duplicated implementations; `useSessionMutations` hook extracts all mutation handlers from both page orchestrators; `repliesByQuestion` memoized as Map
- [ ] **Phase 12: Component Decomposition and QAPanel Cleanup** — `SnippetCard` extracted to its own file; `QAPanel` accepts pre-sorted questions and drops its duplicate sort; `QuestionCard` decomposed into Normal, Banned, and Hidden variants with compound AnimatePresence keys
- [ ] **Phase 13: Accessibility and UX Polish** — ARIA tablist semantics on mobile tab bar with both panels permanently mounted; `aria-live` on `NewContentBanner`; vote button fill states and press animation; identity chip in `QAInput`; own-question left-border indicator; contextual empty states; focused-question auto-expand and reply UX improvements

## Phase Details

### Phase 11: Shared Utilities and Hook Extraction

**Goal**: All mutation handler duplication is eliminated at the source — a shared `useSessionMutations` hook replaces anonymous closures in both page orchestrators, `formatRelativeTime` has a single canonical implementation, and `repliesByQuestion` is memoized
**Depends on**: Phase 10
**Requirements**: STRUC-01, STRUC-02, STRUC-06
**Success Criteria** (what must be TRUE):

1. A single `lib/format-relative-time.ts` file is the only implementation of relative time formatting; `clipboard-panel`, `question-card`, and `reply-list` all import from it with no behavior change visible to users
2. `SessionLivePage` and `SessionLiveHostPage` each shrink to approximately 40-50 lines of composition-only code — all optimistic-update-with-rollback handlers live in `useSessionMutations`
3. Mutation rollback handlers in `useSessionMutations` use `useEffectEvent` so they read current state without stale closure bugs under concurrent vote events
4. `repliesByQuestion` in `QAPanel` is computed once per `replies` array change via `useMemo` — profiler confirms no O(n) recompute on unrelated renders
   **Plans**: TBD

### Phase 12: Component Decomposition and QAPanel Cleanup

**Goal**: The three monolithic display components are decomposed into independently testable units — `SnippetCard` lives in its own file, `QAPanel` owns a single canonical sort, and `QuestionCard` is a discriminator that routes to `Normal`, `Banned`, and `Hidden` variants
**Depends on**: Phase 11
**Requirements**: STRUC-03, STRUC-04, STRUC-05
**Success Criteria** (what must be TRUE):

1. `SnippetCard` can be imported from its own file and rendered in a Vitest component test without importing `ClipboardPanel`
2. Sort logic exists in exactly one location in `QAPanel`; removing the duplicate means questions cannot display in different orders between the panel and any derived view
3. `QuestionCard` renders one of three clearly-separated variant components (`QuestionCardNormal`, `QuestionCardBanned`, `QuestionCardHidden`) based on question state; each variant is independently importable and testable
4. Framer Motion `AnimatePresence` exit animations still play when a question transitions between states (normal -> banned, normal -> hidden) — compound key `${question.id}-${variant}` forces clean remount without layout pop
5. `isFocused` prop changes on an already-mounted `QuestionCardNormal` auto-expand the reply section via `useEffect` sync — the stale-state bug where already-mounted cards ignore host focus is fixed
   **Plans**: TBD

### Phase 13: Accessibility and UX Polish

**Goal**: The session interface is accessible by keyboard and screen reader, and every interactive element communicates its state honestly — vote buttons show fill on voted state, participants see their identity before posting, and own questions are spatially recognizable
**Depends on**: Phase 12
**Requirements**: UXINT-01, UXINT-02, UXINT-03, UXINT-04, UXINT-05, UXINT-06, UXINT-07, A11Y-04, A11Y-05, A11Y-06, A11Y-07
**Success Criteria** (what must be TRUE):

1. Both clipboard and Q&A panels remain mounted simultaneously on mobile — switching tabs via the tab bar does not reset scroll position or lose subscription state; `hidden` attribute controls visibility
2. The mobile tab bar is navigable with keyboard arrow keys and screen readers announce the selected tab; `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"`, and `aria-labelledby` are all present
3. Tapping the upvote button on a question shows a filled emerald background; tapping downvote shows a filled rose background; tapping the active vote again returns both to their unvoted appearance — mutual exclusion is visually immediate with a smooth transition and `active:scale-95` press feedback; `aria-pressed` reflects the live toggle state
4. Participant sees their pixel avatar and truncated name (or "Anonymous") inline inside `QAInput` before submitting; clicking the chip opens the `IdentityEditor` popover without leaving the input flow
5. New content arriving via subscription is announced to screen readers via a permanently-mounted `aria-live="polite"` region with debounced content-swapping — no announcement storm during rapid question submission
6. Own questions display a left-border accent strip distinguishing them spatially from other questions in the feed; `QAPanel` and `ClipboardPanel` empty states show connection-aware copy for participant vs host context
   **Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 11 -> 12 -> 13

| Phase                                           | Milestone | Plans Complete | Status      | Completed  |
| ----------------------------------------------- | --------- | -------------- | ----------- | ---------- |
| 1. Infrastructure                               | v1.0      | 3/3            | Complete    | 2026-03-14 |
| 2. Session and View Shell                       | v1.0      | 3/3            | Complete    | 2026-03-14 |
| 3. Real-Time Core                               | v1.0      | 6/6            | Complete    | 2026-03-14 |
| 4. Moderation, Identity, and Polish             | v1.0      | 4/4            | Complete    | 2026-03-14 |
| 5. Code Quality Gates                           | v1.1      | 2/2            | Complete    | 2026-03-15 |
| 6. Testing and CI                               | v1.1      | 3/3            | Complete    | 2026-03-16 |
| 7. Error Handling and Observability             | v1.1      | 3/3            | Complete    | 2026-03-16 |
| 8. SEO and Accessibility                        | v1.1      | 2/2            | Complete    | 2026-03-17 |
| 9. Reactions Data Model and Backend             | v1.2      | 3/3            | Complete    | 2026-03-17 |
| 10. Reactions Frontend State and UI             | v1.2      | 2/2            | Complete    | 2026-03-17 |
| 11. Shared Utilities and Hook Extraction        | v1.3      | 0/TBD          | Not started | -          |
| 12. Component Decomposition and QAPanel Cleanup | v1.3      | 0/TBD          | Not started | -          |
| 13. Accessibility and UX Polish                 | v1.3      | 0/TBD          | Not started | -          |

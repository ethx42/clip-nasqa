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

- [x] **Phase 11: Shared Utilities and Hook Extraction** — `formatRelativeTime` extracted to a single canonical module; `useSessionMutations` hook consolidates all mutation handlers from both page orchestrators (completed 2026-03-17)
- [ ] **Phase 12: Component Decomposition** — `SnippetCard` extracted as a standalone component; `QAPanel` sort logic deduplicated into one shared utility; `QuestionCard` split into host and participant variants
- [ ] **Phase 13: UX Polish and Accessibility** — Vote buttons show filled state with `aria-pressed`; identity chip surfaces device identity inline in QAInput; own questions visually distinguished in the feed

## Phase Details

### Phase 11: Shared Utilities and Hook Extraction

**Goal**: All shared logic lives in canonical locations — `formatRelativeTime` has one implementation consumed everywhere it is used, and `useSessionMutations` is a single hook that gives both page orchestrators their mutation handlers
**Depends on**: Phase 10
**Requirements**: STRUC-01, STRUC-02
**Success Criteria** (what must be TRUE):

1. Relative timestamps throughout the session view (clipboard items, questions, replies) all format identically — changing the rounding rule in one file updates every timestamp with no visible behavior difference
2. `SessionLivePage` and `SessionLiveHostPage` each contain no inline mutation handlers — all submit, vote, reply, and moderation callbacks are imported from `useSessionMutations`
3. Stale closure bugs under concurrent vote events are eliminated — rollback handlers in `useSessionMutations` read current state without capturing a snapshot from the render they were created in

**Plans:** 2/2 plans complete

Plans:

- [ ] 11-01-PLAN.md — Canonical formatRelativeTime utility with TDD and replacement of all 5 duplicates
- [ ] 11-02-PLAN.md — useSessionMutations and useHostMutations hooks, page orchestrator refactor

### Phase 12: Component Decomposition

**Goal**: Three monolithic display concerns are split at clean boundaries — `SnippetCard` is independently importable, sort logic for the Q&A feed exists in exactly one place, and `QuestionCard` routes to distinct host and participant variants
**Depends on**: Phase 11
**Requirements**: STRUC-03, STRUC-04, STRUC-05
**Success Criteria** (what must be TRUE):

1. `SnippetCard` can be imported and rendered in a Vitest component test without pulling in `ClipboardPanel`
2. Questions cannot appear in different orders between the Q&A panel and any derived view — sort logic exists in exactly one location and both consumers call it
3. `QuestionCard` renders a distinct host variant (with moderation controls) and a distinct participant variant (without them) based on the caller context — the two variants are independently importable
4. State transitions between question states (normal, hidden, banned) animate correctly — a question moving from visible to hidden plays its exit animation without a layout pop

**Plans:** 3 plans

Plans:

- [ ] 12-01-PLAN.md — TDD sortQuestions pure utility extraction from QAPanel
- [ ] 12-02-PLAN.md — SnippetCard consolidation into standalone component
- [ ] 12-03-PLAN.md — QuestionCard variant split (host/participant) with shared base and state animations

### Phase 13: UX Polish and Accessibility

**Goal**: Every interactive element in the session view communicates its state honestly — votes show fill when active, participants see their identity before posting, and own questions are spatially recognizable in the feed
**Depends on**: Phase 12
**Requirements**: UXINT-01, UXINT-02, UXINT-03, A11Y-01
**Success Criteria** (what must be TRUE):

1. Tapping the upvote button on a question fills it visually when the user has voted; tapping again returns it to the unvoted appearance — mutual exclusion with downvote is immediate and smooth
2. `aria-pressed="true"` is present on the upvote button when the user has voted and `aria-pressed="false"` when they have not — screen readers announce the toggle state on every change
3. A participant sees their pixel avatar and name (or "Anonymous") inline inside the question input before submitting — the identity is visible without opening any additional panel
4. A participant's own questions display a visually distinct left-border accent in the feed — they can immediately locate their own contributions among other questions
   **Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 11 -> 12 -> 13

| Phase                                    | Milestone | Plans Complete | Status      | Completed  |
| ---------------------------------------- | --------- | -------------- | ----------- | ---------- |
| 1. Infrastructure                        | v1.0      | 3/3            | Complete    | 2026-03-14 |
| 2. Session and View Shell                | v1.0      | 3/3            | Complete    | 2026-03-14 |
| 3. Real-Time Core                        | v1.0      | 6/6            | Complete    | 2026-03-14 |
| 4. Moderation, Identity, and Polish      | v1.0      | 4/4            | Complete    | 2026-03-14 |
| 5. Code Quality Gates                    | v1.1      | 2/2            | Complete    | 2026-03-15 |
| 6. Testing and CI                        | v1.1      | 3/3            | Complete    | 2026-03-16 |
| 7. Error Handling and Observability      | v1.1      | 3/3            | Complete    | 2026-03-16 |
| 8. SEO and Accessibility                 | v1.1      | 2/2            | Complete    | 2026-03-17 |
| 9. Reactions Data Model and Backend      | v1.2      | 3/3            | Complete    | 2026-03-17 |
| 10. Reactions Frontend State and UI      | v1.2      | 2/2            | Complete    | 2026-03-17 |
| 11. Shared Utilities and Hook Extraction | 2/2       | Complete       | 2026-03-17  | -          |
| 12. Component Decomposition              | v1.3      | 0/3            | Not started | -          |
| 13. UX Polish and Accessibility          | v1.3      | 0/TBD          | Not started | -          |

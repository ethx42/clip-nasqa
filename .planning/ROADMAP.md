# Roadmap: Nasqa Live

## Milestones

- ✅ **v1.0 MVP** - Phases 1-4 (shipped 2026-03-14)
- 🚧 **v1.1 Enterprise Hardening** - Phases 5-8 (in progress)
- ⏳ **v1.2 Reactions** - Phases 9-10 (queued)
- ⏳ **v1.3 Participant & Host UX Refactor** - Phases 11-13 (queued)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) - SHIPPED 2026-03-14</summary>

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Infrastructure** - Provision DynamoDB, AppSync, Lambda resolvers, and SST Ion IaC so all feature work builds on a working AWS foundation (completed 2026-03-14)
- [x] **Phase 2: Session and View Shell** - Session creation, host auth, QR code, and the SSR participant view with device fingerprint and theme system (completed 2026-03-14)
- [x] **Phase 3: Real-Time Core** - AppSync subscription channel, live clipboard with Shiki highlighting, and the Q&A write path with upvoting (completed 2026-03-14)
- [x] **Phase 4: Moderation, Identity, and Polish** - Community downvote auto-hide, host and auto-ban, focus mode, speaker replies, optional identity, i18n, and performance hardening (completed 2026-03-14)

### Phase 1: Infrastructure

**Goal**: The AWS backend is fully provisioned and deployable so feature work can begin without infrastructure unknowns
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-09
**Success Criteria** (what must be TRUE):

1. `sst deploy` completes without manual intervention and provisions DynamoDB, AppSync API, and Lambda resolver stubs
2. DynamoDB single-table exists with the correct PK/SK key schema and TTL attribute enabled
3. AppSync GraphQL schema compiles with the full type set (Session, Snippet, Question, Reply, SessionUpdate union) and at least one stub resolver responds
4. ULID package is available and sortable IDs can be generated in Lambda functions
5. `@aws-amplify/api-graphql` and `qrcode` packages are installed and importable in their respective packages
   **Plans**: 3 plans

Plans:

- [x] 01-01-PLAN.md — GraphQL schema expansion, core types/schemas, package installations
- [x] 01-02-PLAN.md — SST IaC wiring (DynamoDB + AppSync + Lambda data sources + resolver files + deploy script)
- [x] 01-03-PLAN.md — Deploy execution and AWS resource verification checkpoint

### Phase 2: Session and View Shell

**Goal**: A host can create a session and share it; participants can navigate to the session URL and see the static view — before any real-time features exist
**Depends on**: Phase 1
**Requirements**: SESS-01, SESS-02, SESS-03, SESS-04, SESS-05, SESS-06, SESS-07, UI-01, UI-02, UI-03, UI-04, UI-05
**Success Criteria** (what must be TRUE):

1. Host visits the landing page, enters a title, and receives a session URL with the raw hostSecret in the hash fragment (never in server logs)
2. The creation page displays the hostSecret clearly for the host to copy before navigating away
3. A QR code for the session participant URL is rendered on the host page for audience scanning
4. Participant navigates to the session URL and sees the session shell rendered server-side with no real-time content yet
5. Theme toggle between dark (Zinc-950) and light (White) modes works with no layout shift; accent color is Emerald-500
   **Plans**: 3 plans

Plans:

- [x] 02-01-PLAN.md — Theme system (Zinc/Emerald CSS vars, ThemeProvider, theme toggle) + i18n routing (next-intl middleware, [locale] segment) + SST table link
- [x] 02-02-PLAN.md — Session creation Server Action (DynamoDB write, word-pair slug, hashed secret, TTL) + getSession utility + marketing landing page with inline form
- [x] 02-03-PLAN.md — Success page (secret display, QR code, host URL) + participant/host view shells (two-column responsive layout) + human verification checkpoint

### Phase 3: Real-Time Core

**Goal**: The live clipboard and Q&A are fully functional in real-time — a host pushes code and the audience sees it instantly; participants submit questions, upvote, and replies thread correctly
**Depends on**: Phase 2
**Requirements**: CLIP-01, CLIP-02, CLIP-03, CLIP-04, CLIP-05, CLIP-06, CLIP-07, QA-01, QA-02, QA-03, QA-04, QA-05, QA-06, QA-07, QA-08, INFRA-02, INFRA-03, INFRA-06, INFRA-07, INFRA-08
**Success Criteria** (what must be TRUE):

1. Host pushes a text or code snippet and all connected participants see it appear within 200ms; the latest snippet is displayed prominently as the Hero
2. Code snippets render with Shiki syntax highlighting in both light and dark themes with no layout shift; Shiki is absent from the client JS bundle
3. Participant submits a question anonymously and it appears in the Q&A feed; upvotes sort the feed in real-time across all connected clients
4. Host can delete a snippet or clear the entire clipboard and changes propagate immediately to all participants
5. Initial page JS payload is under 80kB gzipped; optimistic UI updates appear within 100ms before the server confirms
   **Plans**: 6 plans

Plans:

- [x] 03-01-PLAN.md — GraphQL mutations, Lambda resolver handlers (clipboard + Q&A), SST wiring, Amplify client config
- [x] 03-02-PLAN.md — Shiki SSR dual-theme block, snippet hero/history cards, host input composer with live preview
- [x] 03-03-PLAN.md — Q&A components: question cards with upvoting, reply threads, input with character counter
- [x] 03-04-PLAN.md — AppSync subscription provider, session state reducer, optimistic mutations, page wiring
- [x] 03-05-PLAN.md — Host delete/clear/focus actions, liveness indicators, animations, bundle size verification
- [x] 03-06-PLAN.md — Human verification checkpoint for complete real-time core

### Phase 4: Moderation, Identity, and Polish

**Goal**: Community moderation, host superuser controls, optional participant identity, i18n for en/es/pt, and rate limiting are all active — the product is production-ready
**Depends on**: Phase 3
**Requirements**: MOD-01, MOD-02, MOD-03, MOD-04, MOD-05, MOD-06, IDENT-01, IDENT-02, IDENT-03, I18N-01, I18N-02, I18N-03, I18N-04, I18N-05, INFRA-05
**Success Criteria** (what must be TRUE):

1. Participant receives a device fingerprint (localStorage UUID) on first visit; the fingerprint persists across page reloads and is used for upvote dedup and ban enforcement
2. Host can instantly ban a question or participant (by fingerprint); banned content is hidden for all participants immediately
3. When thumbs-down votes on a question reach 50% of connected audience count, the content is auto-hidden for all participants
4. After 3 banned posts, a participant's device fingerprint is automatically blocked from posting any further content
5. All UI chrome (labels, placeholders, navigation) renders in the browser-detected locale (en/es/pt) via locale-prefixed routes; rate limits of 10 snippets/min (host) and 3 questions/min (participant) are enforced server-side
   **Plans**: 4 plans

Plans:

- [x] 04-01-PLAN.md — Moderation backend: GraphQL mutations (ban/downvote), Lambda resolvers, rate limiting, ban enforcement
- [x] 04-02-PLAN.md — Identity + i18n foundation: routing config, language switcher, translations, useIdentity hook, join modal
- [x] 04-03-PLAN.md — Moderation UI: Server Actions, session state updates, question card moderation controls
- [x] 04-04-PLAN.md — Integration wiring (identity + i18n into pages) + human verification checkpoint

</details>

### 🚧 v1.1 Enterprise Hardening (In Progress)

**Milestone Goal:** Harden the codebase for production reliability and developer experience — testing, CI/CD, error handling, observability, code quality gates, SEO, and accessibility.

- [x] **Phase 5: Code Quality Gates** - Pre-commit hooks, Prettier formatting, and TypeScript strict mode so no quality debt enters the repo during hardening (completed 2026-03-15)
- [x] **Phase 6: Testing and CI** - Vitest test suite across schemas, resolvers, and components; GitHub Actions pipeline that runs lint, typecheck, test, and build on every PR (completed 2026-03-16)
- [x] **Phase 7: Error Handling and Observability** - Next.js error boundaries with graceful fallbacks, structured server actions, and pino structured logging in Lambda resolvers (completed 2026-03-16)
- [x] **Phase 8: SEO and Accessibility** - Dynamic per-session metadata, robots/sitemap, semantic HTML landmarks, ARIA labels, and keyboard navigation across all components (completed 2026-03-17)

### ⏳ v1.2 Reactions (Queued)

**Milestone Goal:** Add emoji reactions to Questions and Replies as a lightweight sentiment layer — fixed 6-emoji palette, per-device dedup, real-time propagation via existing subscription channel, and optimistic UI consistent with the existing vote system.

- [ ] **Phase 9: Reactions Data Model and Backend** - Core types, GraphQL schema, Lambda resolver, rate limiting, ban enforcement, and real-time subscription broadcast for the `react` mutation
- [ ] **Phase 10: Reactions Frontend State and UI** - Session state reducer extension, `useReactions` hook, `ReactionBar` component with optimistic toggle, ARIA labels, and 44px touch targets integrated into QuestionCard and ReplyCard

### ⏳ v1.3 Participant & Host UX Refactor (Queued)

**Milestone Goal:** Decompose monolithic session components, eliminate code duplication, and implement interaction improvements across both participant and host views — making the interface honest, accessible, and structurally sound.

- [ ] **Phase 11: Shared Utilities and Hook Extraction** - `formatRelativeTime` utility replaces 5 duplicated implementations; `useSessionMutations` hook extracts all mutation handlers from both page orchestrators; `repliesByQuestion` memoized as Map
- [ ] **Phase 12: Component Decomposition and QAPanel Cleanup** - `SnippetCard` extracted to its own file; `QAPanel` accepts pre-sorted questions and drops its duplicate sort; `QuestionCard` decomposed into Normal, Banned, and Hidden variants with compound AnimatePresence keys
- [ ] **Phase 13: Accessibility and UX Polish** - ARIA tablist semantics on mobile tab bar with both panels permanently mounted; `aria-live` on `NewContentBanner`; vote button fill states and press animation; identity chip in `QAInput`; own-question left-border indicator; contextual empty states; focused-question auto-expand and reply UX improvements

## Phase Details

### Phase 5: Code Quality Gates

**Goal**: Every commit is blocked if it fails lint or formatting checks, and TypeScript strict mode is consistent across all packages — no new quality debt can enter the repo
**Depends on**: Phase 4
**Requirements**: QUAL-01, QUAL-02, QUAL-03
**Success Criteria** (what must be TRUE):

1. Running `git commit` with a lint error in a staged file is rejected by the pre-commit hook with a clear error message
2. Running `git commit` with inconsistently formatted staged files auto-formats them via Prettier before the commit completes
3. All four packages (root, core, frontend, functions) compile without error under TypeScript strict mode
4. ESLint and Prettier do not conflict — `eslint-config-prettier` disables any ESLint rules that would duplicate or contradict Prettier's output
   **Plans**: 2 plans

Plans:

- [ ] 05-01-PLAN.md — Install toolchain (Husky, lint-staged, Prettier, eslint-config-prettier), fix existing lint errors, configure pre-commit hook
- [ ] 05-02-PLAN.md — Verify TypeScript strict mode, apply initial Prettier formatting, end-to-end hook validation

### Phase 6: Testing and CI

**Goal**: A Vitest test suite covers core schemas, Lambda resolvers, and key UI components; a GitHub Actions pipeline runs all quality checks on every PR and gates deploys on passing tests
**Depends on**: Phase 5
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, CICD-01, CICD-02
**Success Criteria** (what must be TRUE):

1. Running `pnpm test` from the repo root executes all unit and component tests and exits non-zero on any failure
2. Opening a pull request triggers a GitHub Actions run that runs lint, typecheck, and tests in parallel — a PR cannot be merged if any job fails
3. The Actions run completes in under 3 minutes for a typical PR thanks to node_modules and .next caching
4. A CI job fails if the gzipped initial JS bundle exceeds the 80kB budget
   **Plans**: 3 plans

Plans:

- [ ] 06-01-PLAN.md — Vitest monorepo setup, core schema tests, Lambda resolver tests
- [ ] 06-02-PLAN.md — React component tests with RTL + next-intl, bundle size regression guard
- [ ] 06-03-PLAN.md — GitHub Actions CI workflow with parallel jobs and caching

### Phase 7: Error Handling and Observability

**Goal**: Root layout crashes, session-scoped errors, and 404s all show branded fallback UIs instead of blank screens; server actions return structured errors; Lambda resolvers emit structured JSON logs
**Depends on**: Phase 5
**Requirements**: ERR-01, ERR-02, ERR-03, ERR-04, OBS-01
**Success Criteria** (what must be TRUE):

1. A crash in the root layout renders `global-error.tsx` with a recovery button — no blank white screen in production
2. A crash in a session route segment renders `error.tsx` with a "try again" option — the rest of the app remains functional
3. Navigating to a slug that does not exist (or has expired) renders a branded `not-found.tsx` page with a "session has ended" message
4. Calling `createSession` or a Q&A server action with invalid input returns a typed error object — no unhandled exception reaches the client
5. Lambda resolver logs appear in CloudWatch as structured JSON objects with level, sessionSlug, operation, and durationMs fields
   **Plans**: 3 plans

Plans:

- [x] 07-01-PLAN.md — Error boundary files (global-error, session error, not-found), reportError stub, pino structured logging in Lambda
- [x] 07-02-PLAN.md — Server action structured error contract (ActionResult type), i18n error messages, client-side toast handling
- [ ] 07-03-PLAN.md — UAT gap closure: fix landing page validation path + safeAction wrapper for network error resilience

### Phase 8: SEO and Accessibility

**Goal**: Search engines index the landing page correctly (with OG image), session pages are excluded from indexing, and all interactive components are usable by keyboard and screen reader users
**Depends on**: Phase 7
**Requirements**: SEO-01, SEO-02, SEO-03, SEO-04, SEO-05, A11Y-01, A11Y-02, A11Y-03
**Success Criteria** (what must be TRUE):

1. Pasting a session URL into Slack or Twitter shows the session title as the OG preview title; pasting the landing page URL shows a static OG image
2. Fetching `/robots.txt` shows that `/live/` paths are disallowed and the landing page is allowed
3. Every icon-only button (upvote, downvote, copy snippet, delete, theme toggle, language switcher) has an ARIA label readable by VoiceOver
4. The session page structure uses semantic landmark elements (`main`, `section`, `article`, `header`) — no layout-div soup for primary regions
5. Tabbing through the session page reaches every interactive element in logical order with a visible focus ring; the Q&A feed announces new questions to screen readers via an `aria-live` region
   **Plans**: 2 plans

Plans:

- [ ] 08-01-PLAN.md — SEO: robots.txt, sitemap.xml, OG image, generateMetadata, metadataBase, JSON-LD
- [ ] 08-02-PLAN.md — Accessibility: semantic HTML landmarks, ARIA labels, aria-live region, skip-to-content link, focus rings

### Phase 9: Reactions Data Model and Backend

**Goal**: The `react` GraphQL mutation is live — participants can add and toggle emoji reactions on Questions and Replies, counts are deduplicated per device fingerprint, rate limiting and ban enforcement are active, and reaction updates broadcast to all connected clients via the existing subscription channel
**Depends on**: Phase 8
**Requirements**: RXN-01, RXN-02, RXN-03, RXN-04, RXN-05, RXN-06, RXN-07, RXN-08, RXN-09, RXN-14
**Success Criteria** (what must be TRUE):

1. Calling the `react` mutation from the AppSync console with a valid emoji and Question/Reply ID updates the flat `rxn_<emoji>_count` attribute on that DynamoDB item and broadcasts a `REACTION_UPDATED` event to all subscribers within 200ms
2. Calling the `react` mutation twice with the same emoji from the same device fingerprint results in a count of 1 (dedup via `rxn_<emoji>_reactors` Set); calling it a third time toggles the count back to 0
3. A banned participant's `react` call is rejected; a participant who exceeds 30 reactions/minute receives a rate-limit error without consuming their question-submission budget
4. The `REACTION_UPDATED` subscription payload contains only emoji counts (`{ targetId, targetType, emoji, counts }`) — no reactor fingerprints are included
5. The `EMOJI_PALETTE` constant in `@nasqa/core` is the single source of truth for the 6 allowed emoji keys, validated by Zod — the Lambda resolver rejects any emoji argument not in the palette
   **Plans**: TBD

### Phase 10: Reactions Frontend State and UI

**Goal**: The `ReactionBar` component is rendered below every Question and Reply with live emoji counts, optimistic toggle behavior, visual highlight for the user's own active reactions, full ARIA accessibility, and 44px mobile touch targets
**Depends on**: Phase 9
**Requirements**: RXN-10, RXN-11, RXN-12, RXN-13
**Success Criteria** (what must be TRUE):

1. Every QuestionCard and ReplyCard shows a `ReactionBar` with 6 emoji buttons; buttons with zero reactions are hidden; clicking any emoji button immediately toggles its visual state (optimistic) before server confirmation
2. A participant's own active reactions are visually distinct from inactive ones (highlighted state); toggling an active reaction removes the highlight and decrements the displayed count
3. When a `REACTION_UPDATED` subscription event arrives for an item, only that item's reaction counts update in place — no full list re-render; count display converges to the authoritative server value
4. All 6 reaction buttons have `aria-label` strings in en, es, and pt (e.g., "React with thumbs up: 3 reactions") and carry `aria-pressed` to reflect active state; each button's touch target meets the 44px minimum on mobile
   **Plans**: TBD

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
4. Framer Motion `AnimatePresence` exit animations still play when a question transitions between states (normal → banned, normal → hidden) — compound key `${question.id}-${variant}` forces clean remount without layout pop
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
Phases execute in numeric order: 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13

| Phase                                           | Milestone | Plans Complete | Status      | Completed  |
| ----------------------------------------------- | --------- | -------------- | ----------- | ---------- |
| 1. Infrastructure                               | v1.0      | 3/3            | Complete    | 2026-03-14 |
| 2. Session and View Shell                       | v1.0      | 3/3            | Complete    | 2026-03-14 |
| 3. Real-Time Core                               | v1.0      | 6/6            | Complete    | 2026-03-14 |
| 4. Moderation, Identity, and Polish             | v1.0      | 4/4            | Complete    | 2026-03-14 |
| 5. Code Quality Gates                           | v1.1      | 2/2            | Complete    | 2026-03-15 |
| 6. Testing and CI                               | v1.1      | 3/3            | Complete    | 2026-03-16 |
| 7. Error Handling and Observability             | 3/3       | Complete       | 2026-03-16  | -          |
| 8. SEO and Accessibility                        | 2/2       | Complete       | 2026-03-17  | -          |
| 9. Reactions Data Model and Backend             | v1.2      | 0/TBD          | Not started | -          |
| 10. Reactions Frontend State and UI             | v1.2      | 0/TBD          | Not started | -          |
| 11. Shared Utilities and Hook Extraction        | v1.3      | 0/TBD          | Not started | -          |
| 12. Component Decomposition and QAPanel Cleanup | v1.3      | 0/TBD          | Not started | -          |
| 13. Accessibility and UX Polish                 | v1.3      | 0/TBD          | Not started | -          |

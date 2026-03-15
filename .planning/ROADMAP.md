# Roadmap: Nasqa Live

## Milestones

- ✅ **v1.0 MVP** - Phases 1-4 (shipped 2026-03-14)
- 🚧 **v1.1 Enterprise Hardening** - Phases 5-8 (in progress)

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
- [ ] **Phase 6: Testing and CI** - Vitest test suite across schemas, resolvers, and components; GitHub Actions pipeline that runs lint, typecheck, test, and build on every PR
- [ ] **Phase 7: Error Handling and Observability** - Next.js error boundaries with graceful fallbacks, structured server actions, and pino structured logging in Lambda resolvers
- [ ] **Phase 8: SEO and Accessibility** - Dynamic per-session metadata, robots/sitemap, semantic HTML landmarks, ARIA labels, and keyboard navigation across all components

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
   **Plans**: TBD

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
   **Plans**: TBD

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
   **Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 5 → 6 → 7 → 8

| Phase                               | Milestone | Plans Complete | Status      | Completed  |
| ----------------------------------- | --------- | -------------- | ----------- | ---------- |
| 1. Infrastructure                   | v1.0      | 3/3            | Complete    | 2026-03-14 |
| 2. Session and View Shell           | v1.0      | 3/3            | Complete    | 2026-03-14 |
| 3. Real-Time Core                   | v1.0      | 6/6            | Complete    | 2026-03-14 |
| 4. Moderation, Identity, and Polish | v1.0      | 4/4            | Complete    | 2026-03-14 |
| 5. Code Quality Gates               | 2/2       | Complete       | 2026-03-15  | -          |
| 6. Testing and CI                   | v1.1      | 0/TBD          | Not started | -          |
| 7. Error Handling and Observability | v1.1      | 0/TBD          | Not started | -          |
| 8. SEO and Accessibility            | v1.1      | 0/TBD          | Not started | -          |

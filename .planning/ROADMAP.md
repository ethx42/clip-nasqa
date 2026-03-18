# Roadmap: Nasqa Live

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-14)
- ✅ **v1.1 Enterprise Hardening** — Phases 5-8 (shipped 2026-03-17)
- ✅ **v1.2 Reactions** — Phases 9-10 (shipped 2026-03-17)
- ✅ **v1.3 Participant & Host UX Refactor** — Phases 11-13 (shipped 2026-03-18)
- ✅ **v2.0 Performance & Instant Operations** — Phases 14-16 (shipped 2026-03-18)
- 🚧 **v2.1 Edit & Delete** — Phase 17 (in progress)

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

<details>
<summary>✅ v1.3 Participant & Host UX Refactor (Phases 11-13) — SHIPPED 2026-03-18</summary>

- [x] **Phase 11: Shared Utilities and Hook Extraction** — `formatRelativeTime` extracted to a single canonical module; `useSessionMutations` hook consolidates all mutation handlers from both page orchestrators (completed 2026-03-17)
- [x] **Phase 12: Component Decomposition** — `SnippetCard` extracted as a standalone component; `QAPanel` sort logic deduplicated into one shared utility; `QuestionCard` split into host and participant variants (completed 2026-03-17)
- [x] **Phase 13: UX Polish and Accessibility** — Vote buttons show filled state with `aria-pressed`; identity chip surfaces device identity inline in QAInput; own questions visually distinguished in the feed (completed 2026-03-18)

</details>

### v2.0 Performance & Instant Operations (Complete)

**Milestone Goal:** Eliminate all perceived latency — every user action must feel instantaneous with zero flashing, stable layout, and reliable real-time sync.

- [x] **Phase 14: Infrastructure and URL Routing** — Lambda memory at 256MB, SSR fetch deduplication, QA sort debounce with layout animations, 6-digit numeric session codes, flat URL structure, /join page (completed 2026-03-18)
- [x] **Phase 15: Mutation Path and Client Utilities** — `graphqlMutation()` and `safeClientMutation()` client utilities, shared error parser, participant mutations execute directly against AppSync, lazy i18n in surviving Server Actions (completed 2026-03-18)
- [x] **Phase 16: Optimistic Snippet Push and Client Shiki** — Host snippet push appears at 0ms via optimistic dispatch with content-fingerprint dedup and rollback, client-side Shiki syntax preview with dynamic import and JS regex engine (completed 2026-03-18)

### v2.1 Edit & Delete (In Progress)

**Milestone Goal:** Authors can edit and delete their own questions, replies, and clipboard snippets within a 5-minute window. The host has superuser powers to edit or delete any post at any time. All changes broadcast in real-time.

- [ ] **Phase 17: Edit & Delete** — Backend mutations + DynamoDB schema, 5-min author window, host superuser, frontend inline editing UI, edited indicators, real-time broadcast

## Phase Details

### Phase 14: Infrastructure and URL Routing

**Goal**: Measurable backend and routing improvements are live — cold starts are shorter, SSR reads are halved, QA ordering is smooth and fast, and sessions use short numeric codes accessible via a flat URL or a voice-friendly /join page
**Depends on**: Phase 13
**Requirements**: INFRA-01, INFRA-02, INFRA-03, UX-01, UX-02, URL-01, URL-02, URL-03, URL-04, URL-05, URL-06, URL-07, URL-08
**Success Criteria** (what must be TRUE):

1. The Lambda resolver returns responses with measurably shorter cold-start latency — `memory: "256 MB"` is visible in `sst.config.ts` and CloudWatch confirms arm64 execution
2. A session page load triggers at most 2 DynamoDB calls instead of 4 — verifiable by adding a log counter to `getSession`/`getSessionData` and loading the page once
3. Questions visibly animate into their new sorted position when upvotes change at 300ms debounce — no card teleporting during active voting
4. A host creates a session and receives a 6-digit numeric URL (e.g., `/en/482913`) — word-pair slugs no longer appear anywhere in the app
5. A participant can navigate to `/join`, type a 6-digit code, and reach the correct session without needing the full URL
   **Plans**: 4 plans
   Plans:

- [ ] 14-01-PLAN.md — Lambda 256MB + arm64, React.cache SSR dedup, force-dynamic, QA debounce 300ms with reduced-motion
- [ ] 14-02-PLAN.md — slug->code rename across types, GraphQL, Lambda resolvers; numeric code generation; remove random-word-slugs
- [ ] 14-03-PLAN.md — Route migration from session/[slug] to [code], OG image relocation, QR URL update
- [ ] 14-04-PLAN.md — /join page with OTP-style input, validateSessionCode action, branded OG image

### Phase 15: Mutation Path and Client Utilities

**Goal**: Participant mutations bypass the Netlify Server Action layer entirely — `addQuestion`, `upvoteQuestion`, `downvoteQuestion`, `react`, and `addReply` call AppSync directly from the browser via shared typed utilities, and surviving Server Actions no longer call `getTranslations()` on every request
**Depends on**: Phase 14
**Requirements**: MUT-01, MUT-02, MUT-03, MUT-04, MUT-05
**Success Criteria** (what must be TRUE):

1. A participant submitting a question shows no Netlify Server Action network request in DevTools — only a direct AppSync HTTP POST appears
2. Host mutations (pushSnippet, deleteSnippet, clearClipboard, focusQuestion, banQuestion, banParticipant, restoreQuestion) still execute as Server Actions — no host mutation appears as a browser-originated AppSync request in DevTools
3. Rate limit errors from AppSync return a localized countdown toast to the user — the raw `RATE_LIMIT_EXCEEDED:N` string is never shown
4. `lib/appsync-client.ts` exports `graphqlMutation()` and `lib/safe-action.ts` exports `safeClientMutation()` — both are importable and typed against the AppSync schema
   **Plans**: 2 plans
   Plans:

- [ ] 15-01-PLAN.md — Client mutation utilities (graphqlMutation, safeClientMutation), hook migration, QAInput pending state, delete old participant Server Actions
- [ ] 15-02-PLAN.md — Lazy-load getTranslations in surviving Server Actions (snippet, session, moderation)

### Phase 16: Optimistic Snippet Push and Client Shiki

**Goal**: The host's clipboard and syntax preview both respond at 0ms — snippet push appears instantly in the clipboard panel before the server confirms, and syntax highlighting updates live as the host types without any server round-trip
**Depends on**: Phase 15
**Requirements**: OPT-01, OPT-02, OPT-03, SHIKI-01, SHIKI-02, SHIKI-03, SHIKI-04, SHIKI-05, SHIKI-06, SHIKI-07
**Success Criteria** (what must be TRUE):

1. The host presses push and their snippet appears in the clipboard panel before any network response arrives — no spinner, no delay, no flash
2. If the push fails, the optimistic snippet disappears and the textarea content is restored — the host can retry without losing their work
3. Two identical snippets never appear simultaneously in the clipboard panel — the optimistic entry is replaced by the confirmed entry, not duplicated alongside it
4. Syntax highlighting updates live as the host types in the input — no Server Action round-trip occurs, verifiable by watching the Network tab during typing
5. The host can open a language dropdown, select from the supported languages list, and see the preview re-highlight immediately with the chosen language
   **Plans**: 2 plans
   Plans:

- [ ] 16-01-PLAN.md — Optimistic push hook, reducer extensions (failed state, content-fingerprint dedup), SnippetCard failed variant, snippet numbering, compact pill banner
- [ ] 16-02-PLAN.md — Client Shiki hook (singleton, lazy langs, JS regex engine), stricter detectLanguage, language dropdown, HostInput live preview, SnippetCard migration, renderHighlight removal

### Phase 17: Edit & Delete

**Goal**: Authors can edit and delete their own questions, replies, and clipboard snippets within a 5-minute window; the host can edit or delete any post at any time as superuser; all edits and deletes broadcast in real-time with visual indicators
**Depends on**: Phase 16
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08, EDIT-09, EDIT-10, EDIT-11, EDIT-12, EDIT-13
**Success Criteria** (what must be TRUE):

1. An author can tap edit on their own question within 5 minutes and save changes — the edited content appears for all participants in real-time with an "edited" indicator
2. An author can delete their own question within 5 minutes — it disappears for all participants in real-time (soft-delete)
3. After 5 minutes, the edit/delete buttons are no longer visible to the author
4. The host can edit or delete any question, reply, or snippet at any time regardless of the 5-minute window
5. A host can edit a clipboard snippet's content and language — the updated snippet appears in real-time for all participants
   **Plans**: 3 plans
   Plans:

- [ ] 17-01-PLAN.md — Types, GraphQL schema, SST config, Lambda resolvers (edit/delete with auth + soft-delete filter)
- [ ] 17-02-PLAN.md — Frontend state wiring: mutation strings, reducer actions, subscription handler, participant + host mutation hooks, Server Actions
- [ ] 17-03-PLAN.md — Frontend UI: inline edit, delete dialogs, 5-min window auto-hide, edited badges, snippet edit, i18n (en/es/pt)

## Progress

**Execution Order:**
Phases execute in numeric order: 14 -> 15 -> 16 -> 17

| Phase                                        | Milestone | Plans Complete | Status   | Completed  |
| -------------------------------------------- | --------- | -------------- | -------- | ---------- |
| 1. Infrastructure                            | v1.0      | 3/3            | Complete | 2026-03-14 |
| 2. Session and View Shell                    | v1.0      | 3/3            | Complete | 2026-03-14 |
| 3. Real-Time Core                            | v1.0      | 6/6            | Complete | 2026-03-14 |
| 4. Moderation, Identity, and Polish          | v1.0      | 4/4            | Complete | 2026-03-14 |
| 5. Code Quality Gates                        | v1.1      | 2/2            | Complete | 2026-03-15 |
| 6. Testing and CI                            | v1.1      | 3/3            | Complete | 2026-03-16 |
| 7. Error Handling and Observability          | v1.1      | 3/3            | Complete | 2026-03-16 |
| 8. SEO and Accessibility                     | v1.1      | 2/2            | Complete | 2026-03-17 |
| 9. Reactions Data Model and Backend          | v1.2      | 3/3            | Complete | 2026-03-17 |
| 10. Reactions Frontend State and UI          | v1.2      | 2/2            | Complete | 2026-03-17 |
| 11. Shared Utilities and Hook Extraction     | v1.3      | 2/2            | Complete | 2026-03-17 |
| 12. Component Decomposition                  | v1.3      | 3/3            | Complete | 2026-03-17 |
| 13. UX Polish and Accessibility              | v1.3      | 2/2            | Complete | 2026-03-18 |
| 14. Infrastructure and URL Routing           | v2.0      | 4/4            | Complete | 2026-03-18 |
| 15. Mutation Path and Client Utilities       | v2.0      | 2/2            | Complete | 2026-03-18 |
| 16. Optimistic Snippet Push and Client Shiki | v2.0      | 2/2            | Complete | 2026-03-18 |
| 17. Edit & Delete                            | 1/3       | In Progress    |          | -          |

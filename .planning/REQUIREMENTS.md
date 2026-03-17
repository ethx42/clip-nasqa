# Requirements: Nasqa Live

**Defined:** 2026-03-15
**Core Value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices

## v1.1 Requirements

### Code Quality

- [x] **QUAL-01**: Pre-commit hooks block commits that fail lint or typecheck (Husky + lint-staged)
- [x] **QUAL-02**: Prettier enforces consistent formatting on staged files with import sorting
- [x] **QUAL-03**: TypeScript strict mode standardized across all packages (root, core, frontend, functions)

### Testing

- [x] **TEST-01**: Vitest configured as test runner with workspace-aware monorepo setup
- [x] **TEST-02**: Unit tests for core Zod schemas (validation, edge cases)
- [x] **TEST-03**: Unit tests for Lambda resolvers (mocked DynamoDB/AppSync)
- [x] **TEST-04**: Component tests with React Testing Library for key UI components
- [x] **TEST-05**: Bundle size regression guard fails CI if JS exceeds budget

### CI/CD

- [x] **CICD-01**: GitHub Actions pipeline runs lint, typecheck, test, build on every PR
- [x] **CICD-02**: Pipeline caches node_modules and .next for fast runs

### Error Handling

- [x] **ERR-01**: `global-error.tsx` catches root layout crashes with a recovery UI
- [x] **ERR-02**: `error.tsx` in session route segments provides graceful fallbacks
- [x] **ERR-03**: `not-found.tsx` renders a branded 404 page
- [x] **ERR-04**: Server Actions (createSession, Q&A) return structured errors instead of throwing

### Observability

- [x] **OBS-01**: Lambda resolvers use structured JSON logging (level, sessionSlug, operation, durationMs)

### SEO

- [x] **SEO-01**: `generateMetadata` produces dynamic title/description per session page
- [x] **SEO-02**: Static Open Graph image for landing page social sharing
- [x] **SEO-03**: Dynamic OG image per session showing title and QR code
- [x] **SEO-04**: `robots.ts` blocks session pages from indexing, allows landing page
- [x] **SEO-05**: `sitemap.ts` with landing page and locale variants

### Accessibility

- [x] **A11Y-01**: Semantic HTML audit — replace div wrappers with main/nav/section/article
- [x] **A11Y-02**: ARIA labels on all icon-only buttons and live regions for real-time updates
- [x] **A11Y-03**: Keyboard navigation — logical tab order, visible focus rings, modal focus traps

## v1.2 Requirements

### Reactions Data Model

- [x] **RXN-01**: Participant can add one reaction per emoji type per Question (6 fixed emojis: 👍 ❤️ 🎉 😂 🤔 👀)
- [x] **RXN-02**: Participant can add one reaction per emoji type per Reply (same 6 emojis)
- [x] **RXN-03**: Participant can toggle off their own reaction on a Question or Reply
- [ ] **RXN-04**: Reaction counts per emoji are visible to all connected participants in real-time
- [x] **RXN-05**: Reactions are deduplicated per device fingerprint per emoji per item (no double-counting)

### Reactions Backend

- [x] **RXN-06**: Reaction mutations enforce ban check — banned participants cannot react
- [x] **RXN-07**: Reactions are rate-limited at 30/min per fingerprint in a separate namespace from question rate limits
- [ ] **RXN-08**: Reaction updates propagate via existing AppSync SessionUpdate subscription channel
- [x] **RXN-09**: Subscription payloads contain only emoji counts, never reactor fingerprints

### Reactions UI

- [ ] **RXN-10**: Inline ReactionBar component renders below Question and Reply content with per-emoji count badges
- [ ] **RXN-11**: User's own active reactions are visually highlighted (distinct from unselected state)
- [ ] **RXN-12**: Toggling a reaction applies optimistic UI update before server confirmation
- [ ] **RXN-13**: Reaction buttons have ARIA labels and meet 44px minimum touch target for mobile
- [x] **RXN-14**: Emoji palette is defined as a shared constant in `@nasqa/core` validated by Zod schema

## v1.3 Requirements

### Structural Refactor

- [ ] **STRUC-01**: Shared `formatRelativeTime(epochSeconds, t)` utility replaces all inline duplicates (clipboard-panel, question-card, reply-list) with no behavior change
- [ ] **STRUC-02**: `useSessionMutations` hook extracts all optimistic-update-with-rollback logic from `SessionLivePage` and `SessionLiveHostPage`, reducing each to a ~40-line composition root
- [ ] **STRUC-03**: `SnippetCard` is extracted from `ClipboardPanel` into its own file and is independently importable and testable
- [ ] **STRUC-04**: `QuestionCard` is decomposed into state-specific variants (Normal, Banned, Hidden) with a discriminator wrapper; AnimatePresence keys remain on the parent `motion.div`
- [ ] **STRUC-05**: Duplicate sort logic is removed from `QAPanel`; the panel accepts pre-sorted questions and owns only the debounced visual stability
- [ ] **STRUC-06**: `repliesByQuestion` grouping in `QAPanel` is memoized with `useMemo` instead of recomputed on every render

### Interaction Improvements

- [ ] **UXINT-01**: Vote buttons display a filled background state when active (upvote: emerald fill, downvote: rose fill) with smooth transition for mutual-exclusion swap
- [ ] **UXINT-02**: Vote buttons have `active:scale-95` press micro-animation on both upvote and downvote
- [ ] **UXINT-03**: Own questions display a left-border accent strip for spatial recognition in the feed
- [ ] **UXINT-04**: `QAInput` displays an identity chip (pixel avatar + truncated name or "Anonymous") inline; clicking the chip opens the `IdentityEditor` popover
- [ ] **UXINT-05**: `QAPanel` and `ClipboardPanel` empty states are connection-aware with contextual copy for participant and host views
- [ ] **UXINT-06**: Focused questions auto-expand their reply section via `useEffect` sync of `showReplies` to `isFocused` prop changes (fixes stale-state bug)
- [ ] **UXINT-07**: Reply button is visible inline when replies are expanded (no separate click to show input)

### Accessibility

- [ ] **A11Y-04**: Mobile tab bar uses ARIA tablist pattern (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"`, `aria-labelledby`)
- [ ] **A11Y-05**: Mobile tab panels use CSS `hidden` attribute instead of conditional rendering, preserving scroll position and subscription state
- [ ] **A11Y-06**: `NewContentBanner` uses a permanently-mounted `aria-live="polite"` region with content-swapping (not conditional render)
- [ ] **A11Y-07**: Vote buttons carry `aria-pressed` attribute reflecting toggle state

## Future Requirements

- **TEST-06**: E2E tests with Playwright for multi-tab real-time scenarios
- **TEST-07**: Lighthouse CI score gate in GitHub Actions
- **MON-01**: Sentry error tracking across client, server, and edge runtimes
- **SEC-01**: Content Security Policy (CSP) headers
- **RXN-15**: Reactions on Snippets (audience feedback on shared code)
- **RXN-16**: Reaction analytics visible to host (most-reacted questions)

## Out of Scope

| Feature                             | Reason                                                   |
| ----------------------------------- | -------------------------------------------------------- |
| Integration tests against live AWS  | Cost, speed, test pollution — use mocked SDK             |
| Jest                                | ESM-first codebase; Vitest is faster and ESM-native      |
| 100% code coverage                  | Tiered targets instead (core 90%, resolvers 80%, UI 70%) |
| E2E on every PR                     | 5-15 min per PR; run on main only                        |
| Storybook                           | No design team; components coupled to real-time state    |
| WCAG AAA                            | Level AA is realistic; AAA conflicts with real-time UI   |
| Datadog/New Relic                   | Overkill at 50-500 users                                 |
| Emoji picker library                | Bundle budget (80kB); fixed palette prevents abuse       |
| Flying/floating emoji animations    | Accessibility conflicts, bundle cost, CPU overhead       |
| "Who reacted" tooltip               | Privacy concern for anonymous sessions; 24h TTL          |
| Reactions affecting sort order      | Upvotes handle ranking; reactions are sentiment only     |
| Multi-level reply threading         | DynamoDB schema complexity; kills live context momentum  |
| Real-time card reorder on each vote | Layout thrash; 1-second debounce is the correct pattern  |
| Dedicated "My Questions" tab        | Left-border + "You" label solves at zero nav cost        |
| Focused question pulse animation    | Static glow is functional; low priority deferred         |

## Traceability

| Requirement | Phase    | Status   |
| ----------- | -------- | -------- |
| QUAL-01     | Phase 5  | Complete |
| QUAL-02     | Phase 5  | Complete |
| QUAL-03     | Phase 5  | Complete |
| TEST-01     | Phase 6  | Complete |
| TEST-02     | Phase 6  | Complete |
| TEST-03     | Phase 6  | Complete |
| TEST-04     | Phase 6  | Complete |
| TEST-05     | Phase 6  | Complete |
| CICD-01     | Phase 6  | Complete |
| CICD-02     | Phase 6  | Complete |
| ERR-01      | Phase 7  | Complete |
| ERR-02      | Phase 7  | Complete |
| ERR-03      | Phase 7  | Complete |
| ERR-04      | Phase 7  | Complete |
| OBS-01      | Phase 7  | Complete |
| SEO-01      | Phase 8  | Complete |
| SEO-02      | Phase 8  | Complete |
| SEO-03      | Phase 8  | Complete |
| SEO-04      | Phase 8  | Complete |
| SEO-05      | Phase 8  | Complete |
| A11Y-01     | Phase 8  | Complete |
| A11Y-02     | Phase 8  | Complete |
| A11Y-03     | Phase 8  | Complete |
| RXN-01      | Phase 9  | Complete |
| RXN-02      | Phase 9  | Complete |
| RXN-03      | Phase 9  | Complete |
| RXN-04      | Phase 9  | Pending  |
| RXN-05      | Phase 9  | Complete |
| RXN-06      | Phase 9  | Complete |
| RXN-07      | Phase 9  | Complete |
| RXN-08      | Phase 9  | Pending  |
| RXN-09      | Phase 9  | Complete |
| RXN-14      | Phase 9  | Complete |
| RXN-10      | Phase 10 | Pending  |
| RXN-11      | Phase 10 | Pending  |
| RXN-12      | Phase 10 | Pending  |
| RXN-13      | Phase 10 | Pending  |
| STRUC-01    | Phase 11 | Pending  |
| STRUC-02    | Phase 11 | Pending  |
| STRUC-06    | Phase 11 | Pending  |
| STRUC-03    | Phase 12 | Pending  |
| STRUC-04    | Phase 12 | Pending  |
| STRUC-05    | Phase 12 | Pending  |
| UXINT-01    | Phase 13 | Pending  |
| UXINT-02    | Phase 13 | Pending  |
| UXINT-03    | Phase 13 | Pending  |
| UXINT-04    | Phase 13 | Pending  |
| UXINT-05    | Phase 13 | Pending  |
| UXINT-06    | Phase 13 | Pending  |
| UXINT-07    | Phase 13 | Pending  |
| A11Y-04     | Phase 13 | Pending  |
| A11Y-05     | Phase 13 | Pending  |
| A11Y-06     | Phase 13 | Pending  |
| A11Y-07     | Phase 13 | Pending  |

**Coverage:**

- v1.1 requirements: 23 total (10 complete, 13 pending)
- v1.2 requirements: 14 total (0 complete, 14 pending)
- v1.3 requirements: 17 total (0 complete, 17 pending)
- Mapped to phases: 23 (v1.1) + 14 (v1.2) + 17 (v1.3) = 54 total
- Unmapped: 0

---

_Requirements defined: 2026-03-15_
_Last updated: 2026-03-16 after v1.3 roadmap (Phases 11-13) created_

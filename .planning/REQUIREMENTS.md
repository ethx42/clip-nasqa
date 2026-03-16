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
- [ ] **TEST-04**: Component tests with React Testing Library for key UI components
- [ ] **TEST-05**: Bundle size regression guard fails CI if JS exceeds budget

### CI/CD

- [x] **CICD-01**: GitHub Actions pipeline runs lint, typecheck, test, build on every PR
- [x] **CICD-02**: Pipeline caches node_modules and .next for fast runs

### Error Handling

- [ ] **ERR-01**: `global-error.tsx` catches root layout crashes with a recovery UI
- [ ] **ERR-02**: `error.tsx` in session route segments provides graceful fallbacks
- [ ] **ERR-03**: `not-found.tsx` renders a branded 404 page
- [ ] **ERR-04**: Server Actions (createSession, Q&A) return structured errors instead of throwing

### Observability

- [ ] **OBS-01**: Lambda resolvers use structured JSON logging (level, sessionSlug, operation, durationMs)

### SEO

- [ ] **SEO-01**: `generateMetadata` produces dynamic title/description per session page
- [ ] **SEO-02**: Static Open Graph image for landing page social sharing
- [ ] **SEO-03**: Dynamic OG image per session showing title and QR code
- [ ] **SEO-04**: `robots.ts` blocks session pages from indexing, allows landing page
- [ ] **SEO-05**: `sitemap.ts` with landing page and locale variants

### Accessibility

- [ ] **A11Y-01**: Semantic HTML audit — replace div wrappers with main/nav/section/article
- [ ] **A11Y-02**: ARIA labels on all icon-only buttons and live regions for real-time updates
- [ ] **A11Y-03**: Keyboard navigation — logical tab order, visible focus rings, modal focus traps

## v1.2 Requirements

### Reactions Data Model

- [ ] **RXN-01**: Participant can add one reaction per emoji type per Question (6 fixed emojis: 👍 ❤️ 🎉 😂 🤔 👀)
- [ ] **RXN-02**: Participant can add one reaction per emoji type per Reply (same 6 emojis)
- [ ] **RXN-03**: Participant can toggle off their own reaction on a Question or Reply
- [ ] **RXN-04**: Reaction counts per emoji are visible to all connected participants in real-time
- [ ] **RXN-05**: Reactions are deduplicated per device fingerprint per emoji per item (no double-counting)

### Reactions Backend

- [ ] **RXN-06**: Reaction mutations enforce ban check — banned participants cannot react
- [ ] **RXN-07**: Reactions are rate-limited at 30/min per fingerprint in a separate namespace from question rate limits
- [ ] **RXN-08**: Reaction updates propagate via existing AppSync SessionUpdate subscription channel
- [ ] **RXN-09**: Subscription payloads contain only emoji counts, never reactor fingerprints

### Reactions UI

- [ ] **RXN-10**: Inline ReactionBar component renders below Question and Reply content with per-emoji count badges
- [ ] **RXN-11**: User's own active reactions are visually highlighted (distinct from unselected state)
- [ ] **RXN-12**: Toggling a reaction applies optimistic UI update before server confirmation
- [ ] **RXN-13**: Reaction buttons have ARIA labels and meet 44px minimum touch target for mobile
- [ ] **RXN-14**: Emoji palette is defined as a shared constant in `@nasqa/core` validated by Zod schema

## Future Requirements

- **TEST-06**: E2E tests with Playwright for multi-tab real-time scenarios
- **TEST-07**: Lighthouse CI score gate in GitHub Actions
- **MON-01**: Sentry error tracking across client, server, and edge runtimes
- **SEC-01**: Content Security Policy (CSP) headers
- **RXN-15**: Reactions on Snippets (audience feedback on shared code)
- **RXN-16**: Reaction analytics visible to host (most-reacted questions)

## Out of Scope

| Feature                            | Reason                                                   |
| ---------------------------------- | -------------------------------------------------------- |
| Integration tests against live AWS | Cost, speed, test pollution — use mocked SDK             |
| Jest                               | ESM-first codebase; Vitest is faster and ESM-native      |
| 100% code coverage                 | Tiered targets instead (core 90%, resolvers 80%, UI 70%) |
| E2E on every PR                    | 5-15 min per PR; run on main only                        |
| Storybook                          | No design team; components coupled to real-time state    |
| WCAG AAA                           | Level AA is realistic; AAA conflicts with real-time UI   |
| Datadog/New Relic                  | Overkill at 50-500 users                                 |
| Emoji picker library               | Bundle budget (80kB); fixed palette prevents abuse       |
| Flying/floating emoji animations   | Accessibility conflicts, bundle cost, CPU overhead       |
| "Who reacted" tooltip              | Privacy concern for anonymous sessions; 24h TTL          |
| Reactions affecting sort order     | Upvotes handle ranking; reactions are sentiment only     |

## Traceability

| Requirement | Phase    | Status   |
| ----------- | -------- | -------- |
| QUAL-01     | Phase 5  | Complete |
| QUAL-02     | Phase 5  | Complete |
| QUAL-03     | Phase 5  | Complete |
| TEST-01     | Phase 6  | Complete |
| TEST-02     | Phase 6  | Complete |
| TEST-03     | Phase 6  | Complete |
| TEST-04     | Phase 6  | Pending  |
| TEST-05     | Phase 6  | Pending  |
| CICD-01     | Phase 6  | Complete |
| CICD-02     | Phase 6  | Complete |
| ERR-01      | Phase 7  | Pending  |
| ERR-02      | Phase 7  | Pending  |
| ERR-03      | Phase 7  | Pending  |
| ERR-04      | Phase 7  | Pending  |
| OBS-01      | Phase 7  | Pending  |
| SEO-01      | Phase 8  | Pending  |
| SEO-02      | Phase 8  | Pending  |
| SEO-03      | Phase 8  | Pending  |
| SEO-04      | Phase 8  | Pending  |
| SEO-05      | Phase 8  | Pending  |
| A11Y-01     | Phase 8  | Pending  |
| A11Y-02     | Phase 8  | Pending  |
| A11Y-03     | Phase 8  | Pending  |
| RXN-01      | Phase 9  | Pending  |
| RXN-02      | Phase 9  | Pending  |
| RXN-03      | Phase 9  | Pending  |
| RXN-04      | Phase 9  | Pending  |
| RXN-05      | Phase 9  | Pending  |
| RXN-06      | Phase 9  | Pending  |
| RXN-07      | Phase 9  | Pending  |
| RXN-08      | Phase 9  | Pending  |
| RXN-09      | Phase 9  | Pending  |
| RXN-14      | Phase 9  | Pending  |
| RXN-10      | Phase 10 | Pending  |
| RXN-11      | Phase 10 | Pending  |
| RXN-12      | Phase 10 | Pending  |
| RXN-13      | Phase 10 | Pending  |

**Coverage:**

- v1.1 requirements: 23 total (3 complete, 20 pending)
- v1.2 requirements: 14 total (0 complete, 14 pending)
- Mapped to phases: 23 (v1.1) + 14 (v1.2) = 37 total
- Unmapped: 0

---

_Requirements defined: 2026-03-15_
_Last updated: 2026-03-15 after v1.2 roadmap creation_

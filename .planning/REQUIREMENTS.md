# Requirements: Nasqa Live v1.1 — Enterprise Hardening

**Defined:** 2026-03-15
**Core Value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices

## v1.1 Requirements

### Code Quality

- [x] **QUAL-01**: Pre-commit hooks block commits that fail lint or typecheck (Husky + lint-staged)
- [x] **QUAL-02**: Prettier enforces consistent formatting on staged files with import sorting
- [x] **QUAL-03**: TypeScript strict mode standardized across all packages (root, core, frontend, functions)

### Testing

- [ ] **TEST-01**: Vitest configured as test runner with workspace-aware monorepo setup
- [ ] **TEST-02**: Unit tests for core Zod schemas (validation, edge cases)
- [ ] **TEST-03**: Unit tests for Lambda resolvers (mocked DynamoDB/AppSync)
- [ ] **TEST-04**: Component tests with React Testing Library for key UI components
- [ ] **TEST-05**: Bundle size regression guard fails CI if JS exceeds budget

### CI/CD

- [ ] **CICD-01**: GitHub Actions pipeline runs lint, typecheck, test, build on every PR
- [ ] **CICD-02**: Pipeline caches node_modules and .next for fast runs

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

## Future Requirements

- **TEST-06**: E2E tests with Playwright for multi-tab real-time scenarios
- **TEST-07**: Lighthouse CI score gate in GitHub Actions
- **MON-01**: Sentry error tracking across client, server, and edge runtimes
- **SEC-01**: Content Security Policy (CSP) headers

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

## Traceability

| Requirement | Phase   | Status   |
| ----------- | ------- | -------- |
| QUAL-01     | Phase 5 | Complete |
| QUAL-02     | Phase 5 | Complete |
| QUAL-03     | Phase 5 | Complete |
| TEST-01     | Phase 6 | Pending  |
| TEST-02     | Phase 6 | Pending  |
| TEST-03     | Phase 6 | Pending  |
| TEST-04     | Phase 6 | Pending  |
| TEST-05     | Phase 6 | Pending  |
| CICD-01     | Phase 6 | Pending  |
| CICD-02     | Phase 6 | Pending  |
| ERR-01      | Phase 7 | Pending  |
| ERR-02      | Phase 7 | Pending  |
| ERR-03      | Phase 7 | Pending  |
| ERR-04      | Phase 7 | Pending  |
| OBS-01      | Phase 7 | Pending  |
| SEO-01      | Phase 8 | Pending  |
| SEO-02      | Phase 8 | Pending  |
| SEO-03      | Phase 8 | Pending  |
| SEO-04      | Phase 8 | Pending  |
| SEO-05      | Phase 8 | Pending  |
| A11Y-01     | Phase 8 | Pending  |
| A11Y-02     | Phase 8 | Pending  |
| A11Y-03     | Phase 8 | Pending  |

**Coverage:**

- v1.1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---

_Requirements defined: 2026-03-15_

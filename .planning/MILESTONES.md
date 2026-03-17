# Milestones

## v1.1 Enterprise Hardening (Shipped: 2026-03-17)

**Phases completed:** 4 phases (5-8), 10 plans
**Timeline:** 3 days (2026-03-13 → 2026-03-16)
**Git range:** `2189507..790e7c2` (43 commits, 138 files, +15,782/-3,166)

**Key accomplishments:**

- Pre-commit quality gates: Husky + lint-staged + Prettier with import sorting + TypeScript strict mode across all packages
- 74-test Vitest suite covering Zod schemas, Lambda resolvers, and React components (QuestionCard, QAInput)
- GitHub Actions CI pipeline with 4 parallel jobs (lint, typecheck, test, bundle-size) gating every PR
- Error boundaries (global-error, session error, not-found) with structured ActionResult errors and safeAction network resilience
- Pino structured JSON logging in Lambda resolvers with operation, sessionSlug, and durationMs fields
- SEO infrastructure: robots.txt, sitemap.xml, dynamic per-session OG images with QR code, generateMetadata, JSON-LD WebApplication
- Accessibility: semantic HTML landmarks, ARIA labels on all icon-only buttons, skip-to-content link, aria-live region for screen readers

**Known tech debt:**

- Pre-commit hook skips frontend typecheck (CI catches it)
- No tests for error boundaries, safeAction, or SEO files
- Bundle size 156.7kB exceeds 80kB budget (aws-amplify ~68kB)
- TODO(MON-01) in report-error.ts — Sentry deferred

**Archives:**

- `milestones/v1.1-ROADMAP.md`
- `milestones/v1.1-REQUIREMENTS.md`
- `milestones/v1.1-MILESTONE-AUDIT.md`

---

## v1.0 MVP (Shipped: 2026-03-14)

**Phases completed:** 4 phases (1-4), 16 plans
**Timeline:** 1 day (2026-03-14)

**Key accomplishments:**

- SST Ion IaC: DynamoDB single-table, AppSync API, Lambda resolvers provisioned via `sst deploy`
- Session creation with word-pair slugs, SHA-256 hashed host secrets, 24h TTL
- Real-time clipboard with Shiki dual-theme syntax highlighting (SSR, no client JS)
- Q&A with upvoting, reply threading, and speaker reply badges
- Community moderation (50% downvote auto-hide, 3-strike auto-ban, host superuser)
- Optional participant identity with device fingerprint tracking
- i18n (en/es/pt) with locale-prefixed routing and browser detection
- Theme system (dark/light) with Emerald-500 accent, no layout shift

---

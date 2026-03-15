# Feature Research

**Domain:** Enterprise hardening for a production Next.js real-time app (v1.1 milestone)
**Researched:** 2026-03-15
**Confidence:** HIGH — Next.js official production checklist verified (nextjs.org/docs/app/guides/production-checklist, last updated 2026-02-27); Vitest/RTL setup verified against official Next.js testing guide and vitest.dev; Sentry/Next.js integration verified against docs.sentry.io; GitHub Actions patterns from community sources (MEDIUM); accessibility standards from WCAG 2.2 official sources.

---

## Context: What Already Exists

The following features are already implemented in v1.0 and are NOT in scope for v1.1:

- Real-time clipboard with AppSync WebSocket subscriptions
- Q&A with upvoting and moderation (host ban, community downvote, auto-ban)
- Rate limiting (DynamoDB minute-bucket counters)
- i18n with next-intl (en, es, pt)
- Theme system (dark/light, next-themes, Zinc/Emerald tokens)
- Host authentication via SHA-256 hashed secret
- Device fingerprint for anonymous identity
- 24-hour TTL auto-expiry

**v1.1 adds the production reliability layer, not new product features.**

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features a production Next.js app must have. Their absence signals an immature or unsafe codebase — engineers, DevOps teams, and any potential organizational stakeholders will notice their absence immediately.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Unit test suite (Vitest + RTL) | Any production codebase without tests is considered unshippable by modern engineering standards; required for safe refactoring | MEDIUM | Vitest is the current standard for Next.js ESM monorepos; RTL for component tests; `@vitest/coverage-v8` for coverage reports. Async Server Components cannot be unit tested — use E2E for those. |
| CI pipeline (GitHub Actions) | PRs without automated lint/typecheck/test are unsafe to merge; required for team collaboration and safe deploys | MEDIUM | Standard flow: `npm ci` → lint → typecheck → test → build. Run on push + PRs. Cache `node_modules` and `.next` for speed. Monorepo: run per-package with `npm -w packages/frontend run ...` |
| Error boundaries (`error.tsx`) | Unhandled React render errors show a blank screen or browser crash page; error boundaries provide graceful fallbacks | LOW | Next.js App Router: add `error.tsx` per route segment, not just root. `global-error.tsx` for root layout failures. Must be Client Components. Use `reset()` to allow retry. |
| `global-error.tsx` + `not-found.tsx` | Official Next.js production checklist requirement; every production app needs these safety nets | LOW | `app/global-error.tsx` catches root layout crashes (rare but catastrophic). `app/not-found.tsx` handles 404s gracefully with a link back home. |
| Error tracking (Sentry) | Production issues are otherwise invisible; engineers cannot diagnose issues without error reports and stack traces | MEDIUM | Sentry's Next.js SDK handles App Router automatically via `withSentryConfig` in `next.config.ts`. Creates `global-error.tsx` via setup wizard. Each `error.tsx` must call `Sentry.captureException(error)` in a `useEffect` — errors caught by boundaries do NOT reach the global Sentry handler automatically. |
| Pre-commit hooks (Husky + lint-staged) | Without hooks, bad code reaches CI; lint errors block deploys and slow down the team | LOW | Husky v9 + lint-staged: run ESLint + tsc on staged `*.ts`/`*.tsx` files only. Add `prepare` script so hooks install on `npm install`. Blocks commits, not just PRs. |
| Structured logging in Lambda resolvers | Production Lambda functions without logging are undebuggable; CloudWatch is the only window into resolver behavior | LOW | Replace `console.log` with structured JSON (`{ level, message, sessionSlug, operation, durationMs }`). CloudWatch ingests JSON automatically; structured logs are filterable. |
| Dynamic SEO metadata (`generateMetadata`) | Default metadata (`"Create Next App"` title) is actively harmful to discoverability and professionalism | LOW | Next.js `generateMetadata` API: static metadata for landing page, dynamic per-session metadata for the `/live/[slug]` route showing session title. Verified in official docs. |
| Open Graph image for landing page | Social sharing without OG images looks broken; links appear as plain text in Slack, Twitter, iMessage | LOW | Static `opengraph-image.png` in `app/` directory is the simplest path. OG image for per-session pages is a differentiator (see below). |
| `robots.txt` | Without a robots file, search engines crawl everything including live session pages (which should not be indexed) | LOW | `app/robots.ts` with `disallow: /live/` (session pages are ephemeral; indexing them is useless and wastes crawl budget). Allow `/` (landing page). |
| Semantic HTML audit | `<div>` soup with no landmark roles makes the app inaccessible to screen readers; also hurts SEO | MEDIUM | Replace `<div>` wrappers with `<main>`, `<nav>`, `<section>`, `<article>`, `<header>`, `<footer>` where appropriate. Next.js already has `eslint-plugin-jsx-a11y` via `eslint-config-next` — enable it and address all warnings. |
| ARIA labels on interactive elements | Unlabeled buttons (`<button>` with only an icon) are inaccessible; screen readers cannot announce their purpose | LOW | All icon-only buttons (upvote, downvote, theme toggle, copy, delete) need `aria-label`. Live regions for real-time Q&A updates (`aria-live="polite"`). |
| Keyboard navigation | All interactive features must be reachable without a mouse; this is a WCAG 2.2 Level AA requirement (now legally required in the EU since June 2025) | MEDIUM | Tab order must be logical. Focus must be visible (Tailwind `focus-visible:ring` already in shadcn components — verify coverage). Modal/dialog traps focus. Upvote/downvote buttons keyboard-triggerable. |
| TypeScript strict mode audit | `tsconfig.json` inconsistencies already identified in CONCERNS.md; strict mode gaps introduce runtime errors that TypeScript could have caught | LOW | Standardize root and per-package tsconfig targets (ES2022 everywhere). Verify `strict: true` is set. Resolve `@nasqa/functions` path alias gap. |

### Differentiators (Competitive Advantage)

Features that go beyond the baseline. For a developer-focused tool like Nasqa, these signal craftsmanship and build trust with technical users.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| E2E tests (Playwright) | Playwright catches real-time subscription behavior, multi-tab scenarios, and race conditions that unit tests cannot; differentiates serious projects | HIGH | Playwright is preferred over Cypress for this project: better multi-tab support (critical for testing host + participant simultaneously), better WebSocket handling, broader browser coverage. Test critical paths: session create → join → post question → upvote → host ban. |
| Dynamic OG image per session | Sharing a session link in Slack shows the session title and a QR code preview; dramatically improves session discoverability | MEDIUM | Next.js `ImageResponse` API with `generateMetadata`. Render session title + "Join Nasqa Live" on OG image. Requires fetching session metadata at OG generation time. 1200x630px. |
| Bundle size regression guard in CI | Prevents the 80kB gzip budget from being silently violated as features are added; catches Shiki bundle leakage | MEDIUM | `@next/bundle-analyzer` or `bundlesize` npm package in CI. Fail the pipeline if `packages/frontend/.next/static/chunks/` exceeds the threshold. Add this after the current bundle is measured as the baseline. |
| Lighthouse CI score gate | Prevents performance, accessibility, and SEO regressions as the codebase evolves; automated quality floor | HIGH | `@lhci/cli` (Lighthouse CI) in GitHub Actions. Run against `next start` in CI. Gate on: Performance >= 80, Accessibility >= 90, SEO >= 90, Best Practices >= 90. Requires a deployment step or `next build && next start` in CI. |
| Prettier for consistent formatting | Eliminates formatting debates in PRs; unformatted code is a signal of an immature codebase to contributors | LOW | Prettier with `@trivago/prettier-plugin-sort-imports`. Add to lint-staged alongside ESLint. Establish `.prettierrc` as the canonical format source. |
| `sitemap.xml` generation | Helps search engines find the landing page; minimal effort for meaningful SEO improvement | LOW | `app/sitemap.ts` — static sitemap with only the landing page and locale variants. Session pages should NOT be in the sitemap (ephemeral). |
| `useReportWebVitals` hook | Sends real LCP/CLS/FID data to an analytics endpoint; provides field data vs Lighthouse's lab data | LOW | Next.js official API. Report to a simple CloudWatch custom metric via a Lambda Route Handler, or use Vercel Analytics if deploying there. Lightweight to add. |
| Content Security Policy (CSP) headers | Prevents XSS and code injection attacks; signals security maturity | MEDIUM | Next.js `next.config.ts` headers with CSP for: AppSync domain (`connect-src`), Sentry domain (`connect-src`), Shiki fonts, CDN assets. A too-strict CSP will break AppSync WebSocket — test carefully. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like enterprise hardening but either contradict the project's constraints or create more complexity than they solve at this stage.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Integration tests against live AWS | "Real" tests that hit DynamoDB and AppSync; seems thorough | AWS resources cost money in CI; slow (3-10s per test); require secrets in CI; hit TTL-managed data; create test pollution across test runs; infrastructure must be up during CI | Unit tests with mocked AWS SDK (use `vi.mock`); E2E tests against a staging deploy on pushes to main only, not every PR |
| Jest instead of Vitest | Teams migrating from Create React App often default to Jest | The codebase uses ESM throughout (Next.js 16, SST, Zod v4 all ESM-first); Jest requires complex Babel transforms for ESM; Vitest is ESM-native and 2-3x faster for this stack | Vitest — verified by Next.js official docs as the recommended test runner for App Router ESM projects |
| 100% code coverage requirement | "Coverage = quality" intuition | Chasing 100% produces tests that test implementation, not behavior; mocks of mocks; brittle suites that break on refactors; slows down development | Target coverage by tier: core schemas 90%, Lambda resolvers 80%, UI components 70%; enforce minimums not maximums |
| E2E tests on every PR | Maximum test confidence for every change | Playwright E2E requires a built Next.js app + deployed AppSync; adds 5-15 minutes to every PR; blocks merge velocity; conference speakers do not have 15 minutes per PR | Run E2E only on pushes to `main` (pre-deploy gate), not on every PR. Unit + typecheck + lint cover PRs adequately. |
| Storybook for component documentation | Documents UI components in isolation; useful for design systems | Adds a second build system, second deploy target, and maintenance burden; Nasqa's components are tightly coupled to real-time state and not reusable in isolation; no design team to consume a Storybook | Rely on visual tests via Playwright screenshots if visual regression tracking is needed |
| Full WCAG 2.1 Level AAA compliance | Maximum accessibility | Level AAA is not legally required and is often technically infeasible for dynamic real-time UIs (e.g., live content updates conflict with some AAA criteria); disproportionate effort for a single-developer project at this stage | Target WCAG 2.2 Level AA (legally required in EU for software, realistic for this UI); use `eslint-plugin-jsx-a11y` to catch Level A violations automatically |
| Datadog / New Relic APM | Full APM observability; traces, metrics, dashboards | Overkill and expensive for a project at 50-500 users; requires agent setup in Lambda; adds latency; costs money at every invocation | Sentry for errors + structured CloudWatch logs + `useReportWebVitals` for Web Vitals is the right observability stack at this scale |
| Database migrations system | Schema versioning for DynamoDB | DynamoDB is schemaless; SST Ion provisions the table with correct key schema; "migrations" are just Lambda code changes with Zod schema evolution; a migrations framework adds ceremony without benefit | Version Zod schemas in `@nasqa/core`; Lambda handlers carry schema evolution logic; SST manages table-level changes |

---

## Feature Dependencies

```
Pre-commit hooks (Husky + lint-staged)
    └──requires──> ESLint config (already exists, needs strengthening)
    └──requires──> Prettier config (not yet set up)
    └──enhances──> TypeScript strict mode (tsconfig audit)

CI Pipeline (GitHub Actions)
    └──requires──> Test suite (Vitest + RTL)
    └──requires──> Pre-commit hooks (local quality gate before CI)
    └──optionally includes──> Bundle size guard
    └──optionally includes──> Lighthouse CI (needs build + start step)

Test suite (Vitest + RTL)
    └──requires──> TypeScript strict mode (tests catch more with strict)
    └──requires──> Mocked AWS SDK (vi.mock for DynamoDB + AppSync)
    └──enables──> E2E tests (unit tests define the baseline; E2E expands on it)

Error boundaries (error.tsx + global-error.tsx)
    └──requires──> Sentry (errors caught by boundaries must be forwarded manually)
    └──enables──> Sentry (boundary provides the capture point)

Sentry integration
    └──requires──> Error boundaries (to capture React render errors)
    └──requires──> structured logging (complements Sentry for Lambda-side errors)

SEO metadata (generateMetadata)
    └──requires──> not-found.tsx (part of the SEO surface)
    └──requires──> robots.txt (controls indexing scope)
    └──optionally enhances──> Dynamic OG image (per-session metadata includes OG image URL)

Dynamic OG image
    └──requires──> generateMetadata (OG image URL is part of metadata response)
    └──requires──> session data access at render time (fetch session title for image)

Accessibility (ARIA + keyboard + semantic HTML)
    └──requires──> TypeScript strict mode (typed event handlers, no `any` on ARIA props)
    └──enhances──> eslint-plugin-jsx-a11y (already in eslint-config-next; must be activated)
    └──enables──> Lighthouse CI accessibility score gate

Lighthouse CI
    └──requires──> CI pipeline (runs inside GitHub Actions)
    └──requires──> next build + next start in CI (needs production build)
    └──requires──> Accessibility improvements (score will be low without ARIA + semantic HTML fixes)
    └──requires──> SEO metadata (score will be low without title/description/OG)
```

### Dependency Notes

- **Error boundaries require Sentry:** `error.tsx` components catch errors and prevent them from propagating to Sentry's global handler. Without explicit `Sentry.captureException(error)` in each `error.tsx`, errors silently swallow in production. The two features must ship together.
- **Accessibility requires semantic HTML first, then ARIA:** Semantic HTML (`<main>`, `<nav>`, `<article>`) covers 80% of accessibility needs without ARIA; ARIA fills the remaining gaps. Do semantic HTML audit before adding ARIA labels to avoid redundant attributes.
- **Lighthouse CI depends on accessibility and SEO being done:** Running Lighthouse CI before accessibility/SEO work produces low scores that will always fail the gate. These must be implemented before the score gate is enforced.
- **Dynamic OG image conflicts with session privacy:** Session pages must not be indexed (robots.txt `disallow: /live/`), but OG images are fetched by social media crawlers directly (not via search engines). This is acceptable — OG image generation does not require the page to be indexed. OG image URL can be an API route (`/api/og?slug=...`) that is also disallowed from indexing.

---

## MVP Definition

The v1.1 milestone is itself an MVP of production hardening. There is a minimum set of features that takes the app from "demo quality" to "production quality," and then there are differentiators that are worth doing but not blocking.

### Launch With (v1.1 core — must ship)

These are the features that move the needle from "demo" to "production-grade":

- [ ] Vitest + RTL test suite — unsafe to refactor without tests; CI depends on this
- [ ] CI pipeline (lint + typecheck + test on PRs) — team hygiene and safe merge gate
- [ ] Error boundaries (`error.tsx` + `global-error.tsx` + `not-found.tsx`) — unhandled render crashes are unacceptable in production
- [ ] Sentry error tracking — blind production debugging is unsustainable
- [ ] Pre-commit hooks (Husky + lint-staged) — local quality gate; prevents bad code from reaching CI
- [ ] Structured CloudWatch logging in Lambda resolvers — minimum observability for the backend
- [ ] Dynamic SEO metadata (`generateMetadata` for landing + session pages) — fixing the "Create Next App" title is embarrassing
- [ ] `robots.txt` — prevent session pages from being indexed
- [ ] ARIA labels on interactive elements (icon-only buttons) — Level A accessibility; the easiest accessibility win
- [ ] Semantic HTML audit — replaces `<div>` soup with landmark elements; foundational for accessibility
- [ ] Keyboard navigation verification — all interactive elements reachable and operable without a mouse
- [ ] TypeScript strict mode + tsconfig consistency — low effort, high correctness benefit

### Add After Validation (v1.x)

Features worth adding once the core hardening is stable:

- [ ] Playwright E2E tests (happy path: create session → join → post question → upvote) — trigger: when the app is deployed to a stable staging environment
- [ ] Bundle size regression guard in CI — trigger: after a baseline measurement is established; add when the 80kB budget approaches its limit
- [ ] Open Graph image for landing page (static) — trigger: first time the app is shared publicly on social media
- [ ] Dynamic OG image per session — trigger: after static OG image is working; add when session sharing becomes a common pattern
- [ ] Prettier formatting — trigger: before first external contributor; low effort, add to lint-staged alongside ESLint

### Future Consideration (v2+)

Features to defer until the project has more usage and maturity:

- [ ] Lighthouse CI score gate — high CI setup complexity; meaningful only when Lighthouse scores are stable (after full accessibility + SEO pass)
- [ ] `useReportWebVitals` hook — meaningful only when there is enough traffic to generate field data worth analyzing
- [ ] Content Security Policy headers — valuable, but AppSync WebSocket domain and Sentry domains must be carefully allowlisted; easy to break real-time; defer until after E2E tests can catch breakage
- [ ] `sitemap.xml` — low priority; only the landing page is indexable and it will be found without a sitemap at this scale

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Vitest + RTL test suite | HIGH (developer confidence) | MEDIUM | P1 |
| CI pipeline (lint + typecheck + test) | HIGH (safe merges) | MEDIUM | P1 |
| Error boundaries + not-found.tsx | HIGH (production resilience) | LOW | P1 |
| Sentry error tracking | HIGH (production visibility) | MEDIUM | P1 |
| Pre-commit hooks (Husky + lint-staged) | HIGH (code quality gate) | LOW | P1 |
| Structured CloudWatch logging | MEDIUM (backend visibility) | LOW | P1 |
| Dynamic SEO metadata | MEDIUM (discoverability + professionalism) | LOW | P1 |
| robots.txt | MEDIUM (crawl hygiene) | LOW | P1 |
| ARIA labels on icon-only buttons | HIGH (Level A accessibility) | LOW | P1 |
| Semantic HTML audit | HIGH (accessibility + SEO) | MEDIUM | P1 |
| Keyboard navigation verification | MEDIUM (Level AA compliance) | MEDIUM | P1 |
| TypeScript strict mode audit | MEDIUM (correctness) | LOW | P1 |
| Playwright E2E (happy path) | HIGH (real-time flow coverage) | HIGH | P2 |
| Bundle size regression guard | MEDIUM (budget enforcement) | MEDIUM | P2 |
| Static OG image (landing page) | LOW (social sharing) | LOW | P2 |
| Dynamic OG image (per session) | MEDIUM (session sharing UX) | MEDIUM | P2 |
| Prettier formatting | LOW (DX consistency) | LOW | P2 |
| Lighthouse CI score gate | MEDIUM (quality regression prevention) | HIGH | P3 |
| useReportWebVitals hook | LOW (field data at current scale) | LOW | P3 |
| Content Security Policy | MEDIUM (security) | HIGH | P3 |
| sitemap.xml | LOW (marginal SEO benefit) | LOW | P3 |

**Priority key:**
- P1: Must have for v1.1 launch
- P2: Should have, add when P1 is complete
- P3: Nice to have, future consideration

---

## Expected Behavior for Each Feature

### Testing Infrastructure (Vitest + RTL)

**Unit tests (Vitest):**
- Location: co-located with source files (`button.test.tsx` next to `button.tsx`) for components; `__tests__/` for resolver functions
- Minimum coverage targets: `@nasqa/core` Zod schemas → 90%; Lambda resolvers → 80%; UI components → 70%
- Async Server Components cannot be unit tested — test their children (Client Components) and use E2E for full page behavior
- Mock AWS SDK with `vi.mock('@aws-sdk/client-dynamodb')` — never hit live DynamoDB in unit tests
- Mock AppSync subscription client in component tests — test the subscription handler logic, not the WebSocket connection

**Component tests (RTL):**
- Query by role, not implementation (`getByRole('button', { name: 'Upvote' })`, not `getByTestId('upvote-btn')`)
- Test user interactions: `userEvent.click`, `userEvent.type`, not `fireEvent`
- Test real-time state: pass a mock `onSessionUpdate` callback; call it with a mock event; assert DOM updates

### CI Pipeline (GitHub Actions)

**On every PR:**
1. `npm ci` (with `node_modules` cache keyed on `package-lock.json`)
2. `npm run lint` (ESLint across all packages)
3. `npm run typecheck` (tsc --noEmit across all packages)
4. `npm run test` (Vitest with coverage report as CI artifact)
5. `npm run build` (fails if there are build errors)

**On push to `main` only:**
6. E2E tests (Playwright) — requires staging deploy or `next build && next start`
7. SST deploy to production stage

**Expected CI time:** < 5 minutes for the PR gate (lint + typecheck + test + build). E2E on main: 10-15 minutes acceptable.

### Error Handling

**`app/error.tsx` (route-level):** Client Component. Receives `error` prop and `reset` function. Calls `Sentry.captureException(error)` in `useEffect`. Renders a user-friendly message ("Something went wrong") with a "Try again" button that calls `reset()`.

**`app/global-error.tsx`:** Same pattern as error.tsx but wraps the root layout. Renders its own `<html>` and `<body>`. Catches root layout crashes (rare: e.g., i18n middleware failure, ThemeProvider crash).

**`app/not-found.tsx`:** Renders a 404 page with a link back to the landing page. Localized via next-intl if within the `[locale]` segment.

**Lambda resolvers:** Wrap all resolver logic in try-catch. Return typed error responses `{ success: false, error: { code, message } }`. Catch specific AWS SDK errors (ConditionalCheckFailedException, ProvisionedThroughputExceededException) separately. Log structured JSON before returning.

### Sentry

- Initialize with `withSentryConfig` in `next.config.ts`
- Set `SENTRY_DSN` as an environment variable (never `NEXT_PUBLIC_SENTRY_DSN` — DSN must be server-side only to avoid client-side exposure)
- Capture rate: 100% for errors, 10% for performance traces (not 100% — Lambda invocation costs at scale)
- `beforeSend` filter: ignore `AbortError` from cancelled subscriptions (common on page navigation; not actionable)
- Source maps: upload to Sentry at build time (Sentry webpack plugin); add `.sentryrc` to `.gitignore`

### Pre-commit Hooks

- `husky` v9 (`npx husky init`) — creates `.husky/pre-commit`
- `lint-staged` configuration in `package.json`:
  - `"*.{ts,tsx}": ["eslint --fix", "prettier --write"]`
  - `"*.{json,md,css}": ["prettier --write"]`
- tsc type checking is NOT run in lint-staged (too slow for per-file staged-file runs) — tsc runs in CI
- The `prepare` script installs Husky hooks: `"prepare": "husky"` in root `package.json`

### SEO and Metadata

**Landing page (`app/[locale]/page.tsx`):**
- Static metadata: `title: "Nasqa Live — Real-Time Code Sharing for Presenters"`, `description`, `openGraph`, `twitter`
- Static OG image: `app/opengraph-image.png` (1200x630, shows product name + tagline)

**Session page (`app/[locale]/live/[slug]/page.tsx`):**
- `generateMetadata({ params })`: fetches session title from DynamoDB; returns `title: "${sessionTitle} — Nasqa Live"`, `description: "Join the live Q&A session for ${sessionTitle}"`
- `noIndex: true` in metadata — session pages should NOT be indexed
- Dynamic OG image (P2): `app/[locale]/live/[slug]/opengraph-image.tsx` using `ImageResponse`

**robots.ts:**
```typescript
export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/live/' },
    sitemap: 'https://nasqa.live/sitemap.xml',
  }
}
```

### Accessibility

**Priority order for this project:**
1. ARIA labels on all icon-only buttons (upvote, downvote, copy snippet, delete snippet, theme toggle, language switcher)
2. Semantic HTML landmarks: `<main>` for the session view, `<section>` for clipboard and Q&A panels, `<article>` for individual questions, `<header>` for session metadata
3. `aria-live="polite"` on the Q&A question list — new questions arriving via subscription should be announced to screen readers without interrupting the user
4. `aria-live="assertive"` on connection status indicator ("Reconnecting...") — critical status change that should interrupt
5. `focus-visible` styles on all interactive elements — Tailwind's `focus-visible:ring-2 focus-visible:ring-emerald-500` (already in shadcn button component; verify it's applied everywhere)
6. Keyboard-operable Q&A actions: `Enter` submits the question form; `Space`/`Enter` triggers upvote button
7. Skip link: `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>` at the top of the layout

---

## Sources

- [Next.js Production Checklist](https://nextjs.org/docs/app/guides/production-checklist) (last updated 2026-02-27) — HIGH confidence
- [Next.js Testing Guide — Vitest](https://nextjs.org/docs/pages/guides/testing/vitest) — HIGH confidence
- [Next.js Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) — HIGH confidence
- [Next.js Metadata and OG Images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) — HIGH confidence
- [Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/) — HIGH confidence
- [Vitest Component Testing Guide](https://vitest.dev/guide/browser/component-testing) — HIGH confidence
- [Next.js Accessibility Architecture](https://nextjs.org/docs/architecture/accessibility) — HIGH confidence
- [WCAG 2.2 Compliance Checklist 2025](https://www.allaccessible.org/blog/wcag-22-compliance-checklist-implementation-roadmap) — MEDIUM confidence
- [Playwright vs Cypress 2025 Comparison](https://www.frugaltesting.com/blog/playwright-vs-cypress-the-ultimate-2025-e2e-testing-showdown) — MEDIUM confidence
- [Husky + lint-staged setup](https://betterstack.com/community/guides/scaling-nodejs/husky-and-lint-staged/) — MEDIUM confidence
- [GitHub Actions Next.js CI/CD](https://eastondev.com/blog/en/posts/dev/20251220-nextjs-cicd-github-actions/) — MEDIUM confidence

---
*Feature research for: Enterprise hardening (v1.1) — Next.js real-time app*
*Researched: 2026-03-15*

# Project Research Summary

**Project:** Nasqa Live — enterprise hardening (v1.1)
**Domain:** Production hardening of an existing Next.js 16 + SST + AppSync real-time app
**Researched:** 2026-03-15
**Confidence:** HIGH

## Executive Summary

Nasqa Live v1.0 is a fully scaffolded, feature-complete real-time presentation tool (live clipboard + Q&A). The v1.1 milestone is not about adding new product features — it is a production reliability layer that moves the codebase from "demo quality" to "production grade." The research confirms this is a well-understood problem domain: the patterns for testing, CI/CD, error tracking, and accessibility in Next.js 16 App Router are mature and well-documented, with official guidance from Next.js, Sentry, and Vitest covering most of the ground.

The recommended approach builds the hardening stack in dependency order: pre-commit hooks first (prevents any new quality debt from entering the repo during the hardening process itself), then CI pipeline (authoritative quality gate, independent of hooks), then test infrastructure (requires CI to run against), then error handling (pure Next.js file conventions, no external dependencies), then monitoring together with logging (Sentry requires error boundaries to exist), then SEO/metadata (independent), and finally accessibility (applied across all components, benefits from lint enforcement being in place). This order is not arbitrary — each layer depends on or reinforces the previous one, and deviating from it creates rework.

The critical risks are all avoidable with configuration discipline. Sentry will flood with AppSync WebSocket noise unless `beforeSend` filters are applied on day one. The `hostSecret` URL parameter will be leaked to Sentry's dashboard unless explicitly scrubbed. Pre-commit hooks are a developer convenience, not a security gate — CI must independently enforce the same checks. Vitest cannot test async Server Components; treating this as a workaround-able configuration problem wastes time. These risks are well-understood and mitigatable if addressed at the right phase, in the right order.

## Key Findings

### Recommended Stack

The v1.0 stack is pinned and production-ready (Next.js 16.1.6, React 19.2.3, AppSync, SST Ion v4, DynamoDB, Zod v4). The v1.1 additions are entirely additive — no existing dependencies change. For testing, Vitest 4.1.0 + React Testing Library 16.3.2 is the official Next.js recommendation for this ESM-first monorepo stack (the only RTL version with React 19 peer-dep compatibility). Playwright 1.58.0 handles E2E and async Server Component testing that Vitest cannot touch. Sentry 10.43.0 covers all three Next.js runtimes from a single SDK. Husky 9 + lint-staged 16.3.x provides pre-commit hooks; Prettier 3.8.x completes the formatter setup that is currently missing from the codebase.

**Core technologies (v1.1 additions):**
- **Vitest 4.1.0**: Unit + component test runner — ESM-native, 10-40x faster than Jest for this stack, official Next.js recommendation
- **@testing-library/react 16.3.2**: Component rendering — only RTL version with React 19 peer-dep compatibility; earlier versions have conflicts
- **Playwright 1.58.0**: E2E + async RSC tests — native parallelism (no paid tier), WebSocket network interception, cross-browser including WebKit
- **@sentry/nextjs 10.43.0**: Error tracking — covers client/server/edge runtimes in a single SDK; App Router error boundary integration; Lambda function capture
- **Husky 9 + lint-staged 16.3.x**: Pre-commit hooks — staged-file only linting (fast); Husky must be installed at repo root only
- **Prettier 3.8.1**: Code formatter — currently missing from the codebase; must be paired with `eslint-config-prettier` to prevent ESLint rule conflicts
- **pino + pino-lambda**: Structured Lambda logging — CloudWatch-native structured JSON; Lambda request ID injected automatically

**What NOT to install:** Jest (requires Babel/SWC transform overhead on top of existing Vite config), vitest-axe (unmaintained, 0.1.0 three years old), jest-axe (Jest-specific, incompatible with Vitest), next-seo (Pages Router library — a no-op in App Router), eslint-plugin-prettier (runs Prettier as an ESLint rule, 2-5x lint slowdown), Cypress (paid parallelism, no WebKit, worse WebSocket interception than Playwright).

### Expected Features

The v1.1 milestone is itself an MVP — an MVP of production hardening. The research draws a clear line between what must ship to call the app production-grade and what is a differentiator or future work.

**Must have — v1.1 core (table stakes for production):**
- Vitest + RTL test suite — unsafe to refactor without tests; CI quality gate blocks on this
- GitHub Actions CI pipeline (lint + typecheck + test on every PR)
- Error boundaries: `error.tsx` + `global-error.tsx` + `not-found.tsx` — must ship together with Sentry
- Sentry error tracking — blind production debugging is unsustainable; must ship with error boundaries
- Pre-commit hooks (Husky + lint-staged + Prettier)
- Structured CloudWatch logging in Lambda resolvers (pino)
- Dynamic SEO metadata via `generateMetadata` for landing and session pages
- `robots.txt` — disallow `/live/` so ephemeral session pages are not indexed
- ARIA labels on all icon-only buttons (Level A accessibility — lowest effort, highest impact)
- Semantic HTML audit — replace `<div>` soup with landmark elements; foundational for accessibility
- Keyboard navigation verification — WCAG 2.2 Level AA, legally required in EU since June 2025
- TypeScript strict mode + tsconfig consistency audit

**Should have — v1.x (add when core hardening is stable):**
- Playwright E2E tests — happy path: create session, join, post question, upvote, host ban
- Bundle size regression guard in CI
- Static OG image for landing page
- Dynamic OG image per session (session title in social link previews)
- Prettier formatting already in pre-commit once Prettier is installed

**Defer — v2+:**
- Lighthouse CI score gate (high CI setup complexity; meaningful only after full a11y + SEO pass)
- `useReportWebVitals` hook (needs traffic volume to generate useful field data)
- Content Security Policy headers (AppSync WebSocket domain allowlisting is easy to break accidentally; defer until E2E tests can catch breakage)
- `sitemap.xml` (only the landing page is indexable; marginal benefit at this scale)

**Anti-features (do not build):**
- Integration tests against live AWS (cost, slowness, test pollution across runs)
- 100% code coverage mandate (produces implementation-testing, not behavior-testing; chasing it generates brittle suites)
- E2E tests on every PR (adds 5-15 minutes to every PR; run on main push only)
- Storybook (Nasqa components are tightly coupled to real-time state and not reusable in isolation; no design team to consume it)
- WCAG 2.1 Level AAA (technically infeasible for dynamic real-time UIs; target Level AA)
- Datadog / New Relic APM (overkill for 50-500 users; adds latency and cost per invocation)

### Architecture Approach

The hardening layer wraps the existing monorepo (`packages/frontend`, `packages/functions`, `packages/core`, `sst.config.ts`) without restructuring it. Every new component has a specific insertion point: Vitest config and test files live in `packages/frontend/`; Sentry requires three separate config files (one per Next.js runtime — browser, Node.js, Edge) plus `withSentryConfig` wrapping in `next.config.ts`; Husky and GitHub Actions workflows live at the repo root (not in any package). The build order follows dependency flow — each layer depends on the previous being in place.

**Major components and insertion points:**
1. **Pre-commit layer** (`/.husky/pre-commit`, root `package.json` lint-staged config) — runs ESLint + Prettier on staged files only; type check deferred to CI to keep hooks fast (under 5 seconds)
2. **CI pipeline** (`.github/workflows/ci.yml` + `deploy.yml`) — parallel lint/typecheck/test jobs; deploy gated on all quality jobs passing; AWS authentication via OIDC (no long-lived secrets stored)
3. **Test layer** (`packages/frontend/vitest.config.mts`, `src/__tests__/`) — Vitest + RTL for Client Components and synchronous Server Components; Playwright for async RSCs and E2E flows; `vite-tsconfig-paths` required for `@/` alias resolution
4. **Error handling layer** (`app/global-error.tsx`, `app/[locale]/error.tsx`, `app/not-found.tsx`) — must be present before Sentry is enabled; error boundaries must manually call `Sentry.captureException()` in `useEffect` — boundaries prevent Sentry's automatic global capture
5. **Monitoring layer** (Sentry three-config setup, pino Lambda logger) — `beforeSend` AppSync noise filter; `hostSecret` URL scrubbing is non-optional security requirement; source map upload via Netlify env vars
6. **SEO layer** (`generateMetadata` in session page, `robots.ts`) — dynamic session title in metadata; session pages disallowed from indexing; `hreflang` + `alternates.canonical` required to prevent i18n duplicate content penalty
7. **Accessibility layer** (ARIA labels, semantic HTML, `aria-live` regions) — applied across existing components; `aria-live` regions must be unconditionally mounted before receiving content (architectural constraint, not cosmetic addition)

### Critical Pitfalls

1. **Sentry capturing `hostSecret` in URLs** — The host page URL contains `?hostSecret=[uuid]`. Sentry captures full request URLs by default. Add `beforeSend` to all three Sentry configs (client, server, edge) to strip `hostSecret` before the event is sent. This is non-optional and must be implemented before Sentry is enabled in any environment.

2. **Error boundaries not catching layout errors** — `app/error.tsx` cannot catch errors thrown inside `app/layout.tsx` (correct React behavior, not a bug). `app/global-error.tsx` must also be present and must include its own `<html><body>` tags because it replaces the root layout when triggered. Without it, root layout crashes produce a blank white screen in production with no fallback UI.

3. **Husky treated as the CI gate** — Pre-commit hooks can be bypassed (`git commit --no-verify`, GitHub web editor, certain IDE integrations). CI must independently run lint, typecheck, and tests regardless of whether hooks ran. Hooks are developer convenience; CI is the authoritative gate.

4. **Sentry flooded with AppSync WebSocket noise** — AppSync reconnect attempts, subscription keep-alive timeouts, and 401 responses during connection renegotiation all appear as errors to Sentry's default instrumentation. At 500 concurrent participants, this exhausts Sentry quotas in minutes and buries real errors. Add `beforeSend` filters to drop known-benign AppSync connection events on day one of Sentry setup.

5. **Vitest cannot test async Server Components** — Components with `async` at the top level cannot be rendered in jsdom. This is an architectural constraint, not a configuration problem. The Next.js team explicitly states this is unsupported. Test async RSCs with Playwright E2E; unit test their synchronous child components and extracted data-fetching functions instead.

6. **lint-staged running wrong ESLint config in monorepo** — ESLint 9 flat config resolves relative to cwd. Running lint-staged from the repo root means ESLint cannot find `packages/frontend/eslint.config.mjs`. Use `--config packages/frontend/eslint.config.mjs` in the lint-staged glob pattern for frontend files.

7. **`aria-live` regions conditionally mounted** — `aria-live` regions must be in the DOM before the first content change occurs. The accessibility tree only registers them at first render; conditionally mounting them causes initial announcements to be missed by screen readers. Render them unconditionally with empty content; populate the content when events fire.

## Implications for Roadmap

Based on the feature dependency graph in FEATURES.md and the build order in ARCHITECTURE.md, the phase structure is dependency-driven. Deviating from this order creates rework: tests cannot run without CI, Sentry cannot capture React errors without error boundaries, and accessibility improvements require lint hooks to enforce them.

### Phase 1: Developer Quality Gates
**Rationale:** Pre-commit hooks must be in place before any other hardening work begins — they ensure no new quality debt enters the repo during the hardening process itself. This phase has zero external dependencies (no AWS account changes, no Sentry setup, no CI configuration needed).
**Delivers:** Husky + lint-staged blocking commits with lint errors; Prettier config established; `eslint-config-prettier` preventing rule conflicts; TypeScript strict mode verified; tsconfig consistency across packages
**Addresses:** TypeScript strict mode audit, Prettier formatting, pre-commit hooks (all P1 from FEATURES.md)
**Avoids:** lint-staged wrong ESLint config pitfall — configure `--config packages/frontend/eslint.config.mjs` explicitly from the start; full typecheck in pre-commit anti-pattern (run ESLint only in hooks; defer tsc to CI)
**Research flag:** Standard patterns — skip research-phase. Husky v9 `husky init` + lint-staged monorepo glob patterns are well-documented with official sources.

### Phase 2: CI Pipeline
**Rationale:** The authoritative quality gate must exist before tests are written — tests need somewhere to run and be verified against. GitHub Actions OIDC setup is one-time infrastructure work that unblocks all future deploys. Path-filtered jobs prevent the full monorepo from rebuilding on every trivial change.
**Delivers:** `.github/workflows/ci.yml` (parallel lint + typecheck + test + build jobs on every PR); `.github/workflows/deploy.yml` (SST deploy on main push via OIDC role assumption); path-filtered jobs per package; `node_modules` caching; Netlify + Next.js 16 compatibility validated via preview deploy
**Addresses:** CI pipeline (P1), AWS credential security
**Avoids:** Husky-as-CI-gate pitfall; long-lived AWS credentials stored as GitHub secrets (use OIDC `aws-actions/configure-aws-credentials@v4`); full monorepo rebuild on every commit (use `dorny/paths-filter` or `on.push.paths`); Netlify + Next.js 16 edge function bundling failures (validate early with a staging preview deploy)
**Research flag:** MEDIUM confidence — SST Ion + GitHub Actions OIDC IAM permissions scoping is not fully documented in official SST Ion docs. The OIDC role trust policy pattern is established but the exact IAM permissions required by `sst deploy` may need empirical validation during implementation.

### Phase 3: Testing Infrastructure
**Rationale:** Tests require CI to run against (Phase 2). Writing tests before the pipeline is wired creates code that isn't automatically verified. This phase establishes the test conventions document first — which components are testable in Vitest vs. Playwright — before any test authoring begins. This prevents wasted effort writing tests for async Server Components that Vitest cannot run.
**Delivers:** `vitest.config.mts` with jsdom + tsconfigPaths plugin; `src/__tests__/setup.ts`; first smoke tests for QuestionCard, VoteButton, Zod schemas in `@nasqa/core`, moderation threshold logic; `test` job added to CI workflow; coverage report as CI artifact
**Uses:** Vitest 4.1.0, @testing-library/react 16.3.2, @testing-library/user-event 14.x, vite-tsconfig-paths, jsdom
**Addresses:** Unit test suite (P1); minimum coverage targets (core schemas 90%, Lambda resolvers 80%, UI components 70%)
**Avoids:** Vitest workspace config conflicts — install Vitest per-package, not at root, for this monorepo's current structure; async Server Component testing trap — document test strategy per component type before authoring begins
**Research flag:** Standard patterns — skip research-phase. Official Next.js Vitest guide is current and comprehensive (updated 2026-02-27). The per-package vs. root Vitest install decision should be made explicitly at the start of this phase.

### Phase 4: Error Handling
**Rationale:** Pure Next.js file conventions — no external service dependencies. Delivers user-visible resilience immediately. Must precede Sentry setup because error boundaries are the capture points for React render errors; Sentry's automatic instrumentation does not reach errors caught by boundaries.
**Delivers:** `app/global-error.tsx` (root layout crash fallback with standalone `<html><body>`); `app/[locale]/error.tsx` (session-scoped error boundary with retry button and "try again" UX); `app/[locale]/live/[slug]/error.tsx` (session-specific "session unavailable, reconnecting" message); `app/not-found.tsx` with expired session detection and graceful "this session has ended" message
**Addresses:** Error boundaries + global-error.tsx + not-found.tsx (P1); graceful expired session UX
**Avoids:** `error.tsx` not catching layout errors pitfall — `global-error.tsx` must be present and must include `<html><body>`; error boundaries testing gap — test each boundary explicitly with a development-only throw button, not just in the Next.js dev overlay
**Research flag:** Standard patterns — skip research-phase. Next.js App Router error boundary file conventions are stable and well-documented.

### Phase 5: Monitoring and Observability
**Rationale:** Requires error boundaries (Phase 4) to already exist. Requires an external Sentry project to be created before implementation begins. The `hostSecret` scrubbing and AppSync noise filter must be configured before any production traffic reaches Sentry — these are not optional post-hoc improvements.
**Delivers:** Sentry three-runtime config (client/server/edge init files); `withSentryConfig` wrapping in `next.config.ts`; `beforeSend` AppSync noise filter dropping reconnect events; `hostSecret` URL scrubbing in all three configs; source map upload configured via Netlify env vars (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`); `tracesSampleRate: 0.1` in production (not 1.0); pino structured logger in Lambda resolvers with `LOG_LEVEL` env var per stage
**Uses:** @sentry/nextjs 10.43.0, pino, pino-lambda
**Addresses:** Sentry error tracking (P1), structured CloudWatch logging (P1)
**Avoids:** Sentry capturing hostSecret (non-optional security requirement); Sentry flooded with AppSync noise (exhausts quota during active sessions); source maps missing in production (stack traces become unreadable minified paths); `tracesSampleRate: 1.0` exhausting quota at 500 participants
**Research flag:** MEDIUM confidence — the exact AppSync error message signatures that need filtering in `beforeSend` cannot be fully specified from documentation alone. Must be validated against a real test session after deployment. Plan for one tuning iteration on the `beforeSend` filter after first production session.

### Phase 6: SEO and Metadata
**Rationale:** Independent of testing and monitoring work. Can run in parallel with Phase 5 or immediately after Phase 4. Fixing the "Create Next App" default title is a professionalism issue that should not block on other hardening phases. The `robots.txt` must be in place before the app is indexed at all.
**Delivers:** Static metadata on landing page (title, description, OG, Twitter); `generateMetadata` on session page (dynamic session title fetched from DynamoDB, `noIndex: true`); `robots.ts` (disallow `/live/`); `hreflang` + `alternates.canonical` for en/es/pt locale variants to prevent duplicate content penalty; graceful fallback metadata for expired sessions
**Addresses:** Dynamic SEO metadata (P1), robots.txt (P1), i18n duplicate content prevention
**Avoids:** OG metadata not dynamic per session — `generateMetadata` in `app/[locale]/live/[slug]/page.tsx` fetches session title; static `metadata` export and `generateMetadata` in same file conflict (Next.js silently ignores one); missing hreflang/canonical i18n duplicate content penalty; `await params` gotcha in App Router (params are Promises in Next.js 16 — must be awaited before accessing `locale`)
**Research flag:** Standard patterns for `generateMetadata`. The `await params` requirement for i18n params is a known gotcha to flag in implementation notes but does not require research-phase.

### Phase 7: Accessibility
**Rationale:** Applied across all existing components. Done last in the core hardening sequence so lint hooks (Phase 1) and CI (Phase 2) are in place to enforce a11y rules and block regressions as changes are made. The `aria-live` architecture for real-time feeds is the highest-risk item — it must be treated as an architectural decision, not a cosmetic addition.
**Delivers:** ARIA labels on all icon-only buttons (upvote, downvote, copy snippet, delete snippet, theme toggle, language switcher); semantic HTML landmarks (`<main>`, `<section>`, `<article>`, `<header>`, `<footer>`); unconditionally-mounted `aria-live="polite"` on Q&A question list (with 500ms debounce for rapid upvote counter updates); `aria-live="assertive"` on connection status (reconnecting notification only); `role="status"` on connection indicator; skip link at layout root; `focus-visible:ring` verification on all interactive elements; keyboard navigation audit (Tab order, Enter/Space on buttons)
**Addresses:** ARIA labels (P1), semantic HTML audit (P1), keyboard navigation (P1)
**Avoids:** ARIA bolted on after the fact — `aria-live` regions designed as architectural components, not cosmetic additions; `aria-live` regions conditionally mounted — always mounted, content populated by events; upvote counter spamming screen readers — debounce aria-live updates with 500ms quiet period; focus ring hidden with `outline: none` in global CSS
**Research flag:** MEDIUM confidence — the exact debounce implementation for `aria-live` upvote counter updates in React needs screen reader testing (VoiceOver/NVDA) to validate. The general pattern is correct but the timing and state management details require empirical validation during implementation.

### Phase 8: E2E Tests and Hardening Polish (v1.x, after core)
**Rationale:** Deferred from the core v1.1 phases because it requires a stable staging deploy and adds 10-15 minutes to CI. The value is high but the prerequisite — established baseline, stable deployment pipeline, proven unit test suite — is not met until Phases 1-7 are complete.
**Delivers:** Playwright happy-path E2E (create session, join, post question, upvote, host ban flow); `@axe-core/playwright` accessibility audits on landing page, host view, audience view; bundle size regression guard (baseline measurement first, then threshold enforcement); static OG image for landing page; dynamic OG image per session using Next.js `ImageResponse`
**Addresses:** Playwright E2E (P2), bundle size guard (P2), static OG image (P2), dynamic OG image (P2)
**Avoids:** E2E tests on every PR (run on main push only; not every PR); `axe-core` full page scan in every RTL test (run only in dedicated a11y test files via Playwright)
**Research flag:** NEEDS RESEARCH — Playwright + AppSync WebSocket fixture design for multi-tab host+participant testing is not well-documented. The network interception API for WebSocket is available but the session-specific fixture setup pattern needs research-phase before implementation begins.

### Phase Ordering Rationale

- **Phases 1-2 before everything else** — they are the quality enforcement mechanisms. All other phases produce code that benefits from having hooks and CI enforcing it immediately.
- **Phase 3 after Phase 2** — tests need a CI pipeline to run in; writing tests before CI creates dead code that isn't automatically verified after each commit.
- **Phase 4 before Phase 5** — Sentry requires error boundaries; errors caught by boundaries do not automatically reach Sentry's global handler. Each `error.tsx` must explicitly call `captureException`.
- **Phase 6 can run in parallel with Phase 5** — SEO/metadata work has no dependencies on monitoring. If there are two developers, these phases can be run concurrently.
- **Phase 7 last among core phases** — modifies all components; benefits from lint enforcement (Phase 1), CI verification (Phase 2), and unit tests (Phase 3) being in place to catch regressions as a11y changes are made across the codebase.
- **Phase 8 deferred** — requires stable staging environment and test baseline from Phase 3.

### Research Flags

Phases needing deeper research during planning:
- **Phase 2 (CI Pipeline):** SST Ion + GitHub Actions OIDC IAM permissions — the exact IAM policy for `sst deploy --stage production` is not documented in official SST Ion docs. Empirical derivation or community source validation needed.
- **Phase 5 (Monitoring):** Sentry + AppSync WebSocket `beforeSend` filter signatures — specific error message patterns from Amplify reconnect behavior need empirical validation against a live session; cannot be fully pre-specified.
- **Phase 8 (E2E):** Playwright + AppSync WebSocket multi-tab fixture design — not well-documented; needs research-phase before implementation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Pre-commit hooks):** Husky v9 + lint-staged monorepo patterns are well-documented with official sources.
- **Phase 3 (Testing):** Official Next.js Vitest guide is current and comprehensive (updated 2026-02-27).
- **Phase 4 (Error handling):** Next.js App Router error boundary file conventions are stable.
- **Phase 6 (SEO):** `generateMetadata` API is fully documented; `robots.ts` convention is standard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All v1.0 versions verified from installed package.json files. v1.1 addition versions verified against npm current as of 2026-03-15 and official docs. |
| Features | HIGH | Based on Next.js official production checklist (updated 2026-02-27) and WCAG 2.2 official sources. P1/P2/P3 priority tiers are well-justified from dependency analysis. |
| Architecture | HIGH | Build order and insertion points verified against official Next.js, Sentry, and GitHub Actions docs. Monorepo-specific patterns verified from official Husky and lint-staged docs. |
| Pitfalls | HIGH (testing, CI, error handling, Sentry source maps) / MEDIUM (Sentry + AppSync noise, Netlify edge cases) | Testing and CI pitfalls have multiple verified sources including official Next.js docs. Sentry + AppSync WebSocket noise filter specifics and Netlify + Next.js 16 edge function bundling are MEDIUM — community sources corroborate but exact signatures are not officially documented. |

**Overall confidence:** HIGH

### Gaps to Address

- **SST Ion OIDC IAM permissions:** The exact IAM policy for `sst deploy --stage production` is not specified in official SST Ion docs. Needs empirical derivation during Phase 2 planning — start with CloudFormation + Lambda + DynamoDB + AppSync + S3 + CloudFront; tighten via CloudTrail.
- **AppSync `beforeSend` filter signatures:** The exact error message strings emitted by the Amplify WebSocket client during reconnect/keep-alive cannot be pre-specified from documentation. Validate against a real test session during Phase 5 implementation; plan for one tuning iteration.
- **Netlify + Next.js 16 Edge Functions compatibility:** Currently MEDIUM confidence based on community reports of build failures. Validate with a staging Netlify preview deploy early in Phase 2, before other phases assume stable deployment.
- **`aria-live` debounce for rapid upvote updates:** The 500ms quiet-period debounce pattern is well-understood in principle but the React state management implementation for rapid real-time updates needs screen reader (VoiceOver/NVDA) testing to validate. Address empirically during Phase 7.
- **Playwright + AppSync WebSocket fixture design:** Multi-tab host+participant session testing pattern is not documented for Playwright + Amplify/AppSync. Needs research-phase before Phase 8 planning begins.

## Sources

### Primary (HIGH confidence)
- Next.js Vitest testing guide: https://nextjs.org/docs/app/guides/testing/vitest (updated 2026-02-27) — test runner setup, async RSC limitations
- Next.js production checklist: https://nextjs.org/docs/app/guides/production-checklist (updated 2026-02-27) — feature completeness standards
- Next.js error handling: https://nextjs.org/docs/app/getting-started/error-handling — error boundary file conventions and layout limitation
- Next.js generateMetadata: https://nextjs.org/docs/app/api-reference/functions/generate-metadata — SEO API reference
- Next.js accessibility: https://nextjs.org/docs/architecture/accessibility — a11y patterns and eslint-plugin-jsx-a11y
- Sentry for Next.js: https://docs.sentry.io/platforms/javascript/guides/nextjs/ — SDK setup and configuration
- Sentry manual setup: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/ — three-config pattern, source map upload
- Vitest projects config: https://vitest.dev/guide/projects — monorepo workspace configuration
- aws-actions/configure-aws-credentials: https://github.com/aws-actions/configure-aws-credentials — OIDC authentication for GitHub Actions
- Codebase package.json files (`/packages/frontend/package.json`, `/packages/functions/package.json`, root) — all v1.0 versions verified from installed packages

### Secondary (MEDIUM confidence)
- Netlify + Next.js 16 build failures: https://answers.netlify.com/t/next-js-16-project-build-fails-on-netlify/157791 — edge function bundling failures
- SST + GitHub Actions OIDC: https://towardsthecloud.com/blog/sst-nextjs-preview-environments-github-actions — OIDC role pattern for SST deploys
- lint-staged monorepo configuration: https://www.horacioh.com/writing/setup-lint-staged-on-a-monorepo/ — per-package ESLint config routing with `--config`
- SEO i18n hreflang with next-intl: https://dev.to/oikon/seo-and-i18n-implementation-guide-for-nextjs-app-router-dynamic-metadata-and-internationalization-3eol
- GitHub Actions monorepo CI patterns: https://dev.to/pockit_tools/github-actions-in-2026-the-complete-guide-to-monorepo-cicd-and-self-hosted-runners-1jop
- Playwright vs Cypress 2025 comparison: https://www.frugaltesting.com/blog/playwright-vs-cypress-the-ultimate-2025-e2e-testing-showdown
- Husky + lint-staged setup guide: https://betterstack.com/community/guides/scaling-nodejs/husky-and-lint-staged/

### Tertiary (LOW confidence)
- None — all findings have at least MEDIUM confidence support.

---
*Research completed: 2026-03-15*
*Ready for roadmap: yes*

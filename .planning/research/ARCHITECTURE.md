# Architecture Patterns

**Domain:** Enterprise hardening — testing, CI/CD, error tracking, and quality gates for an existing Next.js + SST monorepo
**Researched:** 2026-03-15
**Confidence:** HIGH (Next.js 16 official docs verified; Sentry official docs verified; GitHub Actions + SST OIDC from multiple confirmed sources; Husky/lint-staged from official docs)

---

## Context: Existing Architecture

This is an addendum to the base architecture research (2026-03-13). The foundation is already in place:

```
packages/
  frontend/       Next.js 16 App Router, Netlify deploy
  functions/      Lambda resolvers, AppSync/DynamoDB
  core/           Shared Zod schemas and TypeScript types
sst.config.ts     SST Ion v4 IaC — AppSync + DynamoDB + Lambda
```

The milestone adds hardening layers that wrap this existing structure without restructuring it. Every new component integrates into the existing monorepo at a specific insertion point.

---

## System Overview: Hardened Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   DEVELOPER WORKSTATION                          │
│  ┌─────────────────┐   ┌─────────────────┐                      │
│  │  Pre-commit      │   │  Type Check     │                      │
│  │  (Husky +        │   │  (tsc --noEmit) │                      │
│  │   lint-staged)   │   │                 │                      │
│  └────────┬────────┘   └────────┬────────┘                      │
│           │ git push            │                                │
└───────────┼─────────────────────┼────────────────────────────────┘
            ↓                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                  GITHUB ACTIONS CI PIPELINE                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │  lint    │  │typecheck │  │   test   │  │    deploy     │   │
│  │ (eslint) │  │   (tsc)  │  │ (vitest) │  │ (sst deploy)  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬────────┘   │
│       │             │             │                │             │
│  quality gate: all jobs must pass before deploy job runs        │
└───────┼─────────────┼─────────────┼────────────────┼────────────┘
        │                                            │
        ↓                                            ↓
┌───────────────────┐                   ┌────────────────────────┐
│   CODE QUALITY    │                   │   RUNTIME MONITORING   │
│  ┌─────────────┐  │                   │  ┌──────────────────┐  │
│  │ ESLint +    │  │                   │  │ Sentry           │  │
│  │ jsx-a11y   │  │                   │  │ (client+server+  │  │
│  └─────────────┘  │                   │  │  edge runtimes)  │  │
│  ┌─────────────┐  │                   │  └──────────────────┘  │
│  │ Vitest unit │  │                   │  ┌──────────────────┐  │
│  │ + RTL       │  │                   │  │ CloudWatch Logs  │  │
│  └─────────────┘  │                   │  │ (Lambda pino)    │  │
└───────────────────┘                   └────────────────────────┘
```

---

## Component Boundaries

### New Components and Where They Live

| Component | Location | Type | Integrates With |
|-----------|----------|------|-----------------|
| `vitest.config.mts` | `packages/frontend/` | New file | Next.js App Router, existing `tsconfig.json` |
| `__tests__/` directory | `packages/frontend/src/` | New directory | Vitest, React Testing Library |
| `sentry.client.config.ts` | `packages/frontend/` | New file | Next.js client runtime, `next.config.ts` |
| `sentry.server.config.ts` | `packages/frontend/` | New file | Next.js server runtime (Lambda via Netlify), `next.config.ts` |
| `sentry.edge.config.ts` | `packages/frontend/` | New file | Next.js edge middleware, `next.config.ts` |
| `app/global-error.tsx` | `packages/frontend/src/app/` | New file | Sentry, root layout error boundary |
| `app/[locale]/error.tsx` | `packages/frontend/src/app/[locale]/` | New file | React error boundary — locale-scoped routes |
| `.github/workflows/ci.yml` | repo root `.github/` | New directory + file | GitHub Actions, AWS OIDC, Netlify |
| `.husky/` | repo root | New directory | git hooks, lint-staged |
| `instrumentation.ts` | `packages/frontend/src/` | New file | Sentry server instrumentation (Next.js 16 standard) |

### Modified Components

| Component | Location | What Changes |
|-----------|----------|-------------|
| `next.config.ts` | `packages/frontend/` | Wrap with `withSentryConfig()` |
| `package.json` (root) | repo root | Add `test`, `prepare` (Husky), `lint-staged` scripts |
| `package.json` (frontend) | `packages/frontend/` | Add `test`, `typecheck` scripts |
| `packages/functions/` | Lambda resolvers | Add `pino` structured logging |

---

## Integration Points with Existing Architecture

### 1. Vitest — Test Layer

**Insertion point:** `packages/frontend/` only. Lambda resolver tests live in `packages/functions/` if added later, but the current milestone focuses on frontend component tests.

**What Vitest can test in this stack:**
- All synchronous Client Components (`'use client'`) — tested with React Testing Library
- Synchronous Server Components (no `async` keyword) — tested with React Testing Library
- Pure utility functions in `packages/core/` — tested with standard Vitest (no jsdom needed)
- Lambda resolver pure functions (Zod validation, business logic) — if extracted from handler

**What Vitest cannot test directly:**
- Async Server Components (those with `await` at top level) — official Next.js guidance: use E2E tests for these
- AppSync subscription WebSocket behavior — requires integration or E2E tests
- DynamoDB operations — require mocking (Vitest `vi.mock`) or E2E

**Critical config for this monorepo:**

The `vite-tsconfig-paths` plugin is required because Next.js uses TypeScript path aliases (`@/` prefix). Without it, Vitest resolves imports differently from Next.js and tests fail with module-not-found errors.

```typescript
// packages/frontend/vitest.config.mts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.ts',
  },
})
```

**What to test first (highest ROI for this codebase):**

1. `QuestionCard` — pure rendering with props, vote state, hidden state, speaker badge
2. `SnippetCard` / `ShikiBlock` — ensure pre-rendered HTML is rendered as `dangerouslySetInnerHTML`, not re-highlighted
3. Moderation logic in `packages/core/` — the `50% threshold` and `3-strike auto-ban` are pure functions and easy to unit test
4. Zod schemas in `packages/core/` — validate edge cases (empty string, 500+ char question, invalid slug format)
5. `VoteButton` — click handler fires mutation, localStorage dedup gate prevents double-vote

### 2. Sentry — Error Tracking Layer

**Insertion point:** Three separate config files (one per runtime) + `next.config.ts` wrapper + `global-error.tsx`.

**Why three config files:** Next.js 16 runs in three distinct environments — browser (React hydration + client interactions), Node.js (Server Components, Server Actions, API routes), and Edge (next-intl middleware). Each environment has different APIs; Sentry instruments them separately.

```
packages/frontend/
  sentry.client.config.ts     ← browser: captures React errors, user interactions
  sentry.server.config.ts     ← Node.js: captures Lambda/Netlify function errors
  sentry.edge.config.ts       ← Edge: captures middleware errors (next-intl locale redirect)
  src/app/
    global-error.tsx          ← catches root layout errors (must include <html><body>)
    [locale]/
      error.tsx               ← catches locale-subtree rendering errors
  src/instrumentation.ts      ← Next.js 16 standard server instrumentation hook
```

**`next.config.ts` modification pattern:**

```typescript
// packages/frontend/next.config.ts
import { withSentryConfig } from '@sentry/nextjs'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig = {
  transpilePackages: ['@nasqa/core'],
}

export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
})
```

**`global-error.tsx` — root error boundary:**

The `global-error.tsx` file is the last-resort error boundary. It wraps errors thrown inside the root `layout.tsx` itself (which standard `error.tsx` cannot catch because `error.tsx` is nested inside the layout it wraps). It must include `<html>` and `<body>` tags because it replaces the entire root layout.

**`[locale]/error.tsx` — segment error boundary:**

Placed at the locale segment level so that a render error in `/en/live/[slug]` shows a scoped error UI (retry button, "session unavailable" message) rather than crashing the entire app. The error UI must be a `'use client'` component.

**Sentry data concerns for Nasqa Live:**

Sentry's default SDK captures request URLs, which include `?hostSecret=` for host pages. Configure `beforeSend` to scrub this parameter:

```typescript
// sentry.client.config.ts
Sentry.init({
  beforeSend(event) {
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/[?&]hostSecret=[^&]*/i, '')
    }
    return event
  },
})
```

This is not optional — shipping host secrets to a third-party error tracking service is a security risk.

### 3. Structured Logging — Lambda Layer

**Insertion point:** `packages/functions/src/resolvers/` — each Lambda resolver handler.

**Recommended library:** `pino` with `pino-lambda`. CloudWatch receives plain `console.log` output as JSON; `pino` ensures every log line is structured JSON rather than unformatted strings. `pino-lambda` adds Lambda-specific context (request ID, function name) automatically.

**Log level strategy:**

```typescript
// packages/functions/src/lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'nasqa-functions' },
})
```

Log at `warn`/`error` for anomalies (failed host auth, ban threshold reached), `info` for mutations, `debug` disabled in production (CloudWatch cost: $0.50/GB ingested).

### 4. Pre-commit Hooks — Husky + lint-staged

**Insertion point:** Repo root (not inside any package). Husky hooks must live at the git repo root because git itself lives at the root — hooks placed inside `packages/` are never triggered.

**Structure:**

```
(repo root)
  .husky/
    pre-commit        ← runs lint-staged
  package.json        ← has "prepare": "husky" and "lint-staged" config
```

**lint-staged scoping for this monorepo:**

Because ESLint configs live inside `packages/frontend/` and `packages/functions/`, lint-staged must use file-glob patterns that route files to their package-specific linters:

```json
// root package.json
{
  "lint-staged": {
    "packages/frontend/**/*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "bash -c 'npm run typecheck --workspace=packages/frontend'"
    ],
    "packages/functions/**/*.ts": [
      "bash -c 'npm run typecheck --workspace=packages/functions'"
    ],
    "packages/core/**/*.ts": [
      "bash -c 'npm run typecheck --workspace=packages/core'"
    ]
  }
}
```

**Husky v9+ initialization (current version):**

```bash
# At repo root
npx husky init
# Creates .husky/pre-commit and adds "prepare": "husky" to root package.json
```

Note: Husky v9+ dropped the `.huskyrc` file format and the `prepare` script auto-install pattern changed. The `husky init` command is the canonical setup path. Do not use the old `husky add` or `husky install` commands — they no longer exist in v9.

### 5. GitHub Actions — CI/CD Layer

**Insertion point:** `.github/workflows/` at repo root. This directory does not exist yet.

**Recommended workflow structure:**

Two workflows:

1. **`ci.yml`** — runs on every push and pull request; lint + typecheck + test (no deploy)
2. **`deploy.yml`** — runs only on push to `main`; requires `ci.yml` to pass (via `workflow_run` or merge gates); runs `sst deploy --stage production`

Separating them prevents accidental deploys from pull requests and keeps CI fast by parallelizing quality gates.

**AWS authentication — OIDC (recommended over IAM key secrets):**

OIDC authentication lets GitHub Actions assume an AWS IAM role without storing long-lived AWS keys as repository secrets. The IAM role trusts GitHub's OIDC provider and is scoped to the specific repo and branch.

```yaml
# .github/workflows/deploy.yml (excerpt)
permissions:
  id-token: write   # Required for OIDC
  contents: read

jobs:
  deploy:
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ vars.AWS_ACCOUNT_ID }}:role/github-actions-nasqa
          aws-region: us-east-1
```

**Netlify deploy integration:**

The frontend (Next.js) is deployed via Netlify's GitHub integration, not via GitHub Actions. Netlify auto-deploys on push to `main` (production) and on pull requests (deploy previews). GitHub Actions handles the SST Ion backend (Lambda + AppSync + DynamoDB) only.

This split means the CI pipeline must coordinate: backend deploys via Actions, frontend deploys via Netlify. For pull request previews, the SST backend should deploy to a `preview-{PR_NUMBER}` stage, and the Netlify preview URL should point to the matching backend.

**Full CI workflow layout:**

```
.github/
  workflows/
    ci.yml          ← lint + typecheck + test (parallel jobs)
    deploy.yml      ← sst deploy production (sequential after ci passes)
```

### 6. Dynamic SEO — generateMetadata

**Insertion point:** `packages/frontend/src/app/[locale]/live/[slug]/page.tsx` — the session page Server Component.

**Integration pattern:**

```typescript
// app/[locale]/live/[slug]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await getSessionMetadata(params.slug)
  return {
    title: `${session.title} — Nasqa Live`,
    description: `Join ${session.title} — live Q&A and shared clipboard`,
    openGraph: {
      title: session.title,
      description: `Ask questions and view shared code for "${session.title}"`,
      type: 'website',
      url: `https://nasqa.live/en/live/${params.slug}`,
    },
  }
}
```

`generateMetadata` runs on the server at request time. The DynamoDB fetch inside it is automatically deduplicated (memoized) by Next.js if the same call appears in the page component, so there is no double-read penalty.

### 7. Accessibility — No New Files Required

Accessibility improvements integrate into existing components:

- ESLint's `eslint-plugin-jsx-a11y` is already included via `eslint-config-next`. Enabling `--max-warnings 0` in lint-staged makes existing a11y warnings blocking.
- ARIA label and `role` additions go directly into existing component files (`QuestionCard`, `VoteButton`, `HostInput`, etc.)
- The `axe-core` library can be added as a test utility for automated ARIA auditing inside Vitest tests (via `@axe-core/react`)

---

## Data Flow for New Hardening Features

### Error Tracking Data Flow

```
Browser
  → React render error
  → [locale]/error.tsx catches it
  → error.tsx calls Sentry.captureException(error)
  → Sentry SDK batches + sends to sentry.io
  → Sentry dashboard shows error with:
      - component stack trace
      - session slug (from URL, after scrubbing hostSecret param)
      - user fingerprint (device ID, if configured as Sentry user)
      - locale (from URL prefix)

Lambda Resolver
  → unhandled exception in resolver handler
  → pino logger.error({ err, slug, operation })
  → CloudWatch Logs receives structured JSON
  → (Optional) CloudWatch Alarm triggers on error count
  → (Optional) Sentry server SDK captures Lambda exceptions
```

### CI/CD Data Flow

```
Developer pushes to branch
  → GitHub Actions triggers ci.yml
  → Parallel jobs:
      job: lint   → eslint packages/frontend
      job: check  → tsc --noEmit (all packages)
      job: test   → vitest run (packages/frontend)
  → All must pass (required status check on main branch)

Push to main (after PR merge)
  → GitHub Actions triggers deploy.yml
  → Assumes AWS IAM role via OIDC
  → Runs: sst deploy --stage production
  → SST updates: Lambda resolvers, AppSync schema, DynamoDB config
  → Netlify auto-deploys: Next.js frontend (separate trigger)
```

### Pre-commit Data Flow

```
Developer runs: git commit
  → Husky pre-commit hook triggers
  → lint-staged identifies staged files
  → For staged .ts/.tsx in packages/frontend/:
      eslint --fix (auto-fixes fixable issues)
      tsc --noEmit (type check)
  → If any check fails: commit is aborted
  → Developer fixes issues, re-stages, re-commits
```

---

## Recommended File Structure Changes

```
(repo root additions)
├── .github/
│   └── workflows/
│       ├── ci.yml              # lint + typecheck + test
│       └── deploy.yml          # sst deploy production
├── .husky/
│   └── pre-commit              # runs lint-staged

packages/frontend/
├── vitest.config.mts           # Vitest config with jsdom + tsconfigPaths
├── sentry.client.config.ts     # Browser Sentry init
├── sentry.server.config.ts     # Node.js Sentry init
├── sentry.edge.config.ts       # Edge Sentry init
├── next.config.ts              # MODIFIED: wrap with withSentryConfig
└── src/
    ├── app/
    │   ├── global-error.tsx    # Root error boundary (NEW)
    │   └── [locale]/
    │       └── error.tsx       # Locale-scoped error boundary (NEW)
    ├── instrumentation.ts      # Next.js server instrumentation (NEW)
    └── __tests__/
        ├── setup.ts            # RTL + jsdom global setup
        ├── components/
        │   ├── question-card.test.tsx
        │   ├── snippet-card.test.tsx
        │   └── vote-button.test.tsx
        └── lib/
            └── moderation.test.ts  # Pure function tests

packages/core/
└── src/
    └── __tests__/
        └── schemas.test.ts     # Zod schema edge cases

packages/functions/
└── src/
    └── lib/
        └── logger.ts           # pino structured logger (NEW)
```

---

## Build Order for Enterprise Hardening

Dependencies flow top-to-bottom. Each step unlocks the next.

```
1. PRE-COMMIT HOOKS (Husky + lint-staged)
   Why first: Prevents any future code from entering the repo with lint/type errors.
   Once in place, all subsequent work is automatically checked.
   Depends on: nothing (no external services needed)

2. CI PIPELINE SKELETON (GitHub Actions — lint + typecheck jobs only)
   Why second: Establishes the quality gate infra before tests exist.
   Starting with lint and typecheck only means the pipeline is green immediately.
   Tests job can be added once test files exist.
   Depends on: GitHub repo, AWS OIDC role (for deploy job), Netlify (separate auto-trigger)

3. TESTING INFRASTRUCTURE (Vitest + RTL setup)
   Why third: Needs CI pipeline to run against; needs existing components to test.
   Install packages, configure vitest.config.mts, write first smoke test.
   Add `test` job to ci.yml once the first test passes locally.
   Depends on: step 2 (CI pipeline to run tests in)

4. ERROR BOUNDARIES (error.tsx + global-error.tsx)
   Why fourth: Pure Next.js file conventions — no external service needed.
   Delivers user-visible graceful degradation immediately.
   Does not require Sentry to be useful (shows fallback UI regardless).
   Depends on: nothing (pure Next.js App Router file convention)

5. SENTRY INTEGRATION
   Why fifth: Requires error boundaries to already exist (Sentry hooks into them).
   Needs a Sentry project to be created (external setup step).
   The `beforeSend` hostSecret scrubber must be added before enabling.
   Depends on: step 4 (error boundaries), external Sentry account/project

6. STRUCTURED LOGGING (pino in Lambda)
   Why sixth: Independent of frontend work. Can be done any time after step 2.
   Does not need Sentry or test infrastructure.
   Depends on: nothing (just adding a package to packages/functions)

7. DYNAMIC SEO + OPEN GRAPH
   Why seventh: Requires session page to exist (already does).
   `generateMetadata` added to existing page.tsx — no new infrastructure.
   Depends on: existing session page route

8. ACCESSIBILITY IMPROVEMENTS
   Why last: Applies to all components. Better done once other hardening
   is in place so a11y failures are caught by lint (lint-staged blocks them).
   Depends on: step 1 (pre-commit hooks with --max-warnings 0)
```

---

## Architectural Patterns

### Pattern 1: Error Boundary Layering

**What:** Next.js App Router supports nested `error.tsx` files, each catching errors within its subtree. `global-error.tsx` at the root catches errors in the root layout. `[locale]/error.tsx` catches errors within locale-scoped routes.

**When to use:** Place `error.tsx` at the coarsest grain that still allows recovery. For Nasqa Live, one at the `[locale]` level is sufficient — it shows "Session unavailable, try refreshing" for any session page failure.

**Trade-offs:** More granular `error.tsx` files (e.g., per-feature) provide better recovery UX but add complexity. Start with one at the `[locale]` level.

**Pattern:**
```typescript
// src/app/[locale]/error.tsx
'use client'
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div role="alert">
      <p>Something went wrong loading this session.</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### Pattern 2: Test Isolation for AppSync-Dependent Components

**What:** Components that fire AppSync mutations (`VoteButton`, `HostInput`, `QaInput`) must have their AppSync calls mocked in tests. Do not test against a real AppSync API in unit tests.

**When to use:** Any component that imports `@aws-amplify/api-graphql` or calls a Server Action.

**Trade-offs:** Mock-heavy tests can drift from the real API. Mitigate by keeping mutation functions in `src/actions/` (already the pattern) and testing those pure TypeScript functions separately.

**Pattern:**
```typescript
// vote-button.test.tsx
vi.mock('@/actions/qa', () => ({
  upvoteQuestion: vi.fn().mockResolvedValue({ upvoteCount: 1 }),
}))

test('VoteButton fires upvote on click', async () => {
  render(<VoteButton questionId="q1" slug="test-session" />)
  await userEvent.click(screen.getByRole('button', { name: /upvote/i }))
  expect(upvoteQuestion).toHaveBeenCalledWith({ questionId: 'q1', slug: 'test-session' })
})
```

### Pattern 3: GitHub Actions Job Dependencies

**What:** CI jobs (lint, typecheck, test) run in parallel. The deploy job runs sequentially after all CI jobs pass. This is expressed via `needs:` in the deploy workflow.

**When to use:** Always. Never make deploy a job in the same workflow as quality checks — it prevents parallelism and makes the pipeline slower.

**Trade-offs:** Two separate workflow files (`ci.yml` and `deploy.yml`) are harder to reason about than one combined file but prevent accidental deploys from PRs.

**Pattern:**
```yaml
# deploy.yml — only triggers after ci.yml passes on main
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]

jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.IAM_ROLE_ARN }}
          aws-region: us-east-1
      - run: npm ci
      - run: npx sst deploy --stage production
```

---

## Anti-Patterns

### Anti-Pattern 1: Running Vitest Against Async Server Components

**What people do:** Write `render(<SessionPage />)` tests for the `page.tsx` Server Component that has `async` and `await` at the top level.

**Why it's wrong:** Vitest (and React Testing Library) do not support async React Server Components as of March 2026. The official Next.js docs explicitly state this. The test will fail with a confusing error about async components.

**Do this instead:** Test the synchronous child components (`SessionShell`, `ClipboardFeed`, etc.) with Vitest. Test the full async server-rendered page with Playwright E2E tests.

### Anti-Pattern 2: Sentry Without hostSecret Scrubbing

**What people do:** Enable Sentry with default config on a Next.js app that has sensitive data in URLs.

**Why it's wrong:** Sentry captures the full request URL by default. For Nasqa Live, the host page URL is `/live/[slug]?hostSecret=[uuid]`. This UUID would be sent to Sentry and visible in the Sentry dashboard, effectively leaking the host credential to the error tracking service.

**Do this instead:** Add `beforeSend` to all three Sentry configs (client, server, edge) to strip `hostSecret` from URLs before sending. This is non-optional for this codebase.

### Anti-Pattern 3: Husky Hooks Inside Package Directories

**What people do:** Install Husky inside `packages/frontend/` as a dev dependency and run `npx husky init` from that directory.

**Why it's wrong:** Git hooks must live at the `.git/` directory level, which is at the repository root. Husky hooks installed inside a workspace package are never triggered by `git commit`.

**Do this instead:** Install Husky at the repo root only. Run `npx husky init` from the repo root. The `.husky/` directory must be a sibling of `.git/`.

### Anti-Pattern 4: Full typecheck on Every Pre-commit

**What people do:** Run `tsc --noEmit` across the entire project in `lint-staged` for every commit.

**Why it's wrong:** TypeScript project-wide type checking takes 10-30 seconds for even small projects. Running it on every commit makes the pre-commit hook so slow that developers start using `--no-verify` to bypass it.

**Do this instead:** Run ESLint with `--max-warnings 0` in pre-commit (fast, per-file). Run the full `tsc --noEmit` in the GitHub Actions CI pipeline (slow is acceptable there). Only run scoped `tsc` on staged files in pre-commit — `lint-staged` with file-glob patterns limits the scope.

### Anti-Pattern 5: Storing AWS Credentials as Long-Lived Secrets

**What people do:** Create an IAM user, generate access keys, store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as GitHub repository secrets.

**Why it's wrong:** Long-lived keys are a security risk. If the repository is compromised, the attacker has persistent AWS access. Keys also need rotation.

**Do this instead:** Use GitHub Actions OIDC to assume a short-lived IAM role. The role credentials expire after the workflow run. No static keys to rotate or leak. The `aws-actions/configure-aws-credentials@v4` action handles the OIDC token exchange.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Sentry | `@sentry/nextjs` SDK wraps `next.config.ts`; three separate init files per runtime | Add `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` to Netlify env vars; `SENTRY_AUTH_TOKEN` to GitHub Actions secrets for source map upload |
| GitHub Actions | `.github/workflows/` YAML; OIDC role assumption for AWS | Add `IAM_ROLE_ARN` and `AWS_ACCOUNT_ID` as GitHub Actions variables (not secrets) |
| Netlify | `netlify.toml` already exists; Netlify auto-deploys from main; no changes needed for basic CI | Sentry DSN and other env vars must also be set in Netlify dashboard for server-side error tracking |
| CloudWatch Logs | Lambda `console.log` / `pino` output automatically captured; no additional configuration | Logs visible in CloudWatch under `/aws/lambda/ResolverFn` log group |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Vitest tests ↔ `packages/core/` | Direct import — same monorepo, `@nasqa/core` path alias | No mocking needed; pure TypeScript |
| Vitest tests ↔ AppSync mutations | Mock via `vi.mock('@/actions/*')` | Server Actions already isolated in `src/actions/` — clean mock boundary |
| Sentry ↔ error boundaries | `useEffect(() => Sentry.captureException(error), [error])` in `error.tsx` | Manual capture because error boundaries run before Sentry's automatic instrumentation |
| lint-staged ↔ packages | File-glob patterns route staged files to package-specific linters | Each package has its own `eslint.config.mjs`; lint-staged must use the correct working directory |

---

## Scalability Considerations

For the hardening milestone, scalability of the hardening layer itself is relevant:

| Concern | Approach |
|---------|----------|
| Sentry event volume at 500 concurrent users | Set `tracesSampleRate: 0.1` (10% sampling) in Sentry init. Errors are always captured; performance traces are sampled. |
| CloudWatch log costs | Set Lambda `LOG_LEVEL=info` in production; `LOG_LEVEL=debug` only in `sst dev`. At $0.50/GB ingested, structured JSON is cheaper than verbose unstructured logs. |
| CI pipeline speed | Parallelize lint + typecheck + test jobs. With parallelism, total CI time should be under 3 minutes for this codebase size. |
| Vitest test suite growth | Co-locate tests with components (`__tests__` next to `src`) rather than a monolithic test directory — easier to find and maintain as the component count grows. |

---

## Sources

- Next.js Testing with Vitest — https://nextjs.org/docs/app/guides/testing/vitest (HIGH confidence — official docs, version 16.1.6, updated 2026-02-27)
- Next.js Error Handling — https://nextjs.org/docs/app/getting-started/error-handling (HIGH confidence — official docs)
- Sentry for Next.js — https://docs.sentry.io/platforms/javascript/guides/nextjs/ (HIGH confidence — official Sentry docs)
- Sentry Next.js Manual Setup — https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/ (HIGH confidence — official Sentry docs)
- GitHub Actions OIDC AWS — https://github.com/aws-actions/configure-aws-credentials (HIGH confidence — official AWS GitHub Action)
- SST + GitHub Actions OIDC — https://towardsthecloud.com/blog/sst-nextjs-preview-environments-github-actions (MEDIUM confidence — community source, multiple corroborating sources agree on OIDC pattern)
- Husky v9 setup — official Husky docs (HIGH confidence — training data consistent with search results showing `husky init` as canonical path)
- AWS Lambda structured logging — https://docs.aws.amazon.com/lambda/latest/dg/nodejs-logging.html (HIGH confidence — official AWS docs)
- pino-lambda — https://github.com/FormidableLabs/pino-lambda (MEDIUM confidence — Formidable-maintained, widely used)
- Next.js generateMetadata — https://nextjs.org/docs/app/api-reference/functions/generate-metadata (HIGH confidence — official docs)

---

*Architecture research for: enterprise hardening — Nasqa Live v1.1*
*Researched: 2026-03-15*

# Technology Stack

**Project:** Nasqa Live — real-time presentation session tool (live clipboard + Q&A)
**Researched:** 2026-03-13 (production stack) | 2026-03-15 (v1.1 enterprise hardening additions)
**Confidence:** HIGH (all versions verified from actual installed package.json files in the codebase)

---

## Part 1: Production Stack (v1.0 — Existing, Do Not Re-Research)

All versions below are the versions already installed in the scaffolded codebase. Treat them as pinned
baselines; semver ranges in package.json allow patch/minor updates but the majors are fixed.

### Core Framework

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| Next.js | 16.1.6 | Full-stack React framework | App Router + Server Components keeps initial JS payload under 80 kB. RSC renders session shell on the server; real-time hydration handled client-side only for the interactive feed. Non-negotiable per project constraint. |
| React | 19.2.3 | UI runtime | Required by Next.js 16. React 19 concurrent features (`useOptimistic`, Actions) enable the < 100 ms optimistic UI requirement without external libraries. |
| TypeScript | 5.x (devDep) | Type safety across all packages | Strict mode is on. Shared `@nasqa/core` package provides end-to-end type safety from DynamoDB shape → resolver → GraphQL → client. |

### Real-Time Layer

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| AWS AppSync | managed (via SST) | GraphQL API + WebSocket subscriptions | Single subscription channel per session (`onSessionUpdate`) with a union-type `SessionUpdate` covers all event types (snippet, question, upvote, ban, focusToggle). AppSync handles connection management, automatic reconnect, and fan-out — no custom WebSocket server needed. Target: < 200 ms broadcast latency. |
| SST Ion | 4.2.7 | IaC — provisions AppSync, Lambda, DynamoDB | `sst.config.ts` single-command deploy. Ion (v4) uses Pulumi/Terraform under the hood rather than CDK, which eliminates CloudFormation drift issues seen in SST v2/v3. `sst dev` gives live Lambda function reload without re-deploy. |

### Database

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| AWS DynamoDB | managed (via SST) | Primary data store | Single-table design with 24-hour TTL satisfies all session-scoped access patterns in 1-2 round trips. No cold-start latency from connection pooling (unlike RDS/Aurora). Atomic increment for upvote counts (`UpdateExpression ADD votes :one`) eliminates race conditions. |
| @aws-sdk/client-dynamodb | 3.1009.0 | Low-level DynamoDB client | Modular v3 SDK; tree-shaken to only what is imported. |
| @aws-sdk/lib-dynamodb | 3.1009.0 | DynamoDB Document client | Converts JS objects to/from DynamoDB attribute format automatically. Use `DynamoDBDocumentClient` over raw client for all resolver code. |

**DynamoDB single-table key design (confirmed in PROJECT.md):**

```
PK                  SK                        Entity
SESSION#<slug>      METADATA                  Session record (title, hostSecretHash, ttl, connectedCount)
SESSION#<slug>      SNIPPET#<ulid>            Snippet (content, language, createdAt, ttl)
SESSION#<slug>      QUESTION#<ulid>           Question (text, votes, downvotes, hidden, focused, authorToken, ttl)
SESSION#<slug>      QUESTION#<ulid>#REPLY#<ulid>  Reply (text, isSpeaker, authorToken, ttl)
SESSION#<slug>      BAN#<fingerprint>         Banned participant record
```

Use ULID (not UUID) for SK timestamp ordering — ULIDs are lexicographically sortable, enabling reverse-chron
queries without a GSI. Install `ulid` package when implementing the data layer.

### Lambda / Resolver Layer

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| AWS Lambda | managed (via SST) | AppSync resolver runtime | Direct Lambda resolvers (not VTL) give full TypeScript with Zod validation at resolver entry. Keeps business logic testable and type-safe. Cold start budget: Lambda ARM (Graviton2) with 512 MB fits within AppSync's 10 s resolver timeout. |
| Zod | 4.3.6 | Input validation in resolvers + frontend | v4 is a ground-up rewrite with significant performance improvements over v3. Validates AppSync resolver arguments at the boundary before touching DynamoDB. Same schemas shared via `@nasqa/core` between frontend form validation and backend resolver validation — no duplication. |

### Frontend — Data Fetching

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| @tanstack/react-query | 5.90.21 | Server state + query cache | Manages session data hydration and mutation lifecycle. For AppSync subscriptions, pair with a custom `useSubscription` hook that wraps the AWS Amplify `API.graphql` subscription observable — React Query itself does not subscribe; it owns the cache that subscription events write to. |

**Important pattern:** React Query is NOT the subscription manager. It owns the cache. The subscription
hook fires `queryClient.setQueryData(...)` on incoming events, which React Query propagates to all
mounted consumers. This keeps optimistic UI and server-state reconciliation in one place.

### Frontend — UI

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| Tailwind CSS | 4.x | Utility-first styling | CSS-first config (no `tailwind.config.js` — uses `@theme` in globals.css). Tailwind v4 tree-shakes more aggressively than v3, which helps the < 80 kB bundle constraint. |
| shadcn | 4.0.6 | Copy-paste component registry | `base-nova` style with CSS variables. Components are owned and modified — no runtime dependency. Configured with `@base-ui/react` primitives. |
| @base-ui/react | 1.3.0 | Unstyled accessible primitives | Radix UI replacement. Powers shadcn components (Dialog, Popover, etc.) with WAI-ARIA baked in. Smaller bundle than Radix. |
| Framer Motion | 12.36.0 | Animations | Used for the "Hero" snippet prominence animation, pulsing focus glow, and optimistic UI transitions. Keep usage to layout animations and spring transitions — avoid `AnimatePresence` at list scale (50-500 Q&A items can cause jank). |
| Lucide React | 0.577.0 | Icons | Tree-shakeable SVG icons. Already configured in shadcn registry. |
| Sonner | 2.0.7 | Toast notifications | Lightweight toast library for host action feedback (snippet deleted, user banned, etc.). Renders outside React tree, safe for real-time event notifications. |
| clsx + tailwind-merge | 2.1.1 + 3.5.0 | Class composition | Standard `cn()` utility (`clsx` + `twMerge`). Already wired in `@/lib/utils`. |
| class-variance-authority | 0.7.1 | Component variant management | Used by shadcn button and other variant-heavy components. |
| tw-animate-css | 1.4.0 | Tailwind animation utilities | Additional CSS keyframe animations compatible with Tailwind v4. |

### Frontend — Internationalization

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| next-intl | 4.8.3 | i18n routing and message lookup | v4 is the current release for Next.js App Router. Locale-based routing via middleware (`/en/`, `/es/`, `/pt/`). `getTranslations()` in Server Components, `useTranslations()` in Client Components. Covers UI chrome only — user-generated content is not translated. Browser locale auto-detection with `en` fallback. |

**next-intl v4 middleware pattern:**
```ts
// middleware.ts at packages/frontend root
import createMiddleware from "next-intl/middleware";
export default createMiddleware({
  locales: ["en", "es", "pt"],
  defaultLocale: "en",
});
export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
```

### Frontend — Theming

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| next-themes | 0.4.6 | Dark/light mode | SSR-safe theme switching without flash. Works with Tailwind CSS v4 `dark:` variant. Wraps root layout with `ThemeProvider`. Theme tokens confirmed in PROJECT.md: Dark (Zinc-950/Zinc-50/Zinc-800), Light (White/Zinc-900/Zinc-200), Accent (Emerald-500). |

### Frontend — Code Highlighting

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| Shiki | 4.0.2 | Syntax highlighting | v4 is the current release. Dual-theme support via `codeToHtml({ themes: { light, dark } })` with CSS variable output — eliminates layout shift on theme toggle (renders both themes, CSS `display` switches). Run Shiki **server-side only** (in Server Components or Lambda) to avoid shipping the WASM bundle to the client. Highlighted HTML is streamed as static markup. |

**Critical Shiki pattern:** Use `codeToHtml` with `defaultColor: false` and dual themes:
```ts
const html = await codeToHtml(code, {
  lang: snippet.language,
  themes: { light: "github-light", dark: "github-dark" },
  defaultColor: false,         // Outputs CSS vars, not inline style
});
```
Then in CSS:
```css
.shiki span { color: var(--shiki-light); }
.dark .shiki span { color: var(--shiki-dark); }
```
This is the only approach that avoids a second render on theme toggle.

### Frontend — QR Code

| Technology | Installed Version | Purpose | Why |
|------------|-------------------|---------|-----|
| qrcode | not yet installed | QR code generation for join URL | Use `qrcode` (npm: `qrcode` + `@types/qrcode`) for server-side SVG generation. Do not use a client-side canvas library — generate QR as SVG in a Server Component so the < 80 kB payload constraint is respected. Alternative: `qr-code-styling` for client-side with logo branding, but adds ~20 kB. |

**Recommended:** `qrcode@1.5.x` — server-side SVG output, zero client JS.

### AppSync Subscription — Architecture Decision

AppSync supports two subscription trigger models:

1. **Enhanced Subscriptions (Lambda):** Resolver-triggered, you call `appsync:PublishEvent` from Lambda.
2. **Auto-subscriptions (DynamoDB streams):** AppSync reacts to DynamoDB stream events automatically.

**Use Enhanced Subscriptions (Lambda-triggered) for Nasqa Live.**

Rationale: The project requires filtering (only clients in the same session receive updates), union-typed
events, and host-gated mutations. Lambda gives full control over who receives what. DynamoDB stream
subscriptions cannot easily filter by PK or apply business logic before fan-out.

Pattern for the single session channel:
```graphql
type Subscription {
  onSessionUpdate(slug: String!): SessionUpdate
    @aws_subscribe(mutations: ["pushSnippet", "submitQuestion", "upvoteQuestion",
                               "toggleFocus", "deleteSnippet", "banParticipant",
                               "submitReply", "downvoteContent"])
}

union SessionUpdate = SnippetEvent | QuestionEvent | ReplyEvent | ModerationEvent
```

Note: AppSync does not natively support union types in subscription return values in all configurations.
If union types cause schema validation errors in SST's AppSync component, use a tagged union pattern:
```graphql
type SessionUpdate {
  type: String!       # "SNIPPET" | "QUESTION" | "REPLY" | "MODERATION"
  payload: AWSJSON!  # Serialized JSON — discriminated union in TypeScript
}
```
This is the pragmatic fallback and avoids AppSync schema union limitations.

### Infrastructure — Rate Limiting

| Technology | Purpose | Why |
|------------|---------|-----|
| AWS WAF | Rate limiting at edge | 10 snippets/min (host) + 3 questions/min (public). Attach WAF Web ACL to AppSync API via SST. Token-bucket per IP. Cheaper than implementing custom Lambda rate limiting and operates before Lambda invocation. |

WAF rule (in SST `infra/` resource):
- Host operations: 10 req/60s per fingerprint header
- Public mutations: 3 req/60s per fingerprint header

---

## Part 2: Enterprise Hardening Stack (v1.1 — New Additions)

**Scope:** Testing infrastructure, CI/CD pipeline, error tracking/boundaries, pre-commit hooks,
dynamic SEO, and accessibility. All choices verified against current npm versions as of 2026-03-15.

---

### Testing — Unit & Component Tests

| Library | Recommended Version | Purpose | Why |
|---------|---------------------|---------|-----|
| vitest | ^4.1.0 | Test runner | v4.1 is the current stable release (as of March 2026). Vite-native — shares the same Vite config as the build pipeline, so module resolution, aliases, and env vars work identically in tests without duplication. Native ESM, no Babel transform needed. 10-40× faster than Jest for this stack because it skips the CommonJS transform layer. Official Next.js docs (updated 2026-02-27) recommend Vitest for unit/component tests in App Router. |
| @vitejs/plugin-react | ^4.x | React transform for Vitest | Required for JSX transform in the Vitest environment. Already likely present via Vite config; add explicitly if not. |
| @testing-library/react | ^16.3.2 | Component rendering and interaction | v16.3.2 (released January 2026) officially supports React 19. Earlier RTL versions have peer-dep conflicts with React 19 — use ≥ 16.3.0. |
| @testing-library/dom | ^10.x | DOM query utilities | Peer dependency of @testing-library/react. Provides `getByRole`, `getByText`, etc. |
| @testing-library/user-event | ^14.x | User interaction simulation | For testing upvote clicks, question submission, host actions. More realistic than `fireEvent` — simulates browser-level events. |
| jsdom | ^26.x | DOM environment for Vitest | Sets `environment: 'jsdom'` in vitest.config. Required for rendering React components in Node. |
| vite-tsconfig-paths | ^5.x | Path alias resolution | Maps `@/` imports to the correct source directories in test files, matching Next.js config. Without this, `import { cn } from '@/lib/utils'` fails in tests. |

**Vitest config for this monorepo (place in `packages/frontend/vitest.config.mts`):**
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

**Critical limitation:** Vitest does NOT support async Server Components (RSC with `async` functions).
Test those via E2E (Playwright). Synchronous Server Components and all Client Components are testable
with Vitest + RTL.

---

### Testing — End-to-End (E2E)

| Library | Recommended Version | Purpose | Why |
|---------|---------------------|---------|-----|
| @playwright/test | ^1.58.0 | E2E test runner | v1.58.2 is current (March 2026). Choose Playwright over Cypress because: (1) native parallelism without paid tier, (2) cross-browser including WebKit/Safari, (3) first-class support for async RSC testing which Vitest cannot do, (4) better WebSocket/real-time testing via the network interception API. The Next.js docs recommend Playwright for E2E. Playwright is 35-45% faster than Cypress in parallel CI runs. |

E2E tests cover:
- Session creation flow (host secret display, QR code)
- Real-time subscription events (WebSocket via Playwright network API)
- Async Server Components (landing page, session shell rendering)
- i18n routing (`/en/`, `/es/`, `/pt/` locale switching)

---

### Testing — Accessibility

| Library | Recommended Version | Purpose | Why |
|---------|---------------------|---------|-----|
| @axe-core/playwright | ^4.x | Accessibility audits in E2E | Integrates axe-core with Playwright to run WCAG scans against fully rendered pages. Catches structural issues that unit tests miss (landmark regions, heading hierarchy, color contrast). Run on key pages: landing, session host view, session audience view. |

**Do NOT use `vitest-axe`** — its latest stable release is 0.1.0 (3 years old, maintenance inactive).
Use `@axe-core/playwright` instead, which gets axe audits on real rendered DOM with real CSS.

Component-level ARIA correctness (correct roles, labels, keyboard nav) is covered by RTL's
`getByRole` / `getByLabelText` queries — no separate accessibility library needed for unit tests.

---

### Error Tracking & Monitoring

| Library | Recommended Version | Purpose | Why |
|---------|---------------------|---------|-----|
| @sentry/nextjs | ^10.43.0 | Error tracking + performance monitoring | v10.43.0 is current (March 2026). The wizard auto-generates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and `app/global-error.tsx`. App Router error boundaries (`error.tsx`, `global-error.tsx`) are first-class in Sentry v10. Captures unhandled errors, React component stack traces, and Lambda resolver errors via the Node SDK. |

**Next.js App Router error boundary pattern (generated by Sentry wizard):**
```ts
// app/global-error.tsx — Sentry captures + shows fallback UI
'use client'
import * as Sentry from '@sentry/nextjs'
import NextError from 'next/error'
import { useEffect } from 'react'

export default function GlobalError({ error }) {
  useEffect(() => { Sentry.captureException(error) }, [error])
  return (
    <html><body>
      <NextError statusCode={undefined as any} />
    </body></html>
  )
}
```

**Custom error.tsx files** (per-route error boundaries) should be added for:
- `app/[locale]/live/[slug]/error.tsx` — session not found, expired, network errors
- `app/[locale]/error.tsx` — locale-level fallback

**Do NOT use** a third-party structured logging library for Lambda resolvers. Use `console.log`/`console.error`
with structured JSON objects — CloudWatch Logs Insights picks these up natively. Sentry's Node SDK
automatically instruments Lambda via the SST function config.

---

### Pre-Commit Hooks

| Tool | Recommended Version | Purpose | Why |
|------|---------------------|---------|-----|
| husky | ^9.1.7 | Git hook manager | v9.1.7 is current stable (2025). Minimal setup: `husky init` creates `.husky/` and adds `prepare` script to package.json. The `prepare` script ensures all team members get hooks on `npm install`. |
| lint-staged | ^16.3.0 | Run linters on staged files only | v16.3.3 is current (March 2026). Critical: run only on staged files to keep pre-commit fast (< 5 seconds). Running ESLint on the whole monorepo on every commit would be too slow. |

**Pre-commit hook configuration (`.husky/pre-commit`):**
```sh
npx lint-staged
```

**`lint-staged` config in root `package.json`:**
```json
{
  "lint-staged": {
    "packages/frontend/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "packages/core/**/*.ts": [
      "prettier --write"
    ],
    "packages/functions/**/*.ts": [
      "prettier --write"
    ],
    "**/*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

**Add Prettier** — it is not yet installed in the project. This is the right time.

| Tool | Recommended Version | Purpose | Why |
|------|---------------------|---------|-----|
| prettier | ^3.8.1 | Code formatter | v3.8.1 is current (January 2026). ESLint 9 flat config is already in use (eslint-config-next ships it). Add `eslint-config-prettier` to disable ESLint formatting rules that conflict with Prettier. Do NOT use eslint-plugin-prettier (it slows down lint). |
| eslint-config-prettier | ^9.x | Disables ESLint rules that conflict with Prettier | Required when using both tools. Without it, ESLint and Prettier fight over quote style, semicolons, etc. |

---

### CI/CD Pipeline

**Platform:** GitHub Actions (already implied by the git repo context).

**Workflow file:** `.github/workflows/ci.yml`

**Recommended job structure:**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck          # tsc --noEmit across all packages
      - run: npm run lint               # eslint on frontend
      - run: npm run test --workspace=packages/frontend -- --run  # vitest --run (no watch)

  e2e:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build --workspace=packages/frontend
      - run: npx playwright test
```

**Key decisions:**
- `npm ci` (not `npm install`) for reproducible installs in CI
- `actions/setup-node@v4` with `cache: 'npm'` halves install time on subsequent runs
- `--run` flag on Vitest disables watch mode (required in CI — watch mode hangs)
- E2E runs after quality gate passes (`needs: quality`) to avoid wasting Playwright time on broken builds
- Deploy step is separate and only runs on `main` push (not on PRs) to avoid billing runaway

**Deploy job (separate workflow or additional job, main branch only):**
```yaml
  deploy:
    runs-on: ubuntu-latest
    needs: [quality, e2e]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run deploy
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
```

Note: The root `package.json` deploy script already runs lint + typecheck before `sst deploy`.
In CI the quality job runs those separately first, so you may want a lighter deploy script
(just `sst deploy`) to avoid double-running checks in CI.

---

### Dynamic SEO

**No new library needed.** Next.js 16 App Router provides all required primitives natively.

| Primitive | Purpose | How to Use |
|-----------|---------|------------|
| `generateMetadata()` | Per-route dynamic metadata | Export from any `page.tsx` — async, can fetch data. Works for session pages (title from session title, description from session slug). |
| `ImageResponse` from `next/og` | Dynamic OG images | Built-in image generation API. Create `app/[locale]/live/[slug]/opengraph-image.tsx` as a route segment file — Next.js auto-registers it as the OG image endpoint. |
| Static `metadata` export | Static page metadata | Use for the landing page, which has fixed title/description. |

**Per-session OG metadata pattern:**
```ts
// app/[locale]/live/[slug]/page.tsx
export async function generateMetadata({ params }) {
  const session = await getSession(params.slug)
  return {
    title: session?.title ?? 'Nasqa Live Session',
    description: `Join the live Q&A session: ${params.slug}`,
    openGraph: {
      title: session?.title ?? 'Nasqa Live',
      images: [`/api/og?slug=${params.slug}`],
    },
  }
}
```

**What NOT to build:** Do not install `next-seo` — it is a Pages Router library. App Router's
built-in `generateMetadata` API replaces it entirely.

---

## Packages NOT Yet Installed (v1.0 Gaps)

| Package | Version | Why Needed |
|---------|---------|-----------|
| `ulid` | ^3.0.2 | Already in functions/package.json. Confirm it's present — it is. |
| `qrcode` | ^1.5.4 | Already in frontend/package.json. Confirm present — it is. |
| `@types/qrcode` | ^1.5.6 | Already in frontend/devDependencies. |
| `aws-amplify` / `@aws-amplify/api-graphql` | ^6.x | Already in frontend/package.json as `aws-amplify@^6.16.3` and `@aws-amplify/api-graphql@^4.8.5`. |

## Packages NOT Yet Installed (v1.1 Enterprise Hardening)

| Package | Version | Workspace | Why Needed |
|---------|---------|-----------|-----------|
| `vitest` | ^4.1.0 | packages/frontend (devDep) | Test runner |
| `@vitejs/plugin-react` | ^4.x | packages/frontend (devDep) | JSX transform for Vitest |
| `@testing-library/react` | ^16.3.2 | packages/frontend (devDep) | Component testing, React 19 compatible |
| `@testing-library/dom` | ^10.x | packages/frontend (devDep) | DOM queries |
| `@testing-library/user-event` | ^14.x | packages/frontend (devDep) | User interaction simulation |
| `jsdom` | ^26.x | packages/frontend (devDep) | DOM environment |
| `vite-tsconfig-paths` | ^5.x | packages/frontend (devDep) | Path alias resolution in tests |
| `@playwright/test` | ^1.58.0 | root (devDep) | E2E testing |
| `@axe-core/playwright` | ^4.x | root (devDep) | Accessibility audits in E2E |
| `@sentry/nextjs` | ^10.43.0 | packages/frontend | Error tracking + monitoring |
| `husky` | ^9.1.7 | root (devDep) | Git hook manager |
| `lint-staged` | ^16.3.0 | root (devDep) | Staged-file linting |
| `prettier` | ^3.8.1 | root (devDep) | Code formatter |
| `eslint-config-prettier` | ^9.x | packages/frontend (devDep) | Disables ESLint formatting rules that conflict with Prettier |

---

## Installation (v1.1 Additions)

```bash
# Unit testing stack — frontend workspace
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom @testing-library/user-event jsdom vite-tsconfig-paths --workspace=packages/frontend

# E2E testing + accessibility — root (applies to all workspaces)
npm install -D @playwright/test @axe-core/playwright

# Install Playwright browsers (run once after install)
npx playwright install --with-deps

# Error tracking — frontend workspace (runtime dep, not devDep)
npm install @sentry/nextjs --workspace=packages/frontend

# Pre-commit hooks — root
npm install -D husky lint-staged prettier eslint-config-prettier
npx husky init

# Add Prettier config to root package.json
# (See lint-staged config block above)
```

---

## Alternatives Considered (v1.1 Additions)

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Test runner | Vitest | Jest | Jest requires Babel transform for ESM/TypeScript in this stack — adds config overhead. Vitest is native ESM, 10-40× faster cold start, and the official Next.js docs now recommend it over Jest for App Router. |
| Test runner | Vitest | Jest (with SWC) | Even with SWC, Jest's architecture runs each test file in an isolated process. Vitest shares the Vite build graph across tests for faster reruns. |
| E2E | Playwright | Cypress | Cypress charges for parallel execution (required in CI at scale). Playwright has native parallelism free. Playwright also supports WebKit/Safari and has better WebSocket network interception for testing AppSync subscriptions. |
| E2E | Playwright | Cypress | Cypress cannot test async RSC behavior directly; Playwright runs against the real browser. |
| Accessibility | @axe-core/playwright | vitest-axe | vitest-axe is unmaintained (latest stable 0.1.0, published 3 years ago). @axe-core/playwright tests against real rendered CSS, which catches contrast and layout issues vitest-axe cannot. |
| Accessibility | @axe-core/playwright | jest-axe | jest-axe targets Jest, not Vitest. Even with adapters, it tests against a JSDOM snapshot, not real CSS — misses contrast violations. |
| Error tracking | @sentry/nextjs | Datadog RUM | Sentry has a generous free tier (5K errors/month). Datadog requires paid plan. For a personal project at 50-500 users/session, Sentry free tier is sufficient. |
| Error tracking | @sentry/nextjs | LogRocket | LogRocket is session-replay focused. Sentry has better App Router error boundary integration and Lambda function error capture via the same SDK. |
| Pre-commit | husky + lint-staged | lefthook | lefthook is a valid alternative (faster, written in Go). Husky v9 is simpler for a npm workspaces setup and has better ecosystem documentation. Both are fine; husky is more commonly understood. |
| Code formatting | Prettier | ESLint formatting rules only | ESLint formatting rules are deprecated in ESLint 9+. Prettier is the dedicated formatter; ESLint handles correctness. Using both with `eslint-config-prettier` is the standard pattern. |
| SEO | Native generateMetadata | next-seo | next-seo is a Pages Router library. It provides no value in an App Router project — generateMetadata covers everything next-seo offered, natively. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `jest` (for unit tests) | Requires Babel/SWC transform config on top of existing Vite/TypeScript setup. Duplicates build config. Slower than Vitest. | `vitest` |
| `vitest-axe` | Unmaintained (0.1.0, 3 years old). Do not add unmaintained packages to a hardening milestone. | `@axe-core/playwright` |
| `jest-axe` | Jest-specific, incompatible with Vitest. | `@axe-core/playwright` |
| `next-seo` | Pages Router library. A no-op in App Router — adds a dependency with zero benefit. | `generateMetadata()` from Next.js |
| `eslint-plugin-prettier` | Runs Prettier as an ESLint rule — significantly slows ESLint (2-5× slower). The correct pattern is to run them separately. | `eslint-config-prettier` (disables conflicts) + `prettier --write` in lint-staged |
| `@sentry/react` (alone) | The React-only SDK does not instrument Next.js Server Components, Lambda resolvers, or edge middleware. | `@sentry/nextjs` (covers all runtimes) |
| `cypress` | Parallel execution requires paid plan. No WebKit support. | `@playwright/test` |
| `aws-sdk` (v2) | Deprecated. Has a 50× larger bundle than the v3 modular SDK. | `@aws-sdk/client-dynamodb` v3 (already installed) |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@testing-library/react@^16.3.2` | `react@19.2.3` | RTL ≥ 16.3.0 required for React 19. Earlier RTL versions have peer-dep conflicts. |
| `vitest@^4.1.0` | `@vitejs/plugin-react@^4.x` | Must use @vitejs/plugin-react (not @vitejs/plugin-react-swc) for jsdom compatibility. |
| `@sentry/nextjs@^10.x` | `next@16.1.6` | Sentry v10 requires Next.js ≥ 13.2. Next.js 16 is fully supported. |
| `eslint-config-next@16.1.6` | `eslint@^9` | Already installed. ESLint 9 flat config is the default. Do not use `.eslintrc.json` — use `eslint.config.mjs`. |
| `husky@^9.x` | `npm` workspaces | husky v9 `prepare` script runs from the root; works with npm workspaces without extra config. |
| `lint-staged@^16.x` | `husky@^9.x` | lint-staged v16 requires Node ≥ 18. Both are current and compatible. |
| `prettier@^3.8.x` | `eslint-config-prettier@^9.x` | Always pair together. eslint-config-prettier v9 supports Prettier 3. |

---

## Sources

- Codebase: `/packages/frontend/package.json` — verified installed versions (HIGH confidence)
- Codebase: `/packages/functions/package.json` — verified versions (HIGH confidence)
- Codebase: `/package.json` — root workspace dependencies (HIGH confidence)
- Next.js docs: https://nextjs.org/docs/app/guides/testing/vitest — Vitest setup guide, updated 2026-02-27 (HIGH confidence)
- Next.js docs: https://nextjs.org/docs/app/api-reference/functions/generate-metadata — generateMetadata API (HIGH confidence)
- WebSearch: vitest v4.1.0 confirmed as current npm latest as of 2026-03-15 (HIGH confidence)
- WebSearch: @testing-library/react v16.3.2 as React 19 compatible release, January 2026 (HIGH confidence)
- WebSearch: @sentry/nextjs v10.43.0 as current stable, March 2026 (HIGH confidence)
- WebSearch: husky v9.1.7 as current stable (MEDIUM confidence — last published 1 year ago per search, v9 is still the recommended line)
- WebSearch: lint-staged v16.3.3 as current stable, March 2026 (HIGH confidence)
- WebSearch: prettier v3.8.1 as current stable, January 2026 (HIGH confidence)
- WebSearch: @playwright/test v1.58.2 as current stable, March 2026 (HIGH confidence)
- WebSearch: vitest-axe maintenance status — 0.1.0 latest stable, 3 years inactive (HIGH confidence — validated by multiple sources)
- WebSearch: Playwright vs Cypress comparison for 2025 — Playwright recommended for CI/parallel (MEDIUM confidence — multiple sources agree)

---

*Stack research for: Nasqa Live — enterprise hardening (v1.1)*
*Researched: 2026-03-15*

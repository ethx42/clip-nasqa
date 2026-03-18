# Technology Stack

**Project:** Nasqa Live — real-time presentation session tool (live clipboard + Q&A)
**Researched:** 2026-03-13 (production stack) | 2026-03-15 (v1.1 enterprise hardening additions) | 2026-03-15 (v1.2 reactions additions) | 2026-03-16 (v1.3 participant & host UX refactor)
**Confidence:** HIGH (all versions verified from actual installed package.json files in the codebase)

---

## Part 1: Production Stack (v1.0 — Existing, Do Not Re-Research)

All versions below are the versions already installed in the scaffolded codebase. Treat them as pinned
baselines; semver ranges in package.json allow patch/minor updates but the majors are fixed.

### Core Framework

| Technology | Installed Version | Purpose                         | Why                                                                                                                                                                                                                         |
| ---------- | ----------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js    | 16.1.6            | Full-stack React framework      | App Router + Server Components keeps initial JS payload under 80 kB. RSC renders session shell on the server; real-time hydration handled client-side only for the interactive feed. Non-negotiable per project constraint. |
| React      | 19.2.3            | UI runtime                      | Required by Next.js 16. React 19 concurrent features (`useOptimistic`, Actions) enable the < 100 ms optimistic UI requirement without external libraries.                                                                   |
| TypeScript | 5.x (devDep)      | Type safety across all packages | Strict mode is on. Shared `@nasqa/core` package provides end-to-end type safety from DynamoDB shape → resolver → GraphQL → client.                                                                                          |

### Real-Time Layer

| Technology  | Installed Version | Purpose                                    | Why                                                                                                                                                                                                                                                                                                                  |
| ----------- | ----------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWS AppSync | managed (via SST) | GraphQL API + WebSocket subscriptions      | Single subscription channel per session (`onSessionUpdate`) with a union-type `SessionUpdate` covers all event types (snippet, question, upvote, ban, focusToggle). AppSync handles connection management, automatic reconnect, and fan-out — no custom WebSocket server needed. Target: < 200 ms broadcast latency. |
| SST Ion     | 4.2.7             | IaC — provisions AppSync, Lambda, DynamoDB | `sst.config.ts` single-command deploy. Ion (v4) uses Pulumi/Terraform under the hood rather than CDK, which eliminates CloudFormation drift issues seen in SST v2/v3. `sst dev` gives live Lambda function reload without re-deploy.                                                                                 |

### Database

| Technology               | Installed Version | Purpose                   | Why                                                                                                                                                                                                                                                                         |
| ------------------------ | ----------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWS DynamoDB             | managed (via SST) | Primary data store        | Single-table design with 24-hour TTL satisfies all session-scoped access patterns in 1-2 round trips. No cold-start latency from connection pooling (unlike RDS/Aurora). Atomic increment for upvote counts (`UpdateExpression ADD votes :one`) eliminates race conditions. |
| @aws-sdk/client-dynamodb | 3.1009.0          | Low-level DynamoDB client | Modular v3 SDK; tree-shaken to only what is imported.                                                                                                                                                                                                                       |
| @aws-sdk/lib-dynamodb    | 3.1009.0          | DynamoDB Document client  | Converts JS objects to/from DynamoDB attribute format automatically. Use `DynamoDBDocumentClient` over raw client for all resolver code.                                                                                                                                    |

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

| Technology | Installed Version | Purpose                                  | Why                                                                                                                                                                                                                                                                                  |
| ---------- | ----------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AWS Lambda | managed (via SST) | AppSync resolver runtime                 | Direct Lambda resolvers (not VTL) give full TypeScript with Zod validation at resolver entry. Keeps business logic testable and type-safe. Cold start budget: Lambda ARM (Graviton2) with 512 MB fits within AppSync's 10 s resolver timeout.                                        |
| Zod        | 4.3.6             | Input validation in resolvers + frontend | v4 is a ground-up rewrite with significant performance improvements over v3. Validates AppSync resolver arguments at the boundary before touching DynamoDB. Same schemas shared via `@nasqa/core` between frontend form validation and backend resolver validation — no duplication. |

### Frontend — Data Fetching

| Technology            | Installed Version | Purpose                    | Why                                                                                                                                                                                                                                                                                        |
| --------------------- | ----------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| @tanstack/react-query | 5.90.21           | Server state + query cache | Manages session data hydration and mutation lifecycle. For AppSync subscriptions, pair with a custom `useSubscription` hook that wraps the AWS Amplify `API.graphql` subscription observable — React Query itself does not subscribe; it owns the cache that subscription events write to. |

**Important pattern:** React Query is NOT the subscription manager. It owns the cache. The subscription
hook fires `queryClient.setQueryData(...)` on incoming events, which React Query propagates to all
mounted consumers. This keeps optimistic UI and server-state reconciliation in one place.

### Frontend — UI

| Technology               | Installed Version | Purpose                        | Why                                                                                                                                                                                                                                    |
| ------------------------ | ----------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tailwind CSS             | 4.x               | Utility-first styling          | CSS-first config (no `tailwind.config.js` — uses `@theme` in globals.css). Tailwind v4 tree-shakes more aggressively than v3, which helps the < 80 kB bundle constraint.                                                               |
| shadcn                   | 4.0.6             | Copy-paste component registry  | `base-nova` style with CSS variables. Components are owned and modified — no runtime dependency. Configured with `@base-ui/react` primitives.                                                                                          |
| @base-ui/react           | 1.3.0             | Unstyled accessible primitives | Radix UI replacement. Powers shadcn components (Dialog, Popover, etc.) with WAI-ARIA baked in. Smaller bundle than Radix.                                                                                                              |
| Framer Motion            | 12.36.0           | Animations                     | Used for the "Hero" snippet prominence animation, pulsing focus glow, and optimistic UI transitions. Keep usage to layout animations and spring transitions — avoid `AnimatePresence` at list scale (50-500 Q&A items can cause jank). |
| Lucide React             | 0.577.0           | Icons                          | Tree-shakeable SVG icons. Already configured in shadcn registry.                                                                                                                                                                       |
| Sonner                   | 2.0.7             | Toast notifications            | Lightweight toast library for host action feedback (snippet deleted, user banned, etc.). Renders outside React tree, safe for real-time event notifications.                                                                           |
| clsx + tailwind-merge    | 2.1.1 + 3.5.0     | Class composition              | Standard `cn()` utility (`clsx` + `twMerge`). Already wired in `@/lib/utils`.                                                                                                                                                          |
| class-variance-authority | 0.7.1             | Component variant management   | Used by shadcn button and other variant-heavy components.                                                                                                                                                                              |
| tw-animate-css           | 1.4.0             | Tailwind animation utilities   | Additional CSS keyframe animations compatible with Tailwind v4.                                                                                                                                                                        |

### Frontend — Internationalization

| Technology | Installed Version | Purpose                         | Why                                                                                                                                                                                                                                                                                                                     |
| ---------- | ----------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| next-intl  | 4.8.3             | i18n routing and message lookup | v4 is the current release for Next.js App Router. Locale-based routing via middleware (`/en/`, `/es/`, `/pt/`). `getTranslations()` in Server Components, `useTranslations()` in Client Components. Covers UI chrome only — user-generated content is not translated. Browser locale auto-detection with `en` fallback. |

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

| Technology  | Installed Version | Purpose         | Why                                                                                                                                                                                                                                                        |
| ----------- | ----------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| next-themes | 0.4.6             | Dark/light mode | SSR-safe theme switching without flash. Works with Tailwind CSS v4 `dark:` variant. Wraps root layout with `ThemeProvider`. Theme tokens confirmed in PROJECT.md: Dark (Zinc-950/Zinc-50/Zinc-800), Light (White/Zinc-900/Zinc-200), Accent (Emerald-500). |

### Frontend — Code Highlighting

| Technology | Installed Version | Purpose             | Why                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ----------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shiki      | 4.0.2             | Syntax highlighting | v4 is the current release. Dual-theme support via `codeToHtml({ themes: { light, dark } })` with CSS variable output — eliminates layout shift on theme toggle (renders both themes, CSS `display` switches). Run Shiki **server-side only** (in Server Components or Lambda) to avoid shipping the WASM bundle to the client. Highlighted HTML is streamed as static markup. |

**Critical Shiki pattern:** Use `codeToHtml` with `defaultColor: false` and dual themes:

```ts
const html = await codeToHtml(code, {
  lang: snippet.language,
  themes: { light: "github-light", dark: "github-dark" },
  defaultColor: false, // Outputs CSS vars, not inline style
});
```

Then in CSS:

```css
.shiki span {
  color: var(--shiki-light);
}
.dark .shiki span {
  color: var(--shiki-dark);
}
```

This is the only approach that avoids a second render on theme toggle.

### Frontend — QR Code

| Technology | Installed Version | Purpose                         | Why                                                                                                                                                                                                                                                                                                   |
| ---------- | ----------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| qrcode     | not yet installed | QR code generation for join URL | Use `qrcode` (npm: `qrcode` + `@types/qrcode`) for server-side SVG generation. Do not use a client-side canvas library — generate QR as SVG in a Server Component so the < 80 kB payload constraint is respected. Alternative: `qr-code-styling` for client-side with logo branding, but adds ~20 kB. |

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
    @aws_subscribe(
      mutations: [
        "pushSnippet"
        "submitQuestion"
        "upvoteQuestion"
        "toggleFocus"
        "deleteSnippet"
        "banParticipant"
        "submitReply"
        "downvoteContent"
      ]
    )
}

union SessionUpdate = SnippetEvent | QuestionEvent | ReplyEvent | ModerationEvent
```

Note: AppSync does not natively support union types in subscription return values in all configurations.
If union types cause schema validation errors in SST's AppSync component, use a tagged union pattern:

```graphql
type SessionUpdate {
  type: String! # "SNIPPET" | "QUESTION" | "REPLY" | "MODERATION"
  payload: AWSJSON! # Serialized JSON — discriminated union in TypeScript
}
```

This is the pragmatic fallback and avoids AppSync schema union limitations.

### Infrastructure — Rate Limiting

| Technology | Purpose               | Why                                                                                                                                                                                                             |
| ---------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWS WAF    | Rate limiting at edge | 10 snippets/min (host) + 3 questions/min (public). Attach WAF Web ACL to AppSync API via SST. Token-bucket per IP. Cheaper than implementing custom Lambda rate limiting and operates before Lambda invocation. |

WAF rule (in SST `infra/` resource):

- Host operations: 10 req/60s per fingerprint header
- Public mutations: 3 req/60s per fingerprint header

---

## Part 2: Enterprise Hardening Stack (v1.1 — New Additions)

**Scope:** Testing infrastructure, CI/CD pipeline, error tracking/boundaries, pre-commit hooks,
dynamic SEO, and accessibility. All choices verified against current npm versions as of 2026-03-15.

---

### Testing — Unit & Component Tests

| Library                     | Recommended Version | Purpose                             | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------- | ------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| vitest                      | ^4.1.0              | Test runner                         | v4.1 is the current stable release (as of March 2026). Vite-native — shares the same Vite config as the build pipeline, so module resolution, aliases, and env vars work identically in tests without duplication. Native ESM, no Babel transform needed. 10-40× faster than Jest for this stack because it skips the CommonJS transform layer. Official Next.js docs (updated 2026-02-27) recommend Vitest for unit/component tests in App Router. |
| @vitejs/plugin-react        | ^4.x                | React transform for Vitest          | Required for JSX transform in the Vitest environment. Already likely present via Vite config; add explicitly if not.                                                                                                                                                                                                                                                                                                                                |
| @testing-library/react      | ^16.3.2             | Component rendering and interaction | v16.3.2 (released January 2026) officially supports React 19. Earlier RTL versions have peer-dep conflicts with React 19 — use ≥ 16.3.0.                                                                                                                                                                                                                                                                                                            |
| @testing-library/dom        | ^10.x               | DOM query utilities                 | Peer dependency of @testing-library/react. Provides `getByRole`, `getByText`, etc.                                                                                                                                                                                                                                                                                                                                                                  |
| @testing-library/user-event | ^14.x               | User interaction simulation         | For testing upvote clicks, question submission, host actions. More realistic than `fireEvent` — simulates browser-level events.                                                                                                                                                                                                                                                                                                                     |
| jsdom                       | ^26.x               | DOM environment for Vitest          | Sets `environment: 'jsdom'` in vitest.config. Required for rendering React components in Node.                                                                                                                                                                                                                                                                                                                                                      |
| vite-tsconfig-paths         | ^5.x                | Path alias resolution               | Maps `@/` imports to the correct source directories in test files, matching Next.js config. Without this, `import { cn } from '@/lib/utils'` fails in tests.                                                                                                                                                                                                                                                                                        |

**Vitest config for this monorepo (place in `packages/frontend/vitest.config.mts`):**

```ts
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

**Critical limitation:** Vitest does NOT support async Server Components (RSC with `async` functions).
Test those via E2E (Playwright). Synchronous Server Components and all Client Components are testable
with Vitest + RTL.

---

### Testing — End-to-End (E2E)

| Library          | Recommended Version | Purpose         | Why                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @playwright/test | ^1.58.0             | E2E test runner | v1.58.2 is current (March 2026). Choose Playwright over Cypress because: (1) native parallelism without paid tier, (2) cross-browser including WebKit/Safari, (3) first-class support for async RSC testing which Vitest cannot do, (4) better WebSocket/real-time testing via the network interception API. The Next.js docs recommend Playwright for E2E. Playwright is 35-45% faster than Cypress in parallel CI runs. |

E2E tests cover:

- Session creation flow (host secret display, QR code)
- Real-time subscription events (WebSocket via Playwright network API)
- Async Server Components (landing page, session shell rendering)
- i18n routing (`/en/`, `/es/`, `/pt/` locale switching)

---

### Testing — Accessibility

| Library              | Recommended Version | Purpose                     | Why                                                                                                                                                                                                                                                            |
| -------------------- | ------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @axe-core/playwright | ^4.x                | Accessibility audits in E2E | Integrates axe-core with Playwright to run WCAG scans against fully rendered pages. Catches structural issues that unit tests miss (landmark regions, heading hierarchy, color contrast). Run on key pages: landing, session host view, session audience view. |

**Do NOT use `vitest-axe`** — its latest stable release is 0.1.0 (3 years old, maintenance inactive).
Use `@axe-core/playwright` instead, which gets axe audits on real rendered DOM with real CSS.

Component-level ARIA correctness (correct roles, labels, keyboard nav) is covered by RTL's
`getByRole` / `getByLabelText` queries — no separate accessibility library needed for unit tests.

---

### Error Tracking & Monitoring

| Library        | Recommended Version | Purpose                                 | Why                                                                                                                                                                                                                                                                                                                                                                       |
| -------------- | ------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @sentry/nextjs | ^10.43.0            | Error tracking + performance monitoring | v10.43.0 is current (March 2026). The wizard auto-generates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and `app/global-error.tsx`. App Router error boundaries (`error.tsx`, `global-error.tsx`) are first-class in Sentry v10. Captures unhandled errors, React component stack traces, and Lambda resolver errors via the Node SDK. |

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

| Tool        | Recommended Version | Purpose                          | Why                                                                                                                                                                                                 |
| ----------- | ------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| husky       | ^9.1.7              | Git hook manager                 | v9.1.7 is current stable (2025). Minimal setup: `husky init` creates `.husky/` and adds `prepare` script to package.json. The `prepare` script ensures all team members get hooks on `npm install`. |
| lint-staged | ^16.3.0             | Run linters on staged files only | v16.3.3 is current (March 2026). Critical: run only on staged files to keep pre-commit fast (< 5 seconds). Running ESLint on the whole monorepo on every commit would be too slow.                  |

**Pre-commit hook configuration (`.husky/pre-commit`):**

```sh
npx lint-staged
```

**`lint-staged` config in root `package.json`:**

```json
{
  "lint-staged": {
    "packages/frontend/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "packages/core/**/*.ts": ["prettier --write"],
    "packages/functions/**/*.ts": ["prettier --write"],
    "**/*.{json,md}": ["prettier --write"]
  }
}
```

**Add Prettier** — it is not yet installed in the project. This is the right time.

| Tool                   | Recommended Version | Purpose                                           | Why                                                                                                                                                                                                                                                          |
| ---------------------- | ------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| prettier               | ^3.8.1              | Code formatter                                    | v3.8.1 is current (January 2026). ESLint 9 flat config is already in use (eslint-config-next ships it). Add `eslint-config-prettier` to disable ESLint formatting rules that conflict with Prettier. Do NOT use eslint-plugin-prettier (it slows down lint). |
| eslint-config-prettier | ^9.x                | Disables ESLint rules that conflict with Prettier | Required when using both tools. Without it, ESLint and Prettier fight over quote style, semicolons, etc.                                                                                                                                                     |

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
          cache: "npm"
      - run: npm ci
      - run: npm run typecheck # tsc --noEmit across all packages
      - run: npm run lint # eslint on frontend
      - run: npm run test --workspace=packages/frontend -- --run # vitest --run (no watch)

  e2e:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
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
        cache: "npm"
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

| Primitive                      | Purpose                    | How to Use                                                                                                                                                         |
| ------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `generateMetadata()`           | Per-route dynamic metadata | Export from any `page.tsx` — async, can fetch data. Works for session pages (title from session title, description from session slug).                             |
| `ImageResponse` from `next/og` | Dynamic OG images          | Built-in image generation API. Create `app/[locale]/live/[slug]/opengraph-image.tsx` as a route segment file — Next.js auto-registers it as the OG image endpoint. |
| Static `metadata` export       | Static page metadata       | Use for the landing page, which has fixed title/description.                                                                                                       |

**Per-session OG metadata pattern:**

```ts
// app/[locale]/live/[slug]/page.tsx
export async function generateMetadata({ params }) {
  const session = await getSession(params.slug);
  return {
    title: session?.title ?? "Nasqa Live Session",
    description: `Join the live Q&A session: ${params.slug}`,
    openGraph: {
      title: session?.title ?? "Nasqa Live",
      images: [`/api/og?slug=${params.slug}`],
    },
  };
}
```

**What NOT to build:** Do not install `next-seo` — it is a Pages Router library. App Router's
built-in `generateMetadata` API replaces it entirely.

---

## Part 3: Reactions Stack (v1.2 — New Additions)

**Scope:** Emoji reactions on Questions and Replies. Fixed palette of 6 emojis (👍 ❤️ 🎉 😂 🤔 👀).
No emoji picker library. Dedup via DynamoDB Sets (same pattern as existing votes). Real-time propagation
via the existing `onSessionUpdate` subscription channel.

**Key finding: Zero new npm packages required.** Every capability needed already exists in the
installed stack. This milestone is pure schema extension + resolver code + UI components.

---

### DynamoDB Pattern — Reactions

**Store reactions as 6 named String Set attributes on Question and Reply items.**

Each emoji gets its own DynamoDB String Set attribute containing fingerprints of participants who
reacted with that emoji. This mirrors the existing `voters` set pattern on upvote/downvote exactly:

```
Attribute name  DynamoDB type   Content
react_thumbsup  SS (String Set) { "fp-abc123", "fp-def456" }
react_heart     SS (String Set) { "fp-xyz789" }
react_party     SS (String Set) {}   (absent if no reactions)
react_laugh     SS (String Set) { ... }
react_think     SS (String Set) { ... }
react_eyes      SS (String Set) { ... }
```

**Why this layout over a Map attribute:**

DynamoDB `ADD/DELETE` with `:fpSet` (a `Set`) works directly on top-level String Set attributes.
Nested updates to a Map's inner sets require complex UpdateExpression paths and cannot use the
atomic `ADD`/`DELETE` set operations — they require `SET map.key = list_append(...)` which is
not atomic. Keeping each emoji as a separate top-level attribute preserves the exact same
`ConditionalCheckFailedException`-based dedup that `upvoteQuestion` already uses.

**Resolver UpdateExpression (adding a reaction):**

```typescript
// Identical structure to upvoteQuestion — no new patterns
const updateExpression = "ADD #react :fpSet";
const conditionExpression = "NOT contains(#react, :fp) OR attribute_not_exists(#react)";

await docClient.send(
  new UpdateCommand({
    TableName: tableName(),
    Key: { PK: `SESSION#${sessionSlug}`, SK: `QUESTION#${questionId}` },
    UpdateExpression: updateExpression,
    ConditionExpression: conditionExpression,
    ExpressionAttributeNames: { "#react": reactionAttributeName(emoji) },
    ExpressionAttributeValues: {
      ":fp": fingerprint,
      ":fpSet": new Set([fingerprint]),
    },
  }),
);
```

**Serialization to client:** The 6 set attributes are never sent raw to the client. In the resolver,
read `ReturnValues: "ALL_NEW"` and project to a count map:

```typescript
// reactionCounts: { "👍": 3, "❤️": 1, "🎉": 0, ... }
const counts = EMOJI_PALETTE.reduce(
  (acc, emoji) => {
    const attr = reactionAttributeName(emoji); // "react_thumbsup", etc.
    acc[emoji] = (item[attr] as Set<string>)?.size ?? 0;
    return acc;
  },
  {} as Record<string, number>,
);
```

This count map is serialized into the `SessionUpdate.payload` AWSJSON field — same as upvote
count propagation. The client never needs to know about fingerprint sets.

**Rate limiting:** Reuse `checkRateLimit(fingerprint, limit, window)` from `rate-limit.ts`. Apply a
dedicated limit for reactions: 10 reactions/60s per fingerprint. This is a separate rate limit key
from questions/replies so they do not interfere.

**Ban enforcement:** Reuse `checkNotBanned(sessionSlug, fingerprint)` from `rate-limit.ts` unchanged.

---

### AppSync Schema Changes

**New mutations (add to `infra/schema.graphql`):**

```graphql
type Mutation {
  # ... existing mutations ...
  reactToQuestion(
    sessionSlug: String!
    questionId: String!
    fingerprint: String!
    emoji: String!
    remove: Boolean
  ): SessionUpdate!
  reactToReply(
    sessionSlug: String!
    replyId: String!
    questionId: String!
    fingerprint: String!
    emoji: String!
    remove: Boolean
  ): SessionUpdate!
}
```

**New event types (add to `SessionEventType` enum):**

```graphql
enum SessionEventType {
  # ... existing types ...
  QUESTION_REACTION_UPDATED
  REPLY_REACTION_UPDATED
}
```

**Question and Reply types — add reactions field:**

```graphql
type Question {
  # ... existing fields ...
  reactions: AWSJSON # Serialized { "👍": 3, "❤️": 1, ... } count map
}

type Reply {
  # ... existing fields ...
  reactions: AWSJSON # Same count map
}
```

**Subscription update:** Add both new mutations to `@aws_subscribe`:

```graphql
type Subscription {
  onSessionUpdate(sessionSlug: String!): SessionUpdate
    @aws_subscribe(
      mutations: [
        # ... existing mutations ...,
        "reactToQuestion"
        "reactToReply"
      ]
    )
}
```

---

### TypeScript Changes — `@nasqa/core`

**Update `packages/core/src/types.ts`:**

```typescript
// Add to Question and Reply interfaces
export interface Question {
  // ... existing fields ...
  reactions?: Record<string, number>; // { "👍": 3, "❤️": 1, ... } — absent on old items
}

export interface Reply {
  // ... existing fields ...
  reactions?: Record<string, number>;
}

// Add to SessionEventType enum
export enum SessionEventType {
  // ... existing values ...
  QUESTION_REACTION_UPDATED = "QUESTION_REACTION_UPDATED",
  REPLY_REACTION_UPDATED = "REPLY_REACTION_UPDATED",
}

// New mutation arg interfaces
export interface ReactToQuestionArgs {
  sessionSlug: string;
  questionId: string;
  fingerprint: string;
  emoji: string; // validated against EMOJI_PALETTE in resolver
  remove?: boolean;
}

export interface ReactToReplyArgs {
  sessionSlug: string;
  replyId: string;
  questionId: string; // needed for SK lookup: REPLY#<ulid> is under SESSION#<slug>
  fingerprint: string;
  emoji: string;
  remove?: boolean;
}
```

**Add to `packages/core/src/schemas.ts`:**

```typescript
export const EMOJI_PALETTE = ["👍", "❤️", "🎉", "😂", "🤔", "👀"] as const;
export type EmojiReaction = (typeof EMOJI_PALETTE)[number];

export const reactToQuestionInputSchema = z.object({
  sessionSlug: z.string(),
  questionId: z.string(),
  fingerprint: z.string().uuid(),
  emoji: z.enum(EMOJI_PALETTE), // Rejects invalid emoji at both client and resolver boundary
  remove: z.boolean().optional(),
});
```

---

### Frontend State Changes — `useSessionState`

**`SessionAction` union — add reaction actions:**

```typescript
export type SessionAction =
  | // ... existing actions ...
  | {
      type: "QUESTION_REACTION_UPDATED";
      payload: { questionId: string; reactions: Record<string, number> };
    }
  | {
      type: "REPLY_REACTION_UPDATED";
      payload: { replyId: string; reactions: Record<string, number> };
    };
```

**Reducer cases:**

```typescript
case "QUESTION_REACTION_UPDATED": {
  return {
    ...state,
    questions: state.questions.map((q) =>
      q.id === action.payload.questionId
        ? { ...q, reactions: action.payload.reactions }
        : q
    ),
  };
}

case "REPLY_REACTION_UPDATED": {
  return {
    ...state,
    replies: state.replies.map((r) =>
      r.id === action.payload.replyId
        ? { ...r, reactions: action.payload.reactions }
        : r
    ),
  };
}
```

**Optimistic pattern:** On reaction click, immediately dispatch with a `+1` delta to the local
reactions map before the server responds. On `ConditionalCheckFailedException` (already reacted),
roll back. This matches the existing `upvoteDelta` pattern in `QUESTION_UPDATED`.

---

### Frontend UI — Reaction Bar Component

**No emoji picker library.** The fixed 6-emoji palette renders as a hardcoded button row.

```typescript
// packages/frontend/src/components/reaction-bar.tsx
const PALETTE = ["👍", "❤️", "🎉", "😂", "🤔", "👀"] as const;
```

Each emoji button is a standard `<button>` element with:

- `aria-label="React with [emoji name]"` for accessibility
- `aria-pressed={hasReacted}` for toggle state
- Count badge hidden if count is 0 (reduces visual noise)
- Click handler calls `reactToQuestionAction` / `reactToReplyAction` (Server Actions, same pattern as `upvoteQuestionAction`)

**Bundle impact:** Zero — 6 hardcoded emoji characters in JSX cost 0 bytes beyond the component
itself. No emoji library, no picker, no unicode database. This is the correct choice for the < 80 kB
budget constraint.

---

### Frontend — New Server Actions

Add to `packages/frontend/src/actions/qa.ts`:

```typescript
export async function reactToQuestionAction(args: {
  sessionSlug: string;
  questionId: string;
  fingerprint: string;
  emoji: string;
  remove?: boolean;
}): Promise<{ ok: boolean; error?: string }>;

export async function reactToReplyAction(args: {
  sessionSlug: string;
  replyId: string;
  questionId: string;
  fingerprint: string;
  emoji: string;
  remove?: boolean;
}): Promise<{ ok: boolean; error?: string }>;
```

Both follow the exact `appsyncMutation(MUTATION_NAME, args)` pattern already established.

---

### Frontend — New GraphQL Mutations

Add to `packages/frontend/src/lib/graphql/mutations.ts`:

```typescript
export const REACT_TO_QUESTION = `
  mutation ReactToQuestion($sessionSlug: String!, $questionId: String!, $fingerprint: String!, $emoji: String!, $remove: Boolean) {
    reactToQuestion(sessionSlug: $sessionSlug, questionId: $questionId, fingerprint: $fingerprint, emoji: $emoji, remove: $remove) {
      eventType
      sessionSlug
      payload
    }
  }
`;

export const REACT_TO_REPLY = `
  mutation ReactToReply($sessionSlug: String!, $replyId: String!, $questionId: String!, $fingerprint: String!, $emoji: String!, $remove: Boolean) {
    reactToReply(sessionSlug: $sessionSlug, replyId: $replyId, questionId: $questionId, fingerprint: $fingerprint, emoji: $emoji, remove: $remove) {
      eventType
      sessionSlug
      payload
    }
  }
`;
```

---

### Reply SK Pattern — Important Note

The existing Reply DynamoDB SK is `REPLY#<ulid>` — top-level under `SESSION#<slug>`, NOT nested
under a question. The `reactToReply` resolver needs `questionId` only to look up the Reply's
`SK = REPLY#<replyId>` — the question association is stored as a `questionId` attribute on the
Reply item, not in the key. This matches the existing `addReply` and `getSessionData` patterns.

Confirm: `packages/functions/src/resolvers/qa.ts` addReply uses `SK: \`REPLY#${id}\`` — correct,
no change needed to the key scheme.

---

## Packages NOT Yet Installed (v1.0 Gaps)

| Package                                    | Version | Why Needed                                                                                       |
| ------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------ |
| `ulid`                                     | ^3.0.2  | Already in functions/package.json. Confirm it's present — it is.                                 |
| `qrcode`                                   | ^1.5.4  | Already in frontend/package.json. Confirm present — it is.                                       |
| `@types/qrcode`                            | ^1.5.6  | Already in frontend/devDependencies.                                                             |
| `aws-amplify` / `@aws-amplify/api-graphql` | ^6.x    | Already in frontend/package.json as `aws-amplify@^6.16.3` and `@aws-amplify/api-graphql@^4.8.5`. |

## Packages NOT Yet Installed (v1.1 Enterprise Hardening)

| Package                       | Version  | Workspace                  | Why Needed                                                   |
| ----------------------------- | -------- | -------------------------- | ------------------------------------------------------------ |
| `vitest`                      | ^4.1.0   | packages/frontend (devDep) | Test runner                                                  |
| `@vitejs/plugin-react`        | ^4.x     | packages/frontend (devDep) | JSX transform for Vitest                                     |
| `@testing-library/react`      | ^16.3.2  | packages/frontend (devDep) | Component testing, React 19 compatible                       |
| `@testing-library/dom`        | ^10.x    | packages/frontend (devDep) | DOM queries                                                  |
| `@testing-library/user-event` | ^14.x    | packages/frontend (devDep) | User interaction simulation                                  |
| `jsdom`                       | ^26.x    | packages/frontend (devDep) | DOM environment                                              |
| `vite-tsconfig-paths`         | ^5.x     | packages/frontend (devDep) | Path alias resolution in tests                               |
| `@playwright/test`            | ^1.58.0  | root (devDep)              | E2E testing                                                  |
| `@axe-core/playwright`        | ^4.x     | root (devDep)              | Accessibility audits in E2E                                  |
| `@sentry/nextjs`              | ^10.43.0 | packages/frontend          | Error tracking + monitoring                                  |
| `husky`                       | ^9.1.7   | root (devDep)              | Git hook manager                                             |
| `lint-staged`                 | ^16.3.0  | root (devDep)              | Staged-file linting                                          |
| `prettier`                    | ^3.8.1   | root (devDep)              | Code formatter                                               |
| `eslint-config-prettier`      | ^9.x     | packages/frontend (devDep) | Disables ESLint formatting rules that conflict with Prettier |

## Packages NOT Yet Installed (v1.2 Reactions)

**None.** Zero new npm packages required. All capabilities are already installed:

| Needed Capability                     | Provided By                                                            | Already Installed      |
| ------------------------------------- | ---------------------------------------------------------------------- | ---------------------- |
| DynamoDB String Set atomic ADD/DELETE | `@aws-sdk/lib-dynamodb`                                                | Yes — 3.1009.0         |
| DynamoDB conditional checks           | `@aws-sdk/client-dynamodb` (`ConditionalCheckFailedException`)         | Yes — 3.1009.0         |
| Rate limiting                         | `checkRateLimit()` in `packages/functions/src/resolvers/rate-limit.ts` | Yes — internal utility |
| Ban enforcement                       | `checkNotBanned()` in `packages/functions/src/resolvers/rate-limit.ts` | Yes — internal utility |
| AppSync mutation + subscription       | AWS AppSync (managed, via SST)                                         | Yes                    |
| Server Actions                        | Next.js 16 built-in                                                    | Yes                    |
| Real-time event dispatch              | `useSessionState` reducer                                              | Yes — extend only      |
| Input validation                      | Zod 4.3.6                                                              | Yes                    |
| Optimistic UI                         | React 19 `useReducer` + dispatch pattern                               | Yes                    |
| Fixed emoji display                   | Hardcoded JSX — no library                                             | n/a                    |

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

## Installation (v1.2 Reactions)

```bash
# No new packages to install.
# Work is entirely:
#   1. infra/schema.graphql — add mutations, event types, reactions field
#   2. packages/core/src/types.ts — add reactions to Question/Reply, new arg interfaces
#   3. packages/core/src/schemas.ts — add EMOJI_PALETTE constant + Zod schema
#   4. packages/functions/src/resolvers/qa.ts — add reactToQuestion / reactToReply resolvers
#   5. packages/frontend/src/lib/graphql/mutations.ts — add REACT_TO_QUESTION / REACT_TO_REPLY
#   6. packages/frontend/src/actions/qa.ts — add reactToQuestionAction / reactToReplyAction
#   7. packages/frontend/src/hooks/use-session-state.ts — add reaction action types + reducer cases
#   8. packages/frontend/src/components/reaction-bar.tsx — new component, no new deps
```

---

## Alternatives Considered (v1.1 Additions)

| Category        | Recommended             | Alternative                  | Why Not                                                                                                                                                                                                                           |
| --------------- | ----------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test runner     | Vitest                  | Jest                         | Jest requires Babel/SWC transform config on top of existing Vite/TypeScript setup. Duplicates build config. Slower than Vitest.                                                                                                   |
| Test runner     | Vitest                  | Jest (with SWC)              | Even with SWC, Jest's architecture runs each test file in an isolated process. Vitest shares the Vite build graph across tests for faster reruns.                                                                                 |
| E2E             | Playwright              | Cypress                      | Cypress charges for parallel execution (required in CI at scale). Playwright has native parallelism free. Playwright also supports WebKit/Safari and has better WebSocket network interception for testing AppSync subscriptions. |
| E2E             | Playwright              | Cypress                      | Cypress cannot test async RSC behavior directly; Playwright runs against the real browser.                                                                                                                                        |
| Accessibility   | @axe-core/playwright    | vitest-axe                   | vitest-axe is unmaintained (latest stable 0.1.0, published 3 years ago). @axe-core/playwright tests against real rendered CSS, which catches contrast and layout issues vitest-axe cannot.                                        |
| Accessibility   | @axe-core/playwright    | jest-axe                     | jest-axe targets Jest, not Vitest. Even with adapters, it tests against a JSDOM snapshot, not real CSS — misses contrast violations.                                                                                              |
| Error tracking  | @sentry/nextjs          | Datadog RUM                  | Sentry has a generous free tier (5K errors/month). Datadog requires paid plan. For a personal project at 50-500 users/session, Sentry free tier is sufficient.                                                                    |
| Error tracking  | @sentry/nextjs          | LogRocket                    | LogRocket is session-replay focused. Sentry has better App Router error boundary integration and Lambda function error capture via the same SDK.                                                                                  |
| Pre-commit      | husky + lint-staged     | lefthook                     | lefthook is a valid alternative (faster, written in Go). Husky v9 is simpler for a npm workspaces setup and has better ecosystem documentation. Both are fine; husky is more commonly understood.                                 |
| Code formatting | Prettier                | ESLint formatting rules only | ESLint formatting rules are deprecated in ESLint 9+. Prettier is the dedicated formatter; ESLint handles correctness. Using both with `eslint-config-prettier` is the standard pattern.                                           |
| SEO             | Native generateMetadata | next-seo                     | next-seo is a Pages Router library. It provides no value in an App Router project — generateMetadata covers everything next-seo offered, natively.                                                                                |

## Alternatives Considered (v1.2 Reactions)

| Category                  | Recommended                                                | Alternative                                             | Why Not                                                                                                                                                                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DynamoDB reaction storage | 6 top-level String Set attributes (`react_thumbsup`, etc.) | Single `reactions` Map attribute with nested sets       | DynamoDB `ADD`/`DELETE` set operations only work on top-level String Set attributes. Nested Map updates require `SET map.key = ...` which is not atomic and cannot use `ConditionalCheckFailedException` for dedup. The flat attribute approach reuses the proven `voters` set pattern identically. |
| DynamoDB reaction storage | 6 top-level String Set attributes                          | Separate `REACTION#<itemId>#<emoji>` items per reaction | Adds a new access pattern that requires a Query + aggregation instead of a single UpdateItem. Overkill for 6 emojis; adds read complexity and extra DynamoDB cost.                                                                                                                                  |
| DynamoDB reaction storage | Count map projected from sets                              | Store raw sets in GraphQL response                      | Sending full fingerprint sets to every client on every reaction update leaks participant identity, wastes bandwidth, and grows unboundedly (up to 500 fingerprints × 6 emojis per item). Count map is sufficient for the UI.                                                                        |
| Emoji input               | `z.enum(EMOJI_PALETTE)` Zod validation                     | Free-text `emoji: String` in GraphQL                    | Allowing arbitrary emoji strings creates a DynamoDB injection vector — a malicious client could send any string as the attribute name via `ExpressionAttributeNames`. Validating against the fixed palette at both the GraphQL schema level (enum) and Zod level (z.enum) closes this.              |
| Emoji display             | Hardcoded JSX with 6 `<button>` elements                   | Emoji picker library (emoji-mart, etc.)                 | emoji-mart adds 40-50 kB gzipped — would blow the 80 kB bundle budget on its own. The fixed 6-emoji palette specified in v1.2 requirements eliminates any need for a picker.                                                                                                                        |
| Real-time propagation     | Reuse `onSessionUpdate` subscription                       | New `onReactionUpdate` subscription                     | Adding a second subscription doubles WebSocket connections per client (one per session for content, one for reactions). The existing single-channel design handles this cleanly via new event type discriminators.                                                                                  |

---

## What NOT to Use

| Avoid                                                            | Why                                                                                                                                                             | Use Instead                                                                            |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `jest` (for unit tests)                                          | Requires Babel/SWC transform config on top of existing Vite/TypeScript setup. Duplicates build config. Slower than Vitest.                                      | `vitest`                                                                               |
| `vitest-axe`                                                     | Unmaintained (0.1.0, 3 years old). Do not add unmaintained packages to a hardening milestone.                                                                   | `@axe-core/playwright`                                                                 |
| `jest-axe`                                                       | Jest-specific, incompatible with Vitest.                                                                                                                        | `@axe-core/playwright`                                                                 |
| `next-seo`                                                       | Pages Router library. A no-op in App Router — adds a dependency with zero benefit.                                                                              | `generateMetadata()` from Next.js                                                      |
| `eslint-plugin-prettier`                                         | Runs Prettier as an ESLint rule — significantly slows ESLint (2-5× slower). The correct pattern is to run them separately.                                      | `eslint-config-prettier` (disables conflicts) + `prettier --write` in lint-staged      |
| `@sentry/react` (alone)                                          | The React-only SDK does not instrument Next.js Server Components, Lambda resolvers, or edge middleware.                                                         | `@sentry/nextjs` (covers all runtimes)                                                 |
| `cypress`                                                        | Parallel execution requires paid plan. No WebKit support.                                                                                                       | `@playwright/test`                                                                     |
| `aws-sdk` (v2)                                                   | Deprecated. Has a 50× larger bundle than the v3 modular SDK.                                                                                                    | `@aws-sdk/client-dynamodb` v3 (already installed)                                      |
| Any emoji picker library (`emoji-mart`, `emoji-mart-next`, etc.) | Adds 40-50 kB gzipped — violates the < 80 kB bundle budget. Not needed for a fixed 6-emoji palette.                                                             | Hardcoded 6-button JSX component                                                       |
| DynamoDB Map attribute for reactions                             | Cannot use atomic `ADD`/`DELETE` set operations on nested Map values. Forces non-atomic read-modify-write, creating race conditions under concurrent reactions. | 6 top-level String Set attributes, one per emoji                                       |
| A second AppSync subscription channel for reactions              | Doubles WebSocket connections per client session. No benefit when the single `onSessionUpdate` channel handles all session events via discriminated union.      | `QUESTION_REACTION_UPDATED` / `REPLY_REACTION_UPDATED` event types on existing channel |

---

## Version Compatibility

| Package                          | Compatible With                | Notes                                                                                                                                                                                      |
| -------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@testing-library/react@^16.3.2` | `react@19.2.3`                 | RTL ≥ 16.3.0 required for React 19. Earlier RTL versions have peer-dep conflicts.                                                                                                          |
| `vitest@^4.1.0`                  | `@vitejs/plugin-react@^4.x`    | Must use @vitejs/plugin-react (not @vitejs/plugin-react-swc) for jsdom compatibility.                                                                                                      |
| `@sentry/nextjs@^10.x`           | `next@16.1.6`                  | Sentry v10 requires Next.js ≥ 13.2. Next.js 16 is fully supported.                                                                                                                         |
| `eslint-config-next@16.1.6`      | `eslint@^9`                    | Already installed. ESLint 9 flat config is the default. Do not use `.eslintrc.json` — use `eslint.config.mjs`.                                                                             |
| `husky@^9.x`                     | `npm` workspaces               | husky v9 `prepare` script runs from the root; works with npm workspaces without extra config.                                                                                              |
| `lint-staged@^16.x`              | `husky@^9.x`                   | lint-staged v16 requires Node ≥ 18. Both are current and compatible.                                                                                                                       |
| `prettier@^3.8.x`                | `eslint-config-prettier@^9.x`  | Always pair together. eslint-config-prettier v9 supports Prettier 3.                                                                                                                       |
| `@aws-sdk/lib-dynamodb@3.1009.0` | DynamoDB String Set operations | `new Set([fingerprint])` in JS is serialized as `SS` type by DocumentClient — the same mechanism used for `voters` in upvote. Reactions use the identical pattern, no version bump needed. |
| `zod@4.3.6`                      | `z.enum(EMOJI_PALETTE)`        | `z.enum` on a `const` tuple works in Zod v4 identically to v3. No compatibility concern.                                                                                                   |

---

## Sources

- Codebase: `/packages/frontend/package.json` — verified installed versions (HIGH confidence)
- Codebase: `/packages/functions/package.json` — verified versions (HIGH confidence)
- Codebase: `/package.json` — root workspace dependencies (HIGH confidence)
- Codebase: `/infra/schema.graphql` — existing GraphQL schema, confirmed patterns (HIGH confidence)
- Codebase: `/packages/functions/src/resolvers/qa.ts` — existing upvote Set pattern (HIGH confidence)
- Codebase: `/packages/functions/src/resolvers/rate-limit.ts` — reusable rate limit + ban logic (HIGH confidence)
- Codebase: `/packages/core/src/types.ts` — existing type interfaces (HIGH confidence)
- Codebase: `/packages/frontend/src/hooks/use-session-state.ts` — existing reducer + optimistic UI pattern (HIGH confidence)
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
- AWS DynamoDB docs: ADD/DELETE UpdateExpression operations on String Sets — atomic, conditional, supports ConditionalCheckFailedException (HIGH confidence — same pattern already in production codebase)

---

_Stack research for: Nasqa Live — emoji reactions (v1.2)_
_Researched: 2026-03-15_

---

## Part 4: Participant & Host UX Refactor (v1.3 — Patterns, Not New Libraries)

**Scope:** Decompose monolithic session components, add ARIA semantics, implement CSS
micro-interactions, and improve real-time accessibility. This milestone adds **zero new npm
packages**. Every capability is already installed. The work is pattern application.

**Confidence:** HIGH — all ARIA specs verified against W3C APG and MDN (current 2026). CSS
patterns verified against Tailwind CSS v4 docs. React 19.2 patterns verified against official
React docs.

---

### Key Finding: Zero New Packages Required

| Needed Capability                       | Provided By                             | Already Installed     |
| --------------------------------------- | --------------------------------------- | --------------------- |
| ARIA tablist/tab/tabpanel semantics     | Native HTML attributes                  | n/a — pure markup     |
| `aria-live` for real-time announcements | Native HTML attribute                   | n/a — pure markup     |
| CSS micro-interactions (scale, color)   | Tailwind CSS v4 `active:` variant       | Yes — tailwindcss 4.x |
| Framer Motion `layout` transitions      | framer-motion 12.36.0                   | Yes                   |
| Custom hook extraction                  | React 19.2 `useReducer` / `useCallback` | Yes — react 19.2.3    |
| Identity chip component                 | `useIdentity` hook + Tailwind           | Yes — hook exists     |
| `useEffectEvent` for stable event refs  | React 19.2                              | Yes — react 19.2.3    |

**What NOT to add:** `@react-aria/live-announcer` — despite being a legitimate solution to React
`aria-live` lifecycle problems, it adds ~3 kB gzipped and its pattern (persistent DOM + message
service) can be replicated with 15 lines of vanilla React at zero cost to the bundle. See
**Pattern 3: aria-live** below for the exact implementation.

---

### Pattern 1: ARIA Tablist Semantics for SessionShell Mobile Tabs

**Problem:** The current `SessionShell` mobile tab bar uses plain `<button>` elements with
`onClick`. Screen readers announce them as buttons, not as a tab navigation control. Keyboard
navigation (Left/Right arrow keys) does not work. The active panel is not associated with its tab.

**W3C APG requirement (HIGH confidence — verified against https://www.w3.org/WAI/ARIA/apg/patterns/tabs/):**

| Element         | Required attributes                                     | Active tab                             | Inactive tabs                            |
| --------------- | ------------------------------------------------------- | -------------------------------------- | ---------------------------------------- |
| Container div   | `role="tablist"` + `aria-label`                         | —                                      | —                                        |
| Each tab button | `role="tab"` + `aria-controls` + `aria-selected` + `id` | `aria-selected="true"`, `tabindex="0"` | `aria-selected="false"`, `tabindex="-1"` |
| Each panel div  | `role="tabpanel"` + `aria-labelledby` + `id`            | rendered                               | hidden (or `hidden` attr)                |

**Keyboard model:** Left/Right Arrow keys move between tabs. Enter/Space activates.
Focus management: active tab has `tabindex="0"`; inactive tabs have `tabindex="-1"`.
Tab key moves focus INTO the active panel (not to the next tab).

**Implementation for SessionShell:**

```tsx
// session-shell.tsx — replace the plain <button> tab bar with:

const clipboardTabId = "tab-clipboard";
const qaTabId = "tab-qa";
const clipboardPanelId = "panel-clipboard";
const qaPanelId = "panel-qa";

function handleKeyDown(e: React.KeyboardEvent, current: Tab) {
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    e.preventDefault();
    const next = current === "clipboard" ? "qa" : "clipboard";
    handleTabChange(next);
    // Move focus to the newly activated tab
    document.getElementById(next === "clipboard" ? clipboardTabId : qaTabId)?.focus();
  }
}

// Tab bar markup:
<div role="tablist" aria-label={t("sessionTabs")} className="flex border-b border-border lg:hidden">
  <button
    id={clipboardTabId}
    role="tab"
    aria-selected={activeTab === "clipboard"}
    aria-controls={clipboardPanelId}
    tabIndex={activeTab === "clipboard" ? 0 : -1}
    onClick={() => handleTabChange("clipboard")}
    onKeyDown={(e) => handleKeyDown(e, "clipboard")}
    className={...}
  >
    <ClipboardList className="h-4 w-4" aria-hidden />
    {t("clipboard")}
    {clipboardBadge && (
      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
    )}
  </button>
  <button
    id={qaTabId}
    role="tab"
    aria-selected={activeTab === "qa"}
    aria-controls={qaPanelId}
    tabIndex={activeTab === "qa" ? 0 : -1}
    onClick={() => handleTabChange("qa")}
    onKeyDown={(e) => handleKeyDown(e, "qa")}
    className={...}
  >
    <MessageCircleQuestion className="h-4 w-4" aria-hidden />
    {t("qa")}
    {qaBadge && (
      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
    )}
  </button>
</div>

// Panel markup — mobile single panel:
<div className="flex h-full w-full lg:hidden">
  <div
    id={clipboardPanelId}
    role="tabpanel"
    aria-labelledby={clipboardTabId}
    tabIndex={0}
    hidden={activeTab !== "clipboard"}
    className="h-full w-full"
  >
    {clipboardSlot}
  </div>
  <div
    id={qaPanelId}
    role="tabpanel"
    aria-labelledby={qaTabId}
    tabIndex={0}
    hidden={activeTab !== "qa"}
    className="h-full w-full"
  >
    {qaSlot}
  </div>
</div>
```

**Why `hidden` attribute instead of conditional render:** The `hidden` attribute preserves the
panel's DOM node, which means AppSync subscription-driven state updates continue to land in the
reducer even when a panel is not visible. Conditional render would unmount the panel component and
lose its scroll position. `hidden` is also the pattern recommended by W3C APG for tabs that do not
load lazily.

**i18n:** Add `sessionTabs` key to all three locale files (`en.json`, `es.json`, `pt.json`).

---

### Pattern 2: CSS Micro-Interactions for Vote Buttons

**Problem:** The current upvote/downvote buttons in `QuestionCard` have `transition-colors` but no
scale feedback on press. Participants clicking a vote button get no immediate tactile confirmation
that their tap registered — critical on mobile where network latency hides the response.

**Tailwind v4 active-state scale pattern (HIGH confidence — verified against Tailwind CSS docs):**

```tsx
// QuestionCard.tsx — upvote button
<button
  onClick={handleUpvoteClick}
  aria-label={isVoted ? tSession("removeUpvote") : tSession("upvoteQuestion")}
  aria-pressed={isVoted}  // ← add: communicates toggle state to screen readers
  className={cn(
    "rounded-lg p-1.5 transition-all duration-150",
    // Scale feedback: press squishes to 90%, releases to 100%
    "active:scale-90",
    // Color: instant when activated (optimistic), smooth on deactivate
    isVoted
      ? "text-emerald-500 hover:text-emerald-400"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  )}
>
  <ChevronUp className="h-5 w-5" />
</button>

// Downvote button — same pattern with rose accent
<button
  onClick={handleDownvoteClick}
  aria-label={isDownvoted ? tSession("removeDownvote") : tSession("downvoteQuestion")}
  aria-pressed={isDownvoted}  // ← add
  className={cn(
    "mt-1 rounded-lg p-1.5 transition-all duration-150",
    "active:scale-90",
    isDownvoted
      ? "text-rose-500 hover:text-rose-400"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  )}
>
  <ThumbsDown className="h-4 w-4" />
</button>
```

**Why `active:scale-90` over `active:scale-95`:** The vote column is compact (icon-only buttons).
A 5% scale reduction (`scale-95`) is barely perceptible on a 20px icon. `scale-90` provides
clear visual feedback. The DESIGN_SYSTEM.md specifies `active:scale-[0.98]` for primary CTAs —
that conservative value applies to large pill buttons. Compact icon buttons benefit from a
slightly stronger scale signal.

**Why `transition-all duration-150` instead of `transition-colors`:** The vote count text next to
the button also changes color (emerald/rose vs. muted). A single `transition-all` covers both the
button's color change and the sibling span's color change via CSS cascade. `duration-150` is fast
enough to feel instant (optimistic UI) while still smoothing the transition.

**Mutual exclusion visual feedback:** When a user clicks upvote while downvoted (or vice versa),
the state machine in `handleUpvoteClick` already removes the opposing vote first. The visual
feedback is handled entirely by the `isVoted` / `isDownvoted` conditional classes above — no
additional animation state needed.

**`aria-pressed`:** Toggle buttons must communicate their pressed state to screen readers.
`aria-pressed={isVoted}` announces "upvote, toggle button, pressed" or "upvote, toggle button,
not pressed" to VoiceOver/NVDA. Without this, screen reader users have no way to know if their
upvote was applied.

---

### Pattern 3: `aria-live` for NewContentBanner

**Problem:** The current `NewContentBanner` appears/disappears from the DOM based on the `visible`
prop (`if (!visible) return null`). This conditional render pattern silently fails for screen
readers — assistive technologies never observe a text change event because the element is created
from scratch each time, not updated in place.

**Root cause (HIGH confidence — verified k9n.dev/blog/2025-11-aria-live, November 2025):**
Screen readers track `aria-live` regions by element identity in the DOM tree. When React
unmounts and remounts the element, the AT loses its reference and the announcement never fires.

**Correct pattern — persistent live region with content swap:**

```tsx
// new-content-banner.tsx — replace conditional render with persistent element

export function NewContentBanner({ message, visible, onTap }: NewContentBannerProps) {
  const t = useTranslations("session");

  // The aria-live region MUST remain mounted — screen readers track it by DOM identity.
  // We hide it visually and empty its content when not visible.
  // The live region announces when `message` changes while `visible` is true.
  return (
    <>
      {/* Always-mounted announcer: polite so it doesn't interrupt ongoing narration */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {visible ? message : ""}
      </div>

      {/* Visual banner — only rendered when visible (no AT implications) */}
      {visible && (
        <div
          role="button"
          tabIndex={0}
          onClick={onTap}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onTap();
          }}
          className="sticky top-0 z-10 cursor-pointer select-none bg-emerald-500 px-5 py-2.5 text-center text-sm font-semibold text-white shadow-md"
        >
          {message} · {t("tapToScroll")}
        </div>
      )}
    </>
  );
}
```

**Why `aria-live="polite"` not `"assertive"`:** A new question arriving is informational, not
urgent. `assertive` would interrupt any narration in progress (e.g. the user listening to an
existing question being read). `polite` waits for a pause, which is the right behavior. Use
`assertive` only for error states or time-critical alerts.

**Why `aria-atomic="true"`:** Without it, some screen readers announce only the changed portion of
the text (e.g., just the count changing from "1 new question" to "2 new questions" — announcing
"2"). `aria-atomic="true"` forces the whole announcement to be re-read.

**Why two elements instead of one:** The visual banner uses `position: sticky` and needs to be
inside the scroll container. The `aria-live` announcer does not need to be visible or interact with
layout — keeping them separate avoids CSS interference. The `sr-only` class (`position: absolute;
width: 1px; height: 1px; overflow: hidden; ...`) hides the announcer from sighted users while
keeping it in the accessibility tree.

**Important initialization rule:** The `aria-live` div is always mounted (not conditionally
rendered). This registers it with the AT before any content appears. Populating content after
mount guarantees the AT observes a text change event.

---

### Pattern 4: Custom Hook Extraction — `useSessionMutations`

**Problem:** `SessionLiveHostPage` is a 270-line God Orchestrator containing 9 async mutation
handlers. Each handler follows the same pattern: optimistic dispatch → server action → rollback on
failure. This logic belongs in a domain hook, not a render component.

**React 19.2 guidance (HIGH confidence — verified react.dev/learn/reusing-logic-with-custom-hooks):**
Extract non-reusable hooks to make the parent component easier to understand, even when the hook is
not shared across components.

**Extraction target — `useSessionMutations` hook:**

```typescript
// packages/frontend/src/hooks/use-session-mutations.ts
"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";

import type { SessionAction } from "./use-session-state";

interface UseSessionMutationsArgs {
  sessionSlug: string;
  hostSecretHash: string;
  fingerprint: string;
  authorName: string | undefined;
  dispatch: React.Dispatch<SessionAction>;
  state: { questions: Question[] };
  votedIds: Set<string>;
  downvotedIds: Set<string>;
  addVote: (id: string) => void;
  removeVote: (id: string) => void;
  addDownvote: (id: string) => void;
  removeDownvote: (id: string) => void;
}

export function useSessionMutations(args: UseSessionMutationsArgs) {
  const tCommon = useTranslations("common");

  const handleUpvote = useCallback(
    async (questionId: string, remove: boolean) => {
      // ... optimistic dispatch + action call + rollback
    },
    [args.dispatch, args.sessionSlug, args.fingerprint, args.votedIds, tCommon],
  );

  // ... other handlers

  return {
    handleUpvote,
    handleDownvote,
    handleAddQuestion,
    handleReply,
    handleFocusQuestion,
    handleDeleteSnippet,
    handleClearClipboard,
    handleBanQuestion,
    handleBanParticipant,
    handleRestoreQuestion,
  };
}
```

**Resulting SessionLiveHostPage (composition root, ~40 lines):**

```tsx
export function SessionLiveHostPage({ session, sessionSlug, rawSecret, ... }) {
  const { name: authorName } = useIdentity();
  const { fingerprint, votedIds, downvotedIds, addVote, removeVote, addDownvote, removeDownvote } =
    useFingerprint(sessionSlug);
  const { state, dispatch, sortedQuestions, bannedFingerprints } = useSessionState({ ... });
  const { connectionStatus, lastHostActivity } = useSessionUpdates(sessionSlug, dispatch);
  const [hostSecretHash, setHostSecretHash] = useState("");

  useEffect(() => { /* secret hashing */ }, [sessionSlug, rawSecret]);

  const mutations = useSessionMutations({
    sessionSlug, hostSecretHash, fingerprint, authorName,
    dispatch, state, votedIds, downvotedIds,
    addVote, removeVote, addDownvote, removeDownvote,
  });

  return (
    <SessionShell
      title={session.title}
      sessionSlug={sessionSlug}
      isHost
      hostToolbar={hostToolbar}
      snippetCount={state.snippets.length}
      questionCount={state.questions.length}
      liveIndicator={<LiveIndicator ... />}
      clipboardSlot={<ClipboardPanel isHost ... onDeleteSnippet={mutations.handleDeleteSnippet} ... />}
      qaSlot={<QAPanel isHost ... onUpvote={mutations.handleUpvote} ... />}
    />
  );
}
```

**Why `useCallback` on each handler:** The handlers are passed as props to `ClipboardPanel` and
`QAPanel`. Without memoization, every re-render of the host page (e.g., on real-time question
arrival) creates new function references, forcing both panels to re-render even if their data
hasn't changed. `useCallback` stabilizes references so React's prop comparison works correctly.

**React Compiler note:** The React Compiler (available as opt-in Babel plugin in React 19) would
eliminate the need for manual `useCallback`. This project does not currently use the compiler.
If it is adopted in a future milestone, `useCallback` wrappers can be removed then — they are
not harmful to leave in place.

---

### Pattern 5: `useMemo` for `repliesByQuestion` in QAPanel

**Problem:** `QAPanel` currently rebuilds the `repliesByQuestion` Map on every render in the
component body (not memoized). With 50-500 questions and replies, this is O(n) work on every
keystroke in the QA input, every vote arriving via WebSocket, and every sort debounce tick.

**Fix:**

```typescript
// qa-panel.tsx — replace the imperative Map construction with useMemo
const repliesByQuestion = useMemo(() => {
  const map = new Map<string, Reply[]>();
  for (const reply of replies) {
    const existing = map.get(reply.questionId) ?? [];
    existing.push(reply);
    map.set(reply.questionId, existing);
  }
  return map;
}, [replies]); // Only rebuild when replies array reference changes (after reducer dispatch)
```

**Why this works:** `useSessionState` returns `state.replies` which only gets a new array
reference when the reducer processes a `REPLY_ADDED` action. Between reply events, `replies` is
the same array reference — `useMemo` returns the cached Map.

**Do not move this to `useSessionState`:** The hook returns raw arrays. Returning a Map from the
hook would couple state management to a specific rendering concern (grouping). The consumer
(QAPanel) owns the grouping concern.

---

### Pattern 6: Identity Chip in QAInput

**Problem:** The QA input area has no visible indication of who is posting. Participants need to
see their current identity before submitting a question, and tap to edit it in place rather than
hunting for the User icon in the header.

**Component pattern — inline identity chip with click-to-edit:**

```tsx
// qa-input.tsx — add above or below the textarea

import { useFingerprint } from "@/hooks/use-fingerprint";
import { useIdentity } from "@/hooks/use-identity";

import { PixelAvatar } from "./pixel-avatar";

// Inside QAInput component:
const { name } = useIdentity();
const { fingerprint } = useFingerprint(sessionSlug);

// Identity chip — clicking opens the IdentityEditor popover
<button
  type="button"
  onClick={openIdentityEditor} // triggers IdentityEditor popover (existing component)
  aria-label={t("editIdentity")}
  className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-accent transition-colors"
>
  <PixelAvatar seed={fingerprint} size={20} className="rounded-full shrink-0" />
  <span className="truncate max-w-[8rem]">{name ? formatDisplayName(name) : t("anonymous")}</span>
  <PencilLine className="h-3 w-3 shrink-0 opacity-50" />
</button>;
```

**Wiring the chip to IdentityEditor:** `IdentityEditor` is currently a self-contained
`Popover.Root` triggered by an internal button. To allow external trigger, extract the `open` state
up to the parent (`QAInput` or a shared state) and pass it as a prop, or use a `ref` on the
`Popover.Trigger`. The simplest approach: lift `open` / `setOpen` to a new `useIdentityPopover`
hook that both the header icon and the inline chip share via context or prop drilling.

**Alternatively (simpler):** Duplicate the popover — one in the header, one inline. The identity
state persists in localStorage regardless of which popover saves it. Two independent popover
instances are simpler than shared state coordination for this use case.

---

### Pattern 7: `formatRelativeTime` Shared Utility

**Problem:** The `formatRelativeTime` function is currently defined inline in `question-card.tsx`
and duplicated in at least two other files. This is the kind of utility that drifts: one copy gets
the "just now" threshold changed, another doesn't.

**Fix — extract to `packages/frontend/src/lib/format-time.ts`:**

```typescript
// packages/frontend/src/lib/format-time.ts

type TFunction = (key: string, values?: Record<string, number>) => string;

/** Formats a Unix timestamp (seconds) as a relative time string using i18n keys. */
export function formatRelativeTime(createdAt: number, t: TFunction): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - createdAt;
  if (diff < 60) return t("timeJustNow");
  if (diff < 3600) return t("timeMinutesAgo", { count: Math.floor(diff / 60) });
  if (diff < 86400) return t("timeHoursAgo", { count: Math.floor(diff / 3600) });
  return t("timeDaysAgo", { count: Math.floor(diff / 86400) });
}
```

The `TFunction` type matches `useTranslations()` return type — pass `tSession` directly, no
adaptation needed. All three callers already have `tSession` in scope.

---

### Pattern 8: QuestionCard State Variants

**Problem:** `QuestionCard` uses three early-return branches (banned, hidden, normal) in a single
file. The "banned" tombstone is 4 lines; the "hidden" collapsed view is 15 lines; the normal view
is 200+ lines. The early returns make the render logic hard to follow and make it impossible to
test each variant in isolation.

**Decomposition target:**

```
question-card.tsx                 — router: selects variant based on question state
question-card-banned.tsx          — tombstone view
question-card-hidden.tsx          — collapsed community-hidden view + expand button
question-card-normal.tsx          — full question card (the existing main render)
```

**Router pattern:**

```tsx
// question-card.tsx (becomes a thin dispatcher)
export function QuestionCard(props: QuestionCardProps) {
  if (props.question.isBanned) return <QuestionCardBanned />;
  if (props.question.isHidden && !props.showHiddenContent) {
    return <QuestionCardHidden {...props} />;
  }
  return <QuestionCardNormal {...props} />;
}
```

**Why this matters for testing:** Each variant can now be imported and tested independently with
RTL. Testing `QuestionCardBanned` is a one-liner assertion. Testing the full `QuestionCard` and
ensuring the right variant renders is the integration test.

**`showHiddenContent` state:** Currently this state lives inside `QuestionCard`. After decomposing,
it can remain in `QuestionCardNormal` (which handles the expand logic) since the hidden→normal
transition is driven by the "show" button inside `QuestionCardHidden`. Pass a callback
`onShowHidden` from the router if the normal variant needs to know.

---

### Pattern 9: `useEffectEvent` for Stable Subscription Callbacks (React 19.2)

**Problem:** `useSessionUpdates` attaches an AppSync subscription with a `dispatch` callback.
If `dispatch` were to change identity (it does not with `useReducer`, but pattern is worth noting),
the subscription would tear down and re-establish on every render.

**React 19.2 introduces `useEffectEvent`** (released 2025-10-01 per React blog) — a hook for
extracting "event-like" logic from Effects that should always see fresh values without causing
re-runs:

```typescript
// use-session-updates.ts — if dispatch callback stability ever becomes a concern
import { useEffectEvent } from "react"; // React 19.2+

export function useSessionUpdates(sessionSlug: string, dispatch: React.Dispatch<SessionAction>) {
  const onEvent = useEffectEvent((update: SessionUpdate) => {
    // dispatch always sees the latest version of itself,
    // but this function is NOT a dependency of the useEffect below
    handleSessionUpdate(update, dispatch);
  });

  useEffect(() => {
    const subscription = subscribeToSession(sessionSlug, onEvent);
    return () => subscription.unsubscribe();
  }, [sessionSlug]); // onEvent is intentionally excluded — useEffectEvent handles this
}
```

**Current status:** `useEffectEvent` requires `eslint-plugin-react-hooks@latest` (v6+ per React
19.2 release notes) to properly lint the dependency array exclusion. Do not add `onEvent` to the
dependency array — the hook is specifically designed to be excluded. The existing
`eslint-disable-next-line react-hooks/exhaustive-deps` comment approach is the pre-19.2 workaround
for the same pattern.

**Applicability to this milestone:** `useReducer`'s `dispatch` is already stable (same reference
across renders). `useEffectEvent` is not urgently needed for the subscription hook as currently
written. Apply it when a genuinely unstable callback needs to be used in an Effect.

---

### Framer Motion Integration Notes

The existing `AnimatePresence` + `motion.div` usage in `QAPanel` for question card enter/exit
animations is correct and should be preserved. Two clarifications for the v1.3 work:

**1. Do not add `layout` to the `motion.div` wrapping individual `QuestionCard` variants.**
The `layout` prop triggers layout animations on every re-render of the list, including vote count
updates. With 50-500 cards, this creates noisy micro-animations on every upvote. Reserve `layout`
for the container-level `AnimatePresence` where it's already correctly used.

**2. The focused-question pulsing glow is a CSS animation, not Framer Motion.**
The current `shadow-[0_0_12px_rgba(16,185,129,0.15)]` on focused cards is static. If a pulsing
animation is desired, use `animate-pulse` from Tailwind (already available via `tw-animate-css`)
on the ring element — do not add a Framer Motion `animate` prop to the card for this, as it
creates JavaScript-driven layout work on every pulse tick.

**3. `AnimatePresence initial={false}` is already correct.**
The `initial={false}` prop prevents enter animations when the component first mounts with
pre-loaded questions. Removing it would cause all initial questions to animate in simultaneously —
visually noisy and potentially triggering scroll position issues.

---

### What NOT to Add

| Avoid                                       | Why                                                                                                                                                                                      | Use Instead                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `@react-aria/live-announcer`                | ~3 kB gzipped for functionality achievable with 15 lines of vanilla React. Bundle budget is tight at < 80 kB.                                                                            | Persistent `aria-live` div pattern (Pattern 3)                      |
| `react-aria-live`                           | Unmaintained (last commit 2019). Ships a React class component wrapper.                                                                                                                  | Persistent `aria-live` div pattern (Pattern 3)                      |
| `@radix-ui/react-tabs`                      | Already have `@base-ui/react` which provides equivalent accessible primitives. Adding Radix creates a duplicate headless UI dependency.                                                  | Native ARIA attributes on `<button>` + `<div>` elements (Pattern 1) |
| React Compiler (Babel plugin)               | Not yet adopted in this project. Removing `useCallback` / `useMemo` manually before the compiler is enabled would regress performance. Wait for a dedicated compiler-adoption milestone. | Keep manual `useCallback` / `useMemo` for now                       |
| `framer-motion` `layout` on QuestionCard    | Per-card layout animation fires on every vote update. With 50-500 cards this becomes expensive.                                                                                          | Limit `layout` to the `AnimatePresence` container only              |
| `aria-live="assertive"` on NewContentBanner | Assertive mode interrupts any ongoing screen reader narration. New questions arriving are informational, not urgent.                                                                     | `aria-live="polite"` (Pattern 3)                                    |

---

## Installation (v1.3 UX Refactor)

```bash
# No new packages to install.
# All work is:
#   1. session-shell.tsx         — ARIA tablist semantics (Pattern 1)
#   2. question-card.tsx         — active:scale-90, aria-pressed (Pattern 2)
#   3. new-content-banner.tsx    — persistent aria-live region (Pattern 3)
#   4. use-session-mutations.ts  — new hook, extraction from SessionLiveHostPage (Pattern 4)
#   5. qa-panel.tsx              — useMemo for repliesByQuestion (Pattern 5)
#   6. qa-input.tsx              — identity chip (Pattern 6)
#   7. lib/format-time.ts        — shared formatRelativeTime utility (Pattern 7)
#   8. question-card-*.tsx       — variant decomposition files (Pattern 8)
#   9. messages/*.json           — add sessionTabs i18n key
```

---

## Alternatives Considered (v1.3)

| Category                    | Recommended                         | Alternative                          | Why Not                                                                                                                                                                                                                                                                |
| --------------------------- | ----------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA live announcer         | Persistent `aria-live` div (inline) | `@react-aria/live-announcer`         | Adds ~3 kB gzipped for 15 lines of code. Unnecessary for this bundle budget.                                                                                                                                                                                           |
| Tab semantics               | Native ARIA attributes              | `@radix-ui/react-tabs`               | Radix is already replaced by `@base-ui/react` in this project. Two headless UI libraries creates version drift and larger bundle.                                                                                                                                      |
| Tab semantics               | Native ARIA attributes              | `@base-ui/react/tabs` (if it exists) | `@base-ui/react` 1.3.0 may include a Tabs component, but the custom state management (badge counts, scroll tracking) makes the uncontrolled primitive harder to integrate than plain ARIA attributes. Verify if adopted.                                               |
| Vote animation              | `active:scale-90` (CSS)             | Framer Motion `whileTap`             | Framer Motion's `whileTap` creates a motion value subscription per button. With 50-500 `QuestionCard` instances each having 2 buttons, this is 100-1000 motion value listeners. Tailwind CSS `active:scale` uses native CSS `:active` pseudo-class — zero JS overhead. |
| God component decomposition | `useSessionMutations` hook          | Moving to a context/provider         | Context adds indirection and re-renders all consumers when any mutation state changes. The hook's return value (stable callbacks) does not need to be in context — it is only consumed by `SessionLiveHostPage`.                                                       |

---

## Version Compatibility (v1.3 Additions)

| Feature                                 | React Version      | Notes                                                                                   |
| --------------------------------------- | ------------------ | --------------------------------------------------------------------------------------- |
| `useEffectEvent`                        | 19.2+              | Available in react@19.2.3 (already installed). Requires `eslint-plugin-react-hooks@6+`. |
| `aria-live` persistent div pattern      | All React versions | No React-specific API. Pure DOM.                                                        |
| `active:scale-90`                       | Tailwind 4.x       | Already installed. The `active:` variant and `scale-*` utilities are built-in.          |
| `aria-selected` + `tabindex` management | All React versions | Standard HTML attributes. No library needed.                                            |
| `useMemo` for Map construction          | All React versions | Standard hook.                                                                          |

---

## Sources (v1.3 Additions)

- W3C APG Tabs Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ — ARIA roles, keyboard model, required attributes (HIGH confidence)
- MDN aria-live: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-live — `polite` vs `assertive` guidance (HIGH confidence)
- k9n.dev aria-live in React (Nov 2025): https://k9n.dev/blog/2025-11-aria-live/ — React conditional render pitfall for aria-live, persistent DOM pattern (HIGH confidence — recently published, matches MDN spec)
- React docs: https://react.dev/learn/reusing-logic-with-custom-hooks — hook extraction rationale (HIGH confidence)
- React 19.2 blog: https://react.dev/blog/2025/10/01/react-19-2 — `useEffectEvent` API, `eslint-plugin-react-hooks` v6 requirement (HIGH confidence)
- reacttraining.com 2025: https://reacttraining.com/blog/hooks-you-probably-dont-need-2025 — useCallback/useMemo guidance without React Compiler (HIGH confidence)
- Tailwind CSS docs: https://tailwindcss.com/docs/scale — `scale-*` utilities and `active:` variant (HIGH confidence)
- Tailwind CSS docs: https://tailwindcss.com/docs/transition-property — `transition-all`, `duration-*` utilities (HIGH confidence)
- Codebase: `packages/frontend/src/components/session/session-shell.tsx` — current tab implementation, confirmed patterns (HIGH confidence)
- Codebase: `packages/frontend/src/components/session/question-card.tsx` — current vote button implementation (HIGH confidence)
- Codebase: `packages/frontend/src/components/session/new-content-banner.tsx` — current conditional render (HIGH confidence)
- Codebase: `packages/frontend/src/components/session/session-live-host-page.tsx` — 270-line God Orchestrator confirmed (HIGH confidence)
- Codebase: `packages/frontend/DESIGN_SYSTEM.md` — `active:scale-[0.98]` for primary CTAs, motion philosophy (HIGH confidence)

---

_Stack research for: Nasqa Live — participant & host UX refactor (v1.3)_
_Researched: 2026-03-16_

---

---

## Part 5: v2.0 Performance & Instant Operations Additions

**Researched:** 2026-03-17
**Confidence:** HIGH (all four areas verified against official docs and installed package dist)

### Context

This section covers only the new capabilities needed for v2.0. The following are validated and must NOT be re-researched:

- Next.js 16.1.6, React 19.2.3
- aws-amplify 6.16.3 + @aws-amplify/api-graphql 4.8.5
- shiki 4.0.2 (already installed — all fine-grained APIs confirmed in local `node_modules`)
- SST Ion (sst.aws.Function)
- DynamoDB via @aws-sdk/lib-dynamodb, AppSync via API key auth
- @tanstack/react-query 5.90.21

**No new npm packages are required for any of the four v2.0 features.** All capabilities are in existing installed dependencies.

---

### Feature 1: Client-Side AppSync Mutations

**Goal:** Replace Server Action round-trips for mutations with direct `client.graphql()` calls from client components. Eliminates one full network hop (client → Netlify/Next.js → AppSync → Lambda).

**What exists and what to use:**

`appsync-client.ts` already exports `appsyncClient = generateClient()` from `aws-amplify/api`, configured with the API key. The `client.graphql()` method accepts `{ query, variables }` and works for mutations.

| API                                    | Import              | Notes                                                        |
| -------------------------------------- | ------------------- | ------------------------------------------------------------ |
| `generateClient()`                     | `aws-amplify/api`   | Already configured in `appsync-client.ts` — no change needed |
| `client.graphql({ query, variables })` | via `appsyncClient` | Returns `{ data, errors }` — check `result.errors?.length`   |

**Pattern (in client component hooks):**

```typescript
import { appsyncClient } from "@/lib/appsync-client";
import { PUSH_SNIPPET } from "@/lib/graphql/mutations";

const result = await appsyncClient.graphql({
  query: PUSH_SNIPPET,
  variables: { sessionSlug, hostSecretHash, content, type, language },
});
if (result.errors?.length) {
  throw new Error(result.errors.map((e) => e.message).join("; "));
}
```

**Migration constraint:** Validation currently in Server Actions (`getTranslations("actionErrors")` calls) must move to client-side. Use `useTranslations()` instead of `getTranslations()` since these run in `'use client'` components.

`appsync-server.ts` (plain fetch) stays for any remaining server-side mutations that legitimately need server execution (e.g., session creation which touches `random-word-slugs` and requires server-only environment).

---

### Feature 2: Client-Side Shiki Highlighting

**Goal:** Replace `renderHighlight` Server Action round-trip in `HostInput` with in-browser highlighting using `createHighlighterCore` + `createJavaScriptRegexEngine`. `ShikiBlock` (SSR Server Component rendering pushed snippets) stays unchanged.

**No new packages.** Shiki 4.0.2 ships all required entry points.

| Entry Point                   | Import Path                    | Bundle cost                                         |
| ----------------------------- | ------------------------------ | --------------------------------------------------- |
| `createHighlighterCore`       | `shiki/core`                   | Core only — no bundled langs/themes                 |
| `createJavaScriptRegexEngine` | `shiki/engine/javascript`      | ~4.5 KB total (confirmed via local dist inspection) |
| Language grammars             | `shiki/langs/{name}`           | Lazy dynamic import per language                    |
| `github-light` theme          | `@shikijs/themes/github-light` | Loaded once at init                                 |
| `github-dark` theme           | `@shikijs/themes/github-dark`  | Loaded once at init                                 |

**Engine choice — `createJavaScriptRegexEngine` not `createOnigurumaEngine`:**

| Engine                        | Bundle cost                          | Limitation                                                |
| ----------------------------- | ------------------------------------ | --------------------------------------------------------- |
| `createOnigurumaEngine`       | ~622 KB (WASM inlined in `wasm.mjs`) | None — full Oniguruma                                     |
| `createJavaScriptRegexEngine` | ~4.5 KB                              | Requires RegExp `v` flag (all modern browsers since 2023) |

The JS engine is correct for this use case. The project's `SUPPORTED_LANGUAGES` list (TypeScript, JavaScript, Python, etc.) all work with the JS engine. The RegExp `v` flag requirement is satisfied by Chrome 112+ / Firefox 116+ / Safari 17+ — all browsers from 2023. Bundle budget is already exceeded by `aws-amplify`; adding 622 KB for WASM is not acceptable.

**Singleton pattern (new file: `lib/client-highlighter.ts`):**

```typescript
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

let _promise: ReturnType<typeof createHighlighterCore> | null = null;
const _loadedLangs = new Set<string>();

export function getClientHighlighter() {
  if (!_promise) {
    _promise = createHighlighterCore({
      themes: [import("@shikijs/themes/github-light"), import("@shikijs/themes/github-dark")],
      langs: [],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return _promise;
}

export async function ensureLang(lang: string) {
  const h = await getClientHighlighter();
  if (!_loadedLangs.has(lang)) {
    try {
      await h.loadLanguage((await import(`shiki/langs/${lang}`)).default);
      _loadedLangs.add(lang);
    } catch {
      // Unsupported language — caller falls back to plain text
    }
  }
  return h;
}
```

This replaces the `renderHighlight` Server Action call in `HostInput`. The debounce ref pattern already in `HostInput` is reused — only the call site changes from `await renderHighlight(code, lang)` to `await ensureLang(lang).then(h => h.codeToHtml(code, { lang, themes: { light: "github-light", dark: "github-dark" } }))`.

---

### Feature 3: Lambda Memory and Cold-Start Optimization

**Goal:** Reduce cold-start duration and invocation cost by tuning `ResolverFn` in `sst.config.ts`.

**No new packages.** SST Ion's `sst.aws.Function` accepts `memory` and `architecture` natively.

| Property       | SST type              | Current (implicit)        | Recommended | Rationale                                                                                                                                                          |
| -------------- | --------------------- | ------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `memory`       | `"${number} MB"`      | `"1024 MB"` (SST default) | `"512 MB"`  | Lambda CPU scales with memory; 512 MB is sufficient for DynamoDB-bound Node.js resolvers. Halves memory cost. Raise to `"1024 MB"` if P99 > 100ms after measuring. |
| `architecture` | `"x86_64" \| "arm64"` | `"x86_64"`                | `"arm64"`   | Graviton2: ~20% cheaper per-invocation, equal/better performance for Node.js. Single property change.                                                              |
| `timeout`      | `"${number} seconds"` | `"20 seconds"`            | Keep as-is  | Already generous. Do not reduce — leave headroom for DDB cold reads.                                                                                               |

**Diff to `sst.config.ts`:**

```typescript
const resolverFn = new sst.aws.Function("ResolverFn", {
  handler: "packages/functions/src/resolvers/index.handler",
  memory: "512 MB", // explicitly set (was implicit 1024 MB)
  architecture: "arm64", // was implicit x86_64
  environment: {
    TABLE_NAME: table.name,
    AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
  },
  link: [table],
});
```

**Other cold-start mitigations already in place:**

- esbuild tree-shaking via SST (reduces zip size automatically)
- `AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1"` (reuses DynamoDB SDK TCP connections)
- Pino initialized at module level (avoids re-init on warm starts — v1.1)

**Do not add:** Lambda SnapStart (Java/Python only as of 2026), Lambda Powertools (~40 KB bundle, unnecessary with Pino).

---

### Feature 4: SSR Fetch Deduplication with React `cache()`

**Goal:** Eliminate duplicate DynamoDB calls caused by `generateMetadata` and `SessionPage` both calling `getSession(slug)` and `getSessionData(slug)` in the same render pass.

**No new packages.** `cache` is part of React 19 (already installed).

**The problem in `session/[slug]/page.tsx`:**

```
generateMetadata → getSession(slug)    ← DynamoDB GetItem
generateMetadata → getSessionData(slug) ← DynamoDB Query
SessionPage      → getSession(slug)    ← DynamoDB GetItem (duplicate)
SessionPage      → getSessionData(slug) ← DynamoDB Query (duplicate)
```

Four DynamoDB calls per page load; should be two.

| API                   | Import       | Scope                                          | Use for session data?                              |
| --------------------- | ------------ | ---------------------------------------------- | -------------------------------------------------- |
| `cache()`             | `react`      | Request-scoped (per render pass)               | YES — request-scoped is correct for real-time data |
| `unstable_cache()`    | `next/cache` | Cross-request (persists across users/requests) | NO — would serve stale data to participants        |
| `use cache` directive | Next.js 15+  | Cross-request                                  | NO — same problem as `unstable_cache`              |

**Pattern (minimal change to `lib/session.ts`):**

```typescript
import { cache } from "react";

// Wrap both exports — implementation bodies are unchanged
export const getSession = cache(async (slug: string): Promise<Session | null> => {
  // ... existing implementation ...
});

export const getSessionData = cache(async (slug: string): Promise<SessionData> => {
  // ... existing implementation ...
});
```

After this change, both `generateMetadata` and `SessionPage` call `getSession(slug)` but DynamoDB is only hit once. The `cache()` wrapper is transparent to call sites — no changes to `page.tsx`.

---

### No New Packages Required

```bash
# All four v2.0 features use existing installed packages.
# No npm installs needed.
#
# Capabilities used:
#   aws-amplify 6.16.3          → client.graphql() mutations
#   shiki 4.0.2                 → shiki/core + shiki/engine/javascript
#   react 19.2.3                → cache() for SSR deduplication
#   SST Ion (sst.config.ts)     → memory + architecture properties
```

---

### What NOT to Use (v2.0)

| Avoid                                           | Why                                                                        | Use Instead                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `shiki/wasm` (base64 inlined)                   | `wasm.mjs` is 622 KB — adds ~400 KB to client bundle                       | `shiki/engine/javascript` — ~4.5 KB                                |
| `shiki/bundle/full` or `shiki/bundle/web`       | Eager-loads all grammars (3.8–6.4 MB minified)                             | `createHighlighterCore` with dynamic per-language imports          |
| `unstable_cache` / `use cache` for session data | Cross-request cache serves stale data to live participants                 | `react cache()` — request-scoped only                              |
| Server Action path for `renderHighlight`        | Full network round-trip (client → server → client) for every debounce tick | `createHighlighterCore` + `createJavaScriptRegexEngine` in browser |
| `generateServerClientUsingCookies`              | For Cognito/cookie auth; this project uses API key auth                    | `generateClient()` already in `appsync-client.ts`                  |
| Lambda SnapStart                                | Java/Python only — not available for Node.js as of 2026                    | `arm64` architecture + memory tuning                               |

---

### Version Compatibility (v2.0 Additions)

| Package                       | Version     | API Used                                       | Compatibility Notes                                                                                                              |
| ----------------------------- | ----------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| shiki                         | 4.0.2       | `shiki/core`, `shiki/engine/javascript`        | Confirmed in local `node_modules/shiki/dist/` exports. `createHighlighterCore` + `createJavaScriptRegexEngine` are stable in v4. |
| react                         | 19.2.3      | `cache()`                                      | `cache` is stable in React 19. Request-scoped deduplication.                                                                     |
| aws-amplify                   | 6.16.3      | `generateClient()`, `client.graphql()`         | Gen 1 API. `appsync-client.ts` already configures this.                                                                          |
| `createJavaScriptRegexEngine` | shiki 4.0.2 | Requires RegExp `v` flag                       | Supported: Chrome 112+ (Apr 2023), Firefox 116+ (Aug 2023), Safari 17+ (Sep 2023).                                               |
| SST Ion                       | current     | `memory`, `architecture` on `sst.aws.Function` | Property names verified in SST docs.                                                                                             |

---

### Sources (v2.0 Additions)

- [SST Function component docs](https://sst.dev/docs/component/aws/function/) — `memory`, `architecture`, `timeout` property names and types — HIGH confidence
- [Next.js 16.1.7 fetching data docs](https://nextjs.org/docs/app/getting-started/fetching-data) — `react cache()` for ORM/DynamoDB deduplication — HIGH confidence (docs version 16.1.7 confirmed in page metadata)
- [Next.js 16.1.7 caching docs](https://nextjs.org/docs/app/getting-started/caching-and-revalidating) — `unstable_cache` vs `use cache` distinction — HIGH confidence
- [Shiki regex engines docs](https://shiki.style/guide/regex-engines) — JS vs Oniguruma engine, RegExp `v` flag requirement — HIGH confidence
- [Shiki bundles docs](https://shiki.style/guide/bundles) — bundle sizes, fine-grained API overview — HIGH confidence
- [Amplify mutate-data docs](https://docs.amplify.aws/gen1/javascript/build-a-backend/graphqlapi/mutate-data/) — `client.graphql()` mutation pattern with custom query strings — HIGH confidence
- Local package inspection — `node_modules/shiki/dist/` (onig.wasm: 466 KB, wasm.mjs: 622 KB inlined, engine-javascript dist total: ~4.5 KB), `node_modules/shiki/package.json` exports map — HIGH confidence (source of truth)
- [Shiki v3 blog](https://shiki.style/blog/v3) — `engine` field replacing `loadWasm` in v3; still current in v4 — HIGH confidence

---

_Stack research for: Nasqa Live — v2.0 Performance & Instant Operations_
_Researched: 2026-03-17_

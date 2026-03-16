# Phase 6: Testing and CI - Research

**Researched:** 2026-03-15
**Domain:** Vitest monorepo testing, React Testing Library, AWS SDK mocking, GitHub Actions CI
**Confidence:** HIGH

## Summary

This phase adds a Vitest test suite covering core Zod schemas, Lambda resolvers, and key UI components, then wires everything into a GitHub Actions pipeline that gates PR merges on passing lint, typecheck, tests, and a bundle-size budget check.

The project is an npm workspace monorepo with three testable packages: `@nasqa/core` (Zod schemas, TypeScript types), `@nasqa/functions` (Lambda resolvers using AWS SDK v3 DynamoDB), and `packages/frontend` (Next.js 16 App Router + React 19 components). No test infrastructure exists today — zero test files, no vitest.config, no `.github` directory. Everything must be built from scratch.

The standard stack is well-established: Vitest (currently 3.x with stable `projects` API), `@testing-library/react`, `aws-sdk-client-mock` for DynamoDB mocking, and GitHub Actions' built-in `actions/setup-node` with `cache: 'npm'` for fast pipeline runs. The primary non-obvious complexity is the monorepo Vitest `projects` configuration, the `next-intl` provider requirement for UI component tests, and the Lambda resolver design — `docClient` is a module-level singleton exported from `resolvers/index.ts`, which requires vi.mock at the module level rather than dependency injection.

**Primary recommendation:** Use a single root `vitest.config.ts` with `test.projects` inline definitions — one for `core` (node environment), one for `functions` (node environment, mocks AWS SDK), one for `frontend` (jsdom, React plugin, next-intl inline). This avoids per-package vitest configs while keeping environment isolation.

<phase_requirements>

## Phase Requirements

| ID      | Description                                                           | Research Support                                                                                                                                                     |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TEST-01 | Vitest configured as test runner with workspace-aware monorepo setup  | Root `vitest.config.ts` with `test.projects` array; three inline project definitions with different environments                                                     |
| TEST-02 | Unit tests for core Zod schemas (validation, edge cases)              | Pure TypeScript tests in node environment; no framework deps needed; schemas in `packages/core/src/schemas.ts`                                                       |
| TEST-03 | Unit tests for Lambda resolvers (mocked DynamoDB/AppSync)             | `aws-sdk-client-mock` + `mockClient(DynamoDBDocumentClient)`; `vi.mock` for the `docClient` singleton exported from `resolvers/index.ts`                             |
| TEST-04 | Component tests with React Testing Library for key UI components      | `@testing-library/react`, jsdom env, `NextIntlClientProvider` wrapper with real `messages/en.json`                                                                   |
| TEST-05 | Bundle size regression guard fails CI if JS exceeds budget            | Next.js `.next/analyze/` output from `@next/bundle-analyzer` or `size-limit` with `@size-limit/file`; CI job reads build stats and asserts gzipped initial JS ≤ 80kB |
| CICD-01 | GitHub Actions pipeline runs lint, typecheck, test, build on every PR | `.github/workflows/ci.yml` with `on: pull_request`; parallel jobs for lint, typecheck, test; branch protection required status checks                                |
| CICD-02 | Pipeline caches node_modules and .next for fast runs                  | `actions/setup-node` with `cache: 'npm'`; separate `actions/cache` step for `.next/cache` keyed on `hashFiles('packages/frontend/**')`                               |

</phase_requirements>

## Standard Stack

### Core

| Library                     | Version | Purpose                                                 | Why Standard                                                          |
| --------------------------- | ------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| vitest                      | ^3.x    | Test runner                                             | ESM-native, fastest TS monorepo runner; replaces Jest on ESM projects |
| @vitejs/plugin-react        | ^4.x    | JSX transform for vitest component tests                | Required by Next.js official Vitest guide                             |
| @testing-library/react      | ^16.x   | Component render + query                                | Idiomatic React UI testing; works with React 19                       |
| @testing-library/dom        | ^10.x   | DOM query helpers (peer dep)                            | Required by @testing-library/react                                    |
| @testing-library/user-event | ^14.x   | Realistic user interaction simulation                   | Preferred over fireEvent for interaction tests                        |
| jsdom                       | ^26.x   | Browser DOM simulation in Node                          | Standard vitest environment for React components                      |
| vite-tsconfig-paths         | ^5.x    | Resolves TypeScript path aliases (@/\* and @nasqa/core) | Required for path aliases to work in vitest; Next.js uses them        |
| aws-sdk-client-mock         | ^4.x    | Mock AWS SDK v3 clients in unit tests                   | Official AWS-recommended mocking strategy; supports Vitest matchers   |
| aws-sdk-client-mock-vitest  | ^4.x    | Vitest-specific matchers for aws-sdk-client-mock        | Enables `expect(mock).toHaveReceivedCommand()` in Vitest              |

### Supporting

| Library               | Version | Purpose                                          | When to Use                                                           |
| --------------------- | ------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| @next/bundle-analyzer | ^16.x   | Generates bundle size reports from Next.js build | TEST-05: produces the stats JSON that CI reads                        |
| size-limit            | ^11.x   | Assert file sizes against a budget (alternative) | Alternative to parsing bundle-analyzer output; simpler CI integration |
| @vitest/coverage-v8   | ^3.x    | Code coverage via V8                             | Optional for coverage reporting; not required for this phase          |

### Alternatives Considered

| Instead of                    | Could Use                               | Tradeoff                                                                                                                                    |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| vitest `test.projects` inline | per-package `vitest.config.ts`          | Per-package configs require running `vitest` in each package dir; root projects config runs everything from root with `pnpm test`           |
| aws-sdk-client-mock           | aws-sdk-vitest-mock                     | aws-sdk-client-mock is older, more widely used; aws-sdk-vitest-mock is TypeScript-first with zero deps but less ecosystem adoption          |
| @next/bundle-analyzer         | hashicorp/nextjs-bundle-analysis action | The hashicorp action adds PR comments but requires a separate `comment` step; for a simple budget assertion the analyzer JSON is sufficient |
| size-limit                    | custom script parsing .next stats       | size-limit has a stable CLI and known format; custom scripts are fragile across Next.js versions                                            |

**Installation (root workspace):**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/user-event vite-tsconfig-paths aws-sdk-client-mock aws-sdk-client-mock-vitest @next/bundle-analyzer
```

## Architecture Patterns

### Recommended Project Structure

```
# New files to create:
vitest.config.ts                          # root — defines all three projects
packages/
├── core/
│   └── src/__tests__/
│       └── schemas.test.ts               # TEST-02
├── functions/
│   └── src/__tests__/
│       ├── qa.test.ts                    # TEST-03 (addQuestion, upvoteQuestion, addReply)
│       ├── moderation.test.ts            # TEST-03 (ban*, restore*)
│       └── rate-limit.test.ts            # TEST-03 (checkRateLimit, checkNotBanned)
└── frontend/
    └── src/__tests__/
        ├── setup.ts                      # jsdom setup, RTL cleanup
        ├── question-card.test.tsx        # TEST-04
        └── qa-input.test.tsx             # TEST-04
.github/
└── workflows/
    └── ci.yml                            # CICD-01, CICD-02
scripts/
└── check-bundle-size.mjs                 # TEST-05 — reads .next/analyze/client.html stats
```

### Pattern 1: Root Vitest Projects Config

**What:** Single `vitest.config.ts` at repo root defines three inline project definitions.
**When to use:** Any monorepo where different packages need different environments (node vs jsdom).

```typescript
// vitest.config.ts — Source: https://vitest.dev/guide/projects
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // @nasqa/core — pure TypeScript, node environment
        test: {
          name: "core",
          include: ["packages/core/src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        // @nasqa/functions — Lambda resolvers, node environment, AWS mocked
        test: {
          name: "functions",
          include: ["packages/functions/src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        // frontend — React components, jsdom, next-intl inlined
        plugins: [tsconfigPaths(), react()],
        test: {
          name: "frontend",
          include: ["packages/frontend/src/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["packages/frontend/src/__tests__/setup.ts"],
          server: {
            deps: {
              inline: ["next-intl"],
            },
          },
        },
      },
    ],
  },
});
```

**Critical:** `test.projects` is the current API (Vitest 3+). The old `workspace` file approach is deprecated as of Vitest 3.2. Also: project-level configs do **not** inherit root-level config options — each project is fully self-contained. Use `extends: true` only if needed.

### Pattern 2: Zod Schema Unit Tests

**What:** Pure `describe/it/expect` tests against Zod schemas.

```typescript
// packages/core/src/__tests__/schemas.test.ts
import { describe, expect, it } from "vitest";

import {
  createQuestionInputSchema,
  createSessionInputSchema,
  createSnippetInputSchema,
} from "../schemas";

describe("createSessionInputSchema", () => {
  it("accepts valid title", () => {
    expect(createSessionInputSchema.parse({ title: "My Session" })).toEqual({
      title: "My Session",
    });
  });
  it("rejects empty title", () => {
    expect(() => createSessionInputSchema.parse({ title: "" })).toThrow();
  });
  it("rejects title over 50 chars", () => {
    expect(() => createSessionInputSchema.parse({ title: "a".repeat(51) })).toThrow();
  });
});
```

### Pattern 3: Lambda Resolver Tests with aws-sdk-client-mock

**What:** Mock the `DynamoDBDocumentClient` singleton that resolvers import from `resolvers/index.ts`.

**Key challenge:** `docClient` is a module-level export from `packages/functions/src/resolvers/index.ts`. The resolvers call it directly. The cleanest mock strategy is `vi.mock` at the top of the test file, replacing `aws-sdk-client-mock` idiom.

```typescript
// packages/functions/src/__tests__/qa.test.ts
import { mockClient } from "aws-sdk-client-mock";
import { beforeEach, describe, expect, it } from "vitest";

import "aws-sdk-client-mock-vitest";

import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import { addQuestion } from "../resolvers/qa";

// Mock the docClient module BEFORE importing resolvers
const ddbMock = mockClient(DynamoDBDocumentClient);

// Set TABLE_NAME before resolvers load
process.env.TABLE_NAME = "test-table";

beforeEach(() => {
  ddbMock.reset();
  // Mock rate limit and ban checks (always pass)
  ddbMock.on(GetCommand).resolves({ Item: undefined });
  ddbMock.on(UpdateCommand).resolves({});
  ddbMock.on(PutCommand).resolves({});
});

describe("addQuestion", () => {
  it("returns QUESTION_ADDED event with correct shape", async () => {
    const result = await addQuestion({
      sessionSlug: "test-slug",
      text: "What is this?",
      fingerprint: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.eventType).toBe("QUESTION_ADDED");
    expect(result.sessionSlug).toBe("test-slug");
    const payload = JSON.parse(result.payload as string);
    expect(payload.text).toBe("What is this?");
  });
  it("throws when text exceeds 500 chars", async () => {
    await expect(
      addQuestion({
        sessionSlug: "test-slug",
        text: "a".repeat(501),
        fingerprint: "123e4567-e89b-12d3-a456-426614174000",
      }),
    ).rejects.toThrow("Question text exceeds 500 character limit");
  });
});
```

**Note:** `mockClient(DynamoDBDocumentClient)` intercepts all instances created from `DynamoDBDocumentClient.from(...)`. This works because aws-sdk-client-mock patches the prototype. The key concern is import order: `mockClient` must be called before the resolver module is imported.

### Pattern 4: React Component Tests with next-intl

**What:** Render client components with `NextIntlClientProvider` using real English messages.

```typescript
// packages/frontend/src/__tests__/setup.ts
import "@testing-library/jest-dom";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
```

```tsx
// packages/frontend/src/__tests__/question-card.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import messages from "../../messages/en.json";
import { QuestionCard } from "../components/session/question-card";

function renderCard(props = {}) {
  const defaultQuestion = {
    id: "q1",
    sessionSlug: "test-slug",
    text: "Is this working?",
    fingerprint: "fp-1",
    upvoteCount: 0,
    downvoteCount: 0,
    isHidden: false,
    isFocused: false,
    isBanned: false,
    createdAt: Math.floor(Date.now() / 1000),
    TTL: Math.floor(Date.now() / 1000) + 86400,
  };
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QuestionCard
        question={defaultQuestion}
        replies={[]}
        isHost={false}
        fingerprint="other-fp"
        sessionSlug="test-slug"
        votedQuestionIds={new Set()}
        downvotedQuestionIds={new Set()}
        onUpvote={vi.fn()}
        onDownvote={vi.fn()}
        onReply={vi.fn()}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("QuestionCard", () => {
  it("renders question text", () => {
    renderCard();
    expect(screen.getByText("Is this working?")).toBeDefined();
  });
  it("shows banned tombstone when isBanned", () => {
    renderCard({ question: { ...defaultQuestion, isBanned: true } });
    // tombstone text comes from messages
  });
});
```

**Important:** `next-intl` must be in `server.deps.inline` in the vitest project config or tests will fail with ESM resolution errors.

### Pattern 5: Bundle Size CI Check (TEST-05)

**What:** After `next build`, parse the `build-manifest.json` or use `@next/bundle-analyzer` to assert gzipped initial JS ≤ 80kB.

Two approaches:

**Option A — Custom script reading Next.js build output (LOW complexity, HIGH reliability):**

```javascript
// scripts/check-bundle-size.mjs
import { readFileSync } from "fs";
import { gzipSync } from "zlib";

const manifest = JSON.parse(readFileSync("packages/frontend/.next/build-manifest.json", "utf-8"));
const initialFiles =
  manifest.pages["/__next/static/chunks/main-app"] ?? Object.values(manifest.pages)[0] ?? [];

// Sum gzipped sizes of initial JS chunks
// ...assert total < 80 * 1024
```

**Option B — size-limit (recommended for accuracy):**

```json
// package.json
{
  "size-limit": [
    {
      "path": "packages/frontend/.next/static/chunks/main-app-*.js",
      "gzip": true,
      "limit": "80 kB"
    }
  ]
}
```

```bash
npm run build --workspace=packages/frontend && npx size-limit
```

Option B is more reliable because size-limit handles gzip calculation accurately and its output is CI-friendly (exits non-zero on failure). However, the exact file glob must be validated against the actual build output — Next.js chunk naming can vary.

### Pattern 6: GitHub Actions CI Workflow

**What:** Parallel jobs (lint, typecheck, test) plus sequential bundle-size gate.

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm test -- --run

  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - name: Restore .next cache
        uses: actions/cache@v4
        with:
          path: packages/frontend/.next/cache
          key: ${{ runner.os }}-next-${{ hashFiles('packages/frontend/**') }}
          restore-keys: |
            ${{ runner.os }}-next-
      - run: npm ci
      - run: npm run build --workspace=packages/frontend
      - run: node scripts/check-bundle-size.mjs
```

**Cache strategy:**

- `actions/setup-node` with `cache: 'npm'` caches `~/.npm` (the npm cache dir), keyed on `**/package-lock.json`. This is GitHub's recommended approach — do NOT cache `node_modules` directly.
- `.next/cache` is a separate `actions/cache` step since it's not covered by setup-node. Key on `hashFiles('packages/frontend/**')` so it invalidates when frontend source changes.

### Anti-Patterns to Avoid

- **Caching `node_modules` directly:** Fails across Node.js version changes and is not recommended by GitHub. Use `cache: 'npm'` in setup-node instead, which caches `~/.npm`.
- **Using `--workspace` in vitest:** Vitest workspace (old API) is deprecated in 3.2. Use `test.projects` in root config.
- **Importing resolvers before mockClient is called:** aws-sdk-client-mock patches the DynamoDBDocumentClient prototype at call time. If the resolver module is imported first, the `docClient` singleton is already constructed and the mock won't intercept it. Import order matters.
- **Forgetting `--run` flag in CI:** `vitest` without `--run` enters watch mode and hangs the CI job. Always use `vitest --run` or `vitest run` in CI.
- **Testing async Server Components with Vitest:** Next.js async Server Components are not supported by Vitest. Only test synchronous Client Components (`"use client"`) and synchronous Server Components. The existing components in this project are all `"use client"` — this is not a concern.
- **Not inlining next-intl:** Without `server.deps.inline: ['next-intl']`, Vitest fails with `ERR_UNKNOWN_FILE_EXTENSION` or ESM resolution errors in jsdom.

## Don't Hand-Roll

| Problem                        | Don't Build                           | Use Instead                                           | Why                                                                                                                       |
| ------------------------------ | ------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| DynamoDB client mocking        | Custom mock object for DynamoDB       | `aws-sdk-client-mock`                                 | Handles prototype patching, command matching, sequential responses — getting this right manually is extremely error-prone |
| Path alias resolution in tests | Manual alias mapping in vitest config | `vite-tsconfig-paths`                                 | Reads existing `tsconfig.json` paths automatically; no duplication                                                        |
| next-intl translation in tests | Mock `useTranslations` to return keys | `NextIntlClientProvider` with real `messages/en.json` | Mocking translation functions misses missing-key regressions; provider approach tests the real text                       |
| Bundle size check script       | Custom gzip + stats parsing           | `size-limit`                                          | Cross-platform, handles gzip accurately, CLI exits non-zero on budget failure                                             |
| CI caching logic               | Custom cache paths and keys           | `actions/setup-node` with `cache: 'npm'`              | Built-in npm cache integration handles cache invalidation automatically                                                   |

**Key insight:** The biggest custom-code temptation in this phase is rolling a bundle-size check script by hand. The size-limit library is 3 lines of config vs. 50+ lines of fragile file-system parsing that breaks when Next.js changes its chunk naming convention.

## Common Pitfalls

### Pitfall 1: docClient singleton import ordering breaks mocks

**What goes wrong:** `aws-sdk-client-mock` patches `DynamoDBDocumentClient.prototype.send`. If `resolvers/index.ts` is imported before `mockClient()` is called, the existing `docClient` instance escapes the mock and real AWS calls are attempted.
**Why it happens:** Node module cache: the singleton is constructed once at import time.
**How to avoid:** Call `mockClient(DynamoDBDocumentClient)` at the top of the test file, before any import that transitively imports the resolver module. Alternatively, refactor resolvers to accept `docClient` as a parameter (dependency injection) — but that changes production code.
**Warning signs:** Tests fail with `Missing credentials in config` or `Network request failed` — these indicate the real AWS SDK is being called.

### Pitfall 2: Vitest hangs in CI (watch mode)

**What goes wrong:** `npm test` runs `vitest` which defaults to watch mode in non-TTY environments on some platforms.
**Why it happens:** Watch mode detection heuristics.
**How to avoid:** In `package.json` scripts, define `"test": "vitest run"` (not just `"vitest"`). Or pass `--run` in CI explicitly.
**Warning signs:** CI job never completes; runner times out after ~6 hours.

### Pitfall 3: next-intl ESM errors in jsdom

**What goes wrong:** `Error: Cannot use import statement in a module` or `ERR_UNKNOWN_FILE_EXTENSION` when rendering components that use `useTranslations`.
**Why it happens:** next-intl ships ESM-only; jsdom Vitest environment doesn't automatically handle this.
**How to avoid:** Add `server: { deps: { inline: ['next-intl'] } }` to the frontend vitest project config.
**Warning signs:** Tests for any component using `useTranslations` fail immediately on import.

### Pitfall 4: Root tsconfig.json picks up test files from wrong packages

**What goes wrong:** `tsc --noEmit` at root fails because vitest test files in `packages/frontend` have JSX but root tsconfig doesn't enable JSX.
**Why it happens:** Root tsconfig now correctly excludes `packages/frontend` (established in Phase 5), so this is already resolved. But test files in `packages/core` or `packages/functions` must not use JSX.
**Warning signs:** `tsc` errors about `JSX` on `.tsx` test files in non-frontend packages.

### Pitfall 5: GitHub branch protection — status check name must match job name exactly

**What goes wrong:** After adding `ci.yml`, the branch protection rule's "required status checks" dropdown shows no options, or the check never appears.
**Why it happens:** GitHub only shows status checks that have run on the protected branch within the last 7 days. You must merge the CI workflow to `main` first, then configure branch protection.
**How to avoid:** On the first CI workflow PR, manually configure branch protection after the workflow runs on `main`. Job names in the YAML (`lint`, `typecheck`, `test`, `bundle-size`) become the required status check names.
**Warning signs:** Branch protection settings page shows "No status checks found" for your workflow.

### Pitfall 6: TABLE_NAME environment variable not set for resolver tests

**What goes wrong:** `checkRateLimit` and `addQuestion` throw `Error: TABLE_NAME environment variable is not set` before any mock logic runs.
**Why it happens:** Both functions call `tableName()` which reads `process.env.TABLE_NAME`.
**How to avoid:** Set `process.env.TABLE_NAME = 'test-table'` in a `beforeAll` or at the top of the test file, before importing resolvers.
**Warning signs:** All resolver tests fail with `TABLE_NAME environment variable is not set`.

## Code Examples

Verified patterns from official sources:

### Vitest projects config (root)

```typescript
// vitest.config.ts — Source: https://vitest.dev/guide/projects
export default defineConfig({
  test: {
    projects: [
      { test: { name: "core", include: ["packages/core/src/**/*.test.ts"], environment: "node" } },
      {
        test: {
          name: "functions",
          include: ["packages/functions/src/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        plugins: [tsconfigPaths(), react()],
        test: {
          name: "frontend",
          include: ["packages/frontend/src/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["packages/frontend/src/__tests__/setup.ts"],
          server: { deps: { inline: ["next-intl"] } },
        },
      },
    ],
  },
});
```

### aws-sdk-client-mock with Vitest matchers

```typescript
// Source: https://github.com/m-radzikowski/aws-sdk-client-mock (README)
import { mockClient } from "aws-sdk-client-mock";

import "aws-sdk-client-mock-vitest";

import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => ddbMock.reset());

it("calls PutCommand", async () => {
  ddbMock.on(PutCommand).resolves({});
  await myFunction();
  expect(ddbMock).toHaveReceivedCommand(PutCommand);
});
```

### next-intl provider in RTL tests

```tsx
// Source: https://next-intl.dev/docs/environments/testing
import { NextIntlClientProvider } from "next-intl";

import messages from "../../messages/en.json";

render(
  <NextIntlClientProvider locale="en" messages={messages}>
    <YourComponent />
  </NextIntlClientProvider>,
);
```

### GitHub Actions npm cache

```yaml
# Source: https://github.com/actions/setup-node
- uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: "npm" # caches ~/.npm, keyed on package-lock.json
- run: npm ci
```

### .next/cache in GitHub Actions

```yaml
# Source: https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
- uses: actions/cache@v4
  with:
    path: packages/frontend/.next/cache
    key: ${{ runner.os }}-next-${{ hashFiles('packages/frontend/**') }}
    restore-keys: |
      ${{ runner.os }}-next-
```

## State of the Art

| Old Approach                              | Current Approach                               | When Changed              | Impact                                                                     |
| ----------------------------------------- | ---------------------------------------------- | ------------------------- | -------------------------------------------------------------------------- |
| `vitest.workspace.ts` file                | `test.projects` in root `vitest.config.ts`     | Vitest 3.2 (2025)         | Workspace files deprecated; inline projects config is now canonical        |
| Per-package `vitest.config.ts` + run-many | Single root config with `projects` array       | Vitest 2+                 | Single `vitest` invocation covers all packages; simpler `pnpm test` script |
| `jest` + `babel-jest` for ESM             | `vitest` natively                              | 2023-2024                 | Project already uses ESM-first; Jest is out of scope per REQUIREMENTS.md   |
| Caching `node_modules` in GitHub Actions  | Caching `~/.npm` via setup-node `cache: 'npm'` | 2021+                     | node_modules caching breaks across Node versions; npm cache is safer       |
| `window.confirm` for confirmations        | Dialog/Modal components                        | Active (project decision) | Relevant for component test assertions — no `window.confirm` to mock       |

**Deprecated/outdated:**

- `vitest.workspace.ts`: Deprecated in Vitest 3.2. Still works but shows a warning. Use `test.projects` in root config.
- Jest: Explicitly out of scope per REQUIREMENTS.md ("ESM-first codebase; Vitest is faster and ESM-native").
- `@testing-library/jest-dom`: Can be used with Vitest (it's not Jest-only), but must be imported as `'@testing-library/jest-dom/vitest'` in the setup file in recent versions.

## Open Questions

1. **docClient mock strategy: prototype patch vs. dependency injection**
   - What we know: `docClient` is a module-level export from `resolvers/index.ts`. aws-sdk-client-mock patches the prototype of `DynamoDBDocumentClient`, which intercepts all instances including existing ones — so import order is the only constraint.
   - What's unclear: Whether the mock reliably intercepts the `docClient` constructed in `resolvers/index.ts` when the test file mocks _after_ the module is already loaded in the same test run.
   - Recommendation: In the test file, call `mockClient(DynamoDBDocumentClient)` before importing any resolver. Vitest's module isolation should handle this cleanly since each test file gets its own module context. Validate with a quick smoke test during Wave 1.

2. **Exact glob pattern for bundle-size check**
   - What we know: Next.js App Router produces chunks under `.next/static/chunks/`. The initial JS budget refers to the gzipped sum of JS that must be downloaded before first interaction.
   - What's unclear: The exact filename patterns Next.js 16 emits for the "initial" chunks (main-app, framework, etc.) that count against the 80kB budget.
   - Recommendation: Run `npm run build` locally first, inspect `.next/build-manifest.json`, and derive the correct glob. Document the actual file names in the implementation plan.

3. **Branch protection setup sequence**
   - What we know: GitHub only shows CI check names in the branch protection dropdown after those checks have run on `main`.
   - What's unclear: Whether the first workflow PR can be self-merging or requires manual configuration.
   - Recommendation: Plan for a two-step: (1) merge CI workflow to `main` with a no-op commit, (2) then configure branch protection rules. Document this as a manual step in the verification checklist.

## Sources

### Primary (HIGH confidence)

- https://nextjs.org/docs/app/guides/testing/vitest — Official Next.js 16 Vitest setup guide; packages list, config file, async Server Component constraint
- https://next-intl.dev/docs/environments/testing — Official next-intl testing docs; `NextIntlClientProvider` provider pattern, `server.deps.inline` requirement
- https://vitest.dev/guide/projects — Official Vitest 3 projects API; root config syntax, inheritance model, deprecated workspace API
- https://github.com/m-radzikowski/aws-sdk-client-mock — Official README; `mockClient`, Vitest matchers via `aws-sdk-client-mock-vitest`
- https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching — GitHub official caching docs; 10GB limit, `~/.npm` vs `node_modules` guidance
- https://github.com/actions/setup-node — Official setup-node README; `cache: 'npm'` built-in support

### Secondary (MEDIUM confidence)

- https://www.thecandidstartup.org/2025/09/08/vitest-3-monorepo-setup.html — Verified against vitest.dev/guide/projects; Vitest 3 monorepo setup patterns
- https://cloudonaut.io/how-to-unit-test-aws-javascript-sdk-v3/ — Verified against aws-sdk-client-mock README; DynamoDB mock patterns

### Tertiary (LOW confidence)

- Custom bundle-size script approach — Not sourced from a single authoritative guide; derived from Next.js build output structure knowledge. Validate by inspecting actual build output.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — All packages sourced from official docs (Next.js, Vitest, next-intl, aws-sdk-client-mock)
- Architecture: HIGH — Vitest projects config sourced from official Vitest 3 docs; CI patterns from GitHub official docs
- Pitfalls: HIGH for import order (documented in aws-sdk-client-mock README), watch mode (common knowledge), next-intl inline (official next-intl docs). MEDIUM for branch protection setup sequence (GitHub community discussion, not official docs)

**Research date:** 2026-03-15
**Valid until:** 2026-06-15 (90 days — Vitest and Next.js are active but these APIs are stable)

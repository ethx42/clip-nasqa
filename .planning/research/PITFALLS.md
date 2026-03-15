# Pitfalls Research

**Domain:** Real-time presentation session tool — enterprise hardening (testing, CI/CD, monitoring, error handling, pre-commit hooks, SEO, accessibility)
**Researched:** 2026-03-15
**Confidence:** HIGH for testing/CI/CD patterns (multiple verified sources); MEDIUM for Sentry/AppSync interaction and Netlify-specific edge cases; LOW for SST Ion + GitHub Actions OIDC specifics (limited current official docs found)

---

## Critical Pitfalls

Mistakes that cause pipeline failures, production blind spots, or rework when adding enterprise hardening to an existing Next.js + SST monorepo.

---

### Pitfall 1: Vitest Workspace Config Conflicts with npm Workspaces

**What goes wrong:**
Teams install Vitest per-package (in `packages/frontend`, `packages/core`, `packages/functions`) and discover that running `vitest` from the monorepo root ignores workspace packages unless a root `vitest.config.ts` with the `projects` array is also present. Conversely, running `vitest` inside a package directory ignores the root `vitest.workspace.ts` entirely — it runs as a standalone config. The two modes are mutually exclusive and not symmetric.

**Why it happens:**
The Vitest `workspace` feature (renamed to `projects` in Vitest 3.2+) is opt-in from the root only. Developers accustomed to Jest or monorepo runners (Turborepo, Nx) assume that test discovery propagates automatically through npm workspaces — it does not.

**How to avoid:**
- Install Vitest only at the monorepo root (`devDependencies` in root `package.json`), not in each package.
- Create a single `vitest.config.ts` at the root that uses the `projects` array (Vitest 3.2+) pointing to each package: `['packages/*/vitest.config.ts']`.
- Each per-package config uses `defineProject` (not `defineConfig`) and inherits shared setup from the root config via `extends`.
- Add a single `npm run test` script at the root that runs `vitest` from root — packages should NOT have competing `test` scripts that create parallel Vitest instances.

**Warning signs:**
- `npm run test` passes but per-package `cd packages/frontend && vitest` fails (or vice versa)
- Coverage reports only include one package's files
- Two different test watch sessions needed to cover all packages

**Phase to address:** Testing infrastructure (first phase of hardening)

---

### Pitfall 2: Testing Async Server Components with Vitest — Not Supported

**What goes wrong:**
Next.js App Router Server Components are `async` functions. Vitest's jsdom environment does not support rendering async Server Components via React Testing Library — calling `render(<AsyncServerComponent />)` throws or silently returns null because the component's `async` is treated as returning a Promise, not a React element.

**Why it happens:**
React's server-rendering model for async components requires a Node.js runtime with React's server renderer (`react-dom/server`), not the browser simulation environment (jsdom). This is a fundamental incompatibility, not a configuration issue.

**How to avoid:**
- Do NOT write React Testing Library tests for async Server Components. This is explicitly unsupported by the Next.js team as of 2025.
- For async Server Components: test them via E2E tests (Playwright) that spin up the actual Next.js server.
- For synchronous Server Components and all Client Components: RTL + Vitest works fine.
- Extract async data-fetching logic into pure functions in `packages/core` or data layer files. Unit test those functions in isolation (they're plain async TS functions, not React components).
- Document which components are Server Components and which are Client Components so testers know the correct test strategy for each.

**Warning signs:**
- `render()` returning empty or throwing for components with `async function Component()`
- Tests passing but asserting against an empty DOM
- Vitest error: "Objects are not valid as a React child (found: Promise)"

**Phase to address:** Testing infrastructure phase — set this boundary in test conventions doc before any test authoring begins

---

### Pitfall 3: Husky Hooks Not Running in CI — Silent Quality Gate Bypass

**What goes wrong:**
Husky pre-commit hooks prevent bad code from being committed locally but do nothing in CI. If the CI pipeline does not independently run lint, typecheck, and tests as separate steps, a developer who bypasses hooks (`git commit --no-verify`) or commits from a tool that skips hooks (GitHub web editor, certain IDE integrations) ships unchecked code to production.

**Why it happens:**
Teams treat Husky as the quality gate rather than as a developer convenience layer. The gate must live in CI, not in the client-side hook.

**How to avoid:**
- CI pipeline must always run lint, typecheck, and tests independently — regardless of whether Husky hooks ran.
- Treat Husky as fast feedback for developers, not as the authoritative quality gate.
- Add `--frozen-lockfile` (or `npm ci`) to CI install steps so lockfile drift is caught immediately.
- In the GitHub Actions workflow, add a step that explicitly fails if `npm ci` modifies `package-lock.json`.

**Warning signs:**
- CI pipeline only calls `npm test` but has no explicit lint or typecheck step
- Teammates reporting "the hook never ran" on certain machines
- Commits arriving at main that violate ESLint rules that are enforced locally

**Phase to address:** CI/CD pipeline phase — before Husky is considered complete

---

### Pitfall 4: lint-staged Running Wrong Config in Monorepo — Files Linted Against Wrong Rules

**What goes wrong:**
With npm workspaces, `lint-staged` run from the root will lint all staged files, but ESLint config files (`eslint.config.mjs`) live inside `packages/frontend/`, not at the root. ESLint called from root on frontend files can't find the config, falls back to default rules, and either passes silently or uses the wrong ruleset. This masks real lint errors.

**Why it happens:**
ESLint 9 (flat config) resolves config files relative to the current working directory. When lint-staged runs from the monorepo root, it runs ESLint with root cwd, not the package cwd. The config at `packages/frontend/eslint.config.mjs` is not discovered.

**How to avoid:**
- In the root `.lintstagedrc` (or `package.json` `lint-staged` key), use the `--cwd` flag explicitly:
  ```json
  {
    "packages/frontend/**/*.{ts,tsx}": "eslint --config packages/frontend/eslint.config.mjs --fix"
  }
  ```
- Alternatively, use per-package `lint-staged` configs (one in each package directory) and configure Husky to run `lint-staged --cwd packages/frontend` etc. per directory.
- Always verify by running `lint-staged` manually and checking which config path ESLint reports using `--debug`.

**Warning signs:**
- `lint-staged` completes with zero errors on files that contain obvious lint violations
- ESLint `--debug` output showing "No config file found" or falling back to base config
- TypeScript JSX errors not caught during pre-commit on `.tsx` files

**Phase to address:** Pre-commit hooks phase

---

### Pitfall 5: Sentry Capturing AppSync WebSocket Noise as Real Errors

**What goes wrong:**
AppSync WebSocket connections emit network events that Sentry's default fetch/XHR instrumentation captures as errors: WebSocket reconnect attempts, subscription keep-alive timeouts, and 401 responses during connection renegotiation all generate Sentry issues. In a session with 500 participants on spotty conference WiFi, this creates thousands of noisy Sentry events per session that bury real errors.

**Why it happens:**
Sentry's automatic instrumentation wraps `fetch`, `XMLHttpRequest`, and WebSocket events by default. The Amplify/AppSync WebSocket client's internal retry behavior (which is intentional and handled) appears as a stream of errors to Sentry.

**How to avoid:**
- Add `beforeSend` / `beforeSendTransaction` filters in `sentry.client.config.ts` to drop known-benign AppSync errors:
  ```typescript
  beforeSend(event) {
    if (event.request?.url?.includes('appsync.amazonaws.com')) {
      if (event.level === 'warning' || isReconnectError(event)) return null;
    }
    return event;
  }
  ```
- Use `ignoreErrors` config option for specific AppSync WebSocket error messages.
- Set `tracesSampleRate` to 0.1 (10%) in production — sampling 100% of AppSync subscription transactions will exhaust Sentry quotas in minutes during an active session.
- Separately monitor real application errors (Lambda resolver failures, DynamoDB errors) from connection-layer noise.

**Warning signs:**
- Sentry dashboard flooded with "WebSocket is closed" or "network error" issues immediately after deployment
- Sentry event quota exhausted within hours of a session starting
- Real errors buried under hundreds of reconnect-related issues

**Phase to address:** Monitoring / Sentry setup phase

---

### Pitfall 6: Sentry Source Maps Not Uploaded — Stack Traces Useless in Production

**What goes wrong:**
Sentry captures errors in production with minified stack traces. Without source map upload, every error shows `bundle.js:1:47329` instead of `components/QuestionCard.tsx:83`. This makes production debugging effectively impossible, which defeats the purpose of adding Sentry.

**Why it happens:**
Source map upload is a build-time step that requires a Sentry auth token and project slug configured in the build environment. Teams add Sentry as a runtime dependency but forget to configure the `@sentry/nextjs` Webpack plugin that handles source map upload automatically.

**How to avoid:**
- Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` to Netlify environment variables (not hardcoded in source).
- The `@sentry/nextjs` package automatically uploads source maps during `next build` when these env vars are present. Verify by checking Sentry's "Source Maps" tab after the first CI deploy.
- Add `sentry.server.config.ts` and `sentry.client.config.ts` files. The Sentry Next.js wizard auto-generates these — do not skip it.
- In CI, add a smoke-check step after deploy: trigger a known error and verify Sentry shows a readable stack trace.

**Warning signs:**
- Sentry errors showing minified file paths after production deployment
- Sentry "Releases" page showing no source map artifacts
- Stack traces with anonymous function names and byte offsets

**Phase to address:** Monitoring / Sentry setup phase, verified during first CI deploy

---

### Pitfall 7: Next.js `error.tsx` Does Not Catch Layout or Root-Level Errors

**What goes wrong:**
Teams add `app/error.tsx` expecting it to catch all unhandled errors. It does not. Errors thrown inside `app/layout.tsx` or any parent segment's `layout.tsx` are not caught by `error.tsx` at the same level — they propagate up and crash the entire page with a browser error screen in production.

**Why it happens:**
The Next.js App Router error boundary wraps the `page.tsx` of a segment, not its `layout.tsx`. This is correct React behavior (a boundary cannot catch errors in itself or its siblings) but surprises developers who expect `error.tsx` to be a global catch-all.

**How to avoid:**
- Add `app/global-error.tsx` at the root alongside `app/layout.tsx`. This file wraps the root layout and catches errors that escape all other boundaries. It must include its own `<html>` and `<body>` tags because it replaces the root layout when triggered.
- Add `error.tsx` at every route segment that has its own `layout.tsx` (e.g., `app/[locale]/live/[slug]/error.tsx`).
- Test error boundaries explicitly: add a development-only "throw error" button in each route segment to verify the correct boundary catches it.
- Never assume `app/error.tsx` is a global catch-all.

**Warning signs:**
- In production, errors in `layout.tsx` rendering logic show a blank white page with no error UI
- `global-error.tsx` is absent from the codebase
- Error boundaries tested only in development (where Next.js shows its own error overlay anyway)

**Phase to address:** Error boundaries phase

---

### Pitfall 8: GitHub Actions AWS Credentials Stored as Long-Lived Secrets

**What goes wrong:**
Teams store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as GitHub Actions repository secrets and use them to deploy SST. Long-lived IAM user credentials accumulate over time, are hard to rotate, and create a high-severity blast radius if the repository is compromised or secrets are leaked in a workflow log.

**Why it happens:**
Long-lived credentials are the path of least resistance and are described in most tutorials. OIDC-based auth requires more initial configuration.

**How to avoid:**
- Use GitHub Actions OIDC with `aws-actions/configure-aws-credentials@v4`. This generates short-lived credentials scoped to each workflow run. No long-lived secrets are stored.
- Create an IAM role with a trust policy that allows GitHub Actions from the specific repository (not `token.actions.githubusercontent.com` wildcard) to assume it.
- Scope the IAM role's permissions to exactly what `sst deploy` needs: CloudFormation, Lambda, DynamoDB, AppSync, S3, CloudFront — deny everything else.
- Add a Husky pre-commit hook or lint-staged check using `detect-secrets` or `gitleaks` to scan for accidental credential commits.

**Warning signs:**
- `AWS_ACCESS_KEY_ID` present as a static GitHub Actions secret (not an OIDC role ARN)
- IAM user credentials that do not rotate (last rotated > 90 days)
- Workflow logs that print environment variables without masking

**Phase to address:** CI/CD pipeline phase

---

### Pitfall 9: CI Pipeline Rebuilds All Packages on Every Commit — Slow and Wasteful

**What goes wrong:**
A naive GitHub Actions workflow runs `npm ci && npm run lint && npm run typecheck && npm test && npm run build` on every push, regardless of which packages changed. In a monorepo, a change to `packages/core` triggers a full frontend rebuild. A change to `packages/functions` (Lambda resolvers) triggers a frontend build. This is unnecessary and slows CI to 5–10 minutes for trivial changes.

**Why it happens:**
Monorepo-aware CI requires path-based job filtering. GitHub Actions supports this via `paths` in `on.push`, but it requires per-job scoping, not one global job.

**How to avoid:**
- Use `on.push.paths` filters per job in the GitHub Actions workflow:
  ```yaml
  jobs:
    test-frontend:
      if: contains(github.event.commits[*].modified, 'packages/frontend')
  ```
- Alternatively, use a change detection step (`dorny/paths-filter@v3`) at the top of the workflow to set output variables, then use `if: steps.changes.outputs.frontend == 'true'` on each job.
- Always build shared packages (`packages/core`) before building packages that depend on them — use `needs:` job dependencies in GitHub Actions.
- Cache `node_modules` and Next.js build cache (`.next/cache`) between runs using `actions/cache@v4`.

**Warning signs:**
- CI always runs for > 5 minutes regardless of which file was changed
- A one-line change in a Lambda resolver triggers a full Next.js build and Netlify deploy
- `npm ci` is not caching `node_modules` — watch for "cache miss" in every run

**Phase to address:** CI/CD pipeline phase

---

### Pitfall 10: Open Graph Image Not Generated for Session Pages — OG Preview Shows Generic Metadata

**What goes wrong:**
Teams add static OG metadata to `app/layout.tsx` but forget that session pages (`/[locale]/live/[slug]`) have dynamic session titles. Sharing a session link on Slack/Twitter/WhatsApp shows the generic app title instead of the session's title. The QR code flow that participants use to join depends on the shared link looking credible — generic OG metadata undermines this.

**Why it happens:**
Dynamic metadata requires `generateMetadata` exported from `app/[locale]/live/[slug]/page.tsx`, which requires an async data fetch for the session title. Teams who add static metadata in the root layout assume it propagates to all pages.

**How to avoid:**
- Export `generateMetadata` from every dynamic route segment that has unique content:
  ```typescript
  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const session = await getSession(params.slug);
    return {
      title: session.title,
      openGraph: { title: session.title, description: `Join ${session.title} on Nasqa Live` },
    };
  }
  ```
- Do not export both a static `metadata` object and a `generateMetadata` function from the same file — Next.js ignores one silently.
- For session pages that may be expired (24h TTL), return a fallback metadata object gracefully instead of throwing.
- Test OG tags using `opengraph.xyz` or the LinkedIn post inspector after deploy.

**Warning signs:**
- Sharing a session link shows "Nasqa Live" as the title with no session-specific description
- `generateMetadata` absent from session page files
- OG image showing the generic app logo instead of session context

**Phase to address:** SEO / metadata phase

---

### Pitfall 11: i18n `alternates` / `hreflang` Tags Missing or Wrong — Duplicate Content Penalty

**What goes wrong:**
With locale-based routing (`/en/live/slug`, `/es/live/slug`, `/pt/live/slug`), search engines see three URLs with identical content (since user-generated content is not translated — only UI chrome is). Without `hreflang` tags and canonical consolidation, Google treats them as duplicate pages and may penalize or de-rank all three.

**Why it happens:**
`next-intl` does locale-based routing automatically but does not add `hreflang` tags. Teams must explicitly add `alternates` to `generateMetadata` output.

**How to avoid:**
- In `generateMetadata`, include `alternates` with canonical and `languages` map:
  ```typescript
  alternates: {
    canonical: `https://nasqa.live/en/live/${slug}`,
    languages: {
      'en': `https://nasqa.live/en/live/${slug}`,
      'es': `https://nasqa.live/es/live/${slug}`,
      'pt': `https://nasqa.live/pt/live/${slug}`,
      'x-default': `https://nasqa.live/en/live/${slug}`,
    }
  }
  ```
- For session pages: canonicalize to the English version (since content is identical) to consolidate SEO value.
- Do not use the same canonical URL for every locale — search engines ignore hreflang when canonical conflicts with it.

**Warning signs:**
- Google Search Console showing duplicate content issues across locale variants
- Session pages ranking for the wrong locale in search results
- Missing `x-default` hreflang value

**Phase to address:** SEO / metadata phase

---

### Pitfall 12: Accessibility (a11y) Added as a Checkbox After Implementation — ARIA Bolted On

**What goes wrong:**
Teams add ARIA attributes after implementing real-time UI features, resulting in broken semantics: `role="button"` on a `<div>` that doesn't receive keyboard events, `aria-live` regions that never announce updates because they were added to the wrong DOM node, or `aria-expanded` attributes that don't update state.

The real-time aspects of Nasqa Live (question feed updates, upvote counters, connection status) are especially vulnerable because dynamic DOM changes require `aria-live` regions to be present in the DOM before the first change occurs — adding them after the fact means screen readers miss announcements.

**Why it happens:**
Accessibility is treated as a post-implementation concern rather than a design constraint. `aria-live` regions must be rendered before they receive content — placing an `aria-live` region inside a component that conditionally mounts means it is not registered with the accessibility tree until it first renders, causing initial announcements to be missed.

**How to avoid:**
- Render `aria-live` regions unconditionally (always present in DOM) but with empty content. Populate the content when an event occurs. Never conditionally mount the region.
- Use `aria-live="polite"` for question feed updates (non-urgent) and `aria-live="assertive"` for connection status changes only.
- Add `role="status"` to the connection indicator that shows "Live" / "Reconnecting..." — this announces state changes without requiring `aria-live`.
- Use `axe-core` via `@axe-core/react` in development mode to catch ARIA violations at render time, before code review.
- Run `eslint-plugin-jsx-a11y` (already included in `eslint-config-next`) and fix all warnings before any PR merges.

**Warning signs:**
- `axe-core` flagging violations in development
- Screen reader (VoiceOver, NVDA) not announcing question feed updates
- Keyboard navigation stopping at interactive components that have no `tabIndex` or `role`

**Phase to address:** Accessibility phase — but `aria-live` regions must be designed before real-time event integration

---

### Pitfall 13: Netlify `@netlify/plugin-nextjs` Lagging Behind Next.js 16 — Build Failures

**What goes wrong:**
As of early 2026, there are documented reports of Next.js 16 builds failing on Netlify during the Edge Functions bundling step even when the local build succeeds. The `@netlify/plugin-nextjs` adapter (via OpenNext) has a version coupling to Next.js releases. Upgrading Next.js without checking compatibility first breaks production deploys.

**Why it happens:**
Netlify's adapter wraps Next.js server internals. Each Next.js minor or major version can change internal APIs that the adapter depends on. The adapter is maintained separately from Next.js and sometimes lags.

**How to avoid:**
- Before upgrading Next.js, check the Netlify Next.js compatibility matrix and open GitHub issues for the OpenNext adapter.
- Pin `@netlify/plugin-nextjs` to a version that is explicitly tested against the current Next.js version.
- Add a CI check that deploys to a preview URL on every PR, not just on main merges. Build failures are caught before merging.
- Keep Next.js version upgrades as a dedicated PR with no other changes — isolate the upgrade to make rollback straightforward.

**Warning signs:**
- Netlify build succeeding locally but failing in Netlify CI on "Edge Functions bundling" step
- Error messages referencing `@netlify/plugin-nextjs` or `opennextjs-netlify` in the build log
- Next.js changelog showing "internal API changes" in its release notes

**Phase to address:** CI/CD pipeline phase — verify Netlify compatibility before any Next.js upgrade

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skipping E2E tests for real-time flows | Faster initial test setup | Real-time subscription bugs go undetected until production | Never — real-time is the core value prop |
| Using `any` type in test mocks for AppSync context | Tests compile faster | Type errors in resolvers not caught in tests | Only for initial scaffolding, fix within same PR |
| Setting `tracesSampleRate: 1.0` in Sentry production | Full observability | Sentry quota exhausted in one session at 500 participants | Development only |
| Adding `/* eslint-disable */` to pass lint in CI | CI goes green | Lint debt accumulates, violations hidden | Never in production code |
| Co-locating test files with components without test naming convention | Flexible organization | Test discovery breaks across packages | Only if all packages agree on same convention |
| Ignoring `aria-live` implementation until a11y phase | Faster shipping | Retrofitting live regions requires component restructuring | Never — live regions are architectural, not cosmetic |

---

## Integration Gotchas

Common mistakes when connecting hardening tools to the existing stack.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Sentry + Next.js | Not running Sentry wizard (`npx @sentry/wizard@latest -i nextjs`) and configuring manually | Run the wizard — it generates all required config files and wires source map upload |
| Sentry + AppSync WebSocket | Letting Sentry capture all network errors including WebSocket reconnects | Add `beforeSend` filter to drop known-benign AppSync connection events |
| Vitest + `@nasqa/core` workspace package | Importing from `@nasqa/core` fails in tests because npm workspace symlink not resolved by Vitest | Add `vite-tsconfig-paths` plugin to vitest config; verify `tsconfig.json` `paths` are included |
| Husky + npm workspaces | Installing Husky in each package separately | Install Husky at root only; `.husky/` lives at repo root |
| lint-staged + ESLint flat config | Running `eslint` from root without `--config` pointing to package-level `eslint.config.mjs` | Use `--config packages/frontend/eslint.config.mjs` in lint-staged glob pattern |
| GitHub Actions + SST deploy | Using long-lived IAM user credentials as secrets | Use OIDC role assumption via `aws-actions/configure-aws-credentials@v4` |
| Netlify + Next.js 16 | Upgrading Next.js without checking `@netlify/plugin-nextjs` compatibility | Pin plugin version; test on preview deploy before merging |
| `generateMetadata` + next-intl | Calling `getTranslations()` inside `generateMetadata` without `await`ing the locale param | Params in App Router `generateMetadata` are Promises — must `await params` before accessing `locale` |

---

## Performance Traps

Patterns that work locally but fail or degrade at real session load.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sentry `tracesSampleRate: 1.0` in production | Sentry quota exhausted mid-session; events dropped | Set to 0.1 in production; 1.0 in dev/staging only | At > 100 concurrent participants in a session |
| Running Vitest with `--coverage` on every CI run | CI 3x slower; coverage upload timeout | Run coverage only on main branch push, not on PRs | At > 200 test files |
| Full monorepo rebuild on every commit | CI consistently > 8 minutes | Path-filtered jobs; build cache with `actions/cache` | Immediately — wastes time from first commit |
| `axe-core` full page scan in every RTL test | Test suite takes minutes | Run `axe-core` only in dedicated a11y test files | At > 50 component tests |
| Source maps included in production client bundle | Initial page payload bloated by source maps | Set `productionBrowserSourceMaps: false` in `next.config.ts` | Immediately if source maps are accidentally shipped |

---

## Security Mistakes

Domain-specific security issues introduced during hardening.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Committing Sentry DSN to source | DSN leaks allow event injection and quota abuse | Store DSN in environment variable; gitignore `.env.local` |
| AWS credentials in GitHub Actions secrets (not OIDC) | Credential leak = full AWS account access | Replace with OIDC role assumption |
| Sentry capturing `hostSecret` in error context | Host secret exposed in Sentry event metadata | Add `hostSecret` to Sentry `denyUrls` or scrub from event `request.query` in `beforeSend` |
| Source maps shipped to client in production | Application structure exposed; easier reverse engineering | Set `productionBrowserSourceMaps: false`; upload to Sentry only |
| Pre-commit hook skippable with `--no-verify` | Hooks are not a security boundary | CI is the authoritative gate; hooks are developer convenience only |

---

## UX Pitfalls

User experience mistakes specific to adding enterprise hardening to a real-time presentation app.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Error boundary showing technical error message in production | Attendees see "An error occurred" with no context during a live session | Error boundary UI should say "Session temporarily unavailable — reconnecting" with a retry button |
| OG image showing generic title when sharing session link | QR code context lost; participants confused about what they're joining | Dynamic `generateMetadata` per session fetches title and session context |
| Accessibility focus ring hidden with `outline: none` in global CSS | Keyboard-only users cannot navigate question feed or upvote buttons | Remove `outline: none` from global CSS; use `:focus-visible` to show ring only for keyboard focus |
| `aria-live` region announcing every upvote increment | Screen reader reads "42 upvotes, 43 upvotes, 44 upvotes" in rapid succession during popular sessions | Debounce `aria-live` updates; announce only "Question has 44 votes" after 500ms quiet period |
| 404 page for expired sessions (24h TTL) instead of graceful message | Participants scanning QR after session ends see a blank error page | Detect `SESSION_EXPIRED` from DynamoDB and render an informative "This session has ended" page via `not-found.tsx` or a session-level error boundary |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces — specific to enterprise hardening on this stack.

- [ ] **Sentry integration:** Sentry catches errors but source maps not uploaded — verify by checking Sentry's Releases > Source Maps after first CI deploy shows readable stack traces.
- [ ] **Error boundaries:** `app/error.tsx` exists but `app/global-error.tsx` is absent — errors in root layout crash the app silently in production.
- [ ] **Pre-commit hooks:** Husky installed and hooks run locally but CI has no equivalent lint/typecheck steps — `git commit --no-verify` bypasses all gates.
- [ ] **Test coverage:** Tests exist but only for Client Components — Server Component business logic untested because async RSCs can't be rendered in jsdom.
- [ ] **SEO metadata:** `generateMetadata` returns static title in session pages — session title not fetched; all session OG previews look identical.
- [ ] **i18n SEO:** `hreflang` and `alternates.canonical` absent from session page metadata — three locale variants treated as duplicate content.
- [ ] **CI caching:** GitHub Actions workflow runs `npm ci` without `actions/cache` — every run downloads all dependencies fresh.
- [ ] **AWS credentials:** OIDC role configured but with overly broad permissions (`*`) — scoped-down IAM policy not defined.
- [ ] **Accessibility:** ESLint a11y rules pass but `aria-live` regions for real-time updates not present — screen readers miss question feed changes.
- [ ] **Netlify compatibility:** Next.js and `@netlify/plugin-nextjs` versions compatible in local build but Edge Functions bundling untested — only a staging Netlify deploy confirms compatibility.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Sentry flooded with AppSync noise | LOW | Add `beforeSend` filter, redeploy, manually resolve noise issues in Sentry |
| Source maps missing in Sentry | LOW | Add `SENTRY_AUTH_TOKEN` env var, trigger a new deploy, artifacts upload automatically |
| CI pipeline broken by Vitest workspace config | MEDIUM | Revert to per-package Vitest, consolidate to root config in a dedicated PR |
| AWS credentials leaked in logs | HIGH | Rotate immediately in IAM, audit CloudTrail for unauthorized access, migrate to OIDC |
| Netlify build failing after Next.js upgrade | MEDIUM | Pin Next.js to previous version, monitor OpenNext release for compatibility fix |
| `global-error.tsx` absent and root layout crashes | LOW | Add the file; it follows the same pattern as `error.tsx` but with standalone HTML |
| ARIA live regions not announcing real-time updates | MEDIUM | Refactor to mount `aria-live` regions unconditionally in layout; re-test with screen reader |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Vitest workspace config conflicts (Pitfall 1) | Testing infrastructure | Run `npm test` from root; confirm all three packages' tests execute |
| Async Server Components not testable in RTL (Pitfall 2) | Testing infrastructure | Document test strategy per component type; E2E covers async RSCs |
| Husky not a CI gate (Pitfall 3) | CI/CD pipeline | CI workflow must have explicit lint + typecheck steps independent of hooks |
| lint-staged wrong ESLint config (Pitfall 4) | Pre-commit hooks | Run `lint-staged` manually on a file with a known lint error; verify it fails |
| Sentry AppSync noise (Pitfall 5) | Monitoring / Sentry | Check Sentry dashboard during a test session; no WebSocket reconnect noise |
| Sentry source maps missing (Pitfall 6) | Monitoring / Sentry | Trigger test error in production; verify readable stack trace in Sentry |
| `error.tsx` not catching layout errors (Pitfall 7) | Error boundaries | Test error in `layout.tsx` explicitly; `global-error.tsx` must be present |
| Long-lived AWS credentials in CI (Pitfall 8) | CI/CD pipeline | Verify no static `AWS_ACCESS_KEY_ID` secrets; OIDC role ARN used instead |
| Full monorepo rebuild on every commit (Pitfall 9) | CI/CD pipeline | Measure CI time for a change to single package; should be < 2 minutes |
| OG metadata not dynamic per session (Pitfall 10) | SEO / metadata | Share session link to OG debugger; title must show session name |
| Missing `hreflang` / canonical (Pitfall 11) | SEO / metadata | Check rendered HTML for `alternates` meta tags on session pages |
| ARIA live regions absent (Pitfall 12) | Accessibility | Test with screen reader; question feed updates must be announced |
| Netlify + Next.js 16 build failures (Pitfall 13) | CI/CD pipeline | Staging deploy on Netlify as part of every PR via preview deploy |

---

## Sources

- Vitest projects/workspace configuration (verified, HIGH confidence): https://vitest.dev/guide/projects
- Vitest workspace not detecting tests in monorepo (verified, HIGH confidence): https://github.com/vitest-dev/vitest/issues/5336
- Next.js testing documentation — async Server Components caveat (verified, HIGH confidence): https://nextjs.org/docs/app/guides/testing/vitest
- Running RTL + Vitest on async Server Components (verified, MEDIUM confidence): https://aurorascharff.no/posts/running-tests-with-rtl-and-vitest-on-internationalized-react-server-components-in-nextjs-app-router/
- lint-staged monorepo configuration — multiple config files and `--cwd` pattern (verified, MEDIUM confidence): https://www.horacioh.com/writing/setup-lint-staged-on-a-monorepo/
- lint-staged multiple instances issue in monorepo (verified, MEDIUM confidence): https://github.com/okonet/lint-staged/issues/988
- Next.js error.tsx and global-error.tsx pitfalls (verified, HIGH confidence): https://nextjs.org/docs/app/api-reference/file-conventions/error
- Next.js error handling — layout boundary limitation (verified, HIGH confidence): https://nextjs.org/docs/app/getting-started/error-handling
- Sentry Next.js manual setup and source maps (verified, HIGH confidence): https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
- Netlify Next.js 16 build failures (MEDIUM confidence — community reports): https://answers.netlify.com/t/next-js-16-project-build-fails-on-netlify/157791
- Next.js dynamic SEO with generateMetadata (verified, HIGH confidence): https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- SEO i18n hreflang and alternates with next-intl (verified, MEDIUM confidence): https://dev.to/oikon/seo-and-i18n-implementation-guide-for-nextjs-app-router-dynamic-metadata-and-internationalization-3eol
- GitHub Actions monorepo CI patterns (MEDIUM confidence): https://dev.to/pockit_tools/github-actions-in-2026-the-complete-guide-to-monorepo-cicd-and-self-hosted-runners-1jop
- Pre-commit hooks and secret detection (verified, HIGH confidence): https://trufflesecurity.com/blog/do-pre-commit-hooks-prevent-secrets-leakage
- AWS Labs git-secrets (verified, HIGH confidence): https://github.com/awslabs/git-secrets
- Next.js accessibility documentation (verified, HIGH confidence): https://nextjs.org/docs/architecture/accessibility
- axe-core integration for React testing (verified, MEDIUM confidence): https://www.deque.com/blog/building-accessible-apps-with-next-js-and-axe-devtools/
- Canonical and hreflang in Next.js 16 (verified, MEDIUM confidence): https://www.buildwithmatija.com/blog/nextjs-advanced-seo-multilingual-canonical-tags

---

*Pitfalls research for: enterprise hardening of Next.js + SST monorepo (testing, CI/CD, monitoring, error boundaries, pre-commit hooks, SEO, accessibility)*
*Researched: 2026-03-15*

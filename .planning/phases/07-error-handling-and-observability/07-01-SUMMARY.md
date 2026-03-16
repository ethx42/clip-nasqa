---
phase: 07-error-handling-and-observability
plan: "01"
subsystem: frontend-error-boundaries, lambda-observability
tags: [error-handling, logging, next-js, pino, observability]
dependency_graph:
  requires: []
  provides: [error-boundaries, not-found-page, pino-logging, rate-limit-remaining]
  affects: [session-routes, host-routes, lambda-resolvers, rate-limiter]
tech_stack:
  added: [pino@^9]
  patterns: [Next.js error boundaries, pino child loggers, notFound() navigation]
key_files:
  created:
    - packages/frontend/src/lib/report-error.ts
    - packages/frontend/src/app/global-error.tsx
    - packages/frontend/src/app/[locale]/not-found.tsx
    - packages/frontend/src/app/[locale]/session/[slug]/error.tsx
    - packages/functions/src/resolvers/logger.ts
  modified:
    - packages/frontend/src/app/[locale]/session/[slug]/page.tsx
    - packages/frontend/src/app/[locale]/session/[slug]/host/page.tsx
    - packages/frontend/src/resolvers/index.ts
    - packages/functions/src/resolvers/rate-limit.ts
    - packages/frontend/messages/en.json
    - packages/frontend/messages/es.json
    - packages/frontend/messages/pt.json
decisions:
  - "global-error.tsx uses inline styles (no Tailwind/ThemeProvider available at root layout crash)"
  - "rate-limit throws RATE_LIMIT_EXCEEDED:{remaining} format for client-side cooldown display"
  - "error.tsx classifies connection vs server errors by presence of digest field and message keywords"
  - "pino logger initialized at module level for Lambda warm-start performance"
  - "fingerprint logged at WARN level truncated to first 8 chars for privacy"
metrics:
  duration: "~5 min"
  completed_date: "2026-03-16"
  tasks_completed: 2
  files_created: 5
  files_modified: 8
---

# Phase 7 Plan 01: Error Boundaries and Observability Summary

Next.js error boundary files (global-error, session error, not-found) with Zinc/Emerald brand plus pino structured JSON logging in Lambda resolvers with connection-aware error classification.

## Tasks Completed

| #   | Task                                                       | Commit  | Files                                                                                                       |
| --- | ---------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Error boundary files, not-found page, and reportError stub | 10151cf | global-error.tsx, error.tsx, not-found.tsx, report-error.ts, session/page.tsx, host/page.tsx, en/es/pt.json |
| 2   | pino structured logging in Lambda resolvers                | 7b0bb87 | logger.ts, index.ts, rate-limit.ts, package.json, package-lock.json                                         |

## What Was Built

### Task 1: Frontend Error Boundaries

- **`report-error.ts`** — `reportError(error)` stub that logs to `console.error` with `[reportError]` prefix and a `TODO(MON-01)` comment for future Sentry integration.

- **`global-error.tsx`** — Root layout crash handler. Uses inline styles (Tailwind unavailable outside ThemeProvider), hardcoded English, `<html>/<body>` wrapper required by Next.js, `useEffect` calls `reportError(error)`, and a "Try again" button calling `reset()`. Light-mode only (by design — outside ThemeProvider).

- **`session/[slug]/error.tsx`** — Session segment error boundary. Classifies errors as "Connection lost" (no digest + network/websocket keywords in message) vs "Something went wrong" (server error with digest). Uses `useTranslations('errors')` for i18n. Calls `reportError(error)` in `useEffect`. Styled with Tailwind/Emerald brand tokens.

- **`[locale]/not-found.tsx`** — Server Component (no `'use client'`). Uses `getTranslations('pages')` for i18n. Shows existing `sessionNotFound` / `sessionNotFoundDesc` / `createNewSession` keys. Single CTA links to "/" with full focus ring and 44px touch target.

- **Session page refactors** — Both `session/[slug]/page.tsx` and `host/page.tsx` replace their inline `if (!session) return <JSX />` blocks with `if (!session) notFound()` (outside any try/catch). Removed `getTranslations('pages')`, `Link`, and unused `t` variable from both files.

- **Translation files** — Added `errors` namespace to `en.json`, `es.json`, and `pt.json` with `connectionLost`, `connectionLostDesc`, `serverError`, `serverErrorDesc`, `tryAgain` keys.

### Task 2: Lambda Structured Logging

- **`resolvers/logger.ts`** — Module-level pino singleton: `export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })`. Module-level init avoids re-initialization on Lambda warm starts.

- **`resolvers/index.ts`** — Handler creates a child logger per invocation: `logger.child({ operation: fieldName, sessionSlug: args?.sessionSlug ?? 'unknown' })`. Records `start = Date.now()` before switch. On success: `log.info({ durationMs }, 'resolver success')`. On error catch: `log.error({ durationMs, err }, 'resolver error')` then re-throws. Refactored from `return X` to `result = await X; ... return result` pattern to enable pre-return logging.

- **`resolvers/rate-limit.ts`** — `checkRateLimit` now calculates `remaining = bucket + windowSeconds - nowEpoch`, logs `logger.warn({ key, remaining }, 'rate limit exceeded')`, and throws `new Error(\`RATE_LIMIT_EXCEEDED:${remaining}\`)`. `checkNotBanned`logs`logger.warn({ sessionSlug, fingerprint: fingerprint.slice(0, 8) }, 'banned participant attempted action')` before throwing.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `/packages/frontend/src/lib/report-error.ts` — created
- [x] `/packages/frontend/src/app/global-error.tsx` — created, contains `<html` and `<body`
- [x] `/packages/frontend/src/app/[locale]/not-found.tsx` — created, no `'use client'`
- [x] `/packages/frontend/src/app/[locale]/session/[slug]/error.tsx` — created, has `"use client"`
- [x] `/packages/functions/src/resolvers/logger.ts` — created, module-level pino
- [x] `notFound()` in session/page.tsx and host/page.tsx — verified
- [x] `RATE_LIMIT_EXCEEDED:${remaining}` format — verified
- [x] TypeScript compiles (both packages) — verified
- [x] `npx next build` succeeds — verified
- [x] Commit 10151cf exists — verified
- [x] Commit 7b0bb87 exists — verified

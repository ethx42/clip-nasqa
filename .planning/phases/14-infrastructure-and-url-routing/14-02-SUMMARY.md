---
phase: 14-infrastructure-and-url-routing
plan: "02"
subsystem: data-model
tags: [slug-to-code, session-code, graphql, lambda, types, numeric-code]
dependency_graph:
  requires: []
  provides: [session-code-data-model, numeric-code-generation]
  affects: [url-routing, session-creation, graphql-subscriptions, dynamodb-keys]
tech_stack:
  added: []
  patterns: [numeric-session-codes, SESSION#code-pk-format]
key_files:
  created: []
  modified:
    - packages/core/src/types.ts
    - packages/core/src/schemas.ts
    - packages/core/src/__tests__/schemas.test.ts
    - packages/frontend/src/lib/session.ts
    - packages/frontend/src/actions/session.ts
    - packages/frontend/src/lib/graphql/mutations.ts
    - packages/frontend/src/lib/graphql/subscriptions.ts
    - infra/schema.graphql
    - infra/resolvers/subscription-onSessionUpdate.js
    - packages/functions/src/resolvers/index.ts
    - packages/functions/src/resolvers/clipboard.ts
    - packages/functions/src/resolvers/qa.ts
    - packages/functions/src/resolvers/moderation.ts
    - packages/functions/src/resolvers/reactions.ts
    - packages/functions/src/resolvers/rate-limit.ts
decisions:
  - "Numeric codes use range 100000-999999 (6-digit, 900000 possibilities) for readability"
  - "Collision retry limit kept at 3 (was MAX_SLUG_RETRIES), renamed MAX_CODE_RETRIES"
  - "random-word-slugs dependency removed entirely — no shim needed"
  - "Route param still named 'slug' in filesystem routes — URL restructure is plan 03"
metrics:
  duration: "~25 min"
  completed: "2026-03-17"
  tasks_completed: 2
  files_modified: 32
---

# Phase 14 Plan 02: Slug-to-Code Data Model Migration Summary

Complete rename of session identifiers from word-pair slugs (e.g. `happy-tiger`) to 6-digit numeric codes (e.g. `482913`) across the entire data model — types, GraphQL schema, Lambda resolvers, DynamoDB key format, and all frontend consumers.

## What Was Done

### Task 1: Core types, schemas, GraphQL schema, Lambda resolvers

Renamed every occurrence of `slug`/`sessionSlug` to `code`/`sessionCode` in:

- `packages/core/src/types.ts` — all interfaces: `SessionItem`, `SnippetItem`, `QuestionItem`, `ReplyItem`, `Session`, `Snippet`, `Question`, `Reply`, `SessionUpdate`, and all mutation arg interfaces (`PushSnippetArgs`, `DeleteSnippetArgs`, etc.)
- `packages/core/src/schemas.ts` — `createSnippetInputSchema` and `createQuestionInputSchema` Zod schemas
- `packages/core/src/__tests__/schemas.test.ts` — test fixtures updated from word-slugs to 6-digit codes
- `infra/schema.graphql` — `Session.code`, `SessionUpdate.sessionCode`, all mutation/query/subscription arguments
- `infra/resolvers/subscription-onSessionUpdate.js` — filter expression uses `sessionCode`
- All Lambda resolvers in `packages/functions/src/resolvers/` — variable names, DynamoDB key construction (`SESSION#${sessionCode}`), return objects
- Lambda resolver test files — updated `sessionSlug` to `sessionCode` and `"test-slug"` to `"482913"`

### Task 2: Numeric code generation and frontend cascade

- `packages/frontend/src/actions/session.ts` — removed `import("random-word-slugs")`, added `generateNumericCode()`, DynamoDB key now `SESSION#${code}`, redirect URL pattern `/${locale}/${code}/host`
- `packages/frontend/src/lib/session.ts` — `Session.slug` → `Session.code`, `item.sessionSlug` → `item.sessionCode` in all item mappings
- GraphQL strings in `mutations.ts` and `subscriptions.ts` — all `$sessionSlug` variables renamed to `$sessionCode`
- All frontend actions (`qa.ts`, `snippet.ts`, `moderation.ts`, `reactions.ts`) — `sessionSlug: string` → `sessionCode: string`
- All hooks (use-session-updates, use-session-mutations, use-host-mutations, use-fingerprint, use-reaction-state, use-session-state) — `sessionSlug` → `sessionCode`
- All session components (session-live-page, session-live-host-page, clipboard-panel, qa-panel, join-modal, question-card-\*, reply-list, reaction-bar, host-input, session-shell)
- Frontend test files updated
- `random-word-slugs` uninstalled via `npm uninstall`

## Verification

- `grep -rn "sessionSlug" packages/*/src/ infra/` → 0 results
- `grep -rn "random-word-slugs" packages/frontend/src/ packages/frontend/package.json` → 0 results
- `npx tsc --noEmit` → passes with 0 errors (across core, functions, frontend)

## Deviations from Plan

**[Rule 2 - Auto-fix] Also updated Lambda test files**

- Found during: Task 1
- Issue: `packages/functions/src/__tests__/` (qa.test.ts, moderation.test.ts, reactions.test.ts) also referenced `sessionSlug` in test fixtures — would have caused TypeScript errors
- Fix: Renamed `sessionSlug` → `sessionCode` in all three Lambda test files, updated `.toBe("test-slug"/"my-session")` to `.toBe("482913")`
- Files modified: `packages/functions/src/__tests__/qa.test.ts`, `moderation.test.ts`, `reactions.test.ts`
- Commit: 7eba885

**Note: Route filesystem param unchanged**

- The Next.js page at `app/[locale]/session/[slug]/` still uses `slug` as the route param name — this is intentional. URL routing restructure is deferred to plan 03 (or later), which will rename the route segment and update the redirect URL pattern.

## Self-Check: PASSED

- `packages/core/src/types.ts` — found, contains `code: string` (SessionItem)
- `packages/core/src/schemas.ts` — found, contains `sessionCode: z.string()`
- `infra/schema.graphql` — found, contains `sessionCode: String!`
- `packages/frontend/src/actions/session.ts` — found, contains `generateNumericCode()`
- `packages/frontend/src/lib/session.ts` — found, contains `code: item.code as string`
- `packages/frontend/package.json` — random-word-slugs absent
- Task 1 commit: 7eba885 — confirmed in git log
- Task 2 commit: 8770d46 — confirmed in git log

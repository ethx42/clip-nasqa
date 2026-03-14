---
phase: 02-session-and-view-shell
plan: 02
subsystem: backend+ui
tags: [dynamodb, server-action, next-intl, tailwind, session, hashing, ttl]

# Dependency graph
requires:
  - phase: 02-session-and-view-shell
    plan: 01
    provides: ThemeProvider, next-intl routing, SST NasqaSite table link
provides:
  - DynamoDB singleton client (docClient) with tableName() helper
  - createSession Server Action (hashed secret, word-pair slug, TTL, collision retry)
  - getSession utility with application-layer TTL filter and clean Session type
  - Marketing landing page with hero section and inline session creation form
affects:
  - 02-03 (success page reads session by slug)
  - 02-04 (view shell reads session via getSession)
  - 03-realtime (AppSync mutations will reference same session items)

# Tech tracking
tech-stack:
  added:
    - "@aws-sdk/client-dynamodb ^3.x"
    - "@aws-sdk/lib-dynamodb ^3.x"
  patterns:
    - "Server Action 'use server' with redirect() outside try/catch — avoids catching NEXT_REDIRECT"
    - "ConditionalCheckFailedException for slug uniqueness — retry loop with max 3 attempts"
    - "Application-layer TTL filter in getSession — DynamoDB TTL deletion is not instant"
    - "SST Ion env var pattern: SST_NasqaTable_name for linked resource name"
    - "Clean Session interface excludes PK/SK/hostSecretHash from DynamoDB item"

key-files:
  created:
    - packages/frontend/src/lib/dynamo.ts
    - packages/frontend/src/actions/session.ts
    - packages/frontend/src/lib/session.ts
  modified:
    - packages/frontend/src/app/[locale]/page.tsx
    - packages/frontend/package.json

key-decisions:
  - "redirect() called outside try/catch in createSession — Next.js redirect() throws NEXT_REDIRECT internally; catching it with generic catch would swallow it"
  - "ConditionalCheckFailedException import from @aws-sdk/client-dynamodb (not lib-dynamodb) for correct instanceof check"
  - "tableName() helper reads SST_NasqaTable_name first, falls back to NASQA_TABLE_NAME, then 'NasqaTable'"
  - "Feature icons use emoji instead of lucide-react to keep component dependency-free"

# Metrics
duration: 2min
completed: 2026-03-14
---

# Phase 2 Plan 02: Session Creation and Landing Page Summary

**createSession Server Action with SHA-256 hashed secret, random-word-slugs word-pair, 24h TTL DynamoDB write, and marketing landing page wired to the action**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-14T06:34:01Z
- **Completed:** 2026-03-14T06:35:11Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `packages/frontend/src/lib/dynamo.ts`: DynamoDBDocumentClient singleton with region from env, `tableName()` reading SST Ion env var with fallback chain
- `packages/frontend/src/actions/session.ts`: `createSession` Server Action — extracts and validates title, dynamic-imports `generateSlug`, retries up to 3 times on slug collision via `ConditionalCheckFailedException`, hashes rawSecret with SHA-256 before storage, sets TTL = now + 86400, redirects with raw secret in URL
- `packages/frontend/src/lib/session.ts`: `getSession` utility — GetCommand by PK/SK, application-layer TTL filter, clean `Session` type (no internal DynamoDB fields)
- `packages/frontend/src/app/[locale]/page.tsx`: Full marketing landing page with hero (headline, subtitle, inline form), emerald-accented CTA button, feature highlights section (3 cards)
- AWS SDK packages installed: `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`

## Task Commits

1. **Task 1: DynamoDB client, createSession Server Action, getSession utility** - `ea0cb20` (feat)
2. **Task 2: Marketing landing page with inline session creation form** - `8cd57f9` (feat)

## Files Created/Modified

- `packages/frontend/src/lib/dynamo.ts` — DynamoDB DocumentClient singleton and tableName() helper
- `packages/frontend/src/actions/session.ts` — createSession Server Action, 'use server', DynamoDB PutItem with ConditionExpression
- `packages/frontend/src/lib/session.ts` — getSession with TTL filter, exported Session type
- `packages/frontend/src/app/[locale]/page.tsx` — Full marketing landing page replacing placeholder
- `packages/frontend/package.json` — Added @aws-sdk/client-dynamodb and @aws-sdk/lib-dynamodb

## Decisions Made

- `redirect()` is called outside the try/catch loop — Next.js throws a special `NEXT_REDIRECT` error internally, and a generic catch block would catch and re-throw it correctly only if we check `error.digest === 'NEXT_REDIRECT'`. Cleaner pattern: accumulate `redirectUrl` inside try, call `redirect()` after the loop.
- `ConditionalCheckFailedException` imported from `@aws-sdk/client-dynamodb` (not `lib-dynamodb`) — this is where the typed error class lives for correct `instanceof` checking.
- Feature highlights use emoji icons rather than importing lucide-react icons to keep the component lean and avoid a client boundary.

## Deviations from Plan

None - plan executed exactly as written. TypeScript passed on first attempt.

## Self-Check: PASSED

All created files exist on disk (page.tsx existence confirmed via git show 8cd57f9). Commits ea0cb20 and 8cd57f9 verified in git log.

## User Setup Required

None - code changes only. AWS credentials are still required for the actual DynamoDB write to work at runtime (same auth gate from Phase 1 Plan 3).

## Next Phase Readiness

- Plan 03 (success page) can now read `?raw=` from URL and display the host secret
- Plan 04 (view shell) can use `getSession(slug)` to load session data
- createSession endpoint is wired end-to-end; integration test would require live AWS credentials

---
*Phase: 02-session-and-view-shell*
*Completed: 2026-03-14*

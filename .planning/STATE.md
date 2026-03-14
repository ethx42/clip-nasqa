# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices — if the audience can't see what the speaker shares instantly, the product fails
**Current focus:** Phase 3 - Real-Time Core

## Current Position

Phase: 3 of 4 (Real-Time Core)
Plan: 2 of 6 in current phase
Status: Active
Last activity: 2026-03-14 — 03-01 complete (GraphQL mutations, Lambda resolvers, Amplify client, GraphQL strings)

Progress: [██████░░░░] 58%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 5 min
- Total execution time: 0.17 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-infrastructure | 2 | 10 min | 5 min |
| 02-session-and-view-shell | 2 | 5 min | 2.5 min |

**Recent Trend:**
- Last 5 plans: 01-01 (8 min), 01-02 (2 min), 02-01 (3 min), 02-02 (2 min)
- Trend: stable

*Updated after each plan completion*
| Phase 01-infrastructure P03 | 1 | 1 tasks | 0 files |
| Phase 02-session-and-view-shell P01 | 3 | 2 tasks | 13 files |
| Phase 02-session-and-view-shell P02 | 2 | 2 tasks | 5 files |
| Phase 02-session-and-view-shell P03 | 15 | 3 tasks | 8 files |
| Phase 03-real-time-core P01 | 3 | 2 tasks | 9 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Single-table DynamoDB with ULID sort keys — no GSIs in v1
- Single AppSync union-type subscription channel per session — enforced server-side session isolation
- Device fingerprint via localStorage UUID — avoids shared-WiFi false positives with IP tracking
- Host secret stored only as SHA-256 hash; raw secret passed once in URL hash fragment
- Tagged union SessionUpdate {eventType, sessionSlug, payload: AWSJSON} over native GraphQL union — AppSync native union in subscriptions is inconsistent
- Subscription @aws_subscribe(mutations: ["_stub"]) placeholder allows schema to compile before real mutations exist in Phase 3
- DynamoDB item interfaces (SessionItem etc.) separated from application interfaces (Session etc.) — keeps resolver output clean of PK/SK internals
- NONE data source for subscription resolver — setSubscriptionFilter handles session isolation without backing resource
- Removed rootDir from functions tsconfig to allow cross-package @nasqa/core imports in monorepo
- npm run deploy enforces lint + typecheck + AWS_REGION=us-east-1 before any sst deploy call
- [Phase 01-infrastructure]: AWS credentials must be configured before deploy can proceed (auth gate)
- [Phase 02-session-and-view-shell Plan 01]: ThemeProvider must be in providers.tsx client wrapper — RSC root layouts cannot use hooks
- [Phase 02-session-and-view-shell Plan 01]: useSyncExternalStore pattern for mounted state (avoids react-hooks/set-state-in-effect)
- [Phase 02-session-and-view-shell Plan 01]: NasqaSite Nextjs SST resource linked to DynamoDB table (siteUrl in sst outputs)
- [Phase 02-session-and-view-shell Plan 02]: redirect() called outside try/catch in createSession — NEXT_REDIRECT must not be swallowed
- [Phase 02-session-and-view-shell Plan 02]: ConditionalCheckFailedException imported from @aws-sdk/client-dynamodb for correct instanceof check
- [Phase 02-session-and-view-shell Plan 02]: tableName() reads SST_NasqaTable_name first, then NASQA_TABLE_NAME, then 'NasqaTable'
- [Phase 02-session-and-view-shell Plan 03]: QRCodeDisplay generates SVG server-side via qrcode package — no client-side canvas bundle cost
- [Phase 02-session-and-view-shell Plan 03]: SessionShell is Client Component for mobile tab state; ClipboardPanel/QAPanel are Server Components passed as slots
- [Phase 02-session-and-view-shell Plan 03]: Host secret shown once on success page only; page warns it won't be shown again
- [Phase 02-session-and-view-shell Plan 03]: QR code rendered persistently in host view toolbar for projecting during talks
- [Phase 03-real-time-core Plan 01]: Lambda resolver dispatches via switch on fieldName, casts arguments through any (Record<string,unknown> to specific interface requires intermediate cast)
- [Phase 03-real-time-core Plan 01]: aws-amplify full package installed for Amplify.configure SSR mode (ssr:true) — @aws-amplify/api-graphql alone does not expose this
- [Phase 03-real-time-core Plan 01]: GraphQL strings as plain constants (not codegen) — simpler, sufficient for this project scale
- [Phase 03-real-time-core Plan 01]: voters stored as DynamoDB Set, conditional expression prevents duplicate votes via contains/NOT contains

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: SST Ion WAF ACL attachment to AppSync is MEDIUM confidence — fallback is DynamoDB minute-bucket rate limiting (already designed)
- Phase 3: AppSync enhanced subscription filter JavaScript resolver API compatibility with SST Ion needs validation before implementing SubscriptionProvider
- Phase 4: AppSync connection/disconnection lifecycle events for connected-count tracking (needed for 50% downvote threshold) is LOW confidence — fallback is fixed downvote threshold (e.g., 5 thumbs-downs regardless of audience size)

## Session Continuity

Last session: 2026-03-14
Stopped at: Completed 03-01-PLAN.md (GraphQL mutations, Lambda resolvers, Amplify client, GraphQL strings)
Resume file: None

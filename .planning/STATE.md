# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices — if the audience can't see what the speaker shares instantly, the product fails
**Current focus:** Phase 1 - Infrastructure

## Current Position

Phase: 1 of 4 (Infrastructure)
Plan: 3 of 3 in current phase
Status: Blocked — AWS credentials required
Last activity: 2026-03-14 — 01-03 blocked at AWS auth gate (lint + typecheck pass, sst deploy needs credentials)

Progress: [██░░░░░░░░] 17%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 5 min
- Total execution time: 0.17 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-infrastructure | 2 | 10 min | 5 min |

**Recent Trend:**
- Last 5 plans: 01-01 (8 min), 01-02 (2 min)
- Trend: —

*Updated after each plan completion*
| Phase 01-infrastructure P03 | 1 | 1 tasks | 0 files |

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

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: SST Ion WAF ACL attachment to AppSync is MEDIUM confidence — fallback is DynamoDB minute-bucket rate limiting (already designed)
- Phase 3: AppSync enhanced subscription filter JavaScript resolver API compatibility with SST Ion needs validation before implementing SubscriptionProvider
- Phase 4: AppSync connection/disconnection lifecycle events for connected-count tracking (needed for 50% downvote threshold) is LOW confidence — fallback is fixed downvote threshold (e.g., 5 thumbs-downs regardless of audience size)

## Session Continuity

Last session: 2026-03-14
Stopped at: 01-03-PLAN.md Task 1 — AWS credentials auth gate (configure ~/.aws/config or AWS_PROFILE, then re-run npm run deploy)
Resume file: None

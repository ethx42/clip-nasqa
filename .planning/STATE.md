# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices
**Current focus:** v2.0 Performance & Instant Operations — Phase 14

## Current Position

Phase: 14 of 16 (Infrastructure and URL Routing)
Plan: 1 of TBD in current phase
Status: In progress
Last activity: 2026-03-17 — Plan 14-01 complete: Lambda arm64/256MB, React.cache SSR dedup, QA 300ms debounce

Progress: [█░░░░░░░░░] 10% (v2.0 milestone)

## Performance Metrics

**Velocity:**

- Total plans completed: 38 (v1.0: 16, v1.1: 10, v1.2: 5, v1.3: 6, v2.0: 1)
- Average duration: 5 min
- Total execution time: ~2.5 hours

_Updated after each plan completion_

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.0 research]: Participant mutations safe to move client-side (fingerprint auth enforced in Lambda); host mutations must stay as Server Actions — `hostSecretHash` in Network tab is a security risk
- [v2.0 research]: Lambda memory target is 256MB, not 512MB — AWS August 2025 pricing change bills INIT phase at invocation rate; 512MB doubles cold-start cost vs 128MB
- [v2.0 research]: QA debounce reduction requires Framer Motion `layout` prop on question cards as a prerequisite — without it, 300ms debounce causes visible card teleporting
- [v2.0 research]: Client-side Shiki must use `import("shiki/core")` with `createJavaScriptRegexEngine()` inside async callback only — static import adds 695kB gzip to initial bundle
- [14-01]: React.cache pattern established for server-side DynamoDB fetch deduplication; layout animation duration aligned to 300ms debounce with useReducedMotion gating

### Pending Todos

None.

### Blockers/Concerns

- [Phase 16]: Run `next build` bundle analyzer before implementing client Shiki — confirm it lands in a lazy chunk and initial bundle stays under 100kB gzip

## Session Continuity

Last session: 2026-03-17
Stopped at: Completed 14-01-PLAN.md — infrastructure perf baseline (Lambda, React.cache, QA animation)
Resume at: `/gsd:execute-phase 14` (plan 02: URL routing slug → code rename)

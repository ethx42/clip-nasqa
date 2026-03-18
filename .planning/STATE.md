# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices
**Current focus:** v2.0 Performance & Instant Operations — Phase 14

## Current Position

Phase: 14 of 16 (Infrastructure and URL Routing)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-17 — v2.0 roadmap created, phases 14-16 defined

Progress: [░░░░░░░░░░] 0% (v2.0 milestone)

## Performance Metrics

**Velocity:**

- Total plans completed: 37 (v1.0: 16, v1.1: 10, v1.2: 5, v1.3: 6)
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

### Pending Todos

None.

### Blockers/Concerns

- [Phase 14]: Verify whether Framer Motion `layout` prop is already on question cards before planning debounce work — if present, no prerequisite animation work needed
- [Phase 14]: Confirm actual Lambda memory default in `sst.config.ts` before choosing 256MB target (conflicting research: 128MB vs 1024MB default)
- [Phase 16]: Run `next build` bundle analyzer before implementing client Shiki — confirm it lands in a lazy chunk and initial bundle stays under 100kB gzip

## Session Continuity

Last session: 2026-03-17
Stopped at: v2.0 roadmap defined — phases 14-16 created, all 27 requirements mapped
Resume at: `/gsd:plan-phase 14`

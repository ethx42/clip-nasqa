# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices
**Current focus:** v2.1 Edit & Delete — setting up milestone

## Current Position

Phase: 16-optimistic-snippet-push-and-client-shiki
Plan: 01 of 2 complete
Status: Executing phase 16
Last activity: 2026-03-18 — Plan 16-01 complete: optimistic snippet push, failure state, snippet numbering, pill banner.

Progress: [██░░░░░░░░] 15% (v2.0 milestone)

## Performance Metrics

**Velocity:**

- Total plans completed: 43 (v1.0: 16, v1.1: 10, v1.2: 5, v1.3: 6, v2.0: 6)
- Average duration: 5 min
- Total execution time: ~2.6 hours

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
- [14-02]: Numeric codes use range 100000-999999 (6-digit, 900000 possibilities) for readability; random-word-slugs dependency removed; route param still named "slug" in filesystem routes until URL restructure (plan 03)
- [14-03]: 6-digit validation guard (/^\d{6}$/) placed in both generateMetadata and page default export; participantUrl uses /${locale}/${code} flat format; OG image shows formatCode(code) badge; robots.ts disallow rules removed in favor of per-page robots metadata
- [14-04]: /join page renders inside [locale] layout (nav bar visible) — full standalone requires route group restructure not planned; JoinForm extracted as client component for server generateMetadata; paste handler uses /(\d{6})/ to extract codes from URLs
- [15-01]: VOTE_CONFLICT silent handling in dedicated callVoteMutation() helper outside safeClientMutation to keep shared utility clean; isPending/restoredText threaded through QAPanel as props (QAPanel stays stateless); focusQuestionAction moved to moderation.ts so qa.ts could be deleted entirely
- [15-02]: getTranslations deferred to error paths only in all 8 host Server Actions — happy-path mutations skip i18n resolution entirely; createSession has 3 independent lazy call sites (validation, DynamoDB catch, code exhaustion)
- [Phase 16-01]: Deferred push via editingSnippetIds check in executeServerPush; push fires when handleEditEnd is called with final edited content
- [Phase 16-01]: Content-fingerprint dedup in SNIPPET*ADDED matches sessionCode+content+language+type without optimisticId, auto-removes matched \_opt* ID from failedSnippetIds

### Pending Todos

None.

### Blockers/Concerns

- [Phase 16]: Run `next build` bundle analyzer before implementing client Shiki — confirm it lands in a lazy chunk and initial bundle stays under 100kB gzip

## Session Continuity

Last session: 2026-03-18
Stopped at: Completed 16-01-PLAN.md — optimistic snippet push wired end-to-end
Resume at: `/gsd:execute-phase 16` to run plan 16-02 (client-side Shiki)

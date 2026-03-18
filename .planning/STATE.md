# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices
**Current focus:** v2.1 Edit & Delete — backend infrastructure complete

## Current Position

Phase: 17-edit-and-delete
Plan: 02 of 3 complete
Status: Phase 17 in progress
Last activity: 2026-03-18 — Plan 17-02 complete: frontend mutation strings, reducer actions, subscription handler, participant hooks (client-side), host hooks (Server Actions), and editSnippetAction.

Progress: [████░░░░░░] 40% (v2.1 milestone)

## Performance Metrics

**Velocity:**

- Total plans completed: 45 (v1.0: 16, v1.1: 10, v1.2: 5, v1.3: 6, v2.0: 6, v2.1: 2)
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
- [Phase 16-02]: useShikiHighlight singleton via module-level \_highlighterPromise — highlighter created once, language grammars loaded lazily per-language on first use
- [Phase 16-02]: All Shiki imports dynamic (inside async functions) — no top-level static import; shiki/core + engine + themes + langs all lazy-loaded
- [Phase 16-02]: detectLanguage rewritten with multi-signal heuristics; URL-first check before YAML rule; JS requires 2-of-3 signals
- [Phase 17-01]: verifyHostSecret extracted to resolvers/shared.ts — single source of truth; was duplicated in qa.ts and clipboard.ts
- [Phase 17-01]: Dual-path auth in single mutation — fingerprint+5min-window for participants, verifyHostSecret for host; no time window for host snippet edits (superuser per EDIT-09)
- [Phase 17-01]: Soft-delete via deletedAt attribute — getSessionData filter extended to exclude deletedAt items; editedAt mapped in all three content-type projections
- [Phase 17-02]: Participant edit/delete hooks call graphqlMutation directly; host hooks go through Server Actions — transport split preserves hostSecretHash security boundary
- [Phase 17-02]: handleDeleteReply rollback not attempted for participant path — no repliesRef in useSessionMutations; subscription echo corrects state; repliesRef added as optional param to useHostMutations for Plan 03

### Pending Todos

None.

### Blockers/Concerns

- [Phase 16]: Run `next build` bundle analyzer before implementing client Shiki — confirm it lands in a lazy chunk and initial bundle stays under 100kB gzip

## Session Continuity

Last session: 2026-03-18
Stopped at: Completed 17-02-PLAN.md — frontend mutation strings, reducer, subscription handler, participant hooks, host hooks
Resume at: Phase 17 plan 03 — UI components for edit and delete

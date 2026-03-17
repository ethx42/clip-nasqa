# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices — if the audience can't see what the speaker shares instantly, the product fails
**Current focus:** Milestone v1.1 - Enterprise Hardening (Phase 9 in progress — reactions data model and backend)

## Current Position

Phase: 9 of 13 (Reactions Data Model and Backend — in progress)
Plan: 3 of 3 complete
Status: Phase 9 all 3 plans complete; Phase 10 next (reactions frontend)
Last activity: 2026-03-17 — Phase 9 Plan 03 complete (unit tests for handleReact, EMOJI_PALETTE, emojiKeySchema — 98 tests passing)

Progress: [██████████████░░░░░░] 62% (v1.0+v1.1 Phases 5-9 complete; Phase 10 next)

## Performance Metrics

**Velocity:**

- Total plans completed: 16 (v1.0)
- Average duration: 5 min
- Total execution time: ~1.3 hours

**By Phase:**

| Phase                               | Plans | Total  | Avg/Plan |
| ----------------------------------- | ----- | ------ | -------- |
| 01-infrastructure                   | 3     | 10 min | 5 min    |
| 02-session-and-view-shell           | 3     | 10 min | 3 min    |
| 03-real-time-core                   | 6     | 30 min | 5 min    |
| 04-moderation-identity-and-polish   | 4     | 20 min | 5 min    |
| 05-code-quality-gates               | 2     | 18 min | 9 min    |
| 07-error-handling-and-observability | 3     | 17 min | 5.7 min  |
| 08-seo-and-accessibility            | 2     | 8 min  | 4 min    |

**Recent Trend:**

- Last 5 plans: 07-01 (5 min), 07-02 (8 min), 07-03 (4 min), 08-01 (5 min), 08-02 (3 min)
- Trend: stable

_Updated after each plan completion_

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.3 Roadmap]: Phase 11 must land before Phase 12 — hook extraction enables unit-testable mutation handlers that verify stale closure fix before component surgery
- [v1.3 Roadmap]: Phase 12 QAPanel cleanup (Step 7) before QuestionCard decomposition (Step 8) — panel must be in final state (accepting pre-sorted + Map props) when variants are introduced
- [v1.3 Roadmap]: Phase 13 accessibility last — `hidden` attribute tab panel change (A11Y-05) must precede ARIA tablist roles (A11Y-04); sequencing last avoids merge conflicts during component surgery
- [v1.1 Roadmap]: Compress 7 research phases to 4 (quick depth) — QUAL merged into Phase 5; TEST+CICD merged into Phase 6; ERR+OBS merged into Phase 7; SEO+A11Y merged into Phase 8
- [06-02]: 156.7kB initial JS baseline documented — aws-amplify ~68kB alone exceeds 80kB budget; CI must use continue-on-error until aws-amplify replaced
- [06-03]: bundle-size job uses continue-on-error: true — aws-amplify adds ~68kB gzipped (known Phase 3 constraint); remove when replaced
- [07-01]: global-error.tsx uses inline styles — Tailwind/ThemeProvider unavailable at root layout crash level; light-mode-only rendering accepted
- [07-01]: rate-limit throws RATE_LIMIT_EXCEEDED:{remaining} format — encodes cooldown seconds for client-side display
- [07-01]: pino logger at module level — Lambda warm-start performance: avoids re-init on each invocation
- [07-01]: error.tsx classifies connection vs server errors by digest presence + message keywords — connection lost vs server error hint per user decision
- [07-02]: landing page converted to client component using useActionState (React 19) to handle createSession returning ActionResult
- [07-02]: VOTE_CONFLICT kept as string control code in upvoteQuestionAction — not localized, consumed by client as dedup signal
- [07-03]: safeAction uses R extends {success: boolean} type parameter — accommodates upvoteQuestionAction VOTE_CONFLICT union type without ActionResult<unknown> mismatch
- [07-03]: networkErrorMessage passed as parameter to safeAction — keeps utility free of useTranslations (non-React function, no hook rules)
- [07-03]: noValidate + remove required on landing form — routes all validation through server action for unified toast UX
- [08-01]: session pages use static /opengraph-image (not dynamic per-session thumbnail) — brand consistency is the priority
- [08-01]: product name is "clip" in all metadata and UI header — not "nasqa"
- [08-01]: session pages carry noindex robots (belt-and-suspenders) — sessions are ephemeral and audience-scoped
- [08-01]: JSON-LD injected in locale layout (server component) — landing page is client component; structured data always in static HTML shell
- [Phase 08-02]: NewContentBanner uses aria-hidden=true — screen reader announcements delegated exclusively to QAPanel aria-live region to avoid duplicate reads
- [Phase 08-02]: SessionShell uses header landmark (not main) — layout.tsx already wraps children in main; no duplicate landmark
- [09-01]: EMOJI_PALETTE is single source of truth — EmojiKey type and emojiKeySchema both derived from palette.map(e => e.key); extending palette automatically updates validation
- [09-01]: Array.from() over Set.has() for reactors inspection — DynamoDB DocumentClient may return StringSet as custom object; Array.from().includes() is safe regardless of marshaling
- [09-01]: reactedByMe toggled emoji overridden with isNowReacted flag — avoids re-reading the just-modified Set; eliminates DocumentClient StringSet ambiguity for the key that matters most
- [09-01]: Second CCF on toggle-off = no-op — race condition where two concurrent toggle-off requests arrive simultaneously is handled as idempotent; client reconciles via subscription
- [09-03]: Rate-limit UpdateCommand fires before reaction UpdateCommand — mock sequences must provide rate-limit resolve as call #1 when testing toggle-off path
- [09-03]: SESSION# PK filter distinguishes reaction UpdateCommand from RATELIMIT# UpdateCommand in mock call inspection — cleaner than parsing UpdateExpression

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 6]: SST Ion + GitHub Actions OIDC IAM permissions — exact IAM policy for `sst deploy --stage production` not documented in official SST Ion docs; needs empirical derivation during planning
- [Phase 7]: AppSync `beforeSend` filter signatures — exact error strings from Amplify WebSocket reconnect cannot be pre-specified; plan for one tuning iteration after first live session
- [Phase 8]: `aria-live` debounce for rapid upvote updates — 500ms quiet-period pattern correct in principle but needs VoiceOver/NVDA empirical validation during implementation
- [Phase 11]: `useEffectEvent` vs `stateRef` vs reducer rollback for stale closure fix — three valid solutions; `useEffectEvent` is recommended (React 19.2.3 installed) but confirm during implementation
- [Phase 12]: AnimatePresence `mode` under high load — validate `mode="sync"` vs default during Phase 12 testing; changing mode after the fact is a one-line fix if needed

## Session Continuity

Last session: 2026-03-17
Stopped at: Completed 09-03-PLAN.md (unit tests for handleReact resolver, EMOJI_PALETTE, emojiKeySchema — 98 tests passing across all packages)
Resume file: None

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices
**Current focus:** v2.2 UX Overhaul — Phase 20: Functionality and Audience View

## Current Position

Phase: 20 of 21 (Functionality and Audience View) — IN PROGRESS
Plan: 2 of 2 in current phase (plan 02 complete)
Status: Phase 20 plan 02 complete
Last activity: 2026-03-20 — 20-02 complete: session code chip, section headers, collapsible Q&A, hard delete threading

Progress: [████████████████████░] ~95% (20/21 phases in progress)

## Performance Metrics

**Velocity:**

- Total plans completed: 49 (v1.0: 16, v1.1: 10, v1.2: 5, v1.3: 6, v2.0: 6, v2.1: 3, v2.2: 3)
- Average duration: 5 min
- Total execution time: ~2.8 hours

_Updated after each plan completion_

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 17-03]: ReplyRow extracted from ReplyList — per-reply state requires component isolation
- [Phase 17-02]: Participant edit/delete hooks call graphqlMutation directly; host hooks go through Server Actions — transport split preserves hostSecretHash security boundary
- [Phase 16-02]: useShikiHighlight singleton via module-level \_highlighterPromise — all Shiki imports must remain dynamic (no static top-level import)
- [Phase 15-01]: VOTE_CONFLICT silent handling kept outside safeClientMutation to keep shared utility clean
- [Phase 18-01]: AppHeader uses slot-based composition (sessionContext, shareSlot) so session pages inject context in plan 02 without modifying AppHeader
- [Phase 18-01]: Layout dimensions via CSS variables: --header-height: 56px replaces all hardcoded 73px references
- [Phase 18-02]: Each page renders its own AppHeader instance — cleaner than portals/Context for injecting session-specific header content
- [Phase 18-02]: SessionLiveHostPage owns HostToolbar rendering; host/page.tsx passes raw participantUrl — removes one layer of prop threading
- [Phase 19-01]: Flat py-3 px-1 segment wrapper replaces bordered card (rounded-xl border bg-card) — divide-y handles list separation
- [Phase 19-01]: Snippet number badge moved first in header row — leftmost position establishes creation-order identity as primary visual anchor
- [Phase 19-02]: IconButton with @base-ui Tooltip (400ms delay) wraps all icon-only buttons app-wide
- [Phase 19-02]: ThreadSpine: absolute div w-[1.5px] at left-[6px], no border-left or gradient fade
- [Phase 19-02]: Progressive disclosure for host tools — Edit+Delete primary, moderation behind Popover overflow
- [Phase 19-02]: Avatar-inside-input reply anatomy — 20px PixelAvatar as left-prefix inside border container
- [Phase 20-01]: Hard delete uses DeleteCommand (permanent) not UpdateCommand with deletedAt — no recovery path by design
- [Phase 20-01]: renderMarkdown hand-rolled (no library) to minimize bundle impact — single-pass regex tokenizer
- [Phase 20-01]: QUESTION_HARD_DELETED reducer cascades to filter all replies with matching questionId client-side
- [Phase 20-02]: allowCollapseQA boolean prop (default false) gates Q&A collapse per view — participant sets it true, host never does
- [Phase 20-02]: flex layout with flex-1/w-auto replaces grid-cols-2 for desktop two-column to support smooth Q&A collapse

### Pending Todos

None.

### Blockers/Concerns

- [Phase 16]: Run `next build` bundle analyzer before implementing client Shiki — confirm it lands in a lazy chunk and initial bundle stays under 100kB gzip
- [v2.2 resolved]: Superuser hard delete (FUNC-01) server actions exist; hard delete handlers wired in phase 20-02

## Session Continuity

Last session: 2026-03-20
Stopped at: Phase 20 plan 02 complete — session code chip, section headers, collapsible Q&A, hard delete prop threading
Resume at: Phase 21 (if any) or project complete

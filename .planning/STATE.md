# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Real-time clipboard and Q&A with sub-200ms latency across all connected devices
**Current focus:** v2.2 UX Overhaul — Phase 19: Segments Visual Overhaul and Voting

## Current Position

Phase: 19 of 21 (Segments Visual Overhaul and Voting) — COMPLETE
Plan: 2 of 2 in current phase (all plans complete)
Status: Phase complete
Last activity: 2026-03-20 — 19-02 complete: enterprise UX overhaul (IconButton, voting, spine, input anatomy)

Progress: [██████████████████░░] ~90% (19/21 phases complete)

## Performance Metrics

**Velocity:**

- Total plans completed: 47 (v1.0: 16, v1.1: 10, v1.2: 5, v1.3: 6, v2.0: 6, v2.1: 3, v2.2: 1)
- Average duration: 5 min
- Total execution time: ~2.7 hours

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

### Pending Todos

None.

### Blockers/Concerns

- [Phase 16]: Run `next build` bundle analyzer before implementing client Shiki — confirm it lands in a lazy chunk and initial bundle stays under 100kB gzip
- [v2.2]: Superuser hard delete (FUNC-01) requires a new Server Action — confirm DynamoDB deleteItem replaces existing soft-delete path without breaking subscription broadcast

## Session Continuity

Last session: 2026-03-20
Stopped at: Phase 19 complete — all plans executed and approved
Resume at: Phase 20 (Functionality and Audience View)

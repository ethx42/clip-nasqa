# Phase 11: Shared Utilities and Hook Extraction - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract duplicated logic into canonical locations. `formatRelativeTime` becomes a single shared module consumed by all timestamp displays. `useSessionMutations` consolidates mutation handlers so both page orchestrators import callbacks instead of defining them inline. Stale closure bugs under concurrent votes are eliminated.

</domain>

<decisions>
## Implementation Decisions

### Timestamp display rules

- Short token format: "now", "2m", "1h", "3d", "1w"
- Granularity: "now" for < 60 seconds, then "1m"–"59m", "1h"–"23h", "1d"–"6d", "1w"+"
- Live-update every 30 seconds — timestamps tick forward automatically
- i18n-aware: canonical function accepts translator `t` for localized tokens (e.g., Spanish "ahora", "2min")

### Mutation hook shape

- Split into two hooks: `useSessionMutations` (shared: upvote, downvote, reply, submitQuestion) and `useHostMutations` (extends with banQuestion, banParticipant)
- Error handling is internal — hooks show toast on failure and handle optimistic rollback; consuming components just call and move on
- Hooks accept optional success callbacks (e.g., `onReplySuccess`, `onSubmitSuccess`) so components can co-locate mutation + side-effect logic

### Claude's Discretion

- Stale closure fix strategy — use whatever pattern (refs, reducers, callback form of setState) best eliminates snapshot captures in rollback handlers
- File organization — where shared utilities and hooks live in the source tree
- Exact hook parameter signatures and TypeScript generics
- Performance: whether live-update timer is per-component or shared via context

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 11-shared-utilities-and-hook-extraction_
_Context gathered: 2026-03-17_
